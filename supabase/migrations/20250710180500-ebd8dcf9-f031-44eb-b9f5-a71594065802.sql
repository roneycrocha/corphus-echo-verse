-- Create enum for subscription plans
CREATE TYPE subscription_plan AS ENUM ('bronze', 'silver', 'gold');

-- Create enum for credit transaction types
CREATE TYPE credit_transaction_type AS ENUM ('purchase', 'consumption', 'admin_adjustment', 'plan_bonus');

-- Create subscription plans table with pricing
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan_type subscription_plan NOT NULL UNIQUE,
    monthly_price DECIMAL(10,2) NOT NULL,
    credit_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- Multiplier for credit costs
    monthly_credits INTEGER DEFAULT 0, -- Free credits per month
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_type subscription_plan NOT NULL,
    vindi_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- active, canceled, expired, pending
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    next_billing_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user credits table
CREATE TABLE public.user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    balance INTEGER NOT NULL DEFAULT 0,
    total_purchased INTEGER NOT NULL DEFAULT 0,
    total_consumed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create credit transactions table
CREATE TABLE public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_type credit_transaction_type NOT NULL,
    amount INTEGER NOT NULL, -- Positive for additions, negative for consumptions
    balance_after INTEGER NOT NULL,
    description TEXT NOT NULL,
    related_action TEXT, -- What action triggered this (e.g., 'ai_report', 'ai_consultation')
    vindi_charge_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create credit packages table
CREATE TABLE public.credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    bonus_credits INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, plan_type, monthly_price, credit_multiplier, monthly_credits, features) VALUES
('Bronze', 'bronze', 29.90, 1.0, 10, '["Basic features", "10 free credits monthly"]'),
('Silver', 'silver', 59.90, 0.8, 25, '["All Bronze features", "25 free credits monthly", "20% discount on credits"]'),
('Gold', 'gold', 99.90, 0.6, 50, '["All Silver features", "50 free credits monthly", "40% discount on credits", "Priority support"]');

-- Insert default credit packages
INSERT INTO public.credit_packages (name, credits, price, bonus_credits) VALUES
('Starter Pack', 50, 19.90, 5),
('Popular Pack', 100, 35.90, 15),
('Business Pack', 200, 65.90, 35),
('Professional Pack', 500, 149.90, 100),
('Enterprise Pack', 1000, 279.90, 250);

-- Enable Row Level Security
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Everyone can view subscription plans" ON public.subscription_plans
FOR SELECT USING (is_active = true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own subscription" ON public.user_subscriptions
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service can manage subscriptions" ON public.user_subscriptions
FOR ALL USING (true);

-- RLS Policies for user_credits
CREATE POLICY "Users can view own credits" ON public.user_credits
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can manage credits" ON public.user_credits
FOR ALL USING (true);

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can manage transactions" ON public.credit_transactions
FOR ALL USING (true);

-- RLS Policies for credit_packages (public read)
CREATE POLICY "Everyone can view credit packages" ON public.credit_packages
FOR SELECT USING (is_active = true);

-- Function to initialize user credits
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume credits
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_action TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id;
  
  -- Check if user has enough credits
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance - p_amount;
  
  -- Update user credits
  UPDATE public.user_credits
  SET 
    balance = new_balance,
    total_consumed = total_consumed + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    related_action
  ) VALUES (
    p_user_id,
    'consumption',
    -p_amount,
    new_balance,
    p_description,
    p_action
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_transaction_type credit_transaction_type DEFAULT 'purchase',
  p_vindi_charge_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance or initialize if doesn't exist
  SELECT balance INTO current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id;
  
  IF current_balance IS NULL THEN
    INSERT INTO public.user_credits (user_id, balance, total_purchased)
    VALUES (p_user_id, p_amount, CASE WHEN p_transaction_type = 'purchase' THEN p_amount ELSE 0 END);
    new_balance := p_amount;
  ELSE
    new_balance := current_balance + p_amount;
    UPDATE public.user_credits
    SET 
      balance = new_balance,
      total_purchased = CASE 
        WHEN p_transaction_type = 'purchase' THEN total_purchased + p_amount 
        ELSE total_purchased 
      END,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    vindi_charge_id
  ) VALUES (
    p_user_id,
    p_transaction_type,
    p_amount,
    new_balance,
    p_description,
    p_vindi_charge_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user credit info
CREATE OR REPLACE FUNCTION public.get_user_credit_info(p_user_id UUID)
RETURNS TABLE(
  balance INTEGER,
  total_purchased INTEGER,
  total_consumed INTEGER,
  plan_type subscription_plan,
  credit_multiplier DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(uc.balance, 0) as balance,
    COALESCE(uc.total_purchased, 0) as total_purchased,
    COALESCE(uc.total_consumed, 0) as total_consumed,
    COALESCE(us.plan_type, 'bronze') as plan_type,
    COALESCE(sp.credit_multiplier, 1.0) as credit_multiplier
  FROM public.user_credits uc
  FULL OUTER JOIN public.user_subscriptions us ON uc.user_id = us.user_id AND us.status = 'active'
  LEFT JOIN public.subscription_plans sp ON us.plan_type = sp.plan_type
  WHERE COALESCE(uc.user_id, us.user_id) = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize credits when user subscription is created
CREATE TRIGGER initialize_credits_on_subscription
AFTER INSERT ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.initialize_user_credits();

-- Create updated_at triggers
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at
BEFORE UPDATE ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_packages_updated_at
BEFORE UPDATE ON public.credit_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();