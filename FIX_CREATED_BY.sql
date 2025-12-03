-- =====================================================
-- FIX CREATED_BY CONSTRAINT
-- Run this to allow services to be created without a creator ID
-- =====================================================

-- 1. Make created_by optional (Drop NOT NULL constraint)
ALTER TABLE public.services ALTER COLUMN created_by DROP NOT NULL;

-- 2. Insert Seed Data (Now it should work!)
INSERT INTO public.services (name, description, base_price, duration_minutes, requires_deposit, deposit_amount, is_active, status)
VALUES 
  ('Sisterlocks Installation', 'Complete sisterlocks installation service', 15000.00, 480, true, 5000.00, true, 'active'),
  ('Sisterlocks Retightening', 'Regular maintenance and retightening', 3500.00, 120, false, NULL, true, 'active'),
  ('Consultation', 'Initial consultation for sisterlocks', 1000.00, 60, false, NULL, true, 'active')
ON CONFLICT DO NOTHING;

-- Success Message
DO $$
BEGIN
  RAISE NOTICE 'Constraint fixed and data seeded successfully!';
END $$;
