-- Corrigir políticas RLS duplicadas para patient_booking_tokens

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Update tokens during booking" ON public.patient_booking_tokens;
DROP POLICY IF EXISTS "Update token during public booking" ON public.patient_booking_tokens;

-- Criar política corrigida para atualização de tokens durante agendamento público
CREATE POLICY "Update tokens during booking" 
ON public.patient_booking_tokens 
FOR UPDATE 
USING (
  NOT used AND expires_at > now()
) 
WITH CHECK (
  used = true AND used_at IS NOT NULL
);