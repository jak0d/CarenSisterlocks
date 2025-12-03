-- Script to manually create user profiles for existing auth users
-- Run this AFTER applying the 013_fix_user_profile_creation.sql migration
-- This will create profiles for any users who signed up before the trigger was fixed

-- Create profiles for users who don't have them
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

-- Show the results
SELECT 
  'Created profiles for ' || COUNT(*) || ' users' as result
FROM auth.users au
WHERE EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- Verify all users now have profiles
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_public_users,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.users) 
    THEN '✓ All users have profiles'
    ELSE '✗ Some users are missing profiles'
  END as status;
