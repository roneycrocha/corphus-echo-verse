-- Separar usuários em contas individuais ao invés de usar conta padrão

-- 1. Criar contas individuais para cada usuário que está na conta padrão
INSERT INTO public.accounts (id, name, subscription_status, subscription_plan, is_active)
SELECT 
  gen_random_uuid() as id,
  'Conta de ' || p.full_name as name,
  'active' as subscription_status,
  'bronze' as subscription_plan,
  true as is_active
FROM public.profiles p
WHERE p.account_id = '00000000-0000-0000-0000-000000000000'
AND p.user_type = 'therapist'
ON CONFLICT (id) DO NOTHING;

-- 2. Atualizar profiles para usar contas individuais
WITH new_accounts AS (
  SELECT 
    p.user_id,
    p.full_name,
    a.id as new_account_id,
    ROW_NUMBER() OVER (ORDER BY p.created_at) as rn
  FROM public.profiles p
  JOIN public.accounts a ON a.name = 'Conta de ' || p.full_name
  WHERE p.account_id = '00000000-0000-0000-0000-000000000000'
  AND p.user_type = 'therapist'
)
UPDATE public.profiles 
SET account_id = new_accounts.new_account_id
FROM new_accounts
WHERE profiles.user_id = new_accounts.user_id;

-- 3. Atualizar pacientes para ficarem na conta do seu criador
UPDATE public.patients 
SET account_id = (
  SELECT p.account_id 
  FROM public.profiles p 
  WHERE p.user_id = patients.created_by
)
WHERE account_id IS NULL OR account_id = '00000000-0000-0000-0000-000000000000';

-- 4. Atualizar função handle_new_user para criar conta individual para cada usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  current_account_id uuid;
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
  
  -- Se há um criador diferente, usar a conta dele
  IF creator_id != NEW.id THEN
    SELECT account_id INTO current_account_id
    FROM public.profiles
    WHERE user_id = creator_id
    AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Se não encontrou conta do criador ou é auto-registro, criar nova conta
  IF current_account_id IS NULL THEN
    current_account_id := gen_random_uuid();
    
    -- Criar nova conta para o usuário
    INSERT INTO public.accounts (id, name, subscription_status, subscription_plan, is_active)
    VALUES (current_account_id, 'Conta de ' || user_full_name, 'active', 'bronze', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
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