-- Adicionar campos para foto de perfil, mídias sociais e WhatsApp na tabela patients
ALTER TABLE public.patients 
ADD COLUMN avatar_url TEXT,
ADD COLUMN whatsapp TEXT,
ADD COLUMN social_media JSONB;

-- Criar tabela para links de convite exclusivos
CREATE TABLE public.patient_registration_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  patient_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  patient_id UUID REFERENCES public.patients(id) -- Referência para o paciente criado
);

-- Criar índice no token para busca rápida
CREATE INDEX idx_patient_registration_tokens_token ON public.patient_registration_tokens(token);

-- Habilitar RLS
ALTER TABLE public.patient_registration_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas para patient_registration_tokens
CREATE POLICY "Therapists can create registration tokens" 
ON public.patient_registration_tokens 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist'
  ) 
  AND created_by = auth.uid()
);

CREATE POLICY "Therapists can view their tokens" 
ON public.patient_registration_tokens 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist'
  ) 
  AND created_by = auth.uid()
);

CREATE POLICY "Anyone can view valid tokens for registration" 
ON public.patient_registration_tokens 
FOR SELECT 
USING (
  NOT used 
  AND expires_at > now()
);

CREATE POLICY "Registration process can update tokens" 
ON public.patient_registration_tokens 
FOR UPDATE 
USING (
  NOT used 
  AND expires_at > now()
);

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_patient_registration_tokens_updated_at
BEFORE UPDATE ON public.patient_registration_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();