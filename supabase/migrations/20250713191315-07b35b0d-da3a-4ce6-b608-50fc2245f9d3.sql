-- Permitir que qualquer pessoa atualize tokens válidos durante o registro
DROP POLICY IF EXISTS "Update tokens during registration" ON public.patient_registration_tokens;

CREATE POLICY "Update tokens during registration"
ON public.patient_registration_tokens
FOR UPDATE 
USING (NOT used AND expires_at > now())
WITH CHECK (used = true AND used_at IS NOT NULL);