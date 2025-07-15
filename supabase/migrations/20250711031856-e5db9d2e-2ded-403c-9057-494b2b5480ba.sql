-- Adicionar coluna updated_at na tabela patient_registration_tokens
ALTER TABLE public.patient_registration_tokens 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();