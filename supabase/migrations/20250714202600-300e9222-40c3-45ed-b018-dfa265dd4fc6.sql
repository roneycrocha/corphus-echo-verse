-- Corrigir sistema para permitir múltiplos usuários por conta

-- 1. Reverter a separação individual e criar contas organizacionais
-- Primeiro, vamos consolidar os usuários em contas organizacionais baseadas em domínio de email ou relacionamento

-- Criar conta principal para Breno (admin)
INSERT INTO public.accounts (id, name, subscription_status, subscription_plan, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'Clínica Breno', 'active', 'premium', true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  subscription_status = EXCLUDED.subscription_status,
  subscription_plan = EXCLUDED.subscription_plan;

-- Criar conta para Roney (separada)
INSERT INTO public.accounts (id, name, subscription_status, subscription_plan, is_active)
VALUES ('22222222-2222-2222-2222-222222222222', 'Clínica Roney', 'active', 'premium', true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  subscription_status = EXCLUDED.subscription_status,
  subscription_plan = EXCLUDED.subscription_plan;

-- 2. Agrupar usuários em contas organizacionais
-- Breno e Mari na mesma conta (Clínica Breno)
UPDATE public.profiles 
SET account_id = '11111111-1111-1111-1111-111111111111'
WHERE user_id IN (
  'f7fb242f-1b22-401c-886c-d5362f0da2af', -- brenonakg2@gmail.com
  '2dcb8ce0-52a2-44cc-89a8-8058e65598fc', -- brenonakgcdt@gmail.com
  'a0f65127-b726-4a44-9347-2d7a48a82c2e'  -- doutorharmonizacao@gmail.com (Mari)
);

-- Roney em conta separada
UPDATE public.profiles 
SET account_id = '22222222-2222-2222-2222-222222222222'
WHERE user_id IN (
  '5d6bc866-1ddd-4598-a3af-a4716e74b336', -- roney@cdtsoftware.com.br
  '3a47d4c7-4416-49a3-b74e-4ca943dcf711'  -- roney.rocha@gmail.com
);

-- 3. Definir papéis corretos para cada usuário
-- Breno como admin
UPDATE public.profiles 
SET role = 'admin'
WHERE user_id IN ('f7fb242f-1b22-401c-886c-d5362f0da2af', '2dcb8ce0-52a2-44cc-89a8-8058e65598fc');

-- Mari como secretária
UPDATE public.profiles 
SET role = 'secretary'
WHERE user_id = 'a0f65127-b726-4a44-9347-2d7a48a82c2e';

-- Roney como admin da sua conta
UPDATE public.profiles 
SET role = 'admin'
WHERE user_id IN ('5d6bc866-1ddd-4598-a3af-a4716e74b336', '3a47d4c7-4416-49a3-b74e-4ca943dcf711');

-- 4. Atualizar pacientes para ficarem na conta do criador
UPDATE public.patients 
SET account_id = (
  SELECT p.account_id 
  FROM public.profiles p 
  WHERE p.user_id = patients.created_by
)
WHERE patients.created_by IS NOT NULL;

-- 5. Limpar contas não utilizadas (as individuais que foram criadas)
DELETE FROM public.accounts 
WHERE id NOT IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000'
);

-- 6. Atualizar função handle_new_user para sistema multi-usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
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
  
  -- Se há um criador diferente (usuário sendo criado por outro usuário)
  IF creator_id != NEW.id THEN
    -- Usar a conta do criador
    SELECT account_id INTO target_account_id
    FROM public.profiles
    WHERE user_id = creator_id
    AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Se não encontrou conta do criador, criar nova conta organizacional
  IF target_account_id IS NULL THEN
    target_account_id := gen_random_uuid();
    
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
    target_account_id,
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

-- 7. Adicionar enum para secretary se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'secretary' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'secretary';
  END IF;
END $$;

-- Comentários
COMMENT ON TABLE public.accounts IS 'Contas organizacionais - uma conta pode ter múltiplos usuários';
COMMENT ON COLUMN public.profiles.account_id IS 'Conta organizacional à qual o usuário pertence';
COMMENT ON COLUMN public.profiles.role IS 'Papel do usuário dentro da conta (admin, doctor, secretary, etc)';
COMMENT ON COLUMN public.patients.account_id IS 'Conta organizacional à qual o paciente pertence';