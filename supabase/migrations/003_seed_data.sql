-- Insert sample services
INSERT INTO public.services (name, description, base_price, duration_minutes, requires_deposit, deposit_amount, is_active, status) VALUES
('Reties', 'Maintain your sisterlocks with professional retightening services', NULL, 120, FALSE, NULL, TRUE, 'active'),
('Micro Locks', 'Beautiful micro locks installation and maintenance', NULL, 180, FALSE, NULL, TRUE, 'active'),
('Sisterlocks Installation', 'Complete sisterlocks installation by certified professionals', 15000, 360, TRUE, 5000, TRUE, 'active'),
('Undoing Dreadlocks', 'Professional dreadlock removal with care for your natural hair', NULL, 240, TRUE, 5000, TRUE, 'active');

-- Insert default business hours into system_settings
INSERT INTO public.system_settings (key, value) VALUES
('business_hours', '{
  "monday": {"start": "08:00", "end": "21:00", "closed": false},
  "tuesday": {"start": "08:00", "end": "21:00", "closed": false},
  "wednesday": {"start": "08:00", "end": "21:00", "closed": false},
  "thursday": {"start": "08:00", "end": "21:00", "closed": false},
  "friday": {"start": "08:00", "end": "21:00", "closed": false},
  "saturday": {"start": "08:00", "end": "22:00", "closed": false},
  "sunday": {"start": "08:00", "end": "21:00", "closed": true}
}'::jsonb),
('booking_settings', '{
  "advance_booking_days": 30,
  "buffer_minutes": 10,
  "same_day_booking": true
}'::jsonb),
('business_info', '{
  "name": "CarenSisterlocks",
  "address": "123 Hair Street, Nairobi, Kenya",
  "phone": "+254 700 123 456",
  "email": "info@carensisterlocks.com"
}'::jsonb);

-- Note: Admin users should be created through the signup process
-- Workers should be added through the admin dashboard
