// Email notification utility functions
// Integrates with the send-email Supabase Edge Function

import { supabase } from './supabase';

// Email types
export type EmailType =
    | 'booking_confirmation'
    | 'booking_confirmation_deposit'
    | 'booking_reminder_24h'
    | 'new_booking_alert';

interface SendEmailParams {
    type: EmailType;
    booking_id: string;
    recipient_email?: string; // For worker/admin alerts
}

interface EmailResult {
    success: boolean;
    message?: string;
    email_id?: string;
    error?: string;
}

/**
 * Send an email notification via the Supabase Edge Function
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: params,
        });

        if (error) {
            console.error('Email error:', error);
            return {
                success: false,
                error: error.message || 'Failed to send email',
            };
        }

        return {
            success: true,
            message: data.message,
            email_id: data.email_id,
        };
    } catch (err: any) {
        console.error('Email sending failed:', err);
        return {
            success: false,
            error: err.message || 'Failed to send email',
        };
    }
}

/**
 * Send booking confirmation email to client
 * Automatically determines if deposit is required
 */
export async function sendBookingConfirmation(
    bookingId: string,
    requiresDeposit: boolean
): Promise<EmailResult> {
    const type: EmailType = requiresDeposit
        ? 'booking_confirmation_deposit'
        : 'booking_confirmation';

    return sendEmail({
        type,
        booking_id: bookingId,
    });
}

/**
 * Send 24-hour reminder email to client
 */
export async function send24HourReminder(bookingId: string): Promise<EmailResult> {
    return sendEmail({
        type: 'booking_reminder_24h',
        booking_id: bookingId,
    });
}

/**
 * Send new booking alert to worker
 */
export async function sendWorkerBookingAlert(
    bookingId: string,
    workerEmail: string
): Promise<EmailResult> {
    return sendEmail({
        type: 'new_booking_alert',
        booking_id: bookingId,
        recipient_email: workerEmail,
    });
}

/**
 * Send new booking alert to admin
 */
export async function sendAdminBookingAlert(
    bookingId: string,
    adminEmail?: string
): Promise<EmailResult> {
    return sendEmail({
        type: 'new_booking_alert',
        booking_id: bookingId,
        recipient_email: adminEmail,
    });
}

/**
 * Send all booking notifications (confirmation + alerts)
 * Call this after a successful booking creation
 */
export async function sendBookingNotifications(
    bookingId: string,
    options: {
        requiresDeposit: boolean;
        workerEmail?: string;
        adminEmail?: string;
        notifyWorker?: boolean;
        notifyAdmin?: boolean;
    }
): Promise<{
    clientEmail: EmailResult;
    workerEmail?: EmailResult;
    adminEmail?: EmailResult;
}> {
    const results: {
        clientEmail: EmailResult;
        workerEmail?: EmailResult;
        adminEmail?: EmailResult;
    } = {
        clientEmail: { success: false, error: 'Not attempted' },
    };

    // Send client confirmation
    results.clientEmail = await sendBookingConfirmation(bookingId, options.requiresDeposit);

    // Send worker alert if enabled
    if (options.notifyWorker !== false && options.workerEmail) {
        results.workerEmail = await sendWorkerBookingAlert(bookingId, options.workerEmail);
    }

    // Send admin alert if enabled
    if (options.notifyAdmin !== false && options.adminEmail) {
        results.adminEmail = await sendAdminBookingAlert(bookingId, options.adminEmail);
    }

    return results;
}

/**
 * Queue 24-hour reminder emails for tomorrow's bookings
 * This should be called by a scheduled job/cron
 */
export async function queueReminderEmails(): Promise<{
    sent: number;
    failed: number;
    errors: string[];
}> {
    const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[],
    };

    try {
        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Fetch tomorrow's confirmed bookings
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('id, client_email')
            .eq('booking_date', tomorrowStr)
            .eq('status', 'confirmed');

        if (error) {
            results.errors.push(`Failed to fetch bookings: ${error.message}`);
            return results;
        }

        if (!bookings || bookings.length === 0) {
            console.log('No bookings for tomorrow - no reminders to send');
            return results;
        }

        console.log(`Found ${bookings.length} bookings for tomorrow`);

        // Send reminder to each booking
        for (const booking of bookings) {
            try {
                const result = await send24HourReminder(booking.id);
                if (result.success) {
                    results.sent++;
                } else {
                    results.failed++;
                    results.errors.push(`Booking ${booking.id}: ${result.error}`);
                }
            } catch (err: any) {
                results.failed++;
                results.errors.push(`Booking ${booking.id}: ${err.message}`);
            }
        }

        return results;
    } catch (err: any) {
        results.errors.push(`Queue processing failed: ${err.message}`);
        return results;
    }
}
