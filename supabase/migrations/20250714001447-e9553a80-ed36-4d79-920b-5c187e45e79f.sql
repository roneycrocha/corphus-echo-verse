-- Fix RLS policy for public token updates
-- The issue is that we need to allow the update without checking auth.uid()

-- Drop the current update policy
DROP POLICY IF EXISTS "Public can update valid tokens" ON public.patient_booking_tokens;

-- Create a new policy that properly allows public updates
CREATE POLICY "Public can update valid tokens" 
ON public.patient_booking_tokens 
FOR UPDATE 
TO public
USING (NOT used AND expires_at > now())
WITH CHECK (used = true AND used_at IS NOT NULL);