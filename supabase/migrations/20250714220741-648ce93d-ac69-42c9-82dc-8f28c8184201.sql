-- Atualizar o usuário de teste para ter permissão de admin
UPDATE public.profiles 
SET role = 'admin'::user_role
WHERE user_id = '5b4e4747-81d1-4dad-9f9f-cc1a2abcc4c7';