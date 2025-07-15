-- Corrigir políticas RLS para patient_registration_tokens
DROP POLICY IF EXISTS "Therapists can create registration tokens" ON public.patient_registration_tokens;
DROP POLICY IF EXISTS "Therapists can view their tokens" ON public.patient_registration_tokens;
DROP POLICY IF EXISTS "Anyone can view valid tokens for registration" ON public.patient_registration_tokens;
DROP POLICY IF EXISTS "Registration process can update tokens" ON public.patient_registration_tokens;

-- Política mais simples para criação de tokens
CREATE POLICY "Authenticated users can create registration tokens" 
ON public.patient_registration_tokens 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Política para visualizar próprios tokens
CREATE POLICY "Users can view their own tokens" 
ON public.patient_registration_tokens 
FOR SELECT 
USING (created_by = auth.uid());

-- Política para tokens públicos válidos (para registro)
CREATE POLICY "Public access to valid tokens" 
ON public.patient_registration_tokens 
FOR SELECT 
USING (NOT used AND expires_at > now());

-- Política para atualização durante registro
CREATE POLICY "Update tokens during registration" 
ON public.patient_registration_tokens 
FOR UPDATE 
USING (NOT used AND expires_at > now());