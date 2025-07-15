-- Simplificar a função handle_new_user para evitar interferências no processo de auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  default_account_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Log para debug
  RAISE LOG 'handle_new_user: Starting for user_id: %', NEW.id;
  
  -- Verificar se o perfil já existe para evitar duplicatas
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RAISE LOG 'handle_new_user: Profile already exists for user_id: %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Garantir que a conta padrão existe
  INSERT INTO public.accounts (id, name, is_active)
  VALUES (default_account_id, 'Conta Padrão', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Inserir perfil básico do usuário
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
    'assistant'::user_role,
    'therapist'::user_type,
    NEW.id,
    default_account_id,
    true
  );
  
  RAISE LOG 'handle_new_user: Successfully created profile for user_id: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não bloquear a criação do usuário
    RAISE LOG 'handle_new_user ERROR: % % - user_id: %', 
              SQLERRM, SQLSTATE, NEW.id;
    RETURN NEW;
END;
$$;

-- Remover o trigger antigo e recriar
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verificar se as políticas estão adequadas
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('accounts', 'profiles', 'user_credits')
AND schemaname = 'public'
ORDER BY tablename, policyname;