-- Adicionar campos para pagamento anual nos planos de assinatura
ALTER TABLE public.subscription_plans 
ADD COLUMN annual_price numeric,
ADD COLUMN annual_credits integer;

-- Comentário: annual_price será o preço anual do plano
-- annual_credits será a quantidade de créditos mensais no plano anual (pode ser diferente do mensal)