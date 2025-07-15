-- Criar perfil para o usuário que não foi criado automaticamente
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
) VALUES (
  'a0f65127-b726-4a44-9347-2d7a48a82c2e',
  'Mari Secretaria',
  'doutorharmonizacao@gmail.com',
  '12982817900',
  'assistant',
  'therapist',
  '3a47d4c7-4416-49a3-b74e-4ca943dcf711',
  COALESCE(
    (SELECT account_id FROM public.profiles WHERE user_id = '3a47d4c7-4416-49a3-b74e-4ca943dcf711' LIMIT 1),
    '00000000-0000-0000-0000-000000000000'
  ),
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  user_type = EXCLUDED.user_type,
  updated_at = now();