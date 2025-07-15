-- Atualizar a função handle_new_user para vincular à conta atual
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_account_id uuid;
BEGIN
  -- Buscar o account_id do usuário criador se disponível
  SELECT account_id INTO current_account_id
  FROM public.profiles
  WHERE user_id = (NEW.raw_user_meta_data ->> 'created_by')::uuid;
  
  -- Se não encontrar, buscar o primeiro account_id disponível
  IF current_account_id IS NULL THEN
    SELECT id INTO current_account_id
    FROM public.accounts
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1;
  END IF;
  
  -- Inserir perfil com dados do raw_user_meta_data
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email, 
    phone,
    role, 
    user_type, 
    created_by,
    account_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'assistant')::user_role,
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'therapist')::user_type,
    COALESCE((NEW.raw_user_meta_data ->> 'created_by')::uuid, NEW.id),
    current_account_id
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro para debug
    RAISE LOG 'Erro na função handle_new_user: % %', SQLERRM, SQLSTATE;
    RETURN NEW; -- Continuar mesmo com erro
END;
$$;