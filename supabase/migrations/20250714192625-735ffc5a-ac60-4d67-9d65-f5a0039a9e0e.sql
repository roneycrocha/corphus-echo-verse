-- Desabilitar temporariamente o trigger para teste
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Verificar se há algum conflito nas políticas RLS da tabela profiles
SELECT policyname, cmd, permissive, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';