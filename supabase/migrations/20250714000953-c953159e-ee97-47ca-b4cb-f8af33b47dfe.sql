-- Permitir acesso público para atualizar tokens durante o processo de agendamento

-- Adicionar política para permitir acesso público a tokens válidos durante agendamento
CREATE POLICY "Public can update valid booking tokens during booking" 
ON public.patient_booking_tokens 
FOR UPDATE 
USING (
  NOT used AND expires_at > now()
) 
WITH CHECK (
  used = true AND used_at IS NOT NULL
);