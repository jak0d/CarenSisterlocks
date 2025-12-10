-- Allow workers to view their own profile regardless of status
-- This ensures that even if they are inactive, they can still query their own record
-- to confirm their status, rather than getting a "not found" result which might be ambiguous.

DROP POLICY IF EXISTS "Workers can view their own profile" ON public.workers;

CREATE POLICY "Workers can view their own profile"
  ON public.workers FOR SELECT
  USING (user_id = auth.uid());
