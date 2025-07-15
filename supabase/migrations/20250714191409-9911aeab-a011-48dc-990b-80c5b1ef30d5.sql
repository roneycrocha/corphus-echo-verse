-- Atualizar tabelas que realmente têm o campo account_id
UPDATE public.patients 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.therapeutic_actions 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.transcriptions 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.treatment_plans 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.profiles 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;