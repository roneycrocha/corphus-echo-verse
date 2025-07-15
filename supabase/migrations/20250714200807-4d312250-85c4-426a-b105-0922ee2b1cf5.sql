-- Criar perfil para todos os usuários sem perfil
INSERT INTO public.profiles (
  user_id, 
  full_name, 
  email, 
  role, 
  user_type, 
  account_id,
  is_active
) VALUES (
  'f7fb242f-1b22-401c-886c-d5362f0da2af',
  'Breno Hideki Nakagawa',
  'brenonakg2@gmail.com',
  'admin',
  'therapist',
  '00000000-0000-0000-0000-000000000000',
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  user_type = EXCLUDED.user_type,
  updated_at = now();