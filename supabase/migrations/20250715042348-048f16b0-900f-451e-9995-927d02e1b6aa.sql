-- Corrigir sistema de créditos para contas com planos ativos
-- Garantir que contas recebam os créditos iniciais do plano

-- 1. Criar função para inicializar créditos baseado no plano
CREATE OR REPLACE FUNCTION public.initialize_account_credits_from_plan()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record RECORD;
  plan_credits INTEGER;
  plan_multiplier DECIMAL;
BEGIN
  -- Para cada conta com plano ativo que não tem créditos inicializados
  FOR account_record IN 
    SELECT a.id, a.subscription_plan, a.email, a.created_at
    FROM accounts a
    LEFT JOIN account_credits ac ON a.id = ac.account_id
    WHERE a.subscription_plan IS NOT NULL 
    AND a.subscription_status = 'active'
    AND ac.account_id IS NULL
  LOOP
    -- Buscar créditos do plano
    SELECT monthly_credits, credit_multiplier 
    INTO plan_credits, plan_multiplier
    FROM subscription_plans 
    WHERE plan_type = account_record.subscription_plan::subscription_plan 
    AND is_active = true;
    
    IF plan_credits IS NOT NULL THEN
      -- Criar registro de créditos para a conta
      INSERT INTO public.account_credits (
        account_id, 
        balance, 
        total_purchased, 
        total_consumed
      ) VALUES (
        account_record.id, 
        plan_credits, 
        plan_credits, 
        0
      );
      
      -- Registrar transação inicial
      INSERT INTO public.account_credit_transactions (
        account_id,
        user_id,
        transaction_type,
        amount,
        balance_after,
        description
      ) VALUES (
        account_record.id,
        (SELECT user_id FROM profiles WHERE account_id = account_record.id AND role = 'admin' LIMIT 1),
        'plan_bonus',
        plan_credits,
        plan_credits,
        'Créditos iniciais do plano ' || account_record.subscription_plan
      );
      
      RAISE LOG 'Initialized % credits for account % (plan: %)', 
        plan_credits, account_record.email, account_record.subscription_plan;
    END IF;
  END LOOP;
END;
$$;

-- 2. Executar a função para corrigir contas existentes
SELECT public.initialize_account_credits_from_plan();

-- 3. Criar trigger para automatizar a criação de créditos em novas contas com plano
CREATE OR REPLACE FUNCTION public.auto_initialize_account_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan_credits INTEGER;
BEGIN
  -- Só executar se a conta tem um plano ativo
  IF NEW.subscription_plan IS NOT NULL AND NEW.subscription_status = 'active' THEN
    -- Buscar créditos do plano
    SELECT monthly_credits 
    INTO plan_credits
    FROM subscription_plans 
    WHERE plan_type = NEW.subscription_plan::subscription_plan 
    AND is_active = true;
    
    IF plan_credits IS NOT NULL THEN
      -- Criar registro de créditos
      INSERT INTO public.account_credits (
        account_id, 
        balance, 
        total_purchased, 
        total_consumed
      ) VALUES (
        NEW.id, 
        plan_credits, 
        plan_credits, 
        0
      );
      
      -- Registrar transação inicial
      INSERT INTO public.account_credit_transactions (
        account_id,
        user_id,
        transaction_type,
        amount,
        balance_after,
        description
      ) VALUES (
        NEW.id,
        NULL, -- Será preenchido quando o perfil admin for criado
        'plan_bonus',
        plan_credits,
        plan_credits,
        'Créditos iniciais do plano ' || NEW.subscription_plan
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Criar trigger para contas novas
DROP TRIGGER IF EXISTS trigger_auto_initialize_account_credits ON public.accounts;
CREATE TRIGGER trigger_auto_initialize_account_credits
  AFTER INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_initialize_account_credits();

-- 5. Criar trigger para atualização de planos em contas existentes  
DROP TRIGGER IF EXISTS trigger_auto_initialize_account_credits_update ON public.accounts;
CREATE TRIGGER trigger_auto_initialize_account_credits_update
  AFTER UPDATE OF subscription_plan, subscription_status ON public.accounts
  FOR EACH ROW
  WHEN (NEW.subscription_plan IS NOT NULL AND NEW.subscription_status = 'active' AND 
        (OLD.subscription_plan IS NULL OR OLD.subscription_status != 'active'))
  EXECUTE FUNCTION public.auto_initialize_account_credits();