-- Adicionar campos de autenticação para pacientes
ALTER TABLE public.patients 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Criar índice para melhor performance
CREATE INDEX idx_patients_user_id ON public.patients(user_id);

-- Criar função para criar paciente com usuário
CREATE OR REPLACE FUNCTION public.create_patient_with_auth(
  patient_name TEXT,
  patient_email TEXT,
  patient_password TEXT,
  patient_phone TEXT DEFAULT NULL,
  patient_birth_date DATE DEFAULT NULL,
  created_by_user_id UUID DEFAULT NULL
)
RETURNS TABLE(patient_id UUID, user_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  new_patient_id UUID;
BEGIN
  -- Criar usuário no auth.users (isso será feito via API do Supabase)
  -- Por enquanto, vamos retornar a estrutura para implementar no frontend
  
  RETURN QUERY SELECT 
    NULL::UUID as patient_id,
    NULL::UUID as user_id,
    'Function ready for frontend implementation'::TEXT as message;
END;
$$;

-- Atualizar RLS para pacientes
DROP POLICY IF EXISTS "Authenticated users can manage patients" ON public.patients;

-- Política para terapeutas (podem ver todos os pacientes)
CREATE POLICY "Therapists can manage all patients" 
ON public.patients 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'doctor', 'secretary', 'assistant')
  )
);

-- Política para pacientes (podem ver apenas seus próprios dados)
CREATE POLICY "Patients can view own data" 
ON public.patients 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Política para atualizar próprios dados
CREATE POLICY "Patients can update own data" 
ON public.patients 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

-- Adicionar enum para tipo de usuário se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE public.user_type AS ENUM ('therapist', 'patient');
  END IF;
END $$;

-- Adicionar campo user_type ao profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type public.user_type DEFAULT 'therapist';

-- Atualizar trigger para lidar com diferentes tipos de usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Verificar se é um paciente (baseado em metadata)
  IF NEW.raw_user_meta_data ->> 'user_type' = 'patient' THEN
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      'assistant',
      'patient'
    );
  ELSE
    -- Usuário terapeuta padrão
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      'assistant',
      'therapist'
    );
  END IF;
  RETURN NEW;
END;
$$;