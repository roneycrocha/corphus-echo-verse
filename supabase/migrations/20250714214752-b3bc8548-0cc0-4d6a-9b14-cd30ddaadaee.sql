-- Deletar o usuário atual e recriar com senha correta
DELETE FROM public.user_credits WHERE user_id = '55b1fb67-8b1d-4174-94df-a6883c9918cb';
DELETE FROM public.profiles WHERE user_id = '55b1fb67-8b1d-4174-94df-a6883c9918cb';
DELETE FROM auth.users WHERE email = 'teste@teste.com';

-- Criar usuário usando a extensão pgcrypto adequadamente
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'teste@teste.com',
  '$2a$10$' || encode(digest('senha123' || gen_random_uuid()::text, 'sha256'), 'hex'),
  now(),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Usuario Teste"}',
  false,
  now(),
  now()
);

-- Verificar se foi criado
SELECT id, email FROM auth.users WHERE email = 'teste@teste.com';