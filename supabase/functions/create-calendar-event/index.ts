// Supabase Edge Function for creating Google Calendar events
// This function creates a calendar event when a booking is confirmed

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''

interface BookingData {
    booking_id: string
    worker_id: string
    service_name: string
    client_name: string
    client_email: string
    client_phone: string
    start_time: string
    end_time: string
    notes?: string
}

interface CalendarEvent {
    id: string
    htmlLink: string
}

// Refresh access token if needed
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        })

        if (!response.ok) {
            console.error('Failed to refresh token')
            return null
        }

        const data = await response.json()
        return data.access_token
    } catch (error) {
        console.error('Error refreshing token:', error)
        return null
    }
}

// Create a Google Calendar event
async function createCalendarEvent(
    accessToken: string,
    calendarId: string,
    booking: BookingData
): Promise<CalendarEvent> {
    const event = {
        summary: `${booking.service_name} - ${booking.client_name}`,
        description: `
Client: ${booking.client_name}
Email: ${booking.client_email}
Phone: ${booking.client_phone}
${booking.notes ? `Notes: ${booking.notes}` : ''}

Booking ID: ${booking.booking_id}
        `.trim(),
        start: {
            dateTime: booking.start_time,
            timeZone: 'Africa/Nairobi', // Kenya timezone
        },
        end: {
            dateTime: booking.end_time,
            timeZone: 'Africa/Nairobi',
        },
        attendees: [
            { email: booking.client_email },
        ],
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 }, // 24 hours before
                { method: 'popup', minutes: 60 }, // 1 hour before
            ],
        },
        colorId: '10', // Green color for bookings
    }

    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        }
    )

    if (!response.ok) {
        const error = await response.json()
        console.error('Calendar event creation error:', error)
        throw new Error('Failed to create calendar event')
    }

    return await response.json()
}

// Delete a Google Calendar event
async function deleteCalendarEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
): Promise<void> {
    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
        {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        }
    )

    if (!response.ok && response.status !== 404) {
        const error = await response.json()
        console.error('Calendar event deletion error:', error)
        throw new Error('Failed to delete calendar event')
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, booking } = await req.json()

        if (!booking || !booking.worker_id) {
            return new Response(
                JSON.stringify({ error: 'Booking data with worker_id is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get worker's calendar credentials
        const { data: worker, error: workerError } = await supabase
            .from('workers')
            .select('google_calendar_id, google_access_token, google_refresh_token, calendar_connected')
            .eq('id', booking.worker_id)
            .single()

        if (workerError || !worker) {
            return new Response(
                JSON.stringify({ error: 'Worker not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!worker.calendar_connected || !worker.google_access_token) {
            // Calendar not connected, skip event creation
            return new Response(
                JSON.stringify({
                    message: 'Calendar not connected, event not created',
                    event_id: null
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Refresh token if needed
        let accessToken = worker.google_access_token
        if (worker.google_refresh_token) {
            const newToken = await refreshAccessToken(worker.google_refresh_token)
            if (newToken) {
                accessToken = newToken
                // Update the access token in the database
                await supabase
                    .from('workers')
                    .update({ google_access_token: newToken })
                    .eq('id', booking.worker_id)
            }
        }

        if (action === 'create') {
            // Create a new calendar event
            const event = await createCalendarEvent(
                accessToken,
                worker.google_calendar_id,
                booking
            )

            // Update the booking with the event ID
            await supabase
                .from('bookings')
                .update({ google_calendar_event_id: event.id })
                .eq('id', booking.booking_id)

            return new Response(
                JSON.stringify({
                    message: 'Calendar event created successfully',
                    event_id: event.id,
                    event_link: event.htmlLink,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

        } else if (action === 'delete' && booking.google_calendar_event_id) {
            // Delete an existing calendar event
            await deleteCalendarEvent(
                accessToken,
                worker.google_calendar_id,
                booking.google_calendar_event_id
            )

            // Clear the event ID from the booking
            await supabase
                .from('bookings')
                .update({ google_calendar_event_id: null })
                .eq('id', booking.booking_id)

            return new Response(
                JSON.stringify({
                    message: 'Calendar event deleted successfully',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

        } else {
            return new Response(
                JSON.stringify({ error: 'Invalid action. Use "create" or "delete"' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

    } catch (error) {
        console.error('Error in create-calendar-event:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
