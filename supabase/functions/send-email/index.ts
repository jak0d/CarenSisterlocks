// Supabase Edge Function for sending emails via Resend API
// This function handles all email notifications for CarenSisterlocks

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Business info
const BUSINESS_NAME = 'CarenSisterlocks'
const BUSINESS_EMAIL = Deno.env.get('BUSINESS_EMAIL') || 'bookings@carensisterlocks.com'
const BUSINESS_PHONE = Deno.env.get('BUSINESS_PHONE') || '+254 XXX XXX XXX'
const BUSINESS_ADDRESS = Deno.env.get('BUSINESS_ADDRESS') || 'Nairobi, Kenya'
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@carensisterlocks.com'

// Email types
type EmailType =
    | 'booking_confirmation'
    | 'booking_confirmation_deposit'
    | 'booking_reminder_24h'
    | 'new_booking_alert'

interface EmailRequest {
    type: EmailType
    booking_id: string
    recipient_email?: string // For worker/admin alerts
}

interface BookingDetails {
    id: string
    client_name: string
    client_email: string
    client_phone: string
    booking_date: string
    start_time: string
    end_time: string
    notes: string | null
    total_price: number | null
    deposit_required: boolean
    deposit_amount: number | null
    balance_due: number | null
    status: string
    service: {
        name: string
        duration_minutes: number
    }
    worker: {
        name: string
        email: string
    }
}

// Email template generator
function generateEmailHTML(type: EmailType, booking: BookingDetails): { subject: string; html: string } {
    const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const formattedTime = new Date(booking.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    })

    const baseStyles = `
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 32px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
            .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; }
            .content { padding: 32px; }
            .greeting { font-size: 20px; font-weight: 600; color: #1f2937; margin-bottom: 16px; }
            .message { color: #4b5563; margin-bottom: 24px; }
            .details-card { background: linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%); border-radius: 12px; padding: 24px; margin: 24px 0; }
            .details-card h3 { margin: 0 0 16px 0; color: #7c3aed; font-size: 18px; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(139, 92, 246, 0.1); }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #6b7280; font-size: 14px; }
            .detail-value { color: #1f2937; font-weight: 600; font-size: 14px; text-align: right; }
            .price-highlight { background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 24px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
            .cta-button:hover { opacity: 0.9; }
            .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 24px 0; }
            .alert-box.success { background: #d1fae5; border-left-color: #10b981; }
            .alert-box.info { background: #dbeafe; border-left-color: #3b82f6; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; }
            .social-links { margin: 16px 0; }
            .social-link { display: inline-block; margin: 0 8px; color: #8B5CF6; text-decoration: none; }
        </style>
    `

    switch (type) {
        case 'booking_confirmation':
            return {
                subject: `✨ Your Appointment is Confirmed - ${BUSINESS_NAME}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>${baseStyles}</head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>✨ ${BUSINESS_NAME}</h1>
                                <p>Your beauty journey awaits</p>
                            </div>
                            <div class="content">
                                <p class="greeting">Hi ${booking.client_name}! 👋</p>
                                <p class="message">
                                    Great news! Your appointment has been confirmed. We're excited to see you and help you look and feel your best!
                                </p>
                                
                                <div class="details-card">
                                    <h3>📅 Appointment Details</h3>
                                    <div class="detail-row">
                                        <span class="detail-label">Service</span>
                                        <span class="detail-value">${booking.service.name}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Date</span>
                                        <span class="detail-value">${formattedDate}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Time</span>
                                        <span class="detail-value">${formattedTime}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Duration</span>
                                        <span class="detail-value">${booking.service.duration_minutes} minutes</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Specialist</span>
                                        <span class="detail-value">${booking.worker.name}</span>
                                    </div>
                                    ${booking.total_price ? `
                                    <div class="detail-row">
                                        <span class="detail-label">Total Price</span>
                                        <span class="detail-value price-highlight">KES ${booking.total_price.toLocaleString()}</span>
                                    </div>
                                    ` : ''}
                                </div>

                                <div class="alert-box info">
                                    <strong>💡 Reminder:</strong> Please arrive 10 minutes before your appointment time. If you need to reschedule, please contact us at least 24 hours in advance.
                                </div>

                                ${booking.notes ? `
                                <p style="color: #6b7280; font-size: 14px;">
                                    <strong>Your notes:</strong> ${booking.notes}
                                </p>
                                ` : ''}
                            </div>
                            <div class="footer">
                                <p><strong>${BUSINESS_NAME}</strong></p>
                                <p>📍 ${BUSINESS_ADDRESS}</p>
                                <p>📞 ${BUSINESS_PHONE}</p>
                                <p>✉️ ${BUSINESS_EMAIL}</p>
                                <p style="margin-top: 16px; color: #9ca3af;">
                                    You're receiving this email because you booked an appointment with us.
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            }

        case 'booking_confirmation_deposit':
            return {
                subject: `✨ Appointment Confirmed - Deposit Required - ${BUSINESS_NAME}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>${baseStyles}</head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>✨ ${BUSINESS_NAME}</h1>
                                <p>Your beauty journey awaits</p>
                            </div>
                            <div class="content">
                                <p class="greeting">Hi ${booking.client_name}! 👋</p>
                                <p class="message">
                                    Your appointment has been confirmed! To secure your booking, a deposit payment is required.
                                </p>
                                
                                <div class="details-card">
                                    <h3>📅 Appointment Details</h3>
                                    <div class="detail-row">
                                        <span class="detail-label">Service</span>
                                        <span class="detail-value">${booking.service.name}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Date</span>
                                        <span class="detail-value">${formattedDate}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Time</span>
                                        <span class="detail-value">${formattedTime}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Duration</span>
                                        <span class="detail-value">${booking.service.duration_minutes} minutes</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Specialist</span>
                                        <span class="detail-value">${booking.worker.name}</span>
                                    </div>
                                </div>

                                <div class="details-card" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
                                    <h3 style="color: #92400e;">💳 Payment Details</h3>
                                    <div class="detail-row">
                                        <span class="detail-label">Total Price</span>
                                        <span class="detail-value">KES ${(booking.total_price || 0).toLocaleString()}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Deposit Required</span>
                                        <span class="detail-value" style="color: #92400e; font-weight: 700;">KES ${(booking.deposit_amount || 0).toLocaleString()}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Balance Due (at appointment)</span>
                                        <span class="detail-value">KES ${(booking.balance_due || 0).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div class="alert-box">
                                    <strong>⚠️ Important:</strong> Your booking will be held for 24 hours. Please complete your deposit payment to confirm your slot. You will receive M-Pesa payment instructions shortly.
                                </div>

                                <div class="alert-box info">
                                    <strong>💡 Reminder:</strong> Please arrive 10 minutes before your appointment time. If you need to reschedule, please contact us at least 24 hours in advance.
                                </div>
                            </div>
                            <div class="footer">
                                <p><strong>${BUSINESS_NAME}</strong></p>
                                <p>📍 ${BUSINESS_ADDRESS}</p>
                                <p>📞 ${BUSINESS_PHONE}</p>
                                <p>✉️ ${BUSINESS_EMAIL}</p>
                                <p style="margin-top: 16px; color: #9ca3af;">
                                    You're receiving this email because you booked an appointment with us.
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            }

        case 'booking_reminder_24h':
            return {
                subject: `⏰ Reminder: Your Appointment is Tomorrow - ${BUSINESS_NAME}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>${baseStyles}</head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>⏰ Appointment Reminder</h1>
                                <p>${BUSINESS_NAME}</p>
                            </div>
                            <div class="content">
                                <p class="greeting">Hi ${booking.client_name}! 👋</p>
                                <p class="message">
                                    This is a friendly reminder that your appointment is <strong>tomorrow</strong>! We're looking forward to seeing you.
                                </p>
                                
                                <div class="details-card">
                                    <h3>📅 Your Appointment</h3>
                                    <div class="detail-row">
                                        <span class="detail-label">Service</span>
                                        <span class="detail-value">${booking.service.name}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Date</span>
                                        <span class="detail-value">${formattedDate}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Time</span>
                                        <span class="detail-value">${formattedTime}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Specialist</span>
                                        <span class="detail-value">${booking.worker.name}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Location</span>
                                        <span class="detail-value">${BUSINESS_ADDRESS}</span>
                                    </div>
                                </div>

                                <div class="alert-box success">
                                    <strong>✅ Preparation Tips:</strong>
                                    <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                                        <li>Arrive 10 minutes early</li>
                                        <li>Bring any reference photos if applicable</li>
                                        <li>Wear comfortable clothing</li>
                                    </ul>
                                </div>

                                ${booking.balance_due && booking.balance_due > 0 ? `
                                <div class="alert-box">
                                    <strong>💳 Payment Due:</strong> Please remember to bring KES ${booking.balance_due.toLocaleString()} for the remaining balance.
                                </div>
                                ` : ''}

                                <p style="color: #6b7280; font-size: 14px;">
                                    Need to reschedule? Please contact us as soon as possible at ${BUSINESS_PHONE}.
                                </p>
                            </div>
                            <div class="footer">
                                <p><strong>${BUSINESS_NAME}</strong></p>
                                <p>📍 ${BUSINESS_ADDRESS}</p>
                                <p>📞 ${BUSINESS_PHONE}</p>
                                <p>✉️ ${BUSINESS_EMAIL}</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            }

        case 'new_booking_alert':
            return {
                subject: `🔔 New Booking Alert - ${booking.client_name} - ${booking.service.name}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>${baseStyles}</head>
                    <body>
                        <div class="container">
                            <div class="header" style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);">
                                <h1>🔔 New Booking Alert</h1>
                                <p>${BUSINESS_NAME} Dashboard</p>
                            </div>
                            <div class="content">
                                <p class="greeting">New Appointment Booked! 🎉</p>
                                <p class="message">
                                    A new appointment has been scheduled. Here are the details:
                                </p>
                                
                                <div class="details-card">
                                    <h3>👤 Client Information</h3>
                                    <div class="detail-row">
                                        <span class="detail-label">Name</span>
                                        <span class="detail-value">${booking.client_name}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Email</span>
                                        <span class="detail-value">${booking.client_email}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Phone</span>
                                        <span class="detail-value">${booking.client_phone}</span>
                                    </div>
                                </div>

                                <div class="details-card">
                                    <h3>📅 Appointment Details</h3>
                                    <div class="detail-row">
                                        <span class="detail-label">Service</span>
                                        <span class="detail-value">${booking.service.name}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Date</span>
                                        <span class="detail-value">${formattedDate}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Time</span>
                                        <span class="detail-value">${formattedTime}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Duration</span>
                                        <span class="detail-value">${booking.service.duration_minutes} minutes</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Assigned To</span>
                                        <span class="detail-value">${booking.worker.name}</span>
                                    </div>
                                    ${booking.total_price ? `
                                    <div class="detail-row">
                                        <span class="detail-label">Total Price</span>
                                        <span class="detail-value price-highlight">KES ${booking.total_price.toLocaleString()}</span>
                                    </div>
                                    ` : ''}
                                    ${booking.deposit_required ? `
                                    <div class="detail-row">
                                        <span class="detail-label">Deposit Required</span>
                                        <span class="detail-value">KES ${(booking.deposit_amount || 0).toLocaleString()}</span>
                                    </div>
                                    ` : ''}
                                </div>

                                ${booking.notes ? `
                                <div class="alert-box info">
                                    <strong>📝 Client Notes:</strong> ${booking.notes}
                                </div>
                                ` : ''}

                                <p style="text-align: center; margin-top: 24px;">
                                    <a href="#" class="cta-button">View in Dashboard</a>
                                </p>
                            </div>
                            <div class="footer">
                                <p><strong>${BUSINESS_NAME} Admin</strong></p>
                                <p>This is an automated notification from your booking system.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            }

        default:
            throw new Error(`Unknown email type: ${type}`)
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { type, booking_id, recipient_email }: EmailRequest = await req.json()

        console.log('📧 Email request received:', { type, booking_id })

        // Validate inputs
        if (!type || !booking_id) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: type and booking_id' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check Resend API key
        if (!RESEND_API_KEY) {
            console.error('❌ RESEND_API_KEY not configured')
            return new Response(
                JSON.stringify({ error: 'Email service not configured. Please set RESEND_API_KEY.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create Supabase client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Fetch booking details with service and worker info
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                service:services(name, duration_minutes),
                worker:workers(name, email)
            `)
            .eq('id', booking_id)
            .single()

        if (bookingError || !booking) {
            console.error('❌ Booking not found:', bookingError)
            return new Response(
                JSON.stringify({ error: 'Booking not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('📋 Booking details fetched:', booking.id)

        // Determine recipient based on email type
        let toEmail: string
        switch (type) {
            case 'booking_confirmation':
            case 'booking_confirmation_deposit':
            case 'booking_reminder_24h':
                toEmail = booking.client_email
                break
            case 'new_booking_alert':
                toEmail = recipient_email || booking.worker?.email || ADMIN_EMAIL
                break
            default:
                toEmail = booking.client_email
        }

        // Generate email content
        const { subject, html } = generateEmailHTML(type, booking as BookingDetails)

        console.log('📨 Sending email to:', toEmail)

        // Send email via Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: `${BUSINESS_NAME} <${BUSINESS_EMAIL}>`,
                to: [toEmail],
                subject,
                html,
            }),
        })

        const emailResult = await emailResponse.json()

        if (!emailResponse.ok) {
            console.error('❌ Resend API error:', emailResult)
            return new Response(
                JSON.stringify({ error: 'Failed to send email', details: emailResult }),
                { status: emailResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('✅ Email sent successfully:', emailResult.id)

        // Log email to database (optional - for tracking)
        try {
            await supabase
                .from('email_logs')
                .insert({
                    booking_id,
                    email_type: type,
                    recipient: toEmail,
                    subject,
                    status: 'sent',
                    resend_id: emailResult.id,
                })
        } catch (logError) {
            // Don't fail if logging fails
            console.warn('⚠️ Could not log email:', logError)
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Email sent successfully',
                email_id: emailResult.id,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('❌ Error in send-email:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
