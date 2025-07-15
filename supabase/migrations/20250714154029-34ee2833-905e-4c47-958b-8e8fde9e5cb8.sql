-- Atualizar políticas RLS para multi-tenancy por conta

-- 1. Atualizar políticas da tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view profiles from their account" 
ON public.profiles 
FOR SELECT 
USING (account_id = public.get_user_account_id());

CREATE POLICY "Account admins can manage profiles in their account" 
ON public.profiles 
FOR ALL 
USING (
  account_id = public.get_user_account_id() 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- 2. Atualizar políticas da tabela patients  
DROP POLICY IF EXISTS "Therapists can create patients" ON public.patients;
DROP POLICY IF EXISTS "Therapists can view own patients" ON public.patients;
DROP POLICY IF EXISTS "Therapists can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Therapists can delete own patients" ON public.patients;

CREATE POLICY "Users can manage patients from their account" 
ON public.patients 
FOR ALL 
USING (account_id = public.get_user_account_id());

-- 3. Atualizar função handle_new_user para criar conta automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  creating_user_id UUID;
  user_account_id UUID;
  new_account_id UUID;
BEGIN
  creating_user_id := COALESCE(auth.uid(), NEW.id);
  
  -- Se há um usuário logado criando este usuário, usar a conta do usuário logado
  IF auth.uid() IS NOT NULL AND auth.uid() != NEW.id THEN
    SELECT account_id INTO user_account_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1;
  END IF;
  
  -- Se não há conta definida (primeiro usuário de uma nova organização), criar uma nova conta
  IF user_account_id IS NULL THEN
    INSERT INTO public.accounts (name, email) 
    VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'organization_name', 'Nova Organização'),
      NEW.email
    ) 
    RETURNING id INTO new_account_id;
    user_account_id := new_account_id;
  END IF;
  
  -- Verificar se é um paciente (baseado em metadata)
  IF NEW.raw_user_meta_data ->> 'user_type' = 'patient' THEN
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type, created_by, account_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      'assistant',
      'patient',
      creating_user_id,
      user_account_id
    );
  ELSE
    -- Usuário terapeuta/admin
    -- Se é o primeiro usuário da conta (conta recém-criada), torná-lo admin
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type, created_by, account_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      CASE WHEN new_account_id IS NOT NULL THEN 'admin' ELSE 'specialist' END,
      'therapist',
      creating_user_id,
      user_account_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Atualizar dados existentes para ter uma conta padrão
DO $$ 
DECLARE
  default_account_id UUID;
BEGIN
  -- Verificar se já existe uma conta padrão
  SELECT id INTO default_account_id FROM public.accounts LIMIT 1;
  
  -- Se não existir, criar uma conta padrão
  IF default_account_id IS NULL THEN
    INSERT INTO public.accounts (name, email) 
    VALUES ('Conta Principal', 'admin@sistema.com') 
    RETURNING id INTO default_account_id;
  END IF;
  
  -- Atualizar profiles sem account_id
  UPDATE public.profiles 
  SET account_id = default_account_id 
  WHERE account_id IS NULL;
  
  -- Atualizar patients sem account_id
  UPDATE public.patients 
  SET account_id = default_account_id 
  WHERE account_id IS NULL;
  
  -- Atualizar outras tabelas importantes sem account_id
  UPDATE public.sessions 
  SET account_id = default_account_id 
  WHERE account_id IS NULL;
  
  UPDATE public.body_analyses 
  SET account_id = default_account_id 
  WHERE account_id IS NULL;
  
END $$;

-- Comentários
COMMENT ON POLICY "Users can view profiles from their account" ON public.profiles IS 'Usuários podem ver perfis da sua conta';
COMMENT ON POLICY "Account admins can manage profiles in their account" ON public.profiles IS 'Admins da conta podem gerenciar perfis na sua conta';
COMMENT ON POLICY "Users can manage patients from their account" ON public.patients IS 'Usuários podem gerenciar pacientes da sua conta';