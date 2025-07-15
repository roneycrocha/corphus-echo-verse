-- Adicionar recurso específico para geração de ações de área terapêutica
INSERT INTO resource_costs (
  resource_name,
  resource_description,
  cost_per_usage,
  is_active
) VALUES (
  'ai_area_actions_generation',
  'Geração de múltiplas ações terapêuticas para uma área específica do plano de tratamento',
  8,
  true
) ON CONFLICT (resource_name) DO UPDATE SET
  resource_description = EXCLUDED.resource_description,
  cost_per_usage = EXCLUDED.cost_per_usage,
  is_active = EXCLUDED.is_active;