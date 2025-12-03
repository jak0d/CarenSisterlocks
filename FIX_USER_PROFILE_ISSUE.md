# Fix for User Profile Creation Issue

## Problem
Users are unable to log in because their profiles are not being created in the `users` table when they sign up. The console shows repeated errors:
```
User profile not found after maximum retries. This might indicate a database trigger issue.
```

## Root Cause
The database trigger `on_auth_user_created` that should automatically create user profiles when new users sign up is either:
1. Not properly installed in your Supabase database
2. Failing silently due to RLS policy restrictions
3. Not being executed at all

## Solution

### Step 1: Apply the Migration in Supabase

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: CarenSisterlocks

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste the entire contents of the migration file**
   - Open: `supabase/migrations/013_fix_user_profile_creation.sql`
   - Copy all the SQL code
   - Paste it into the SQL Editor

4. **Run the migration**
   - Click "Run" or press Ctrl+Enter
   - You should see a success message and a notice: "Trigger on_auth_user_created successfully created"

### Step 2: Verify the Fix

After running the migration, verify it worked:

1. **Check if the trigger exists**
   Run this query in the SQL Editor:
   ```sql
   SELECT 
     tgname as trigger_name,
     tgenabled as enabled
   FROM pg_trigger 
   WHERE tgname = 'on_auth_user_created';
   ```
   You should see one row with `trigger_name: on_auth_user_created` and `enabled: O` (meaning it's enabled)

2. **Check existing users**
   Run this query to see if you have any users:
   ```sql
   SELECT id, email, full_name, role, created_at 
   FROM public.users 
   ORDER BY created_at DESC;
   ```

### Step 3: Test User Registration

1. **Clear your browser's application data** (to start fresh)
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Clear site data"

2. **Try signing up again**
   - Go to your app at http://localhost:5173
   - Sign up with a new email address
   - The profile should now be created automatically

3. **Check the console**
   - You should no longer see the "User profile not found" errors
   - You should see: "User profile loaded successfully"

### Step 4: Fix Existing Users (if needed)

If you have users in `auth.users` but not in `public.users`, run this to create their profiles:

```sql
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  COALESCE(au.raw_user_meta_data->>'role', 'client')
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

## What the Migration Does

1. **Drops and recreates the trigger function** with proper error handling
2. **Adds `SECURITY DEFINER`** to ensure the function runs with elevated privileges (bypassing RLS)
3. **Adds exception handling** so auth signup doesn't fail even if profile creation fails
4. **Recreates the trigger** on `auth.users` table
5. **Simplifies RLS policies** to avoid recursion issues
6. **Verifies the trigger** was created successfully

## Expected Result

After applying this fix:
- ✅ New users will automatically get a profile in `public.users`
- ✅ Login will work immediately after signup
- ✅ No more "User profile not found" errors
- ✅ Users will be redirected to their appropriate dashboards based on role

## Troubleshooting

If you still see errors after applying the migration:

1. **Check Supabase logs**
   - Go to Supabase Dashboard → Logs → Postgres Logs
   - Look for any errors related to the trigger

2. **Verify the trigger function exists**
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname = 'handle_new_user';
   ```

3. **Check if RLS is blocking**
   - The trigger uses `SECURITY DEFINER` which should bypass RLS
   - But you can temporarily disable RLS to test:
   ```sql
   ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
   -- Test signup
   -- Then re-enable:
   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
   ```

## Need More Help?

If the issue persists, please provide:
1. The output from the SQL queries above
2. Any error messages from Supabase logs
3. The browser console output when attempting to sign up
