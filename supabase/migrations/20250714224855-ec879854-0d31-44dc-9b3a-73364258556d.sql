-- Criar perfil para o usuário "tio" que não foi criado pelo trigger
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
  'b3f0cf0a-ba50-4160-b476-1708ba1c4263',
  'tio',
  'tio@cdtsoftware.com.br',
  'assistant'::public.user_role,
  'therapist'::public.user_type,
  'b8d7a453-a8cf-4441-b2f0-3e09417b1551',
  '00000000-0000-0000-0000-000000000000',
  true
) ON CONFLICT (user_id) DO NOTHING;