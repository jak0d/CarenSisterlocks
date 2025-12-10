# Worker Management Fix - Implementation Guide

## Problem Summary
When an Admin user updates a worker's profile (editing details, assigning tasks, or updating status), the changes are saved to the database but the worker's active session doesn't reflect these changes until they manually refresh or re-login.

## Root Cause
The worker's authentication context only checks the `is_active` status during:
1. Initial login
2. Page refresh  
3. Auth state changes (sign in/out)

There was no real-time mechanism to detect when an admin changed a worker's status.

## Solution Implemented

### 1. Real-Time Status Monitoring (AuthContext.tsx)
Added a Supabase Realtime subscription that:
- Listens for UPDATE events on the `workers` table
- Filters for changes to the current user's worker profile
- Automatically updates the user's `is_active` status in the auth context
- Forces sign-out if the worker is deactivated

### 2. Database Migration (018_enable_workers_realtime.sql)
Created a migration to enable Supabase Realtime on the `workers` table, allowing clients to subscribe to real-time changes.

## Steps to Apply the Fix

### Step 1: Apply the Database Migration
You need to run the new migration in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/018_enable_workers_realtime.sql`
4. Copy the contents and paste into the SQL Editor
5. Click **Run** to execute the migration

**Migration SQL:**
```sql
-- Enable Realtime for Worker Status Changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.workers;

-- Verify the publication
DO $$
BEGIN
  RAISE NOTICE 'Realtime enabled for public.workers table';
END $$;
```

### Step 2: Verify Realtime is Enabled in Supabase Dashboard
1. In your Supabase Dashboard, go to **Database** → **Replication**
2. Ensure the `workers` table is listed under the `supabase_realtime` publication
3. If not visible, you may need to toggle it on manually in the UI

### Step 3: Test the Fix

#### Test Scenario 1: Deactivate a Worker
1. **As Admin:**
   - Log in to the admin dashboard
   - Navigate to Workers Management
   - Find an active worker
   - Click the "Deactivate" button

2. **As Worker (in another browser/incognito):**
   - Log in as the worker
   - Keep the dashboard open
   - **Expected Result:** Within a few seconds, the worker should be automatically signed out and see the "Account Deactivated" message

#### Test Scenario 2: Reactivate a Worker
1. **As Admin:**
   - Navigate to Workers Management
   - Find the deactivated worker
   - Click the "Activate" button

2. **As Worker:**
   - Try to log in
   - **Expected Result:** Worker can successfully log in and access the dashboard

#### Test Scenario 3: Edit Worker Details
1. **As Admin:**
   - Click the edit icon on a worker
   - Change the worker's name or permissions
   - Click "Update Worker"
   - **Expected Result:** Success message appears, changes are saved

2. **Verify:**
   - Refresh the Workers Management page
   - Confirm the changes are reflected

## How It Works

### Real-Time Flow:
```
Admin Updates Worker Status
        ↓
Database UPDATE on workers table
        ↓
Supabase Realtime broadcasts change
        ↓
Worker's browser receives update via subscription
        ↓
AuthContext updates user.is_active
        ↓
If deactivated → Auto sign-out → "Account Deactivated" screen
If activated → User can continue working
```

### Code Changes Made:

**File: `src/contexts/AuthContext.tsx`**
- Added a `useEffect` hook that subscribes to worker status changes
- Listens for UPDATE events on the `workers` table filtered by `user_id`
- Updates the auth context when status changes
- Automatically signs out deactivated workers

**File: `supabase/migrations/018_enable_workers_realtime.sql`**
- Enables Supabase Realtime for the `workers` table
- Allows real-time subscriptions to worker profile changes

## Troubleshooting

### Issue: Worker not automatically signed out when deactivated
**Solution:**
1. Check browser console for subscription logs:
   - Should see: "Setting up real-time subscription for worker status changes..."
   - Should see: "Worker status changed: {...}" when admin updates
2. Verify Realtime is enabled in Supabase Dashboard
3. Check that migration 018 was applied successfully

### Issue: "Failed to update worker" error when admin tries to edit
**Solution:**
1. Ensure migration `017_fix_workers_policy_definitive.sql` was applied
2. Check RLS policies on the `workers` table
3. Verify the admin is authenticated

### Issue: Changes not reflecting immediately
**Solution:**
1. Check network tab for Supabase Realtime connection (WebSocket)
2. Ensure the worker is logged in when the change is made
3. Try refreshing the page manually

## Additional Notes

- The "Check Status" button on the deactivated screen allows workers to manually refresh their status
- Real-time subscriptions only work when the worker is actively logged in
- If a worker is offline when deactivated, they'll see the deactivated message on next login
- The subscription automatically cleans up when the user signs out or the component unmounts

## Verification Checklist

- [ ] Migration 018 applied successfully in Supabase
- [ ] Realtime enabled for `workers` table in Supabase Dashboard
- [ ] Worker auto-signs out when deactivated by admin
- [ ] Worker can log in after being reactivated
- [ ] Edit worker details works correctly
- [ ] Assign services to worker works correctly
- [ ] No console errors related to Realtime subscriptions
