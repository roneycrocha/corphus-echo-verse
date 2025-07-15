-- Criar tabela para cache de sugestões de IA
CREATE TABLE public.ai_suggestion_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  suggestion_data JSONB NOT NULL,
  ai_generated_content JSONB DEFAULT '{}',
  total_cost INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar trigger para updated_at
CREATE TRIGGER update_ai_suggestion_cache_updated_at
  BEFORE UPDATE ON public.ai_suggestion_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.ai_suggestion_cache ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Therapists can manage their patient suggestion cache"
  ON public.ai_suggestion_cache
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = ai_suggestion_cache.patient_id 
      AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = ai_suggestion_cache.patient_id 
      AND p.created_by = auth.uid()
    ) AND created_by = auth.uid()
  );

-- Adicionar novos recursos de custo para precificação granular
INSERT INTO public.resource_costs (resource_name, cost_per_usage, resource_description, is_active) VALUES
('ai_area_title_generation', 2, 'Geração de título de área terapêutica pela IA', true),
('ai_area_objective_generation', 1, 'Geração de objetivo de área terapêutica pela IA', true),
('ai_action_generation', 3, 'Geração de ação terapêutica pela IA', true),
('ai_report_generation', 10, 'Geração de relatório completo pela IA', true)
ON CONFLICT (resource_name) DO UPDATE SET
  cost_per_usage = EXCLUDED.cost_per_usage,
  resource_description = EXCLUDED.resource_description,
  is_active = EXCLUDED.is_active;