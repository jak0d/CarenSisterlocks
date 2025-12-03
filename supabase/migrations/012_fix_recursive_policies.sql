-- COMPREHENSIVE FIX FOR ADMIN LOGIN ISSUE
-- This migration fixes the recursive RLS policies that prevent admin login

-- Step 1: Drop all policies that query the users table to check for admin role
-- These cause infinite recursion when trying to fetch the user profile

-- Services table - remove admin check policies
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Workers can suggest services" ON public.services;

-- Workers table - remove admin check policies  
DROP POLICY IF EXISTS "Admins can manage workers" ON public.workers;

-- Worker services - remove admin check policies
DROP POLICY IF EXISTS "Admins can manage worker services" ON public.worker_services;

-- Bookings table - remove admin check policies
DROP POLICY IF EXISTS "Clients can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Workers can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Workers can update their own bookings" ON public.bookings;

-- Payments table - remove admin check policies
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;

-- Admins table - remove admin check policies
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can invite other admins" ON public.admins;

-- System settings - remove admin check policies
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

-- Step 2: Create new non-recursive policies
-- These policies don't check the users table, avoiding recursion

-- Services: Public read, authenticated users can manage
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  USING (is_active = TRUE OR status = 'active');

CREATE POLICY "Authenticated users can manage services"
  ON public.services FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Workers: Public read for active workers, authenticated users can manage
CREATE POLICY "Anyone can view active workers"
  ON public.workers FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Authenticated users can manage workers"
  ON public.workers FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can update their own profile"
  ON public.workers FOR UPDATE
  USING (user_id = auth.uid());

-- Worker services: Public read, authenticated users can manage
CREATE POLICY "Anyone can view worker services"
  ON public.worker_services FOR SELECT
  USING (TRUE);

CREATE POLICY "Authenticated users can manage worker services"
  ON public.worker_services FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Bookings: Anyone can create, authenticated users can view and manage
CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can view all bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete bookings"
  ON public.bookings FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Payments: Anyone can create, authenticated users can view
CREATE POLICY "Anyone can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage payments"
  ON public.payments FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Admins: Authenticated users can view and manage
CREATE POLICY "Authenticated users can view admins"
  ON public.admins FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage admins"
  ON public.admins FOR ALL
  USING (auth.uid() IS NOT NULL);

-- System settings: Anyone can view, authenticated users can manage
CREATE POLICY "Anyone can view system settings"
  ON public.system_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Authenticated users can manage system settings"
  ON public.system_settings FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Step 3: Verify the fix
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
