-- =====================================================
-- FIX MISSING COLUMNS
-- Run this script to add columns to existing tables
-- =====================================================

-- 1. Add missing columns to BOOKINGS table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.workers(id);

-- 2. Add missing columns to SERVICES table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected'));

-- 3. Now you can run the policy creation part safely
-- (This part re-applies the policies that failed)

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Re-create the failing policy
DROP POLICY IF EXISTS "Users can view bookings" ON public.bookings;

CREATE POLICY "Users can view bookings"
  ON public.bookings FOR SELECT
  USING (
    -- Clients can see their own bookings
    (client_email = (SELECT email FROM public.users WHERE id = auth.uid()))
    OR
    -- Workers can see their assigned bookings
    (EXISTS (
      SELECT 1 FROM public.workers
      WHERE workers.id = public.bookings.worker_id
      AND workers.user_id = auth.uid()
    ))
    OR
    -- Admins can see all bookings
    (EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    ))
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Columns added successfully!';
END $$;
