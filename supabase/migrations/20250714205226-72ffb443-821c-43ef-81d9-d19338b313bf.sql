-- Desabilitar temporariamente o trigger para diagnosticar o problema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Verificar se existem outras funções ou triggers que podem estar interferindo
SELECT trigger_name, event_object_schema, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' AND event_object_table = 'users'
ORDER BY trigger_name;

-- Verificar se há políticas RLS na tabela auth.users (que não deveria ter)
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'auth' AND tablename = 'users'
ORDER BY policyname;