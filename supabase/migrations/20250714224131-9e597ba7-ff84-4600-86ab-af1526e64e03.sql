-- Criar perfis para os usuários que não têm perfil
INSERT INTO public.profiles (
  user_id, 
  full_name, 
  email, 
  role, 
  user_type, 
  created_by,
  account_id,
  is_active
) 
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.email),
  u.email,
  CAST(COALESCE(u.raw_user_meta_data ->> 'role', 'assistant') AS user_role),
  CAST(COALESCE(u.raw_user_meta_data ->> 'user_type', 'therapist') AS user_type),
  COALESCE((u.raw_user_meta_data ->> 'created_by')::uuid, u.id),
  '00000000-0000-0000-0000-000000000000',
  true
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL
  AND u.raw_user_meta_data IS NOT NULL;