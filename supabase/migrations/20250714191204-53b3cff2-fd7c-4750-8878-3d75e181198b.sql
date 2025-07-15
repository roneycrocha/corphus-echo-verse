-- Primeiro, vamos criar uma conta padrão se não existir
INSERT INTO public.accounts (id, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000000', 'Conta Padrão', true)
ON CONFLICT (id) DO NOTHING;

-- Criar perfil para o usuário atual que não tem perfil
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
  '3a47d4c7-4416-49a3-b74e-4ca943dcf711',
  'Roney Conta2',
  'roney.rocha@gmail.com',
  'admin',
  'therapist',
  '3a47d4c7-4416-49a3-b74e-4ca943dcf711',
  '00000000-0000-0000-0000-000000000000',
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  account_id = '00000000-0000-0000-0000-000000000000',
  full_name = 'Roney Conta2',
  email = 'roney.rocha@gmail.com',
  is_active = true;

-- Corrigir a função handle_new_user para ser mais robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_account_id uuid;
  creator_id uuid;
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
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'assistant')::user_role,
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'therapist')::user_type,
    creator_id,
    current_account_id,
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log detalhado do erro
    RAISE LOG 'Erro na função handle_new_user: % % - user_id: % - creator_id: % - account_id: %', 
              SQLERRM, SQLSTATE, NEW.id, creator_id, current_account_id;
    
    -- Fallback: criar com dados mínimos
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
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      'assistant',
      'therapist',
      NEW.id,
      '00000000-0000-0000-0000-000000000000',
      true
    ) ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;