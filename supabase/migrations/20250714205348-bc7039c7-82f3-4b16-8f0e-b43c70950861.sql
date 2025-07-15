-- Verificar a configuração do Supabase Auth
SELECT * FROM auth.config;

-- Verificar se há hooks configurados no auth
SELECT id, hook_table_id, hook_name, created_at FROM auth.hooks LIMIT 10;

-- Verificar se há algum problema com identities
SELECT count(*) as total_identities FROM auth.identities;

-- Verificar se há logs de erro na tabela auth.audit_log_entries
SELECT id, instance_id, "time", log_type, payload::text 
FROM auth.audit_log_entries 
WHERE log_type = 'signup_error' 
ORDER BY "time" DESC 
LIMIT 5;