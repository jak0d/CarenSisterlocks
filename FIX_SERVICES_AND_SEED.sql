-- =====================================================
-- FIX SERVICES TABLE & SEED DATA
-- Run this to fix the services table and add sample data
-- =====================================================

-- 1. Add missing columns to SERVICES table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS requires_deposit BOOLEAN DEFAULT FALSE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected'));
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Insert Seed Data (Now that columns exist)
INSERT INTO public.services (name, description, base_price, duration_minutes, requires_deposit, deposit_amount, is_active, status)
VALUES 
  ('Sisterlocks Installation', 'Complete sisterlocks installation service', 15000.00, 480, true, 5000.00, true, 'active'),
  ('Sisterlocks Retightening', 'Regular maintenance and retightening', 3500.00, 120, false, NULL, true, 'active'),
  ('Consultation', 'Initial consultation for sisterlocks', 1000.00, 60, false, NULL, true, 'active')
ON CONFLICT DO NOTHING;

-- Success Message
DO $$
BEGIN
  RAISE NOTICE 'Services table fixed and data seeded successfully!';
END $$;
