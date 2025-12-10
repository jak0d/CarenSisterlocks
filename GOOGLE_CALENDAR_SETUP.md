# Google Calendar Integration Setup Guide

This guide explains how to set up Google Calendar integration for the CarenSisterlocks booking platform.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. The CarenSisterlocks project deployed to Supabase

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google Calendar API"
3. Click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Fill in the required fields:
   - App name: `CarenSisterlocks`
   - User support email: Your email
   - Developer contact email: Your email
4. Add the following scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Add test users if in testing mode

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Web application**
4. Configure the following:
   - Name: `CarenSisterlocks Web Client`
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - `https://your-production-domain.com`
   - Authorized redirect URIs:
     - `http://localhost:5173/oauth/google/callback`
     - `https://your-production-domain.com/oauth/google/callback`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## Step 5: Configure Environment Variables

### Frontend (.env)

Add your Google Client ID to the `.env` file:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Supabase Edge Functions

In your Supabase project, go to **Settings > Edge Functions** and add:

```
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Step 6: Deploy Supabase Edge Functions

Deploy the following Edge Functions:

1. **google-calendar-auth** - Handles OAuth token exchange
2. **get-availability** - Fetches calendar availability
3. **create-calendar-event** - Creates/deletes calendar events

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy google-calendar-auth
supabase functions deploy get-availability
supabase functions deploy create-calendar-event
```

## Step 7: Run Database Migration

Apply the calendar integration migration:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/022_google_calendar_integration.sql
```

## Step 8: Test the Integration

### For Admin:
1. Log in as admin
2. Go to **Settings**
3. Click **Connect Google Calendar**
4. Follow the OAuth flow
5. Verify the calendar is connected

### For Workers:
1. Log in as worker
2. On the dashboard, find the Calendar Integration section
3. Click **Connect Google Calendar**
4. Follow the OAuth flow
5. Verify the calendar is connected

## How It Works

### OAuth Flow
1. User clicks "Connect Google Calendar"
2. Redirected to Google OAuth consent screen
3. User grants calendar access
4. Google redirects back with authorization code
5. Edge Function exchanges code for tokens
6. Tokens are stored securely in the database

### Availability Checking
1. When viewing available slots, the system:
   - Fetches worker's calendar free/busy data
   - Combines with business hours
   - Removes already booked slots
   - Returns available time slots

### Event Creation
1. When a booking is confirmed:
   - Edge Function creates a Google Calendar event
   - Event includes client details and booking info
   - Worker receives calendar invite
   - Client receives email notification from Google

## Troubleshooting

### "Calendar not configured" Error
- Ensure `VITE_GOOGLE_CLIENT_ID` is set correctly
- Check that it's not the placeholder value

### OAuth Redirect Error
- Verify redirect URIs in Google Cloud Console match exactly
- Check for trailing slashes or protocol mismatches

### Token Refresh Issues
- Ensure `GOOGLE_CLIENT_SECRET` is set in Supabase
- Check Edge Function logs for errors

### Calendar Events Not Creating
- Verify worker has connected their calendar
- Check Edge Function logs
- Ensure `calendar_connected` is `true` in workers table

## Security Notes

1. **Never expose Client Secret** in frontend code
2. Access tokens are stored encrypted in the database
3. Refresh tokens are used for automatic token renewal
4. RLS policies protect calendar data access

## API Reference

### Get Availability
```
GET /functions/v1/get-availability?date=YYYY-MM-DD&worker_id=uuid&duration=60
```

### Create Calendar Event
```
POST /functions/v1/create-calendar-event
{
  "action": "create" | "delete",
  "booking": { ... }
}
```

### Google Calendar Auth
```
POST /functions/v1/google-calendar-auth
{
  "code": "authorization_code",
  "redirect_uri": "callback_url"
}
```
