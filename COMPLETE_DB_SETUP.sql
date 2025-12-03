-- =====================================================
-- COMPLETE DATABASE REPAIR
-- Run this script to fix everything in the correct order
-- =====================================================

-- 1. Create WORKERS table first (Required for bookings)
CREATE TABLE IF NOT EXISTS public.workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  google_calendar_id TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  calendar_connected BOOLEAN DEFAULT FALSE,
  dashboard_permission TEXT DEFAULT 'none' CHECK (dashboard_permission IN ('none', 'view', 'worker')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create WORKER_SERVICES table
CREATE TABLE IF NOT EXISTS public.worker_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  custom_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(worker_id, service_id)
);

-- 3. Create ADMINS table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  invited_by UUID REFERENCES public.admins(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Now safely add columns to BOOKINGS (Workers table now exists!)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.workers(id);

-- 5. Add columns to SERVICES
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected'));

-- 6. Enable RLS on new tables
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 7. Create Policies (Drop first to avoid errors)

-- Workers policies
DROP POLICY IF EXISTS "Anyone can view active workers" ON public.workers;
CREATE POLICY "Anyone can view active workers" ON public.workers FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage workers" ON public.workers;
CREATE POLICY "Admins can manage workers" ON public.workers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

DROP POLICY IF EXISTS "Workers can update their own profile" ON public.workers;
CREATE POLICY "Workers can update their own profile" ON public.workers FOR UPDATE USING (user_id = auth.uid());

-- Worker Services policies
DROP POLICY IF EXISTS "Anyone can view worker services" ON public.worker_services;
CREATE POLICY "Anyone can view worker services" ON public.worker_services FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage worker services" ON public.worker_services;
CREATE POLICY "Admins can manage worker services" ON public.worker_services FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Bookings policies
DROP POLICY IF EXISTS "Users can view bookings" ON public.bookings;
CREATE POLICY "Users can view bookings" ON public.bookings FOR SELECT USING (
  (client_email = (SELECT email FROM public.users WHERE id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM public.workers WHERE workers.id = public.bookings.worker_id AND workers.user_id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
);

DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
CREATE POLICY "Anyone can create bookings" ON public.bookings FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Success Message
DO $$
BEGIN
  RAISE NOTICE 'Database repaired successfully!';
END $$;
