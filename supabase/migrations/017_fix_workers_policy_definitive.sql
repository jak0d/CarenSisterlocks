-- DEFINITIVE FIX FOR WORKER MANAGEMENT
-- This migration ensures that Authenticated users (Admins) can definitely update workers and their assignments.
-- It cleans up all potential conflicting policies on workers and worker_services tables.

-- ==========================================
-- 1. WORKERS TABLE
-- ==========================================

-- Cleanup existing policies
DROP POLICY IF EXISTS "Workers can view their own profile" ON public.workers;
DROP POLICY IF EXISTS "Anyone can view active workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can manage workers" ON public.workers;
DROP POLICY IF EXISTS "Admins can manage workers" ON public.workers;
DROP POLICY IF EXISTS "Workers can update their own profile" ON public.workers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.workers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.workers;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.workers;
DROP POLICY IF EXISTS "Public can view active workers" ON public.workers; -- self-cleanup
DROP POLICY IF EXISTS "Authenticated users can manage all workers" ON public.workers; -- self-cleanup

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Policy A: Public (Unauthenticated) Access
-- Only allow viewing ACTIVE workers. This is for the booking page.
CREATE POLICY "Public can view active workers"
  ON public.workers FOR SELECT
  TO public
  USING (is_active = TRUE);

-- Policy B: Authenticated Access (Admins & Workers)
-- Allow strict full access (SELECT, INSERT, UPDATE, DELETE) to any authenticated user.
CREATE POLICY "Authenticated users can manage all workers"
  ON public.workers FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);


-- ==========================================
-- 2. WORKER_SERVICES TABLE
-- ==========================================

-- Cleanup existing policies
DROP POLICY IF EXISTS "Anyone can view worker services" ON public.worker_services;
DROP POLICY IF EXISTS "Admins can manage worker services" ON public.worker_services;
DROP POLICY IF EXISTS "Workers can manage their own services" ON public.worker_services;
DROP POLICY IF EXISTS "Authenticated users can manage worker services" ON public.worker_services;

-- Enable RLS
ALTER TABLE public.worker_services ENABLE ROW LEVEL SECURITY;

-- Policy A: Public Access (View)
CREATE POLICY "Public can view worker services"
  ON public.worker_services FOR SELECT
  TO public
  USING (TRUE);

-- Policy B: Authenticated Access (Manage)
CREATE POLICY "Authenticated users can manage worker services"
  ON public.worker_services FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- ==========================================
-- 3. VERIFICATION
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE 'Refreshed RLS policies on public.workers and public.worker_services';
END $$;
