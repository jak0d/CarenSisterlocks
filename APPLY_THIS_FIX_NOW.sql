-- ============================================================================
-- COMPLETE FIX FOR USER PROFILE CREATION ISSUE
-- ============================================================================
-- Copy this ENTIRE script and run it in your Supabase SQL Editor
-- This will fix the trigger AND create profiles for existing users
-- ============================================================================

-- PART 1: Fix the trigger
-- ============================================================================

-- Drop and recreate the trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'::user_role)
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PART 2: Fix RLS policies
-- ============================================================================

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;

-- Create basic policies for users table
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- PART 3: Create profiles for existing users
-- ============================================================================

-- This will create profiles for any users who signed up before the trigger was fixed
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
  COALESCE((au.raw_user_meta_data->>'role')::user_role, 'client'::user_role)
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- PART 4: Verification
-- ============================================================================

-- Verify the trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✓ Trigger on_auth_user_created successfully created';
  ELSE
    RAISE WARNING '✗ Trigger on_auth_user_created was not created!';
  END IF;
END $$;

-- Show results
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_public_users,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.users) 
    THEN '✓ All users have profiles - FIX SUCCESSFUL!'
    ELSE '✗ Some users are still missing profiles'
  END as status;

-- Show all users with their profiles
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at
FROM public.users u
ORDER BY u.created_at DESC;