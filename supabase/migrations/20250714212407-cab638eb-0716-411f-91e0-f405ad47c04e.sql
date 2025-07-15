-- Criar usuário diretamente na base de dados para teste
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'teste@teste.com',
  crypt('senha123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Usuario Teste"}',
  false,
  'authenticated'
);

-- Obter o ID do usuário criado
SELECT id, email FROM auth.users WHERE email = 'teste@teste.com';

-- Garantir que a conta padrão existe
INSERT INTO public.accounts (id, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000000', 'Conta Padrão', true)
ON CONFLICT (id) DO NOTHING;