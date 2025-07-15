-- Atualizar cores dos traços corporais baseado no código
UPDATE body_traits 
SET color = '#4B0082', updated_at = now()
WHERE codigo = 'V' AND nome_simbolico = 'Visionário';

UPDATE body_traits 
SET color = '#FF7F50', updated_at = now()
WHERE codigo = 'C' AND nome_simbolico = 'Comunicador';

UPDATE body_traits 
SET color = '#B22222', updated_at = now()
WHERE codigo = 'D' AND nome_simbolico = 'Dominador';

UPDATE body_traits 
SET color = '#8B4513', updated_at = now()
WHERE codigo = 'E' AND nome_simbolico = 'Executor';

UPDATE body_traits 
SET color = '#FFD700', updated_at = now()
WHERE codigo = 'R' AND nome_simbolico = 'Resolutivo';