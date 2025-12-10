// Availability Service
// This module handles fetching and managing availability data

import { supabase } from './supabase';

export interface TimeSlot {
    startTime: string;
    endTime: string;
    available: boolean;
}

export interface WorkerAvailability {
    worker_id: string;
    worker_name: string;
    calendar_connected: boolean;
    slots: TimeSlot[];
}

export interface AvailabilityResponse {
    date: string;
    business_hours: {
        start: string;
        end: string;
        closed?: boolean;
    };
    workers: WorkerAvailability[];
}

/**
 * Fetch availability for a specific date
 * Optionally filter by worker or service
 */
export async function getAvailability(
    date: string,
    options?: {
        workerId?: string;
        serviceDuration?: number;
    }
): Promise<AvailabilityResponse | null> {
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const params = new URLSearchParams({
            date,
            ...(options?.workerId && { worker_id: options.workerId }),
            ...(options?.serviceDuration && { duration: options.serviceDuration.toString() }),
        });

        const response = await fetch(
            `${supabaseUrl}/functions/v1/get-availability?${params.toString()}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('Availability fetch error:', error);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching availability:', error);
        return null;
    }
}

/**
 * Fallback availability calculation when Edge Function is not available
 * This uses local calculation based on business hours only
 */
export function calculateLocalAvailability(
    date: string,
    businessHours: { start: string; end: string; closed?: boolean },
    serviceDurationMinutes: number,
    existingBookings: Array<{ start_time: string; end_time: string; worker_id: string }>
): TimeSlot[] {
    if (businessHours.closed) {
        return [];
    }

    const slots: TimeSlot[] = [];
    const dayStart = new Date(`${date}T${businessHours.start}:00`);
    const dayEnd = new Date(`${date}T${businessHours.end}:00`);
    const now = new Date();

    let currentTime = new Date(dayStart);

    while (currentTime < dayEnd) {
        const slotEnd = new Date(currentTime.getTime() + serviceDurationMinutes * 60 * 1000);

        if (slotEnd > dayEnd) break;

        // Check if slot is in the past
        const isInPast = currentTime < now;

        // Check if slot overlaps with existing bookings
        const hasConflict = existingBookings.some(booking => {
            const bookingStart = new Date(booking.start_time);
            const bookingEnd = new Date(booking.end_time);
            return currentTime < bookingEnd && slotEnd > bookingStart;
        });

        slots.push({
            startTime: currentTime.toISOString(),
            endTime: slotEnd.toISOString(),
            available: !isInPast && !hasConflict,
        });

        // Move to next 30-minute interval
        currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
    }

    return slots;
}

/**
 * Get business hours for a specific day
 */
export async function getBusinessHours(): Promise<Record<string, { start: string; end: string; closed?: boolean }> | null> {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'business_hours')
            .single();

        if (error) {
            console.error('Error fetching business hours:', error);
            return null;
        }

        return data?.value || null;
    } catch (error) {
        console.error('Error fetching business hours:', error);
        return null;
    }
}

/**
 * Get business hours for a specific day of the week
 */
export function getBusinessHoursForDay(
    businessHours: Record<string, { start: string; end: string; closed?: boolean }>,
    date: string
): { start: string; end: string; closed?: boolean } {
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const defaultHours: Record<string, { start: string; end: string; closed?: boolean }> = {
        monday: { start: '09:00', end: '18:00' },
        tuesday: { start: '09:00', end: '18:00' },
        wednesday: { start: '09:00', end: '18:00' },
        thursday: { start: '09:00', end: '18:00' },
        friday: { start: '09:00', end: '18:00' },
        saturday: { start: '09:00', end: '14:00' },
        sunday: { start: '09:00', end: '14:00', closed: true },
    };

    return businessHours?.[dayOfWeek] || defaultHours[dayOfWeek];
}

/**
 * Format time slot for display
 */
export function formatSlotTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Get available dates for the next N days (excluding closed days)
 */
export async function getAvailableDates(
    startDate: Date,
    daysToCheck: number = 30
): Promise<string[]> {
    const businessHours = await getBusinessHours();
    const availableDates: string[] = [];

    for (let i = 0; i < daysToCheck; i++) {
        const checkDate = new Date(startDate);
        checkDate.setDate(checkDate.getDate() + i);

        const dateStr = checkDate.toISOString().split('T')[0];
        const hours = getBusinessHoursForDay(businessHours || {}, dateStr);

        if (!hours.closed) {
            availableDates.push(dateStr);
        }
    }

    return availableDates;
}

/**
 * Create a calendar event when a booking is made
 */
export async function createCalendarEvent(booking: {
    booking_id: string;
    worker_id: string;
    service_name: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    start_time: string;
    end_time: string;
    notes?: string;
}): Promise<{ success: boolean; event_id?: string; error?: string }> {
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const response = await fetch(
            `${supabaseUrl}/functions/v1/create-calendar-event`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'create',
                    booking,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.error || 'Failed to create calendar event' };
        }

        const data = await response.json();
        return { success: true, event_id: data.event_id };
    } catch (error: any) {
        console.error('Error creating calendar event:', error);
        return { success: false, error: error.message || 'Failed to create calendar event' };
    }
}

/**
 * Delete a calendar event when a booking is cancelled
 */
export async function deleteCalendarEvent(
    bookingId: string,
    workerId: string,
    eventId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const response = await fetch(
            `${supabaseUrl}/functions/v1/create-calendar-event`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'delete',
                    booking: {
                        booking_id: bookingId,
                        worker_id: workerId,
                        google_calendar_event_id: eventId,
                    },
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.error || 'Failed to delete calendar event' };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting calendar event:', error);
        return { success: false, error: error.message || 'Failed to delete calendar event' };
    }
}
