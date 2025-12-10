-- Create a secure function to check worker status
-- This bypasses RLS policies to ensure we can always get the correct status
-- even if the worker is currently deactivated (and thus hidden by RLS)

CREATE OR REPLACE FUNCTION public.get_my_worker_status()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_active_status BOOLEAN;
BEGIN
  -- Check if a worker profile exists for the current user
  SELECT is_active INTO is_active_status
  FROM public.workers
  WHERE user_id = auth.uid();
  
  -- Return the status (TRUE, FALSE, or NULL if not found)
  RETURN is_active_status;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_worker_status TO authenticated;
