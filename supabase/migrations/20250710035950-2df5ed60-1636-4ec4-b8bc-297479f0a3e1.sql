-- Atualizar o enum user_role para trocar 'doctor' por 'specialist'
-- Primeiro, criar o novo tipo enum
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

-- Atualizar a função get_user_role para usar o novo enum
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT role FROM public.profiles WHERE user_id = user_uuid AND is_active = true;
$function$;