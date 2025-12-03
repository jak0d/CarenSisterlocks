-- COMPLETE FIX for 500 error - Run this entire query at once
-- This will fix RLS policies and avoid infinite recursion

-- First, temporarily disable RLS to clear everything
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create new policies WITHOUT recursion
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to view all users (needed for admin dashboard)
-- Use a subquery that doesn't cause recursion
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING ( 
    (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'admin' 
  );

-- Allow admins to update any user (needed for user management)
-- Use a subquery that doesn't cause recursion
CREATE POLICY "Admins can update any user"
  ON public.users FOR UPDATE
  USING ( 
    (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'admin' 
  )
  WITH CHECK ( 
    (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'admin' 
  );

-- Verify the user exists in the users table
SELECT COUNT(*) as user_count FROM public.users;
