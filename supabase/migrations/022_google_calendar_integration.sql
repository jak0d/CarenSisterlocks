-- Migration: Google Calendar Integration Setup
-- This migration adds necessary structures for Google Calendar integration

-- Ensure system_settings table exists (should already exist from initial schema)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add default business hours if not exists
INSERT INTO public.system_settings (key, value, updated_at)
VALUES (
    'business_hours',
    '{
        "monday": {"start": "09:00", "end": "18:00", "closed": false},
        "tuesday": {"start": "09:00", "end": "18:00", "closed": false},
        "wednesday": {"start": "09:00", "end": "18:00", "closed": false},
        "thursday": {"start": "09:00", "end": "18:00", "closed": false},
        "friday": {"start": "09:00", "end": "18:00", "closed": false},
        "saturday": {"start": "09:00", "end": "14:00", "closed": false},
        "sunday": {"start": "09:00", "end": "14:00", "closed": true}
    }'::jsonb,
    NOW()
)
ON CONFLICT (key) DO NOTHING;

-- Add default booking settings if not exists
INSERT INTO public.system_settings (key, value, updated_at)
VALUES (
    'booking_settings',
    '{
        "bufferMinutes": 15,
        "maxAdvanceDays": 60,
        "minAdvanceHours": 2
    }'::jsonb,
    NOW()
)
ON CONFLICT (key) DO NOTHING;

-- Ensure workers table has all required columns for calendar integration
DO $$
BEGIN
    -- Add google_calendar_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workers' AND column_name = 'google_calendar_id'
    ) THEN
        ALTER TABLE public.workers ADD COLUMN google_calendar_id TEXT;
    END IF;

    -- Add google_access_token column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workers' AND column_name = 'google_access_token'
    ) THEN
        ALTER TABLE public.workers ADD COLUMN google_access_token TEXT;
    END IF;

    -- Add google_refresh_token column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workers' AND column_name = 'google_refresh_token'
    ) THEN
        ALTER TABLE public.workers ADD COLUMN google_refresh_token TEXT;
    END IF;

    -- Add calendar_connected column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workers' AND column_name = 'calendar_connected'
    ) THEN
        ALTER TABLE public.workers ADD COLUMN calendar_connected BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Ensure bookings table has google_calendar_event_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'google_calendar_event_id'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN google_calendar_event_id TEXT;
    END IF;
END $$;

-- Create index on bookings for calendar event lookups
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_event 
ON public.bookings(google_calendar_event_id) 
WHERE google_calendar_event_id IS NOT NULL;

-- RLS policy for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read system settings
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;
CREATE POLICY "Anyone can view system settings" ON public.system_settings
    FOR SELECT USING (true);

-- Only admins can update system settings
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- Comment for documentation
COMMENT ON TABLE public.system_settings IS 'Stores system-wide configuration including business hours, calendar settings, and booking preferences';
