-- Corrigir a função handle_new_user para ser mais robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  current_account_id uuid := '00000000-0000-0000-0000-000000000000';
  creator_id uuid;
  user_role_value text := 'admin';
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
  
  -- Se há um criador diferente, tentar buscar sua conta
  IF creator_id != NEW.id THEN
    SELECT COALESCE(account_id, '00000000-0000-0000-0000-000000000000') 
    INTO current_account_id
    FROM public.profiles
    WHERE user_id = creator_id
    AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Garantir que a conta padrão existe
  INSERT INTO public.accounts (id, name, subscription_status, subscription_plan, is_active)
  VALUES (current_account_id, 'Conta Padrão', 'active', 'bronze', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Preparar valores para role e user_type
  user_role_value := COALESCE(NEW.raw_user_meta_data ->> 'role', 'admin');
  user_type_value := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'therapist');
  
  -- Verificar se o perfil já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
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
    current_account_id,
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não bloquear a criação do usuário
    RAISE LOG 'Erro na função handle_new_user: % % - user_id: %', 
              SQLERRM, SQLSTATE, NEW.id;
    RETURN NEW;
END;
$$;