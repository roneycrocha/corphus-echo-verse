-- Migrar dados existentes e garantir que não haverá duplicatas

-- 1. Migrar dados de user_credits para account_credits (consolidando por conta)
WITH user_credits_aggregated AS (
  SELECT 
    p.account_id,
    SUM(uc.balance) as total_balance,
    SUM(uc.total_purchased) as total_purchased_sum,
    SUM(uc.total_consumed) as total_consumed_sum,
    MIN(uc.created_at) as earliest_created_at,
    MAX(uc.updated_at) as latest_updated_at
  FROM public.user_credits uc
  JOIN public.profiles p ON p.user_id = uc.user_id
  WHERE p.account_id IS NOT NULL
  GROUP BY p.account_id
)
INSERT INTO public.account_credits (account_id, balance, total_purchased, total_consumed, created_at, updated_at)
SELECT 
  account_id,
  total_balance,
  total_purchased_sum,
  total_consumed_sum,
  earliest_created_at,
  latest_updated_at
FROM user_credits_aggregated
ON CONFLICT (account_id) DO UPDATE SET
  balance = EXCLUDED.balance,
  total_purchased = EXCLUDED.total_purchased,
  total_consumed = EXCLUDED.total_consumed,
  updated_at = EXCLUDED.updated_at;

-- 2. Migrar dados de credit_transactions para account_credit_transactions
INSERT INTO public.account_credit_transactions (account_id, user_id, transaction_type, amount, balance_after, description, related_action, vindi_charge_id, created_at)
SELECT DISTINCT
  p.account_id,
  ct.user_id,
  ct.transaction_type,
  ct.amount,
  ct.balance_after,
  ct.description,
  ct.related_action,
  ct.vindi_charge_id,
  ct.created_at
FROM public.credit_transactions ct
JOIN public.profiles p ON p.user_id = ct.user_id
WHERE p.account_id IS NOT NULL
ON CONFLICT DO NOTHING;