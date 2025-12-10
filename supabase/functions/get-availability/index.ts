// Supabase Edge Function for fetching calendar availability
// This function queries Google Calendar free/busy API and calculates available slots

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''

interface FreeBusyResponse {
    calendars: {
        [key: string]: {
            busy: Array<{ start: string; end: string }>
        }
    }
}

interface TimeSlot {
    startTime: string
    endTime: string
    available: boolean
}

interface BusinessHours {
    start: string
    end: string
    closed?: boolean
}

// Refresh access token if expired
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

// Get busy times from Google Calendar
async function getFreeBusy(
    accessToken: string,
    calendarId: string,
    timeMin: string,
    timeMax: string
): Promise<Array<{ start: string; end: string }>> {
    const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            timeMin,
            timeMax,
            items: [{ id: calendarId }],
        }),
    })

    if (!response.ok) {
        const error = await response.json()
        console.error('FreeBusy API error:', error)
        throw new Error('Failed to fetch calendar availability')
    }

    const data: FreeBusyResponse = await response.json()
    return data.calendars[calendarId]?.busy || []
}

// Calculate available time slots
function calculateAvailableSlots(
    date: string,
    busyTimes: Array<{ start: string; end: string }>,
    businessHours: BusinessHours,
    slotDurationMinutes: number,
    bufferMinutes: number = 15
): TimeSlot[] {
    const slots: TimeSlot[] = []

    if (businessHours.closed) {
        return slots
    }

    // Parse business hours
    const [startHour, startMinute] = businessHours.start.split(':').map(Number)
    const [endHour, endMinute] = businessHours.end.split(':').map(Number)

    const dayStart = new Date(`${date}T${businessHours.start}:00`)
    const dayEnd = new Date(`${date}T${businessHours.end}:00`)

    // Convert busy times to Date objects
    const busyRanges = busyTimes.map(slot => ({
        start: new Date(slot.start),
        end: new Date(slot.end),
    }))

    // Generate slots at 30-minute intervals
    let currentTime = new Date(dayStart)
    while (currentTime < dayEnd) {
        const slotEnd = new Date(currentTime.getTime() + slotDurationMinutes * 60 * 1000)

        // Check if slot exceeds business hours
        if (slotEnd > dayEnd) break

        // Check if slot overlaps with any busy time (including buffer)
        const isAvailable = !busyRanges.some(busy => {
            const bufferedStart = new Date(busy.start.getTime() - bufferMinutes * 60 * 1000)
            const bufferedEnd = new Date(busy.end.getTime() + bufferMinutes * 60 * 1000)
            return currentTime < bufferedEnd && slotEnd > bufferedStart
        })

        // Also check if slot is in the past
        const now = new Date()
        const isInPast = currentTime < now

        slots.push({
            startTime: currentTime.toISOString(),
            endTime: slotEnd.toISOString(),
            available: isAvailable && !isInPast,
        })

        // Move to next 30-minute interval
        currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000)
    }

    return slots
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const workerId = url.searchParams.get('worker_id')
        const date = url.searchParams.get('date') // YYYY-MM-DD format
        const serviceDuration = parseInt(url.searchParams.get('duration') || '60')

        if (!date) {
            return new Response(
                JSON.stringify({ error: 'Date is required (YYYY-MM-DD format)' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get business hours from settings
        const { data: settingsData } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'business_hours')
            .single()

        const defaultBusinessHours: { [key: string]: BusinessHours } = {
            monday: { start: '09:00', end: '18:00' },
            tuesday: { start: '09:00', end: '18:00' },
            wednesday: { start: '09:00', end: '18:00' },
            thursday: { start: '09:00', end: '18:00' },
            friday: { start: '09:00', end: '18:00' },
            saturday: { start: '09:00', end: '14:00' },
            sunday: { start: '09:00', end: '14:00', closed: true },
        }

        const businessHours = settingsData?.value || defaultBusinessHours
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        const todayHours = businessHours[dayOfWeek] || defaultBusinessHours[dayOfWeek]

        if (todayHours.closed) {
            return new Response(
                JSON.stringify({
                    date,
                    slots: [],
                    message: 'Business is closed on this day',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get worker(s) calendar info
        let workers
        if (workerId) {
            const { data, error } = await supabase
                .from('workers')
                .select('id, name, google_calendar_id, google_access_token, google_refresh_token, calendar_connected')
                .eq('id', workerId)
                .eq('is_active', true)
                .single()

            if (error || !data) {
                return new Response(
                    JSON.stringify({ error: 'Worker not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
            workers = [data]
        } else {
            // Get all active workers
            const { data, error } = await supabase
                .from('workers')
                .select('id, name, google_calendar_id, google_access_token, google_refresh_token, calendar_connected')
                .eq('is_active', true)

            if (error) {
                return new Response(
                    JSON.stringify({ error: 'Failed to fetch workers' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
            workers = data || []
        }

        // Calculate time range for the query
        const timeMin = `${date}T00:00:00Z`
        const timeMax = `${date}T23:59:59Z`

        const results = await Promise.all(
            workers.map(async (worker) => {
                let slots: TimeSlot[] = []

                if (worker.calendar_connected && worker.google_access_token) {
                    try {
                        // Try to get calendar availability
                        let accessToken = worker.google_access_token

                        // Try to refresh token if needed
                        if (worker.google_refresh_token) {
                            const newToken = await refreshAccessToken(worker.google_refresh_token)
                            if (newToken) {
                                accessToken = newToken
                                // Update the access token in the database
                                await supabase
                                    .from('workers')
                                    .update({ google_access_token: newToken })
                                    .eq('id', worker.id)
                            }
                        }

                        const busyTimes = await getFreeBusy(
                            accessToken,
                            worker.google_calendar_id,
                            timeMin,
                            timeMax
                        )

                        slots = calculateAvailableSlots(
                            date,
                            busyTimes,
                            todayHours,
                            serviceDuration
                        )
                    } catch (error) {
                        console.error(`Error fetching availability for worker ${worker.id}:`, error)
                        // Fall back to showing all slots as available
                        slots = calculateAvailableSlots(date, [], todayHours, serviceDuration)
                    }
                } else {
                    // No calendar connected, all business hour slots are available
                    slots = calculateAvailableSlots(date, [], todayHours, serviceDuration)
                }

                return {
                    worker_id: worker.id,
                    worker_name: worker.name,
                    calendar_connected: worker.calendar_connected,
                    slots,
                }
            })
        )

        return new Response(
            JSON.stringify({
                date,
                business_hours: todayHours,
                workers: results,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in get-availability:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
