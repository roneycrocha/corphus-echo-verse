-- Criar trigger inteligente que detecta se é signup normal ou criação via admin
CREATE OR REPLACE FUNCTION public.handle_user_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  creator_account_id uuid;
  user_name text;
  new_account_id uuid;
  creator_user_id uuid;
BEGIN
  -- Log para debug
  RAISE LOG 'handle_user_creation: Starting for user_id: %', NEW.id;
  
  -- Verificar se o perfil já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RAISE LOG 'handle_user_creation: Profile already exists for user_id: %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Extrair nome do usuário dos metadados
  user_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  -- Verificar se foi especificado um created_by nos metadados (criação via admin)
  creator_user_id := (NEW.raw_user_meta_data ->> 'created_by')::uuid;
  
  IF creator_user_id IS NOT NULL THEN
    -- CENÁRIO: Admin criando usuário
    RAISE LOG 'handle_user_creation: Admin creation detected, creator: %', creator_user_id;
    
    -- Buscar account_id do admin que está criando
    SELECT account_id INTO creator_account_id 
    FROM public.profiles 
    WHERE user_id = creator_user_id 
    AND is_active = true
    LIMIT 1;
    
    IF creator_account_id IS NOT NULL THEN
      -- Criar perfil na conta do admin
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
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'assistant')::public.user_role,
        COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'therapist')::public.user_type,
        creator_user_id,
        creator_account_id,
        true
      );
      
      RAISE LOG 'handle_user_creation: Created profile in existing account % for user %', creator_account_id, NEW.id;
    ELSE
      RAISE LOG 'handle_user_creation: Creator account not found, falling back to new account creation';
      -- Fallback: criar nova conta se não encontrar a conta do criador
      creator_account_id := NULL;
    END IF;
  END IF;
  
  -- Se não foi criação via admin OU não encontrou conta do admin, criar nova conta
  IF creator_account_id IS NULL THEN
    -- CENÁRIO: Signup normal ou fallback
    RAISE LOG 'handle_user_creation: Normal signup detected, creating new account';
    
    -- Criar nova conta
    INSERT INTO public.accounts (name, email, is_active)
    VALUES (
      COALESCE(user_name || '''s Account', 'Nova Conta'),
      NEW.email,
      true
    ) RETURNING id INTO new_account_id;
    
    -- Criar perfil como admin da nova conta
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
      'admin'::public.user_role, -- Primeiro usuário da conta é admin
      'therapist'::public.user_type,
      NEW.id,
      new_account_id,
      true
    );
    
    RAISE LOG 'handle_user_creation: Created new account % and profile for user %', new_account_id, NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não bloquear a criação do usuário
    RAISE LOG 'handle_user_creation ERROR: % % - user_id: %', 
              SQLERRM, SQLSTATE, NEW.id;
    RETURN NEW;
END;
$$;

-- Substituir trigger atual
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_creation();