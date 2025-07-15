-- Adicionar configuração para convites de pacientes
-- Esta tabela vai armazenar tokens temporários para convites
CREATE TABLE public.patient_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS policies
ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage patient invites"
ON public.patient_invites
FOR ALL
USING (auth.uid() IS NOT NULL);