-- Migração da gestão de créditos de usuário para conta

-- 1. Criar nova tabela account_credits para substituir user_credits
CREATE TABLE public.account_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_consumed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id)
);

-- 2. Criar nova tabela account_credit_transactions para substituir credit_transactions
CREATE TABLE public.account_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Para rastreabilidade de quem fez a transação
  transaction_type credit_transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT NOT NULL,
  related_action TEXT,
  vindi_charge_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE public.account_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_credit_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for account_credits
CREATE POLICY "Users can view their account credits" 
ON public.account_credits 
FOR SELECT 
USING (account_id = get_user_account_id());

CREATE POLICY "Service can manage all account credits" 
ON public.account_credits 
FOR ALL 
USING (true);

-- 5. Create RLS policies for account_credit_transactions
CREATE POLICY "Users can view their account credit transactions" 
ON public.account_credit_transactions 
FOR SELECT 
USING (account_id = get_user_account_id());

CREATE POLICY "Service can manage all account credit transactions" 
ON public.account_credit_transactions 
FOR ALL 
USING (true);

-- 6. Create indexes for performance
CREATE INDEX idx_account_credits_account_id ON public.account_credits(account_id);
CREATE INDEX idx_account_credit_transactions_account_id ON public.account_credit_transactions(account_id);
CREATE INDEX idx_account_credit_transactions_created_at ON public.account_credit_transactions(created_at DESC);

-- 7. Create trigger for updating updated_at
CREATE TRIGGER update_account_credits_updated_at
BEFORE UPDATE ON public.account_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Criar função para gerenciar créditos da conta
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

-- 9. Criar função para consumir créditos da conta
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

-- 10. Criar função para obter informações de crédito da conta
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

-- 11. Migrar dados existentes de user_credits para account_credits
INSERT INTO public.account_credits (account_id, balance, total_purchased, total_consumed, created_at, updated_at)
SELECT 
  p.account_id,
  uc.balance,
  uc.total_purchased,
  uc.total_consumed,
  uc.created_at,
  uc.updated_at
FROM public.user_credits uc
JOIN public.profiles p ON p.user_id = uc.user_id
WHERE p.account_id IS NOT NULL
ON CONFLICT (account_id) DO UPDATE SET
  balance = EXCLUDED.balance + account_credits.balance,
  total_purchased = EXCLUDED.total_purchased + account_credits.total_purchased,
  total_consumed = EXCLUDED.total_consumed + account_credits.total_consumed;

-- 12. Migrar dados existentes de credit_transactions para account_credit_transactions
INSERT INTO public.account_credit_transactions (account_id, user_id, transaction_type, amount, balance_after, description, related_action, vindi_charge_id, created_at)
SELECT 
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
WHERE p.account_id IS NOT NULL;