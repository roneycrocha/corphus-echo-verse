-- Corrigir a função handle_new_user para funcionar sem cast problemático
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_account_id uuid := '00000000-0000-0000-0000-000000000000';
  creator_id uuid;
BEGIN
  -- Extrair o ID do criador dos metadados se fornecido
  creator_id := (NEW.raw_user_meta_data ->> 'created_by')::uuid;
  
  -- Se há um criador, buscar a conta dele
  IF creator_id IS NOT NULL THEN
    SELECT account_id INTO target_account_id
    FROM public.profiles
    WHERE user_id = creator_id
    AND is_active = true
    LIMIT 1;
    
    -- Se não encontrou a conta do criador, usar a conta padrão
    IF target_account_id IS NULL THEN
      target_account_id := '00000000-0000-0000-0000-000000000000';
    END IF;
  END IF;
  
  -- Garantir que a conta existe
  INSERT INTO public.accounts (id, name, is_active)
  VALUES (target_account_id, 'Conta Padrão', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Inserir perfil do novo usuário usando strings simples
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
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'assistant'),
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'therapist'),
    creator_id,
    target_account_id,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não bloquear a criação do usuário
    RAISE LOG 'Erro na função handle_new_user: % % - user_id: %', 
              SQLERRM, SQLSTATE, NEW.id;
    RETURN NEW;
END;
$$;