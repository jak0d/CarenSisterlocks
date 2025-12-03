-- =====================================================
-- FINAL FIX FOR SERVICES TABLE
-- Run this to ensure ALL columns exist
-- =====================================================

-- 1. Add ALL potentially missing columns to SERVICES table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS requires_deposit BOOLEAN DEFAULT FALSE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected'));
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

-- 2. Handle potential column name mismatch (base_duration_minutes -> duration_minutes)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'base_duration_minutes') THEN
        -- If base_duration_minutes exists, we need to migrate data to duration_minutes
        -- Update duration_minutes with values from base_duration_minutes
        UPDATE public.services SET duration_minutes = base_duration_minutes WHERE base_duration_minutes IS NOT NULL;
        -- Drop the old column
        ALTER TABLE public.services DROP COLUMN base_duration_minutes;
    END IF;
END $$;

-- 3. Insert Seed Data
INSERT INTO public.services (name, description, base_price, duration_minutes, requires_deposit, deposit_amount, is_active, status)
VALUES 
  ('Sisterlocks Installation', 'Complete sisterlocks installation service', 15000.00, 480, true, 5000.00, true, 'active'),
  ('Sisterlocks Retightening', 'Regular maintenance and retightening', 3500.00, 120, false, NULL, true, 'active'),
  ('Consultation', 'Initial consultation for sisterlocks', 1000.00, 60, false, NULL, true, 'active')
ON CONFLICT DO NOTHING;

-- Success Message
DO $$
BEGIN
  RAISE NOTICE 'Services table fully repaired!';
END $$;
