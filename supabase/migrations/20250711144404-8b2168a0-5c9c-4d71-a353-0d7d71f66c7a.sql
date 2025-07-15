-- Criar tabela para tokens de agendamento de pacientes
CREATE TABLE public.patient_booking_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela
ALTER TABLE public.patient_booking_tokens ENABLE ROW LEVEL SECURITY;

-- Política para terapeutas criarem tokens para seus pacientes
CREATE POLICY "Therapists can create booking tokens for their patients"
ON public.patient_booking_tokens
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'therapist'
  ) AND 
  EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = patient_booking_tokens.patient_id AND p.created_by = auth.uid()
  ) AND
  created_by = auth.uid()
);

-- Política para terapeutas visualizarem seus tokens
CREATE POLICY "Therapists can view their booking tokens"
ON public.patient_booking_tokens
FOR SELECT
USING (created_by = auth.uid());

-- Política para acesso público a tokens válidos (para a página de agendamento)
CREATE POLICY "Public access to valid booking tokens"
ON public.patient_booking_tokens
FOR SELECT
USING (NOT used AND expires_at > now());

-- Política para marcar tokens como usados
CREATE POLICY "Update tokens during booking"
ON public.patient_booking_tokens
FOR UPDATE
USING (NOT used AND expires_at > now());

-- Trigger para updated_at
CREATE TRIGGER update_patient_booking_tokens_updated_at
BEFORE UPDATE ON public.patient_booking_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();