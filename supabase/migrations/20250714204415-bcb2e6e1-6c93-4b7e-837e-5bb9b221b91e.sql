-- Atualizar a função handle_new_user para melhor tratamento de erros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_account_id uuid;
  creator_id uuid;
  user_role_value text := 'assistant';
  user_type_value text := 'therapist';
  user_full_name text;
  user_email text;
  user_phone text;
BEGIN
  -- Extrair dados do usuário
  user_email := NEW.email;
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  user_phone := NEW.raw_user_meta_data ->> 'phone';
  
  -- Extrair o ID do criador dos metadados
  creator_id := COALESCE((NEW.raw_user_meta_data ->> 'created_by')::uuid, NEW.id);
  
  -- Log para debug
  RAISE LOG 'handle_new_user: Starting for user_id: %, email: %', NEW.id, user_email;
  
  -- Se há um criador diferente (usuário sendo criado por outro usuário)
  IF creator_id != NEW.id THEN
    -- Usar a conta do criador
    SELECT account_id INTO target_account_id
    FROM public.profiles
    WHERE user_id = creator_id
    AND is_active = true
    LIMIT 1;
    
    RAISE LOG 'handle_new_user: Found creator account_id: %', target_account_id;
  END IF;
  
  -- Se não encontrou conta do criador, criar nova conta organizacional
  IF target_account_id IS NULL THEN
    target_account_id := gen_random_uuid();
    
    RAISE LOG 'handle_new_user: Creating new account with id: %', target_account_id;
    
    -- Criar nova conta organizacional
    INSERT INTO public.accounts (id, name, subscription_status, subscription_plan, is_active)
    VALUES (target_account_id, 'Clínica ' || user_full_name, 'active', 'bronze', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  -- Preparar valores para role e user_type
  user_role_value := COALESCE(NEW.raw_user_meta_data ->> 'role', 'assistant');
  user_type_value := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'therapist');
  
  -- Verificar se o perfil já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RAISE LOG 'handle_new_user: Profile already exists for user_id: %', NEW.id;
    RETURN NEW;
  END IF;
  
  RAISE LOG 'handle_new_user: Creating profile for user_id: %', NEW.id;
  
  -- Inserir perfil do novo usuário
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email, 
    phone,
    role, 
    user_type, 
    created_by,
    account_id,
    is_active
  ) VALUES (
    NEW.id,
    user_full_name,
    user_email,
    user_phone,
    user_role_value::user_role,
    user_type_value::user_type,
    creator_id,  
    target_account_id,
    true
  );
  
  RAISE LOG 'handle_new_user: Successfully created profile for user_id: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log detalhado do erro
    RAISE LOG 'handle_new_user ERROR: % % - user_id: %, email: %, sqlstate: %', 
              SQLERRM, SQLSTATE, NEW.id, user_email, SQLSTATE;
    
    -- Não bloquear a criação do usuário
    RETURN NEW;
END;
$$;