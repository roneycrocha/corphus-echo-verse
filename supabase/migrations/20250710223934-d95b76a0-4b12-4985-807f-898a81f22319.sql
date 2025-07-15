-- Adicionar novo recurso para consumo automático de créditos em videochamadas (a cada 30 minutos)
INSERT INTO public.resource_costs (resource_name, resource_description, cost_per_usage, is_active)
VALUES (
  'video_call_extended',
  'Extensão de videochamada (consumo automático a cada 30 minutos)',
  1,
  true
)
ON CONFLICT (resource_name) DO UPDATE SET
  resource_description = EXCLUDED.resource_description,
  cost_per_usage = EXCLUDED.cost_per_usage,
  updated_at = now();