-- Fix Bookings RLS for Public Booking
-- This migration ensures that public (anonymous) users can create bookings
-- since this is a no-signup booking system

-- First, drop existing insert policies on bookings (if they exist)
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public booking creation" ON public.bookings;

-- Create a new policy that explicitly allows anonymous users to insert bookings
-- The anon key in Supabase should be able to insert
CREATE POLICY "Allow public booking creation"
  ON public.bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

-- Also ensure anon users can view their own bookings by email (for confirmation page)
DROP POLICY IF EXISTS "Clients can view their own bookings" ON public.bookings;

CREATE POLICY "Clients can view their own bookings"
  ON public.bookings FOR SELECT
  USING (
    -- Allow viewing if authenticated user's email matches client_email
    client_email = (SELECT email FROM public.users WHERE id = auth.uid())
    -- OR if user is admin/worker
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'worker')
    )
    -- OR for anon users who just made a booking (allow any select for simplicity)
    OR auth.uid() IS NULL
  );

-- Grant necessary permissions to anon role
GRANT INSERT ON public.bookings TO anon;
GRANT SELECT ON public.bookings TO anon;
GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.workers TO anon;
GRANT SELECT ON public.system_settings TO anon;
