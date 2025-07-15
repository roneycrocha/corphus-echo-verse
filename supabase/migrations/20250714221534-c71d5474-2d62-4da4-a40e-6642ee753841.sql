-- Corrigir a função handle_new_user para não usar tipos enum diretamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_account_id uuid := '00000000-0000-0000-0000-000000000000';
  creator_id uuid;
  user_role_value text := 'assistant';
  user_type_value text := 'therapist';
BEGIN
  -- Extrair o ID do criador dos metadados se fornecido
  creator_id := COALESCE(
    (NEW.raw_user_meta_data ->> 'created_by')::uuid,
    (NEW.raw_user_meta_data -> 'data' ->> 'created_by')::uuid
  );
  
  -- Se há um criador, buscar a conta dele
  IF creator_id IS NOT NULL THEN
    SELECT account_id INTO target_account_id
    FROM public.profiles
    WHERE user_id = creator_id
    AND is_active = true
    LIMIT 1;
    
    RAISE LOG 'handle_new_user: creator_id=%, target_account_id=%', creator_id, target_account_id;
    
    -- Se não encontrou a conta do criador, usar a conta padrão
    IF target_account_id IS NULL THEN
      target_account_id := '00000000-0000-0000-0000-000000000000';
    END IF;
  END IF;
  
  -- Garantir que a conta existe
  INSERT INTO public.accounts (id, name, is_active)
  VALUES (target_account_id, 'Conta Padrão', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Preparar valores para role e user_type
  user_role_value := COALESCE(NEW.raw_user_meta_data ->> 'role', 'assistant');
  user_type_value := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'therapist');
  
  -- Inserir perfil do novo usuário
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email, 
    role, 
    user_type, 
    account_id,
    created_by,
    is_active
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    user_role_value::user_role,
    user_type_value::user_type,
    target_account_id,
    creator_id,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE LOG 'handle_new_user: Usuário % criado na conta % com role % e user_type %', NEW.id, target_account_id, user_role_value, user_type_value;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não bloquear a criação do usuário
    RAISE LOG 'Erro na função handle_new_user: % % - user_id: %', 
              SQLERRM, SQLSTATE, NEW.id;
    RETURN NEW;
END;
$$;