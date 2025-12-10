-- Enable Realtime for Worker Status Changes
-- This migration enables Supabase Realtime on the workers table
-- so that clients can subscribe to changes in worker status

-- Enable realtime for the workers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.workers;

-- Verify the publication
DO $$
BEGIN
  RAISE NOTICE 'Realtime enabled for public.workers table';
END $$;
