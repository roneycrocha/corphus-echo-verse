-- Criar enum types necessários
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'specialist', 'assistant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.user_type AS ENUM ('therapist', 'patient');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.subscription_plan AS ENUM ('bronze', 'silver', 'gold', 'platinum');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.credit_transaction_type AS ENUM ('purchase', 'consumption', 'bonus', 'refund');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela accounts
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscription_plan public.subscription_plan DEFAULT NULL,
  subscription_status TEXT DEFAULT 'inactive',
  credits_balance INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role public.user_role DEFAULT 'assistant',
  user_type public.user_type DEFAULT 'therapist',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Campos de perfil completo
  logo_url TEXT,
  public_email TEXT,
  instagram TEXT,
  facebook TEXT,
  linkedin TEXT,
  whatsapp TEXT,
  website TEXT,
  address JSONB,
  job_title TEXT,
  
  -- Configurações de videochamada
  video_call_settings JSONB DEFAULT '{
    "videoEnabled": true,
    "audioEnabled": true,
    "videoDeviceId": "",
    "audioDeviceId": "", 
    "videoQuality": "medium",
    "autoJoinWithVideo": true,
    "autoJoinWithAudio": true,
    "language": "pt-BR",
    "backgroundBlur": false,
    "backgroundType": "none",
    "backgroundImage": "",
    "noiseCancellation": true,
    "echoCancellation": true,
    "autoGainControl": true,
    "screenShareQuality": "high",
    "recordingQuality": "medium",
    "transcriptionEnabled": false,
    "transcriptionLanguage": "pt-BR"
  }'::jsonb
);

-- Criar tabela patients
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  gender TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Campos de documento
  document TEXT,
  document_type TEXT CHECK (document_type IN ('cpf', 'cnpj'))
);

-- Criar tabela sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  therapist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela patient_registration_tokens
CREATE TABLE IF NOT EXISTS public.patient_registration_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  patient_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Criar tabela patient_booking_tokens
CREATE TABLE IF NOT EXISTS public.patient_booking_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Criar tabela system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  body_analysis_prompt TEXT DEFAULT 'Gere um relatório detalhado de análise corporal com base nos dados fornecidos pelo paciente. Inclua avaliação postural, mobilidade, força muscular e recomendações específicas.',
  follow_up_prompt TEXT DEFAULT 'Crie um relatório de acompanhamento baseado na evolução do paciente. Analise o progresso, identifique melhorias e áreas que precisam de atenção, e sugira ajustes no tratamento.',
  therapy_conclusion_prompt TEXT DEFAULT 'Elabore um relatório de conclusão de terapia resumindo todo o processo terapêutico. Inclua objetivos alcançados, evolução do paciente, recomendações para manutenção dos resultados e orientações futuras.',
  conversation_analysis_prompt TEXT DEFAULT 'Com base na transcrição da conversa e nos traços dominantes do paciente (quando disponíveis), gere uma lista de 5-8 perguntas estratégicas para aprofundar o acompanhamento terapêutico.',
  therapeutic_plan_prompt TEXT DEFAULT 'Elabore um plano terapêutico personalizado com base na análise corporal e histórico do paciente.',
  action_plan_prompt TEXT DEFAULT 'Crie um plano de ação detalhado com exercícios e atividades específicas para o paciente.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela resource_costs
CREATE TABLE IF NOT EXISTS public.resource_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_name TEXT NOT NULL UNIQUE,
  resource_description TEXT,
  cost_per_usage INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_price NUMERIC,
  monthly_credits INTEGER,
  annual_price NUMERIC,
  annual_credits INTEGER,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela body_traits
CREATE TABLE IF NOT EXISTS public.body_traits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome_simbolico TEXT NOT NULL,
  descricao TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela transcriptions
CREATE TABLE IF NOT EXISTS public.transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela treatment_plans
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela therapeutic_actions
CREATE TABLE IF NOT EXISTS public.therapeutic_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000',
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT,
  duration TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patient_registration_tokens_updated_at BEFORE UPDATE ON public.patient_registration_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_treatment_plans_updated_at BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_therapeutic_actions_updated_at BEFORE UPDATE ON public.therapeutic_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para obter account_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT account_id FROM public.profiles WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

-- Habilitar Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_registration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_booking_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapeutic_actions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para admins verem todos os perfis
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.role = 'admin' 
    AND admin_profile.is_active = true
  )
);

-- Política para pacientes
CREATE POLICY "Therapists can view their patients" ON public.patients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

CREATE POLICY "Therapists can create patients" ON public.patients FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

CREATE POLICY "Therapists can update patients" ON public.patients FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

-- Política para sessões
CREATE POLICY "Therapists can manage sessions" ON public.sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

-- Política para tokens de registro
CREATE POLICY "Therapists can create registration tokens" ON public.patient_registration_tokens FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

CREATE POLICY "Therapists can view their tokens" ON public.patient_registration_tokens FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

-- Política para tokens de agendamento
CREATE POLICY "Therapists can create booking tokens" ON public.patient_booking_tokens FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

CREATE POLICY "Therapists can view their booking tokens" ON public.patient_booking_tokens FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

CREATE POLICY "Public can read valid tokens" ON public.patient_booking_tokens FOR SELECT USING (NOT used AND expires_at > now());

-- Política para configurações do sistema
CREATE POLICY "Authenticated users can view system settings" ON public.system_settings FOR SELECT USING (auth.uid() IS NOT NULL);

-- Política para custos de recursos
CREATE POLICY "Authenticated users can view resource costs" ON public.resource_costs FOR SELECT USING (auth.uid() IS NOT NULL);

-- Política para planos de assinatura
CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans FOR SELECT USING (true);

-- Política para traços corporais
CREATE POLICY "Authenticated users can view body traits" ON public.body_traits FOR SELECT USING (auth.uid() IS NOT NULL);

-- Política para transcrições
CREATE POLICY "Therapists can manage transcriptions" ON public.transcriptions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

-- Política para planos de tratamento
CREATE POLICY "Therapists can manage treatment plans" ON public.treatment_plans FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

-- Política para ações terapêuticas
CREATE POLICY "Therapists can manage therapeutic actions" ON public.therapeutic_actions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

-- Política para admins verem todas as contas
CREATE POLICY "Platform admins can view all accounts" ON public.accounts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  )
);

-- Política para admins verem todos os pacientes
CREATE POLICY "Admins can view all patients" ON public.patients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND is_active = true
  )
);

-- Inserir dados iniciais
INSERT INTO public.accounts (id, email, subscription_plan, subscription_status, credits_balance) VALUES
  ('00000000-0000-0000-0000-000000000000', 'default@system.com', 'platinum', 'active', 1000),
  ('11111111-1111-1111-1111-111111111111', 'breno@cdtsoftware.com.br', 'gold', 'active', 500),
  ('22222222-2222-2222-2222-222222222222', 'roney@cdtsoftware.com.br', 'gold', 'active', 500)
ON CONFLICT (id) DO NOTHING;

-- Inserir custos de recursos
INSERT INTO public.resource_costs (resource_name, resource_description, cost_per_usage, is_active) VALUES
  ('video_call_extended', 'Extensão de videochamada (consumo automático a cada 30 minutos)', 1, true),
  ('ai_treatment_plan_generation', 'Geração de plano de tratamento personalizado com IA', 5, true),
  ('ai_area_actions_generation', 'Geração de múltiplas ações terapêuticas para uma área específica', 8, false)
ON CONFLICT (resource_name) DO UPDATE SET
  resource_description = EXCLUDED.resource_description,
  cost_per_usage = EXCLUDED.cost_per_usage,
  is_active = EXCLUDED.is_active;

-- Inserir traços corporais
INSERT INTO public.body_traits (codigo, nome_simbolico, descricao, color) VALUES
  ('V', 'Visionário', 'Traço visionário', '#4B0082'),
  ('C', 'Comunicador', 'Traço comunicador', '#FF7F50'),
  ('D', 'Dominador', 'Traço dominador', '#B22222'),
  ('E', 'Executor', 'Traço executor', '#8B4513'),
  ('R', 'Resolutivo', 'Traço resolutivo', '#FFD700')
ON CONFLICT (codigo) DO UPDATE SET
  nome_simbolico = EXCLUDED.nome_simbolico,
  descricao = EXCLUDED.descricao,
  color = EXCLUDED.color;

-- Função para criar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email, 
    phone,
    role, 
    user_type, 
    created_by,
    account_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'assistant')::user_role,
    'therapist',
    NEW.id,
    '00000000-0000-0000-0000-000000000000'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro na função handle_new_user: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Trigger para criar perfil quando usuário for criado
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();