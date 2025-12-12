# Email Notifications Setup Guide

This guide explains how to set up email notifications for the CarenSisterlocks booking platform using the Resend API.

## Overview

The email notification system sends the following types of emails:

1. **Booking Confirmation (No Deposit)** - Sent to clients when they make a booking that doesn't require a deposit
2. **Booking Confirmation (With Deposit)** - Sent to clients when they make a booking that requires a deposit payment
3. **24-Hour Reminder** - Sent to clients 24 hours before their appointment
4. **New Booking Alert** - Sent to workers and admins when a new booking is made

## Prerequisites

1. A Resend account ([Sign up here](https://resend.com))
2. A verified domain in Resend
3. Supabase CLI installed and configured
4. Access to your Supabase project dashboard

## Step 1: Set Up Resend Account

### 1.1 Create an API Key

1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "CarenSisterlocks Production")
4. Copy the API key - you'll need it later

### 1.2 Verify Your Domain

1. Go to [Resend Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `carensisterlocks.com`)
4. Add the required DNS records:
   - MX record for email receiving (optional)
   - TXT record for SPF
   - CNAME records for DKIM
5. Wait for verification (usually 5-10 minutes)

**Important:** Until your domain is verified, you can only send to your own email address. For production, ensure your domain is fully verified.

## Step 2: Configure Supabase Secrets

You need to set the following secrets in your Supabase Edge Functions:

### Using Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions** → **Secrets**
4. Add the following secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `RESEND_API_KEY` | Your Resend API key | `re_xxxxxxxx_xxxxxxxxxx` |
| `BUSINESS_EMAIL` | Email address to send from | `bookings@carensisterlocks.com` |
| `BUSINESS_PHONE` | Business phone number | `+254 XXX XXX XXX` |
| `BUSINESS_ADDRESS` | Business location | `Nairobi, Kenya` |
| `ADMIN_EMAIL` | Email for admin notifications | `admin@carensisterlocks.com` |

### Using Supabase CLI

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxx_xxxxxxxxxx
supabase secrets set BUSINESS_EMAIL=bookings@carensisterlocks.com
supabase secrets set BUSINESS_PHONE="+254 XXX XXX XXX"
supabase secrets set BUSINESS_ADDRESS="Nairobi, Kenya"
supabase secrets set ADMIN_EMAIL=admin@carensisterlocks.com
```

## Step 3: Deploy Edge Functions

### 3.1 Deploy the send-email function

```bash
supabase functions deploy send-email --no-verify-jwt
```

### 3.2 Deploy the send-reminders function

```bash
supabase functions deploy send-reminders --no-verify-jwt
```

### 3.3 Verify Deployment

Test the functions are deployed:

```bash
supabase functions list
```

You should see:
- `send-email`
- `send-reminders`

## Step 4: Run Database Migration

Run the email logs migration to create the tracking table:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/024_email_logs.sql`
4. Click **Run**

Or using the Supabase CLI:

```bash
supabase db push
```

## Step 5: Set Up 24-Hour Reminders (Cron Job)

To automatically send 24-hour reminders, you need to set up a scheduled job.

### Option A: Using Supabase Cron (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Scheduled Jobs** (or use pg_cron extension)
3. Create a new scheduled job:

```sql
-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the reminder job to run daily at 9 AM EAT (6 AM UTC)
SELECT cron.schedule(
    'send-booking-reminders',
    '0 6 * * *',  -- 6 AM UTC (9 AM EAT)
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
        headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key

### Option B: Using External Cron Service

You can use services like:
- [cron-job.org](https://cron-job.org) (free)
- [EasyCron](https://www.easycron.com)
- GitHub Actions scheduled workflows

Example with curl:
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Step 6: Testing

### Test Email Sending

You can test the email function directly:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "booking_confirmation",
    "booking_id": "YOUR_BOOKING_ID"
  }'
```

### Test in the App

1. Make a test booking through the booking page
2. Check your email inbox (and spam folder)
3. Verify the email content and formatting

### Monitor Email Logs

Check the email_logs table in Supabase:

```sql
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 10;
```

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key**: Ensure it's correctly set in Supabase secrets
2. **Check Domain Verification**: Unverified domains can only send to your own email
3. **Check Edge Function Logs**: View logs in Supabase Dashboard → Edge Functions → Logs
4. **Check Email Logs Table**: Look for error messages in `email_logs.error_message`

### Emails Going to Spam

1. Ensure domain is properly verified with SPF and DKIM
2. Add DMARC record to your domain
3. Avoid spam trigger words in subject lines

### Resend API Errors

Common error codes:
- `401`: Invalid API key
- `403`: Domain not verified or restricted
- `422`: Invalid email parameters
- `429`: Rate limit exceeded

## Email Templates

The email templates are defined in `supabase/functions/send-email/index.ts`. To customize:

1. Find the `generateEmailHTML` function
2. Modify the HTML/CSS for each email type
3. Redeploy the function

### Template Variables Available

| Variable | Description |
|----------|-------------|
| `booking.client_name` | Client's full name |
| `booking.client_email` | Client's email |
| `booking.client_phone` | Client's phone |
| `booking.booking_date` | Appointment date |
| `booking.start_time` | Appointment start time |
| `booking.service.name` | Service name |
| `booking.service.duration_minutes` | Service duration |
| `booking.worker.name` | Assigned worker's name |
| `booking.total_price` | Total booking price |
| `booking.deposit_amount` | Required deposit |
| `booking.balance_due` | Remaining balance |

## Security Notes

- The `send-email` function uses `--no-verify-jwt` for simplicity, but you may want to add authentication for production
- The service role key is used to access booking details - never expose this to the client
- Email logs are protected by RLS - only admins and assigned workers can view them

## Environment Variables Reference

### Frontend (.env)

```env
# No email-related env vars needed - handled by Edge Functions
```

### Supabase Secrets

```
RESEND_API_KEY=re_xxxxxxxx_xxxxxxxxxx
BUSINESS_EMAIL=bookings@carensisterlocks.com
BUSINESS_PHONE=+254 XXX XXX XXX
BUSINESS_ADDRESS=Nairobi, Kenya
ADMIN_EMAIL=admin@carensisterlocks.com
```

## Next Steps

- [ ] Customize email templates with your branding
- [ ] Set up email analytics tracking (Resend provides this)
- [ ] Configure email webhooks for bounce/complaint handling
- [ ] Consider adding SMS notifications as a backup
