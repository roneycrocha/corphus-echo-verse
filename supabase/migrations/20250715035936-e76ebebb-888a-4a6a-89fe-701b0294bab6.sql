-- Remover recurso ai_area_actions_generation já que a cobrança será por ação individual
UPDATE resource_costs 
SET is_active = false 
WHERE resource_name = 'ai_area_actions_generation';