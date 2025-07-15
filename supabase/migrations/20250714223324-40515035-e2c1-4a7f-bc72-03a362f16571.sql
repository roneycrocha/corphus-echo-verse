-- Criar perfis para os usuários que não têm perfil
INSERT INTO public.profiles (
  user_id, 
  full_name, 
  email, 
  phone,
  role, 
  user_type, 
  created_by,
  account_id,
  is_active
) VALUES 
(
  'cdec44ff-aa94-45e0-a47b-4657381a5fd5',
  'joao',
  'joao@cdtsoftware.com.br',
  '',
  'assistant',
  'therapist',
  'b8d7a453-a8cf-4441-b2f0-3e09417b1551',
  '00000000-0000-0000-0000-000000000000',
  true
),
(
  'fa17ef83-a244-43ce-bfd4-af953289f996',
  'paula',
  'pauasl@cdtsofware.com.br',
  '',
  'assistant',
  'therapist',
  'b8d7a453-a8cf-4441-b2f0-3e09417b1551',
  '00000000-0000-0000-0000-000000000000',
  true
)
ON CONFLICT (user_id) DO NOTHING;