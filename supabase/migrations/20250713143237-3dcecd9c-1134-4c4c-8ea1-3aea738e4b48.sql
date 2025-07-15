-- Criar tabela de agentes de IA
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  assistant_id TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna para agente selecionado na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN selected_ai_agent_id UUID;

-- Criar foreign key entre profiles e ai_agents
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_selected_ai_agent 
FOREIGN KEY (selected_ai_agent_id) REFERENCES public.ai_agents(id);

-- Habilitar RLS na tabela ai_agents
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem agentes
CREATE POLICY "Admins can manage AI agents" 
ON public.ai_agents 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin' 
  AND profiles.is_active = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin' 
  AND profiles.is_active = true
) AND created_by = auth.uid());

-- Política para todos os usuários autenticados visualizarem agentes ativos
CREATE POLICY "Authenticated users can view active AI agents" 
ON public.ai_agents 
FOR SELECT 
USING (is_authenticated() AND is_active = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ai_agents_updated_at
BEFORE UPDATE ON public.ai_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir agente padrão para desenvolvimento humano
INSERT INTO public.ai_agents (name, description, assistant_id, category, created_by) 
VALUES (
  'Desenvolvimento Humano',
  'Agente especializado em análise corporal e desenvolvimento humano',
  'asst_Urx3NlHxECrQRS889BwZv0JA',
  'desenvolvimento_humano',
  (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)
);