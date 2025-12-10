// Supabase Edge Function for Google Calendar OAuth
// This function handles the token exchange and calendar API calls

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''

interface TokenResponse {
    access_token: string
    refresh_token?: string
    expires_in: number
    token_type: string
    scope: string
}

interface UserInfo {
    email: string
    id: string
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { code, redirect_uri, user_id, user_role } = await req.json()

        if (!code) {
            return new Response(
                JSON.stringify({ error: 'Authorization code is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri,
                grant_type: 'authorization_code',
            }),
        })

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json()
            console.error('Token exchange error:', errorData)
            return new Response(
                JSON.stringify({ error: 'Failed to exchange authorization code', details: errorData }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const tokens: TokenResponse = await tokenResponse.json()

        // Get user email to use as calendar ID (primary calendar)
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        })

        if (!userInfoResponse.ok) {
            return new Response(
                JSON.stringify({ error: 'Failed to fetch user info' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const userInfo: UserInfo = await userInfoResponse.json()

        // Verify calendar access by listing calendars
        const calendarListResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        })

        if (!calendarListResponse.ok) {
            return new Response(
                JSON.stringify({ error: 'Failed to access Google Calendar' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
                calendar_id: userInfo.email, // Use email as primary calendar ID
                user_email: userInfo.email,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in google-calendar-auth:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
