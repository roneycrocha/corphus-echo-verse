-- Alterar valores padrão da tabela accounts para que novas contas sejam criadas sem assinatura
ALTER TABLE public.accounts ALTER COLUMN subscription_status SET DEFAULT 'inactive';
ALTER TABLE public.accounts ALTER COLUMN subscription_plan SET DEFAULT NULL;

-- Atualizar contas existentes que não deveriam ter assinatura ativa
-- (manter apenas as contas que foram explicitamente configuradas)
UPDATE public.accounts 
SET 
  subscription_status = 'inactive',
  subscription_plan = NULL
WHERE id NOT IN (
  '00000000-0000-0000-0000-000000000000', -- Conta padrão
  '11111111-1111-1111-1111-111111111111', -- Clínica Breno  
  '22222222-2222-2222-2222-222222222222'  -- Clínica Roney
) AND email LIKE '%@cdtsoftware.com.br%';