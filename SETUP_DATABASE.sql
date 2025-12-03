-- =====================================================
-- CARENSISTERLOCKS DATABASE - COMPLETE RESET & SETUP
-- Safe version that handles missing objects gracefully
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SAFE DROP: Order matters!
-- 1. Drop triggers first (they reference tables and functions)
-- 2. Drop functions (they reference tables)
-- 3. Drop tables (CASCADE removes policies automatically)
-- =====================================================

-- Step 1: Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
DROP TRIGGER IF EXISTS update_workers_updated_at ON public.workers;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;

-- Step 2: Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Step 3: Drop tables in correct order (foreign keys)
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.worker_services CASCADE;
DROP TABLE IF EXISTS public.workers CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('client', 'worker', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2),
  duration_minutes INTEGER NOT NULL,
  requires_deposit BOOLEAN DEFAULT FALSE,
  deposit_amount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workers table
CREATE TABLE public.workers (
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

-- Create worker_services junction table
CREATE TABLE public.worker_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  custom_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(worker_id, service_id)
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES public.workers(id),
  service_id UUID REFERENCES public.services(id),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  notes TEXT,
  booking_date DATE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  total_price DECIMAL(10,2),
  deposit_required BOOLEAN DEFAULT FALSE,
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_amount DECIMAL(10,2),
  balance_due DECIMAL(10,2),
  google_calendar_event_id TEXT,
  payment_transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for bookings
CREATE INDEX idx_bookings_worker_date ON public.bookings(worker_id, booking_date);
CREATE INDEX idx_bookings_client_email ON public.bookings(client_email);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES public.bookings(id),
  mpesa_transaction_id TEXT UNIQUE,
  phone_number TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  mpesa_receipt_number TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admins table
CREATE TABLE public.admins (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  invited_by UUID REFERENCES public.admins(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREATE FUNCTIONS
-- =====================================================

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Services table policies
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  USING (is_active = TRUE OR status = 'active');

CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Workers can suggest services"
  ON public.services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'worker'
    ) AND status = 'pending'
  );

-- Workers table policies
CREATE POLICY "Anyone can view active workers"
  ON public.workers FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage workers"
  ON public.workers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Workers can update their own profile"
  ON public.workers FOR UPDATE
  USING (user_id = auth.uid());

-- Worker services policies
CREATE POLICY "Anyone can view worker services"
  ON public.worker_services FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can manage worker services"
  ON public.worker_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Workers can manage their own services"
  ON public.worker_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workers
      WHERE workers.id = worker_services.worker_id
      AND workers.user_id = auth.uid()
    )
  );

-- Bookings table policies
CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (TRUE);

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

CREATE POLICY "Admins can manage all bookings"
  ON public.bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Workers can update their own bookings"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workers
      WHERE workers.id = public.bookings.worker_id
      AND workers.user_id = auth.uid()
    )
  );

-- Payments table policies
CREATE POLICY "Anyone can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = public.payments.booking_id
      AND (
        bookings.client_email = (SELECT email FROM public.users WHERE id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role IN ('admin', 'worker')
        )
      )
    )
  );

CREATE POLICY "Admins can manage payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Admins table policies
CREATE POLICY "Admins can view all admins"
  ON public.admins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can invite other admins"
  ON public.admins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- System settings policies
CREATE POLICY "Anyone can view system settings"
  ON public.system_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert sample services
INSERT INTO public.services (name, description, base_price, duration_minutes, requires_deposit, deposit_amount, is_active, status)
VALUES 
  ('Sisterlocks Installation', 'Complete sisterlocks installation service', 15000.00, 480, true, 5000.00, true, 'active'),
  ('Sisterlocks Retightening', 'Regular maintenance and retightening', 3500.00, 120, false, NULL, true, 'active'),
  ('Consultation', 'Initial consultation for sisterlocks', 1000.00, 60, false, NULL, true, 'active');

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show created tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

SELECT 'Database setup completed successfully! 🎉' as message,
       'Tables: users, services, workers, worker_services, bookings, payments, admins, system_settings' as created_tables,
       '3 sample services added' as seed_data;