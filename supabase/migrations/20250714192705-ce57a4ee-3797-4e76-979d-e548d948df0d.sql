-- Remover a política problemática e criar uma nova mais específica
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON public.profiles;

-- Criar uma política específica para o trigger
CREATE POLICY "System can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  -- Permitir inserção se não há usuário autenticado (contexto de trigger)
  auth.uid() IS NULL OR
  -- Ou se o usuário está criando seu próprio perfil
  auth.uid() = user_id OR
  -- Ou se o usuário está na mesma conta
  account_id = get_user_account_id()
);

-- Recriar a função handle_new_user sem usar SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  current_account_id uuid := '00000000-0000-0000-0000-000000000000';
  creator_id uuid;
  user_role_value text := 'assistant';
  user_type_value text := 'therapist';
BEGIN
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
  INSERT INTO public.accounts (id, name, is_active)
  VALUES (current_account_id, 'Conta Padrão', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Preparar valores para role e user_type
  user_role_value := COALESCE(NEW.raw_user_meta_data ->> 'role', 'assistant');
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
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    user_role_value::user_role,
    user_type_value::user_type,
    creator_id,
    current_account_id,
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log do erro mas não bloquear a criação do usuário
    RAISE LOG 'Erro na função handle_new_user: % % - user_id: %', 
              SQLERRM, SQLSTATE, NEW.id;
    RETURN NEW;
END;
$$;