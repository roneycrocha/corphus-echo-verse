-- Criar política para permitir que o sistema crie profiles durante a criação de usuários
CREATE POLICY "System can create profiles during user creation" 
ON public.profiles 
FOR INSERT 
TO public
WITH CHECK (true);

-- Verificar se a trigger de criação de usuário está funcionando
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';