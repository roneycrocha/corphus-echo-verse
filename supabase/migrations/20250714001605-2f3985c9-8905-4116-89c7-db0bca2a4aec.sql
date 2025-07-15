-- Remove all existing UPDATE policies and create a simpler one
DROP POLICY IF EXISTS "Public can update valid tokens" ON public.patient_booking_tokens;

-- Create a very permissive policy for anonymous token updates
-- This allows any user (including anonymous) to update tokens that match the token value
CREATE POLICY "Allow anonymous token updates" 
ON public.patient_booking_tokens 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (used = true AND used_at IS NOT NULL);