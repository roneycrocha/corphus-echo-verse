-- Insert default credit packages
INSERT INTO public.credit_packages (name, credits, price, bonus_credits, is_active) VALUES
  ('Pacote Básico', 100, 29.90, 10, true),
  ('Pacote Intermediário', 250, 69.90, 30, true),
  ('Pacote Avançado', 500, 129.90, 75, true),
  ('Pacote Premium', 1000, 229.90, 200, true),
  ('Pacote Empresarial', 2500, 499.90, 500, true)
ON CONFLICT (name) DO UPDATE SET
  credits = EXCLUDED.credits,
  price = EXCLUDED.price,
  bonus_credits = EXCLUDED.bonus_credits,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Insert default subscription plans
INSERT INTO public.subscription_plans (plan_type, name, monthly_price, monthly_credits, credit_multiplier, features, is_active) VALUES
  ('bronze', 'Plano Bronze', 39.90, 50, 1.0, '["Acesso básico", "50 créditos mensais", "Suporte por email"]'::jsonb, true),
  ('silver', 'Plano Silver', 79.90, 150, 0.9, '["Acesso completo", "150 créditos mensais", "10% desconto em créditos", "Suporte prioritário"]'::jsonb, true),
  ('gold', 'Plano Gold', 149.90, 300, 0.8, '["Acesso premium", "300 créditos mensais", "20% desconto em créditos", "Suporte 24/7", "Relatórios avançados"]'::jsonb, true)
ON CONFLICT (plan_type) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price,
  monthly_credits = EXCLUDED.monthly_credits,
  credit_multiplier = EXCLUDED.credit_multiplier,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = now();