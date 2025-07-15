-- Adicionar custo de recurso para geração de plano de tratamento com IA
INSERT INTO resource_costs (resource_name, resource_description, cost_per_usage, is_active)
VALUES (
  'ai_treatment_plan_generation',
  'Geração de plano de tratamento personalizado com IA baseado em transcrições e dados do paciente',
  5,
  true
) ON CONFLICT (resource_name) DO UPDATE SET
  resource_description = EXCLUDED.resource_description,
  cost_per_usage = EXCLUDED.cost_per_usage,
  is_active = EXCLUDED.is_active;