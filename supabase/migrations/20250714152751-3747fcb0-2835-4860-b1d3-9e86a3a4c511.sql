-- Adicionar campo created_by na tabela profiles para rastrear quem criou cada usuário
ALTER TABLE public.profiles 
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Atualizar a função handle_new_user para incluir quem está criando o usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  creating_user_id UUID;
BEGIN
  -- Verificar se há um usuário logado criando este usuário
  -- Se não houver (signup próprio), usar o próprio ID do novo usuário
  creating_user_id := COALESCE(auth.uid(), NEW.id);
  
  -- Verificar se é um paciente (baseado em metadata)
  IF NEW.raw_user_meta_data ->> 'user_type' = 'patient' THEN
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type, created_by)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      'assistant', -- Manter assistant mas será filtrado pela interface
      'patient',
      creating_user_id
    );
  ELSE
    -- Usuário terapeuta padrão (qualquer registro via signup normal)
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type, created_by)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      'specialist', -- Definir como specialist por padrão para terapeutas
      'therapist',
      creating_user_id
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Atualizar registros existentes para que created_by seja o próprio user_id (auto-criados)
UPDATE public.profiles 
SET created_by = user_id 
WHERE created_by IS NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.created_by IS 'ID do usuário que criou este perfil';