-- Adicionar coluna updated_at na tabela patient_registration_tokens
ALTER TABLE public.patient_registration_tokens 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_patient_registration_tokens_updated_at
BEFORE UPDATE ON public.patient_registration_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();