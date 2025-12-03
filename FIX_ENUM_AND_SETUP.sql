-- =====================================================
-- FIX ENUM TYPE
-- Run this to add 'worker' to the user_role enum
-- =====================================================

-- 1. Add 'worker' to the user_role enum type
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'worker';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client';

-- 2. Now run the rest of the setup (Simplified version of previous script)

-- Create WORKERS table
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

-- Create WORKER_SERVICES table
CREATE TABLE IF NOT EXISTS public.worker_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  custom_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(worker_id, service_id)
);

-- Create ADMINS table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  invited_by UUID REFERENCES public.admins(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to BOOKINGS
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.workers(id);

-- Add columns to SERVICES
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected'));

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Anyone can view active workers" ON public.workers;
CREATE POLICY "Anyone can view active workers" ON public.workers FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage workers" ON public.workers;
CREATE POLICY "Admins can manage workers" ON public.workers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role)
);

DROP POLICY IF EXISTS "Workers can update their own profile" ON public.workers;
CREATE POLICY "Workers can update their own profile" ON public.workers FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view bookings" ON public.bookings;
CREATE POLICY "Users can view bookings" ON public.bookings FOR SELECT USING (
  (client_email = (SELECT email FROM public.users WHERE id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM public.workers WHERE workers.id = public.bookings.worker_id AND workers.user_id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'::user_role))
);

-- Success Message
DO $$
BEGIN
  RAISE NOTICE 'Enum fixed and database setup complete!';
END $$;
