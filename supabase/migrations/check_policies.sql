-- Quick diagnostic query to check current RLS policies on users table
-- Run this in Supabase SQL Editor to see what policies exist

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
WHERE tablename = 'users' 
AND schemaname = 'public'
ORDER BY policyname;
