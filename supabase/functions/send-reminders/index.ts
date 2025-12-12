// Supabase Edge Function for sending 24-hour booking reminders
// This function should be triggered by a scheduled cron job

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('🔔 Starting 24-hour reminder job...')

        // Create Supabase client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Calculate tomorrow's date range
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Get start and end of tomorrow
        const tomorrowStart = new Date(tomorrow)
        tomorrowStart.setHours(0, 0, 0, 0)

        const tomorrowEnd = new Date(tomorrow)
        tomorrowEnd.setHours(23, 59, 59, 999)

        const tomorrowDateStr = tomorrow.toISOString().split('T')[0]

        console.log(`📅 Looking for bookings on: ${tomorrowDateStr}`)

        // Fetch tomorrow's confirmed bookings that haven't received reminders
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
                id,
                client_name,
                client_email,
                booking_date,
                start_time
            `)
            .eq('booking_date', tomorrowDateStr)
            .eq('status', 'confirmed')

        if (bookingsError) {
            console.error('❌ Error fetching bookings:', bookingsError)
            return new Response(
                JSON.stringify({ error: 'Failed to fetch bookings', details: bookingsError }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!bookings || bookings.length === 0) {
            console.log('✅ No bookings found for tomorrow')
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No bookings for tomorrow',
                    sent: 0,
                    failed: 0
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`📋 Found ${bookings.length} bookings for tomorrow`)

        // Check which bookings already received reminders today
        const { data: sentReminders } = await supabase
            .from('email_logs')
            .select('booking_id')
            .in('booking_id', bookings.map(b => b.id))
            .eq('email_type', 'booking_reminder_24h')
            .gte('created_at', now.toISOString().split('T')[0])

        const sentBookingIds = new Set(sentReminders?.map(r => r.booking_id) || [])
        const bookingsToRemind = bookings.filter(b => !sentBookingIds.has(b.id))

        console.log(`📧 Sending reminders for ${bookingsToRemind.length} bookings`)

        let sent = 0
        let failed = 0
        const errors: string[] = []

        // Send reminders
        for (const booking of bookingsToRemind) {
            try {
                // Invoke the send-email function
                const { data, error } = await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'booking_reminder_24h',
                        booking_id: booking.id,
                    },
                })

                if (error) {
                    console.error(`❌ Failed to send reminder for booking ${booking.id}:`, error)
                    failed++
                    errors.push(`Booking ${booking.id}: ${error.message}`)
                } else {
                    console.log(`✅ Sent reminder for booking ${booking.id}`)
                    sent++
                }
            } catch (err) {
                console.error(`❌ Error sending reminder for booking ${booking.id}:`, err)
                failed++
                errors.push(`Booking ${booking.id}: ${err.message}`)
            }
        }

        console.log(`🏁 Reminder job complete: ${sent} sent, ${failed} failed`)

        return new Response(
            JSON.stringify({
                success: true,
                message: `Reminder job complete`,
                date: tomorrowDateStr,
                total_bookings: bookings.length,
                sent,
                failed,
                errors: errors.length > 0 ? errors : undefined,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('❌ Error in send-reminders:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
