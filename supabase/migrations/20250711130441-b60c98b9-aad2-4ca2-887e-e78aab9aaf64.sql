-- Atualizar função para que pacientes tenham um papel mais específico
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Verificar se é um paciente (baseado em metadata)
  IF NEW.raw_user_meta_data ->> 'user_type' = 'patient' THEN
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      'assistant', -- Manter assistant mas será filtrado pela interface
      'patient'
    );
  ELSE
    -- Usuário terapeuta padrão (qualquer registro via signup normal)
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      'specialist', -- Definir como specialist por padrão para terapeutas
      'therapist'
    );
  END IF;
  RETURN NEW;
END;
$$;