-- Atualizar tabelas existentes para vincular à conta padrão
UPDATE public.patients 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.sessions 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.medical_records 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.body_analyses 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.conversation_analyses 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.therapeutic_actions 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.treatment_plans 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.transcriptions 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.action_executions 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.expenses 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.transactions 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;

UPDATE public.ai_suggestion_cache 
SET account_id = '00000000-0000-0000-0000-000000000000'
WHERE account_id IS NULL;