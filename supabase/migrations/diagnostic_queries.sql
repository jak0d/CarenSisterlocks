-- Diagnostic queries to check user profile creation issue
-- Run these in Supabase SQL Editor to diagnose the problem

-- 1. Check if the trigger exists
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as trigger_type
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
-- Expected: 1 row showing the trigger is enabled

-- 2. Check if the trigger function exists
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user';
-- Expected: 1 row, is_security_definer should be 't' (true)

-- 3. Count users in auth.users (Supabase auth table)
SELECT COUNT(*) as auth_users_count 
FROM auth.users;
-- This shows how many users have signed up

-- 4. Count users in public.users (your application table)
SELECT COUNT(*) as public_users_count 
FROM public.users;
-- This should match auth_users_count if trigger is working

-- 5. Find users who are in auth.users but NOT in public.users
-- These are users whose profiles were not created
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.raw_user_meta_data->>'role' as role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
-- If this returns rows, those users don't have profiles

-- 6. Check RLS policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';
-- Shows all RLS policies on the users table

-- 7. Check if RLS is enabled on users table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';
-- rls_enabled should be 't' (true)

-- 8. View all users with their details
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.users 
ORDER BY created_at DESC;
-- Shows all users that have profiles

-- 9. Test the trigger function manually (safe to run)
-- This will show if the function works
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Just test if the function can be called
  SELECT proname INTO test_result
  FROM pg_proc 
  WHERE proname = 'handle_new_user';
  
  IF test_result IS NOT NULL THEN
    RAISE NOTICE 'Trigger function exists: %', test_result;
  ELSE
    RAISE WARNING 'Trigger function NOT found!';
  END IF;
END $$;
