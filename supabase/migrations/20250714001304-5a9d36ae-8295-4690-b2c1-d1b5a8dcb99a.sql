-- Limpar completamente e recriar políticas RLS para patient_booking_tokens

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Public access to valid booking tokens" ON public.patient_booking_tokens;
DROP POLICY IF EXISTS "Therapists can create booking tokens for their patients" ON public.patient_booking_tokens;
DROP POLICY IF EXISTS "Therapists can view their booking tokens" ON public.patient_booking_tokens;
DROP POLICY IF EXISTS "Allow public token updates during booking" ON public.patient_booking_tokens;

-- Política para leitura pública de tokens válidos
CREATE POLICY "Public can read valid tokens" 
ON public.patient_booking_tokens 
FOR SELECT 
USING (NOT used AND expires_at > now());

-- Política para terapeutas criarem tokens
CREATE POLICY "Therapists can create tokens" 
ON public.patient_booking_tokens 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist'
  ) AND 
  EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = patient_booking_tokens.patient_id 
    AND p.created_by = auth.uid()
  ) AND 
  created_by = auth.uid()
);

-- Política para terapeutas verem seus tokens
CREATE POLICY "Therapists can view own tokens" 
ON public.patient_booking_tokens 
FOR SELECT 
USING (created_by = auth.uid());

-- Política para permitir atualização pública de tokens válidos (sem autenticação)
CREATE POLICY "Public can update valid tokens" 
ON public.patient_booking_tokens 
FOR UPDATE 
USING (NOT used AND expires_at > now())
WITH CHECK (used = true AND used_at IS NOT NULL);