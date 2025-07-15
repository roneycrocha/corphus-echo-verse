-- Criar função para gerar nova conta durante signup
CREATE OR REPLACE FUNCTION public.create_account_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_account_id uuid;
  user_name text;
BEGIN
  -- Log para debug
  RAISE LOG 'create_account_for_user: Starting for user_id: %', NEW.id;
  
  -- Verificar se o perfil já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RAISE LOG 'create_account_for_user: Profile already exists for user_id: %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Extrair nome do usuário dos metadados ou usar email
  user_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  -- Criar nova conta para o usuário
  INSERT INTO public.accounts (name, email, is_active)
  VALUES (
    COALESCE(user_name || '''s Account', 'Nova Conta'),
    NEW.email,
    true
  ) RETURNING id INTO new_account_id;
  
  RAISE LOG 'create_account_for_user: Created new account % for user %', new_account_id, NEW.id;
  
  -- Criar perfil do usuário na nova conta
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email, 
    role, 
    user_type, 
    created_by,
    account_id,
    is_active
  ) VALUES (
    NEW.id,
    user_name,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'admin')::public.user_role, -- Primeiro usuário da conta é admin
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'therapist')::public.user_type,
    NEW.id,
    new_account_id,
    true
  );
  
  RAISE LOG 'create_account_for_user: Successfully created profile for user_id: % with account_id: %', NEW.id, new_account_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não bloquear a criação do usuário
    RAISE LOG 'create_account_for_user ERROR: % % - user_id: %', 
              SQLERRM, SQLSTATE, NEW.id;
    RETURN NEW;
END;
$$;

-- Substituir o trigger antigo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_account_for_user();