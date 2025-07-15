-- Primeiro, remover o valor padrão da coluna role
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Criar o novo tipo enum
CREATE TYPE user_role_new AS ENUM ('admin', 'specialist', 'secretary', 'assistant');

-- Atualizar a tabela profiles para usar o novo enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE user_role_new 
USING CASE 
  WHEN role = 'doctor' THEN 'specialist'::user_role_new
  ELSE role::text::user_role_new
END;

-- Atualizar a tabela role_permissions para usar o novo enum  
ALTER TABLE public.role_permissions 
ALTER COLUMN role TYPE user_role_new 
USING CASE 
  WHEN role = 'doctor' THEN 'specialist'::user_role_new
  ELSE role::text::user_role_new
END;

-- Remover o enum antigo e renomear o novo
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Restaurar o valor padrão com o novo enum
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'assistant'::user_role;