-- Desabilitar trigger temporariamente para teste
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar uma função mais simples para teste
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Função simplificada para teste
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email, 
    role, 
    user_type, 
    created_by
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    'admin',
    'therapist',
    NEW.id
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro para debug
    RAISE LOG 'Erro na função handle_new_user: % %', SQLERRM, SQLSTATE;
    RETURN NEW; -- Continuar mesmo com erro
END;
$function$;

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();