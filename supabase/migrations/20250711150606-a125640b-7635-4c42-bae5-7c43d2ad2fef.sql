-- Política melhorada para permitir marcar tokens como usados durante o booking
DROP POLICY IF EXISTS "Update tokens during booking" ON patient_booking_tokens;

CREATE POLICY "Update tokens during booking" 
ON patient_booking_tokens 
FOR UPDATE 
USING (NOT used AND expires_at > now())
WITH CHECK (used = true AND used_at IS NOT NULL);