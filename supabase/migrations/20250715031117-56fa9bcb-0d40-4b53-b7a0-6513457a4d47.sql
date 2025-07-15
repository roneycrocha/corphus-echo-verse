-- Remover política anterior e criar uma nova mais específica
DROP POLICY IF EXISTS "Public can mark tokens as used" ON public.patient_registration_tokens;
DROP POLICY IF EXISTS "Allow token completion during registration" ON public.patient_registration_tokens;

-- Nova política que permite marcar token como usado durante o processo de registro
CREATE POLICY "Allow token completion during registration"
ON public.patient_registration_tokens
FOR UPDATE
TO public
USING (
  -- Permite atualizar apenas se o token não foi usado e não expirou
  used = false 
  AND expires_at > now()
)
WITH CHECK (
  -- Permite apenas marcar como usado e definir used_at  
  used = true 
  AND used_at IS NOT NULL
  AND updated_at IS NOT NULL
);

-- Garantir que anônimos podem acessar a tabela para o processo de registro
DROP POLICY IF EXISTS "Anonymous can access for registration" ON public.patient_registration_tokens;

CREATE POLICY "Anonymous can access for registration"
ON public.patient_registration_tokens
FOR ALL
TO anon
USING (
  -- Permite acesso a tokens válidos não usados
  used = false 
  AND expires_at > now()
)
WITH CHECK (
  -- Permite marcar como usado
  used = true 
  AND used_at IS NOT NULL
);