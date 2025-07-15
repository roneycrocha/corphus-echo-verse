-- Corrigir tabela user_subscriptions para garantir constraint única
-- Primeiro, verificar se existe constraint única em user_id

DO $$
BEGIN
    -- Verificar se a constraint única existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_subscriptions_user_id_key'
    ) THEN
        -- Adicionar constraint única se não existir
        ALTER TABLE public.user_subscriptions 
        ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
    END IF;
END
$$;

-- Corrigir dados duplicados se existirem
WITH duplicates AS (
    SELECT user_id, MIN(id) as keep_id
    FROM public.user_subscriptions
    GROUP BY user_id
    HAVING COUNT(*) > 1
)
DELETE FROM public.user_subscriptions 
WHERE id NOT IN (SELECT keep_id FROM duplicates)
AND user_id IN (SELECT user_id FROM duplicates);