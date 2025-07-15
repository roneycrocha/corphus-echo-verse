-- Criar tabela de relacionamento entre planos e pacotes
CREATE TABLE public.plan_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type subscription_plan NOT NULL,
  package_id UUID NOT NULL REFERENCES credit_packages(id) ON DELETE CASCADE,
  bonus_multiplier NUMERIC DEFAULT 1.0, -- Multiplicador adicional de bônus para o plano
  is_featured BOOLEAN DEFAULT false, -- Se é pacote em destaque para o plano
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_type, package_id)
);

-- Habilitar RLS
ALTER TABLE public.plan_packages ENABLE ROW LEVEL SECURITY;

-- Política para visualização (todos autenticados podem ver)
CREATE POLICY "Everyone can view plan packages" 
ON public.plan_packages 
FOR SELECT 
USING (true);

-- Política para administração (apenas service role)
CREATE POLICY "Service can manage plan packages" 
ON public.plan_packages 
FOR ALL 
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_plan_packages_updated_at
BEFORE UPDATE ON public.plan_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais - associar todos os pacotes aos planos por enquanto
-- Bronze: acesso aos pacotes básicos
INSERT INTO public.plan_packages (plan_type, package_id, bonus_multiplier, is_featured) VALUES
('bronze', '801cb8ec-cce6-4282-a32e-5e89be1db261', 1.0, true), -- Starter Pack
('bronze', 'da192a57-163b-40e9-a056-4fc34f9cb6a2', 1.0, false), -- Pacote Básico
('bronze', 'a52016f4-e0f2-4c92-b954-6bb15ca12169', 1.0, false); -- Popular Pack

-- Silver: acesso aos pacotes intermediários com bônus
INSERT INTO public.plan_packages (plan_type, package_id, bonus_multiplier, is_featured) VALUES
('silver', '801cb8ec-cce6-4282-a32e-5e89be1db261', 1.2, false), -- Starter Pack com 20% mais bônus
('silver', 'da192a57-163b-40e9-a056-4fc34f9cb6a2', 1.2, false), -- Pacote Básico
('silver', 'a52016f4-e0f2-4c92-b954-6bb15ca12169', 1.3, true), -- Popular Pack em destaque
('silver', '89001cd2-3962-43c2-963b-a07c324bdeb3', 1.2, false), -- Business Pack
('silver', '1085aab3-352c-4da1-9073-55959d3de5bd', 1.3, false), -- Pacote Intermediário
('silver', '3d4383f2-2088-40d1-8935-31c696bcc0cf', 1.2, false); -- Pacote Avançado

-- Gold: acesso a todos os pacotes com máximo bônus
INSERT INTO public.plan_packages (plan_type, package_id, bonus_multiplier, is_featured) VALUES
('gold', '801cb8ec-cce6-4282-a32e-5e89be1db261', 1.5, false), -- Starter Pack
('gold', 'da192a57-163b-40e9-a056-4fc34f9cb6a2', 1.5, false), -- Pacote Básico
('gold', 'a52016f4-e0f2-4c92-b954-6bb15ca12169', 1.5, false), -- Popular Pack
('gold', '89001cd2-3962-43c2-963b-a07c324bdeb3', 1.6, false), -- Business Pack
('gold', '1085aab3-352c-4da1-9073-55959d3de5bd', 1.6, false), -- Pacote Intermediário
('gold', '3d4383f2-2088-40d1-8935-31c696bcc0cf', 1.7, true), -- Pacote Avançado em destaque
('gold', 'bb229226-078d-4178-8ad9-2f6bb6b4fadf', 1.6, false), -- Professional Pack
('gold', 'ebfdc7e5-e062-4b2e-8b0e-584f76d1c671', 1.8, false), -- Pacote Premium
('gold', '3dc4366a-8ded-4290-add7-a0d4d9de12bc', 1.8, false), -- Enterprise Pack
('gold', '9795b2f7-d36a-4cf1-a941-67e8588ee726', 2.0, false); -- Pacote Empresarial com 100% mais bônus