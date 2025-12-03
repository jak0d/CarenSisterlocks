# Fix for 406 Error - Action Required

## ⚠️ Issue Detected

You're experiencing a **406 (Not Acceptable)** error when the app tries to fetch user profiles from Supabase.

**Error**:
```
Failed to load resource: the server responded with a status of 406 ()
yfkycqacybprcffnuuna.supabase.co/rest/v1/users?select=id%2Cemail%2Cfull_name%2Crole&id=eq.e696c5dc-1cef-4bee-b707-126333201974
```

---

## 🔧 What I've Done

### 1. Updated Supabase Client Configuration
**File**: `src/lib/supabase.ts`

Added proper headers and schema configuration to ensure correct response format:
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
    db: {
        schema: 'public',
    },
    global: {
        headers: {
            'Accept': 'application/json',
        },
    },
});
```

### 2. Created Migration to Fix RLS Policies
**File**: `supabase/migrations/011_fix_users_rls.sql`

This migration updates the Row Level Security policies for the `users` table to:
- Allow users to view their own profile properly
- Allow admins to view all users (needed for admin dashboard)
- Fix edge cases during signup

---

## 🚀 Action Required: Run the Migration

You need to apply the new migration to your Supabase database:

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Select your CarenSisterlocks project

2. **Navigate to SQL Editor**:
   - Click on **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy the Migration**:
   - Open `supabase/migrations/011_fix_users_rls.sql` from your project
   - Copy the entire contents

4. **Run the Migration**:
   - Paste the SQL into the query editor
   - Click **Run** (bottom right corner)
   - You should see "Success. No rows returned"

5. **Verify**:
   - Go to **Authentication** > **Policies**
   - Check that the `users` table has the new policies

### Option 2: Using Supabase CLI (If installed)

```bash
supabase db push
```

---

## 🔄 After Running the Migration

1. **Clear Browser Cache**:
   - Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
   - Or open DevTools (F12) > Application > Clear Storage > Clear site data

2. **Refresh the Page**:
   - The 406 error should be gone
   - User profiles should load correctly

3. **Test**:
   - Try logging in
   - Navigate to different pages
   - Check browser console for errors

---

## 📋 Migration Contents

Here's what the migration does:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Recreate policies with better handling
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to view all users
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Allow admins to update any user
CREATE POLICY "Admins can update any user"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
```

---

## 🐛 Why This Happened

The 406 error occurs when:
1. **RLS Policies Too Restrictive**: The original policy only allowed users to view their own profile, but there were edge cases during signup
2. **Missing Admin Permissions**: Admins couldn't view other users' profiles (needed for admin dashboard)
3. **Response Format Issues**: Supabase client wasn't configured with proper headers

---

## ✅ Expected Result

After running the migration:
- ✅ No more 406 errors in console
- ✅ Users can view their own profiles
- ✅ Admins can view all users
- ✅ Signup flow works smoothly
- ✅ Login redirects work correctly

---

## 🔍 Troubleshooting

### If the error persists after migration:

1. **Check Migration Status**:
   - In Supabase Dashboard > SQL Editor
   - Run: `SELECT * FROM public.users LIMIT 1;`
   - Should return data without error

2. **Verify RLS Policies**:
   - Go to **Authentication** > **Policies**
   - Check `users` table has 4 policies

3. **Check User Exists**:
   - Go to **Table Editor** > `users` table
   - Verify your user record exists with correct `id`

4. **Clear Everything**:
   ```bash
   # Stop dev server
   Ctrl + C
   
   # Clear browser cache completely
   # Then restart
   npm run dev
   ```

---

## 📞 Need Help?

If you're still experiencing issues after running the migration:
1. Check the browser console for the exact error
2. Verify the migration ran successfully in Supabase
3. Try logging out and logging back in

---

**Status**: ⏳ Waiting for migration to be applied  
**Priority**: 🔴 High - Blocking user authentication  
**Estimated Time**: 2 minutes
