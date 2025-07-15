-- Criar tabela de plano de contas
CREATE TABLE public.account_plan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('receita', 'despesa', 'ativo', 'passivo', 'patrimonio')),
  parent_id UUID REFERENCES public.account_plan(id),
  level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de lançamentos financeiros (entradas e saídas)
CREATE TABLE public.financial_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.account_plan(id),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('debito', 'credito')),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  patient_id UUID REFERENCES public.patients(id),
  session_id UUID REFERENCES public.sessions(id),
  reference_document TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de categorias de despesas
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de despesas
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  supplier_name TEXT,
  reference_document TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_type TEXT CHECK (recurrence_type IN ('mensal', 'trimestral', 'semestral', 'anual')),
  attachment_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pago' CHECK (status IN ('pago', 'pendente', 'cancelado')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.account_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Políticas para account_plan
CREATE POLICY "Authenticated users can view account plan" 
ON public.account_plan FOR SELECT 
USING (is_authenticated());

CREATE POLICY "Admins can manage account plan" 
ON public.account_plan FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role = 'admin' 
  AND is_active = true
));

-- Políticas para financial_entries
CREATE POLICY "Users can view own financial entries" 
ON public.financial_entries FOR SELECT 
USING (created_by = auth.uid() OR is_authenticated());

CREATE POLICY "Therapists can create financial entries" 
ON public.financial_entries FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  ) AND created_by = auth.uid()
);

CREATE POLICY "Therapists can update own financial entries" 
ON public.financial_entries FOR UPDATE 
USING (created_by = auth.uid());

-- Políticas para expense_categories
CREATE POLICY "Authenticated users can view expense categories" 
ON public.expense_categories FOR SELECT 
USING (is_authenticated());

CREATE POLICY "Admins can manage expense categories" 
ON public.expense_categories FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role = 'admin' 
  AND is_active = true
));

-- Políticas para expenses
CREATE POLICY "Users can view own expenses" 
ON public.expenses FOR SELECT 
USING (created_by = auth.uid() OR is_authenticated());

CREATE POLICY "Therapists can create expenses" 
ON public.expenses FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  ) AND created_by = auth.uid()
);

CREATE POLICY "Therapists can update own expenses" 
ON public.expenses FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Therapists can delete own expenses" 
ON public.expenses FOR DELETE 
USING (created_by = auth.uid());

-- Triggers para updated_at
CREATE TRIGGER update_account_plan_updated_at
  BEFORE UPDATE ON public.account_plan
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_entries_updated_at
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir plano de contas básico
INSERT INTO public.account_plan (code, name, account_type, level) VALUES
-- Receitas
('1', 'RECEITAS', 'receita', 1),
('1.1', 'Receitas Operacionais', 'receita', 2),
('1.1.1', 'Consultas', 'receita', 3),
('1.1.2', 'Sessões de Terapia', 'receita', 3),
('1.1.3', 'Análises Corporais', 'receita', 3),

-- Despesas
('2', 'DESPESAS', 'despesa', 1),
('2.1', 'Despesas Operacionais', 'despesa', 2),
('2.1.1', 'Aluguel', 'despesa', 3),
('2.1.2', 'Energia Elétrica', 'despesa', 3),
('2.1.3', 'Internet', 'despesa', 3),
('2.1.4', 'Telefone', 'despesa', 3),
('2.1.5', 'Material de Escritório', 'despesa', 3),
('2.2', 'Despesas com Pessoal', 'despesa', 2),
('2.2.1', 'Salários', 'despesa', 3),
('2.2.2', 'Benefícios', 'despesa', 3),
('2.3', 'Despesas Administrativas', 'despesa', 2),
('2.3.1', 'Contador', 'despesa', 3),
('2.3.2', 'Advogado', 'despesa', 3),
('2.3.3', 'Software', 'despesa', 3);

-- Inserir categorias de despesas padrão
INSERT INTO public.expense_categories (name, description, color) VALUES
('Aluguel e Condomínio', 'Despesas com aluguel do consultório e condomínio', '#DC2626'),
('Utilities', 'Energia, água, internet, telefone', '#2563EB'),
('Material e Equipamentos', 'Materiais de escritório, equipamentos médicos', '#7C3AED'),
('Pessoal', 'Salários, benefícios, terceirizados', '#059669'),
('Marketing', 'Publicidade, materiais de divulgação', '#EA580C'),
('Educação', 'Cursos, livros, congressos', '#0891B2'),
('Impostos e Taxas', 'Impostos, taxas governamentais', '#BE123C'),
('Serviços Profissionais', 'Contador, advogado, consultoria', '#6366F1'),
('Manutenção', 'Limpeza, manutenção de equipamentos', '#65A30D'),
('Outros', 'Despesas diversas', '#6B7280');