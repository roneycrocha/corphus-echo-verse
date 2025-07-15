-- Criar tabela para configuração de custos de recursos
CREATE TABLE public.resource_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_name TEXT NOT NULL UNIQUE,
  resource_description TEXT,
  cost_per_usage INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir custos padrão para recursos existentes
INSERT INTO public.resource_costs (resource_name, resource_description, cost_per_usage) VALUES
('video_call', 'Videochamada com paciente', 1),
('transcription', 'Transcrição de áudio em tempo real', 1),
('ai_analysis', 'Análise de conversa com IA', 2),
('report_generation', 'Geração de relatórios automatizados', 1),
('voice_to_text', 'Conversão de voz para texto', 1);

-- Habilitar Row Level Security
ALTER TABLE public.resource_costs ENABLE ROW LEVEL SECURITY;

-- Política para visualização - todos usuários autenticados podem ver
CREATE POLICY "Authenticated users can view resource costs" 
ON public.resource_costs 
FOR SELECT 
USING (is_authenticated());

-- Política para inserção - apenas admins
CREATE POLICY "Admins can insert resource costs" 
ON public.resource_costs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
);

-- Política para atualização - apenas admins
CREATE POLICY "Admins can update resource costs" 
ON public.resource_costs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
);

-- Política para exclusão - apenas admins
CREATE POLICY "Admins can delete resource costs" 
ON public.resource_costs 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
);

-- Função para obter custo de um recurso
CREATE OR REPLACE FUNCTION public.get_resource_cost(p_resource_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  resource_cost INTEGER;
BEGIN
  SELECT cost_per_usage INTO resource_cost
  FROM public.resource_costs
  WHERE resource_name = p_resource_name AND is_active = true;
  
  -- Se não encontrar o recurso, retorna 0 (sem custo)
  RETURN COALESCE(resource_cost, 0);
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_resource_costs_updated_at
BEFORE UPDATE ON public.resource_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();