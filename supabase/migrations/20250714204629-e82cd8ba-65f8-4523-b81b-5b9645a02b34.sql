-- Criar política para permitir que o sistema crie user_credits durante a criação de usuários
CREATE POLICY "System can create user credits during user creation" 
ON public.user_credits 
FOR INSERT 
TO public
WITH CHECK (true);

-- Verificar se as políticas estão funcionando
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('accounts', 'profiles', 'user_credits')
AND schemaname = 'public'
ORDER BY tablename, policyname;