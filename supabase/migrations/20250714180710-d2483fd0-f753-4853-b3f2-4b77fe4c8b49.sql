-- Verificar se o trigger existe e removê-lo para recriar
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar a função handle_new_user completamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  creating_user_id UUID;
  user_account_id UUID;
  new_account_id UUID;
BEGIN
  creating_user_id := COALESCE(auth.uid(), NEW.id);
  
  -- Se há um usuário logado criando este usuário, usar a conta do usuário logado
  IF auth.uid() IS NOT NULL AND auth.uid() != NEW.id THEN
    SELECT account_id INTO user_account_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1;
  END IF;
  
  -- Se não há conta definida (primeiro usuário de uma nova organização), criar uma nova conta
  IF user_account_id IS NULL THEN
    INSERT INTO public.accounts (name, email) 
    VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'organization_name', 'Nova Organização'),
      NEW.email
    ) 
    RETURNING id INTO new_account_id;
    user_account_id := new_account_id;
  END IF;
  
  -- Verificar se é um paciente (baseado em metadata)
  IF NEW.raw_user_meta_data ->> 'user_type' = 'patient' THEN
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type, created_by, account_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      'assistant',
      'patient',
      creating_user_id,
      user_account_id
    );
  ELSE
    -- Usuário terapeuta/admin
    -- Se é o primeiro usuário da conta (conta recém-criada), torná-lo admin
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type, created_by, account_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      CASE WHEN new_account_id IS NOT NULL THEN 'admin' ELSE 'specialist' END,
      'therapist',
      creating_user_id,
      user_account_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();