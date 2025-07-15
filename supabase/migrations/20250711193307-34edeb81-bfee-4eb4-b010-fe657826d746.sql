-- Atualizar o peso de todas as avaliações corporais para 0
UPDATE public.body_evaluations 
SET weight = 0
WHERE weight != 0;