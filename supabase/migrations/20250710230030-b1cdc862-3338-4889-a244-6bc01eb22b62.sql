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

-- Corrigir dados duplicados se existirem (usando created_at para manter o mais recente)
WITH duplicates AS (
    SELECT user_id, 
           id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM public.user_subscriptions
)
DELETE FROM public.user_subscriptions 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);