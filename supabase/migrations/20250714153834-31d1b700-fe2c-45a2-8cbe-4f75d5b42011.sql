-- Criar sistema multi-tenant (multi-inquilino)

-- 1. Criar tabela de contas/organizações
CREATE TABLE public.accounts (
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

-- 2. Adicionar account_id na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

-- 3. Adicionar account_id nas tabelas de dados
ALTER TABLE public.patients 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.sessions 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.body_analyses 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.transcriptions 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.conversation_analyses 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.medical_records 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.treatment_plans 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.therapeutic_actions 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.action_executions 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.financial_entries 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.transactions 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

ALTER TABLE public.expenses 
ADD COLUMN account_id UUID REFERENCES public.accounts(id);

-- 4. Habilitar RLS na tabela accounts
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS para accounts
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

-- 6. Criar função para obter account_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT account_id FROM public.profiles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- 7. Trigger para atualizar updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.accounts IS 'Contas/Organizações no sistema multi-tenant';
COMMENT ON FUNCTION public.get_user_account_id() IS 'Retorna o account_id do usuário atual';
COMMENT ON COLUMN public.profiles.account_id IS 'Conta à qual o usuário pertence';
COMMENT ON COLUMN public.patients.account_id IS 'Conta à qual o paciente pertence';