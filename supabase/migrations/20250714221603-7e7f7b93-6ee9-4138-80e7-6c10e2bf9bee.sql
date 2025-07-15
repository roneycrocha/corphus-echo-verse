-- Criar perfil para o usuário Maria que não foi criado automaticamente
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
  '464da8d2-1ff3-4081-9248-1b0e4e1deeee',
  'Maria',
  'maria@cdtsofware.com.br',
  'assistant',
  'therapist',
  '00000000-0000-0000-0000-000000000000',
  'b8d7a453-a8cf-4441-b2f0-3e09417b1551',
  true
)
ON CONFLICT (user_id) DO NOTHING;