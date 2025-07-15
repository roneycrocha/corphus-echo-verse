-- Criar perfil para o usuário teste com assinatura ativa
INSERT INTO public.profiles (
  user_id, 
  full_name, 
  email, 
  role, 
  user_type, 
  account_id,
  is_active
) VALUES (
  '5b4e4747-81d1-4dad-9f9f-cc1a2abcc4c7',
  'teste1752529888457@teste.com',
  'teste1752529888457@teste.com',
  'assistant'::user_role,
  'therapist'::user_type,
  '00000000-0000-0000-0000-000000000000',
  true
) ON CONFLICT (user_id) DO NOTHING;