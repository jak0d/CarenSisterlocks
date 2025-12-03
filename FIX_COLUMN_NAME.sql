-- =====================================================
-- FIX COLUMN NAMES
-- Run this to standardize column names
-- =====================================================

-- 1. Handle duration_minutes column conflict
DO $$ 
BEGIN
    -- Check if both columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'base_duration_minutes') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'duration_minutes') THEN
        
        -- If both exist, drop the one we added (duration_minutes) and rename base_duration_minutes
        ALTER TABLE public.services DROP COLUMN duration_minutes;
        ALTER TABLE public.services RENAME COLUMN base_duration_minutes TO duration_minutes;
        
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'base_duration_minutes') THEN
        -- If only base_duration_minutes exists, just rename it
        ALTER TABLE public.services RENAME COLUMN base_duration_minutes TO duration_minutes;
    END IF;
END $$;

-- 2. Insert Seed Data (Now that column name matches)
INSERT INTO public.services (name, description, base_price, duration_minutes, requires_deposit, deposit_amount, is_active, status)
VALUES 
  ('Sisterlocks Installation', 'Complete sisterlocks installation service', 15000.00, 480, true, 5000.00, true, 'active'),
  ('Sisterlocks Retightening', 'Regular maintenance and retightening', 3500.00, 120, false, NULL, true, 'active'),
  ('Consultation', 'Initial consultation for sisterlocks', 1000.00, 60, false, NULL, true, 'active')
ON CONFLICT DO NOTHING;

-- Success Message
DO $$
BEGIN
  RAISE NOTICE 'Column renamed and data seeded successfully!';
END $$;
