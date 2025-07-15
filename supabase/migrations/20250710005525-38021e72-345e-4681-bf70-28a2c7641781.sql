-- Criar tabela para ações terapêuticas
CREATE TABLE public.therapeutic_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_plan_id UUID NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'unique')),
  start_date DATE NOT NULL,
  end_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  observations TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para execução das ações pelo paciente
CREATE TABLE public.action_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.therapeutic_actions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  execution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  patient_report TEXT,
  emotional_state INTEGER CHECK (emotional_state >= 1 AND emotional_state <= 5),
  difficulty_level TEXT CHECK (difficulty_level IN ('low', 'medium', 'high')),
  evidence_files TEXT[], -- URLs dos arquivos de evidência
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(action_id, execution_date)
);

-- Criar tabela para feedback do terapeuta
CREATE TABLE public.therapist_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.action_executions(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL, -- referencia ao auth.users via profiles
  feedback_text TEXT,
  quick_reaction TEXT, -- emoji ou reação rápida
  action_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para comunicação/chat por ação
CREATE TABLE public.action_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.therapeutic_actions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL, -- referencia ao auth.users via profiles
  sender_type TEXT NOT NULL CHECK (sender_type IN ('therapist', 'patient')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para gamificação
CREATE TABLE public.patient_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  earned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.therapeutic_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapist_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_achievements ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Authenticated users can manage therapeutic actions" 
ON public.therapeutic_actions 
FOR ALL 
USING (is_authenticated());

CREATE POLICY "Authenticated users can manage action executions" 
ON public.action_executions 
FOR ALL 
USING (is_authenticated());

CREATE POLICY "Authenticated users can manage therapist feedback" 
ON public.therapist_feedback 
FOR ALL 
USING (is_authenticated());

CREATE POLICY "Authenticated users can manage action messages" 
ON public.action_messages 
FOR ALL 
USING (is_authenticated());

CREATE POLICY "Authenticated users can view patient achievements" 
ON public.patient_achievements 
FOR ALL 
USING (is_authenticated());

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_therapeutic_actions_updated_at
BEFORE UPDATE ON public.therapeutic_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_action_executions_updated_at
BEFORE UPDATE ON public.action_executions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_therapist_feedback_updated_at
BEFORE UPDATE ON public.therapist_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();