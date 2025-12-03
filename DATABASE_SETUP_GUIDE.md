# 🚀 Database Setup Instructions

## Error: "Could not find the table 'public.workers' in the schema cache"

This error means your Supabase database doesn't have the required tables yet. Follow these steps to set up your database:

---

## Step 1: Open Supabase Dashboard

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your **CarenSisterlocks** project

---

## Step 2: Open SQL Editor

1. In the left sidebar, click on **SQL Editor** (icon looks like `</>`)
2. Click **"+ New query"** button

---

## Step 3: Run the Setup Script

1. Open the file: `SETUP_DATABASE.sql` (in your project root)
2. **Copy ALL the contents** of that file
3. **Paste** into the Supabase SQL Editor
4. Click **"Run"** button (or press `Ctrl+Enter`)

**Wait for it to complete** - you should see:
- ✅ Success message
- No error messages in red

---

## Step 4: Verify Tables Were Created

1. In the left sidebar, click on **Table Editor**
2. You should now see these tables:
   - ✅ `users`
   - ✅ `workers`
   - ✅ `services`
   - ✅ `worker_services`
   - ✅ `bookings`
   - ✅ `payments`
   - ✅ `admins`
   - ✅ `system_settings`

---

## Step 5: Refresh Your Application

1. Go back to your browser where the app is running
2. **Refresh the page** (F5 or Ctrl+R)
3. The error should be gone!

---

## What the Script Does

The `SETUP_DATABASE.sql` script:

✅ Creates all necessary tables  
✅ Sets up relationships between tables  
✅ Creates database functions and triggers  
✅ Enables Row Level Security (RLS)  
✅ Creates security policies  
✅ Adds sample services (optional)  

---

## Troubleshooting

### If you see errors when running the script:

**Error: "relation already exists"**
- ✅ This is OK! It means some tables already exist
- The script uses `IF NOT EXISTS` to avoid conflicts
- Continue anyway

**Error: "permission denied"**
- ❌ You need to be the project owner
- Check you're logged in with the correct account

**Error: "syntax error"**
- ❌ Make sure you copied the ENTIRE file
- Check there are no missing characters

### If tables still don't appear:

1. **Hard refresh** the Supabase dashboard (Ctrl+Shift+R)
2. **Check the correct project** is selected
3. **Try running the script again**

---

## After Setup

Once the database is set up, you can:

1. ✅ **Add workers** from the Workers Management page
2. ✅ **Create services** from the Services page
3. ✅ **Manage bookings** from the Bookings page
4. ✅ **Invite workers** via email

---

## Need Help?

If you're still having issues:

1. Check the **Supabase Logs** (in the dashboard)
2. Look for any error messages in the browser console (F12)
3. Verify your Supabase connection in `.env` file

---

**Last Updated**: December 3, 2025
