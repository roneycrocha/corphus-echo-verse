-- Adicionar política RLS para permitir agendamento público via token de booking válido na tabela sessions

-- Política para permitir inserção de sessões via token de booking válido
CREATE POLICY "Public booking via valid token" 
ON public.sessions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patient_booking_tokens pbt
    WHERE pbt.patient_id = sessions.patient_id 
    AND NOT pbt.used 
    AND pbt.expires_at > now()
  )
);

-- Política para permitir atualização do token durante o agendamento
CREATE POLICY "Update token during public booking" 
ON public.patient_booking_tokens 
FOR UPDATE 
USING (
  NOT used AND expires_at > now()
) 
WITH CHECK (
  used = true AND used_at IS NOT NULL
);