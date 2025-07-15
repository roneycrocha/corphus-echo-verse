-- Remover dados de usuários das tabelas públicas (exceto roney@cdtsoftware.com.br)

-- 1. Remover os perfis relacionados (exceto o do Roney)
DELETE FROM public.profiles 
WHERE user_id != '5d6bc866-1ddd-4598-a3af-a4716e74b336';

-- 2. Remover transações de crédito dos outros usuários
DELETE FROM public.credit_transactions 
WHERE user_id != '5d6bc866-1ddd-4598-a3af-a4716e74b336';

-- 3. Remover dados de créditos dos outros usuários
DELETE FROM public.user_credits 
WHERE user_id != '5d6bc866-1ddd-4598-a3af-a4716e74b336';

-- 4. Remover convites de pacientes criados por outros usuários  
DELETE FROM public.patient_invites 
WHERE created_by != '5d6bc866-1ddd-4598-a3af-a4716e74b336';

-- 5. Remover agentes de IA criados por outros usuários
DELETE FROM public.ai_agents 
WHERE created_by != '5d6bc866-1ddd-4598-a3af-a4716e74b336';

-- Comentário sobre a limpeza
COMMENT ON TABLE public.profiles IS 'Perfis limpos em 2025-01-14 - mantido apenas roney@cdtsoftware.com.br';