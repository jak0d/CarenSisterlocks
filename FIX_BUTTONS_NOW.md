# URGENT: Fix Activate/Deactivate Buttons

## The Problem
The Activate/Deactivate buttons are not working because the database RLS (Row Level Security) policies on the `workers` table are blocking UPDATE operations.

## The Solution
You need to run a SQL script in your Supabase dashboard to fix the permissions.

---

## STEP-BY-STEP INSTRUCTIONS

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Paste This SQL

```sql
-- Drop all existing policies on workers table
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'workers' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workers', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Public can view active workers (for booking page)
CREATE POLICY "public_view_active_workers"
  ON public.workers 
  FOR SELECT
  TO public
  USING (is_active = TRUE);

-- Authenticated users have full access
CREATE POLICY "authenticated_full_access"
  ON public.workers 
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
```

### Step 3: Run the Query
1. Click the **RUN** button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. Wait for the success message
3. You should see: "Success. No rows returned"

### Step 4: Test the Fix
1. Go back to your application: http://localhost:5173/admin/workers
2. Log in as admin
3. Click the **Deactivate** button on a worker
4. You should see: ✅ "Worker deactivated" success message
5. The worker's status should change from "Active" to "Inactive"
6. Click **Activate** to reactivate the worker
7. You should see: ✅ "Worker activated" success message

---

## Why This Fixes It

The previous RLS policies were too restrictive and were blocking authenticated users (including admins) from updating worker records. This new policy:

1. **Drops all conflicting policies** - Removes any old, restrictive policies
2. **Allows public to view active workers** - Needed for the booking page
3. **Gives authenticated users full access** - Admins can now update workers

---

## Verification

After running the SQL, you can verify the policies were created correctly:

```sql
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'workers' 
ORDER BY policyname;
```

You should see:
- `authenticated_full_access` - FOR ALL - {authenticated}
- `public_view_active_workers` - FOR SELECT - {public}

---

## Still Not Working?

If the buttons still don't work after running the SQL:

1. **Check the browser console** (F12) for errors
2. **Hard refresh** the page (Ctrl+Shift+R / Cmd+Shift+R)
3. **Clear browser cache** and reload
4. **Check you're logged in as admin** (not worker or client)

If you see an error like "Failed to update worker" in the console, share the full error message.

---

## Next Steps

After this fix works, you should also:

1. ✅ Apply migration `018_enable_workers_realtime.sql` for real-time updates
2. ✅ Test the Edit worker functionality
3. ✅ Test the Assign Services functionality
