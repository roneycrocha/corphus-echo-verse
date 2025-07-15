-- Remover todas as políticas existentes e criar políticas mais simples
DROP POLICY IF EXISTS "Allow token completion during registration" ON public.patient_registration_tokens;
DROP POLICY IF EXISTS "Anonymous can access for registration" ON public.patient_registration_tokens;
DROP POLICY IF EXISTS "Public can mark tokens as used" ON public.patient_registration_tokens;

-- Política simples para permitir acesso anônimo para registro
CREATE POLICY "Anonymous token access"
ON public.patient_registration_tokens
FOR ALL
TO anon, public
USING (true)
WITH CHECK (true);

-- Política para usuários autenticados também poderem acessar
CREATE POLICY "Authenticated token access"
ON public.patient_registration_tokens
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);