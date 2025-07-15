-- Permitir que tokens válidos sejam marcados como usados publicamente
DROP POLICY IF EXISTS "Public can mark tokens as used" ON public.patient_registration_tokens;

CREATE POLICY "Public can mark tokens as used"
ON public.patient_registration_tokens
FOR UPDATE
TO public
USING (
  -- Só pode atualizar se o token ainda não foi usado e não expirou
  used = false 
  AND expires_at > now()
)
WITH CHECK (
  -- Só pode marcar como usado e definir used_at
  used = true 
  AND used_at IS NOT NULL
);