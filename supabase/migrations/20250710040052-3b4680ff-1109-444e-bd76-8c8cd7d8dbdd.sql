-- Primeiro, remover a política que usa a coluna role
DROP POLICY IF EXISTS "Therapists can manage all patients" ON public.patients;

-- Remover a função que usa o enum
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Remover o valor padrão da coluna role
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

-- Recriar a função atualizada
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT role FROM public.profiles WHERE user_id = user_uuid AND is_active = true;
$function$;

-- Recriar a política atualizada com o novo role
CREATE POLICY "Therapists can manage all patients" 
ON public.patients 
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = ANY (ARRAY['admin'::user_role, 'specialist'::user_role, 'secretary'::user_role, 'assistant'::user_role])
  )
);