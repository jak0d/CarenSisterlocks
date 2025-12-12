# Google Calendar Integration Troubleshooting Guide

## Problem: Connection Appears Successful But No Data Shows

If you've connected Google Calendar and received a success message, but the Settings page still shows "Connect Google Calendar" button instead of "Connected", follow these steps:

---

## Step 1: Check Browser Console for Errors

1. Open your browser's Developer Tools (F12 or Right-click → Inspect)
2. Go to the **Console** tab
3. Look for error messages starting with ❌ or containing "error"
4. Common errors:
   - `404 Not Found` - Edge Function not deployed
   - `CORS error` - Edge Function configuration issue
   - `Failed to fetch` - Network issue or Edge Function not accessible

---

## Step 2: Verify Supabase Edge Functions are Deployed

**This is the most common cause!** The Google Calendar integration requires three Edge Functions to be deployed to Supabase:

1. `google-calendar-auth` - Exchanges OAuth code for tokens
2. `get-availability` - Fetches calendar availability
3. `create-calendar-event` - Creates/deletes calendar events

### How to Deploy Edge Functions:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI (if not installed)
# On Windows (PowerShell as Admin):
npm install -g supabase

# Or using npx (no installation needed):
npx supabase login

# Link to your project (get project ref from Supabase dashboard URL)
npx supabase link --project-ref yfkycqacybprcffnuuna

# Deploy all Edge Functions
npx supabase functions deploy google-calendar-auth
npx supabase functions deploy get-availability  
npx supabase functions deploy create-calendar-event
```

#### Option B: Using Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `yfkycqacybprcffnuuna`
3. Go to **Edge Functions** section
4. Create new function for each of the three functions
5. Copy the code from `supabase/functions/[function-name]/index.ts`

### Set Edge Function Secrets:

After deploying, you MUST set the Google OAuth secrets in Supabase:

```bash
npx supabase secrets set GOOGLE_CLIENT_ID=25913775200-b8n6tdac1noenspcvutib1sd911u6m6v.apps.googleusercontent.com
npx supabase secrets set GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

Or via the Supabase Dashboard:
1. Go to **Settings > Edge Functions**
2. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

---

## Step 3: Verify Database Table Has Required Columns

The `system_settings` table must exist in your database. Run this SQL in Supabase SQL Editor:

```sql
-- Check if system_settings table exists
SELECT * FROM system_settings WHERE key = 'google_calendar_admin';

-- If no results, the connection wasn't saved. Create the table if needed:
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions
GRANT ALL ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO anon;
```

---

## Step 4: Test the Connection Again

1. Open the Settings page: http://localhost:5173/admin/settings
2. Open Developer Tools (F12) → Console tab
3. Click "Connect Google Calendar"
4. After Google OAuth, watch the console for:
   - `🔄 Starting Google Calendar OAuth token exchange...`
   - `📡 Edge Function response status: 200`
   - `✅ Token exchange successful. Calendar ID: your@email.com`
   - `💾 Updating admin calendar connection...`
   - `✅ Admin calendar connection saved`

If you see a 404 error, the Edge Functions are NOT deployed.

---

## Step 5: Verify Connection in Database

After a successful connection, check if data was saved:

```sql
SELECT * FROM system_settings WHERE key = 'google_calendar_admin';
```

You should see a row with a JSON value containing:
- `connected: true`
- `calendar_id: your@email.com`
- `access_token: ...`
- `refresh_token: ...`

---

## Common Error Messages and Solutions

### Error: "Google Calendar Edge Function is not deployed"
**Solution:** Deploy the Edge Functions using the steps in Step 2.

### Error: "Failed to exchange authorization code"
**Solution:** 
- Check that `GOOGLE_CLIENT_SECRET` is set in Supabase Edge Function secrets
- Verify the redirect URI in Google Cloud Console matches exactly

### Error: "Failed to access Google Calendar"
**Solution:**
- Ensure you granted calendar permissions during OAuth
- Check that Google Calendar API is enabled in Google Cloud Console

### Settings page still shows "Connect" after successful OAuth
**Solution:**
- The Edge Function might not be deployed (most common)
- Check console for errors
- Manually verify data in `system_settings` table

---

## Quick Verification Checklist

- [ ] Google Client ID is set in `.env` file
- [ ] Google Calendar API is enabled in Google Cloud Console
- [ ] OAuth Consent Screen is configured
- [ ] Redirect URIs are correctly set in Google Cloud Console
- [ ] Supabase Edge Functions are deployed
- [ ] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in Supabase secrets
- [ ] `system_settings` table exists in database
- [ ] No CORS or network errors in browser console

---

## Need More Help?

If you've followed all steps and still have issues:

1. Check Supabase Edge Function logs in the dashboard
2. Look for specific error messages in browser console
3. Verify all environment variables are correct
4. Test the Edge Function directly using curl or Postman
