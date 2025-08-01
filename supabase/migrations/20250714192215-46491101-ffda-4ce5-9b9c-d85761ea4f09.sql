-- Adicionar política RLS para permitir inserção pelo trigger handle_new_user
CREATE POLICY "Allow trigger to insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- Recriar a função handle_new_user com melhor tratamento de erros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_account_id uuid;
  creator_id uuid;
  user_role_value text;
  user_type_value text;
BEGIN
  -- Extrair o ID do criador dos metadados
  creator_id := COALESCE((NEW.raw_user_meta_data ->> 'created_by')::uuid, NEW.id);
  
  -- Buscar o account_id do usuário criador
  IF creator_id != NEW.id THEN
    SELECT account_id INTO current_account_id
    FROM public.profiles
    WHERE user_id = creator_id
    AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Se não encontrar conta do criador, usar a conta padrão
  IF current_account_id IS NULL THEN
    current_account_id := '00000000-0000-0000-0000-000000000000';
  END IF;
  
  -- Garantir que a conta padrão existe
  INSERT INTO public.accounts (id, name, is_active)
  VALUES (current_account_id, 'Conta Padrão', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Preparar valores para role e user_type
  user_role_value := COALESCE(NEW.raw_user_meta_data ->> 'role', 'assistant');
  user_type_value := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'therapist');
  
  -- Verificar se o perfil já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RAISE LOG 'Perfil já existe para o usuário: %', NEW.id;
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
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    user_role_value::user_role,
    user_type_value::user_type,
    creator_id,
    current_account_id,
    true
  );
  
  RAISE LOG 'Perfil criado com sucesso para o usuário: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE LOG 'Perfil já existe para o usuário: %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log detalhado do erro
    RAISE LOG 'Erro na função handle_new_user: % % - user_id: % - creator_id: % - account_id: %', 
              SQLERRM, SQLSTATE, NEW.id, creator_id, current_account_id;
    
    -- Não fazer fallback, deixar o erro ser propagado
    RAISE;
END;
$$;