-- Criar funções para gerenciar créditos da conta

-- 1. Função para adicionar créditos à conta
CREATE OR REPLACE FUNCTION public.add_account_credits(
  p_account_id UUID,
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_transaction_type credit_transaction_type DEFAULT 'purchase',
  p_vindi_charge_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance or initialize if doesn't exist
  SELECT balance INTO current_balance
  FROM public.account_credits
  WHERE account_id = p_account_id;
  
  IF current_balance IS NULL THEN
    INSERT INTO public.account_credits (account_id, balance, total_purchased)
    VALUES (p_account_id, p_amount, CASE WHEN p_transaction_type = 'purchase' THEN p_amount ELSE 0 END);
    new_balance := p_amount;
  ELSE
    new_balance := current_balance + p_amount;
    UPDATE public.account_credits
    SET 
      balance = new_balance,
      total_purchased = CASE 
        WHEN p_transaction_type = 'purchase' THEN total_purchased + p_amount 
        ELSE total_purchased 
      END,
      updated_at = now()
    WHERE account_id = p_account_id;
  END IF;
  
  -- Record transaction
  INSERT INTO public.account_credit_transactions (
    account_id,
    user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    vindi_charge_id
  ) VALUES (
    p_account_id,
    p_user_id,
    p_transaction_type,
    p_amount,
    new_balance,
    p_description,
    p_vindi_charge_id
  );
  
  RETURN TRUE;
END;
$$;

-- 2. Função para consumir créditos da conta
CREATE OR REPLACE FUNCTION public.consume_account_credits(
  p_account_id UUID,
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_action TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM public.account_credits
  WHERE account_id = p_account_id;
  
  -- Check if account has enough credits
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance - p_amount;
  
  -- Update account credits
  UPDATE public.account_credits
  SET 
    balance = new_balance,
    total_consumed = total_consumed + p_amount,
    updated_at = now()
  WHERE account_id = p_account_id;
  
  -- Record transaction
  INSERT INTO public.account_credit_transactions (
    account_id,
    user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    related_action
  ) VALUES (
    p_account_id,
    p_user_id,
    'consumption',
    -p_amount,
    new_balance,
    p_description,
    p_action
  );
  
  RETURN TRUE;
END;
$$;

-- 3. Função para obter informações de crédito da conta
CREATE OR REPLACE FUNCTION public.get_account_credit_info(p_account_id UUID)
RETURNS TABLE(
  balance INTEGER, 
  total_purchased INTEGER, 
  total_consumed INTEGER, 
  plan_type subscription_plan, 
  credit_multiplier NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ac.balance, 0) as balance,
    COALESCE(ac.total_purchased, 0) as total_purchased,
    COALESCE(ac.total_consumed, 0) as total_consumed,
    COALESCE(us.plan_type, 'bronze'::subscription_plan) as plan_type,
    COALESCE(sp.credit_multiplier, 1.0) as credit_multiplier
  FROM public.account_credits ac
  LEFT JOIN public.user_subscriptions us ON us.user_id = (
    SELECT user_id FROM public.profiles WHERE account_id = p_account_id AND role = 'admin' LIMIT 1
  ) AND us.status = 'active'
  LEFT JOIN public.subscription_plans sp ON us.plan_type = sp.plan_type
  WHERE ac.account_id = p_account_id
  
  UNION ALL
  
  SELECT 
    0 as balance,
    0 as total_purchased,
    0 as total_consumed,
    'bronze'::subscription_plan as plan_type,
    1.0 as credit_multiplier
  WHERE NOT EXISTS (SELECT 1 FROM public.account_credits WHERE account_id = p_account_id)
  LIMIT 1;
END;
$$;