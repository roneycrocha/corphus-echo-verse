-- Criar sistema multi-tenant (continuação - corrigindo tabelas sem account_id)

-- 1. Criar tabela de contas/organizações (se não existir)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address JSONB,
  subscription_status TEXT DEFAULT 'active',
  subscription_plan TEXT DEFAULT 'basic',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 2. Adicionar account_id apenas nas tabelas que não têm
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.body_analyses 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.transcriptions 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.conversation_analyses 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.treatment_plans 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.therapeutic_actions 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.action_executions 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

-- 3. Habilitar RLS na tabela accounts (se não estiver habilitado)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS para accounts (com IF NOT EXISTS)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'Users can view their own account') THEN
    CREATE POLICY "Users can view their own account" 
    ON public.accounts 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() 
        AND p.account_id = accounts.id
      )
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'Account admins can manage their account') THEN
    CREATE POLICY "Account admins can manage their account" 
    ON public.accounts 
    FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() 
        AND p.account_id = accounts.id 
        AND p.role = 'admin'
      )
    );
  END IF;
END $$;

-- 5. Criar função para obter account_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT account_id FROM public.profiles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- 6. Trigger para atualizar updated_at (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_accounts_updated_at') THEN
    CREATE TRIGGER update_accounts_updated_at
      BEFORE UPDATE ON public.accounts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;