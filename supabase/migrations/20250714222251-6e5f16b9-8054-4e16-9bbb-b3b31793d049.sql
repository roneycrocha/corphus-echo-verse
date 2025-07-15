-- Corrigir o último usuário Maria se houver algum problema
UPDATE public.profiles 
SET 
  account_id = '00000000-0000-0000-0000-000000000000',
  updated_at = now()
WHERE user_id = '464da8d2-1ff3-4081-9248-1b0e4e1deeee'
AND (account_id IS NULL OR account_id != '00000000-0000-0000-0000-000000000000');

-- Garantir que a conta padrão tem assinatura ativa
UPDATE public.accounts 
SET 
  subscription_status = 'active',
  subscription_plan = 'silver',
  is_active = true,
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000000';