-- Remover completamente o trigger para testar
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verificar se há outros triggers interferindo
SELECT trigger_name, event_object_schema, event_object_table 
FROM information_schema.triggers 
WHERE event_object_schema = 'auth';