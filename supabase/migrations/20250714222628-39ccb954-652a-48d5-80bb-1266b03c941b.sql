-- Criar perfil para o usuário que ficou órfão devido ao erro na função
INSERT INTO public.profiles (
  user_id,
  full_name,
  email,
  role,
  user_type,
  account_id,
  created_by,
  is_active
) VALUES (
  '7ab7a24d-6ed4-40c1-8a4a-3d435c76e781',
  'Marcos ELS',
  'marcoels@cdtsofware.com.br',
  'assistant',
  'therapist',
  '00000000-0000-0000-0000-000000000000',
  'b8d7a453-a8cf-4441-b2f0-3e09417b1551',
  true
)
ON CONFLICT (user_id) DO NOTHING;