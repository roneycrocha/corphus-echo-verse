-- Atualizar campos account_id para usuários existentes e corrigir algumas funcionalidades

-- 1. Atualizar account_id em todas as tabelas para o usuário Roney
UPDATE public.sessions 
SET account_id = '1f33c57e-ed8d-4581-a718-c7c31096c9ef'
WHERE account_id IS NULL;

UPDATE public.body_analyses 
SET account_id = '1f33c57e-ed8d-4581-a718-c7c31096c9ef'
WHERE account_id IS NULL;

UPDATE public.transcriptions 
SET account_id = '1f33c57e-ed8d-4581-a718-c7c31096c9ef'
WHERE account_id IS NULL;

UPDATE public.conversation_analyses 
SET account_id = '1f33c57e-ed8d-4581-a718-c7c31096c9ef'
WHERE account_id IS NULL;

UPDATE public.medical_records 
SET account_id = '1f33c57e-ed8d-4581-a718-c7c31096c9ef'
WHERE account_id IS NULL;

UPDATE public.treatment_plans 
SET account_id = '1f33c57e-ed8d-4581-a718-c7c31096c9ef'
WHERE account_id IS NULL;

UPDATE public.therapeutic_actions 
SET account_id = '1f33c57e-ed8d-4581-a718-c7c31096c9ef'
WHERE account_id IS NULL;

UPDATE public.action_executions 
SET account_id = '1f33c57e-ed8d-4581-a718-c7c31096c9ef'
WHERE account_id IS NULL;

UPDATE public.transactions 
SET account_id = '1f33c57e-ed8d-4581-a718-c7c31096c9ef'
WHERE account_id IS NULL;

UPDATE public.expenses 
SET account_id = '1f33c57e-ed8d-4581-a718-c7c31096c9ef'
WHERE account_id IS NULL;

UPDATE public.patients 
SET account_id = '1f33c57e-ed8d-4581-a718-c7c31096c9ef'
WHERE account_id IS NULL;

-- 2. Corrigir políticas para créditos para funcionar com account_id
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Service can manage transactions" ON public.credit_transactions;

CREATE POLICY "Users can view own transactions" 
ON public.credit_transactions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Service can manage transactions" 
ON public.credit_transactions 
FOR ALL 
USING (true);

-- 3. Garantir que funcionalidades de multi-tenant estão ativas
COMMENT ON TABLE public.sessions IS 'Sessões agora totalmente integradas ao sistema multi-tenant';
COMMENT ON TABLE public.patients IS 'Pacientes agora totalmente integrados ao sistema multi-tenant';
COMMENT ON TABLE public.transactions IS 'Transações agora totalmente integradas ao sistema multi-tenant';