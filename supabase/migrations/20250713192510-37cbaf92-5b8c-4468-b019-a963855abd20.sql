-- Remover política problemática e criar uma nova mais específica
DROP POLICY IF EXISTS "Update tokens during registration" ON public.patient_registration_tokens;

-- Permitir que qualquer um atualize tokens válidos para marcá-los como usados
CREATE POLICY "Allow token completion during registration"
ON public.patient_registration_tokens
FOR UPDATE 
USING (
  NOT used 
  AND expires_at > now()
  AND used_at IS NULL
)
WITH CHECK (
  used = true 
  AND used_at IS NOT NULL
);