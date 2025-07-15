-- Corrigir completamente o sistema de criação de usuários
-- Remover o trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover a função problemática  
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "System can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can create profiles during user creation" ON public.profiles;

-- Criar uma função mais simples e robusta para criação de perfis
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Inserir perfil básico para o novo usuário
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email, 
    role, 
    user_type, 
    account_id,
    is_active
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    'assistant'::user_role,
    'therapist'::user_type,
    '00000000-0000-0000-0000-000000000000'::uuid,
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

-- Criar política mais permissiva para criação de perfis
CREATE POLICY "Allow profile creation during signup" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  -- Permitir durante triggers (auth.uid() is null) 
  -- ou se o usuário está criando seu próprio perfil
  auth.uid() IS NULL OR 
  auth.uid() = user_id
);

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();