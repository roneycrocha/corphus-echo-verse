-- Criar perfil para o usuário teste
INSERT INTO public.profiles (
  user_id, 
  full_name, 
  email, 
  role, 
  user_type, 
  created_by,
  account_id,
  is_active
) VALUES (
  '55b1fb67-8b1d-4174-94df-a6883c9918cb',
  'Usuario Teste',
  'teste@teste.com',
  'assistant'::user_role,
  'therapist'::user_type,
  '55b1fb67-8b1d-4174-94df-a6883c9918cb',
  '00000000-0000-0000-0000-000000000000',
  true
);

-- Criar créditos iniciais para o usuário
INSERT INTO public.user_credits (user_id, balance, total_purchased, total_consumed)
VALUES ('55b1fb67-8b1d-4174-94df-a6883c9918cb', 0, 0, 0)
ON CONFLICT (user_id) DO NOTHING;