-- Criar perfil para o usuário brenonakgcdt@gmail.com
INSERT INTO public.profiles (
  user_id, 
  full_name, 
  email, 
  role, 
  user_type, 
  account_id,
  is_active
) VALUES (
  '2dcb8ce0-52a2-44cc-89a8-8058e65598fc',
  'Breno Hideki Nakagawa',
  'brenonakgcdt@gmail.com',
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