-- Limpar e reorganizar políticas RLS para patient_booking_tokens

-- Remover todas as políticas de UPDATE existentes para evitar conflitos
DROP POLICY IF EXISTS "Update tokens during booking" ON public.patient_booking_tokens;
DROP POLICY IF EXISTS "Public can update valid booking tokens during booking" ON public.patient_booking_tokens;

-- Criar uma política única e clara para permitir atualizações públicas de tokens válidos
CREATE POLICY "Allow public token updates during booking" 
ON public.patient_booking_tokens 
FOR UPDATE 
USING (
  -- Permitir para tokens não utilizados e não expirados
  NOT used AND expires_at > now()
) 
WITH CHECK (
  -- Só permitir marcar como usado
  used = true AND used_at IS NOT NULL
);