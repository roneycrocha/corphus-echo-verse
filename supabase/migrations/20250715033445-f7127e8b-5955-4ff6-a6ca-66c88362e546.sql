-- Migração da gestão de créditos de usuário para conta (corrigida)

-- 1. Criar nova tabela account_credits para substituir user_credits
CREATE TABLE IF NOT EXISTS public.account_credits (
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
CREATE TABLE IF NOT EXISTS public.account_credit_transactions (
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

-- 3. Enable Row Level Security (se ainda não estiver habilitado)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'account_credits' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.account_credits ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'account_credit_transactions' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.account_credit_transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 4. Create RLS policies for account_credits (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_credits' AND policyname = 'Users can view their account credits') THEN
    CREATE POLICY "Users can view their account credits" 
    ON public.account_credits 
    FOR SELECT 
    USING (account_id = get_user_account_id());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_credits' AND policyname = 'Service can manage all account credits') THEN
    CREATE POLICY "Service can manage all account credits" 
    ON public.account_credits 
    FOR ALL 
    USING (true);
  END IF;
END $$;

-- 5. Create RLS policies for account_credit_transactions (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_credit_transactions' AND policyname = 'Users can view their account credit transactions') THEN
    CREATE POLICY "Users can view their account credit transactions" 
    ON public.account_credit_transactions 
    FOR SELECT 
    USING (account_id = get_user_account_id());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_credit_transactions' AND policyname = 'Service can manage all account credit transactions') THEN
    CREATE POLICY "Service can manage all account credit transactions" 
    ON public.account_credit_transactions 
    FOR ALL 
    USING (true);
  END IF;
END $$;

-- 6. Create indexes for performance (se não existirem)
CREATE INDEX IF NOT EXISTS idx_account_credits_account_id ON public.account_credits(account_id);
CREATE INDEX IF NOT EXISTS idx_account_credit_transactions_account_id ON public.account_credit_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_credit_transactions_created_at ON public.account_credit_transactions(created_at DESC);

-- 7. Create trigger for updating updated_at (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_account_credits_updated_at') THEN
    CREATE TRIGGER update_account_credits_updated_at
    BEFORE UPDATE ON public.account_credits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;