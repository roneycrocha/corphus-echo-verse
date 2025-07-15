-- Limpar todas as políticas conflitantes e recriar de forma limpa

-- Remover todas as políticas antigas da tabela profiles
DROP POLICY IF EXISTS "Account admins can manage profiles in their account" ON public.profiles;
DROP POLICY IF EXISTS "Service role can access all data" ON public.profiles;
DROP POLICY IF EXISTS "Account admins can delete profiles in their account" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Account users can create profiles in their account" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles from their account" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles in their account" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Criar políticas simples e funcionais
CREATE POLICY "Account members can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (account_id = public.get_user_account_id());

CREATE POLICY "Account members can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (account_id = public.get_user_account_id() OR auth.uid() = user_id);

CREATE POLICY "Account members can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (account_id = public.get_user_account_id());

CREATE POLICY "Account admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  account_id = public.get_user_account_id() 
  AND public.is_admin(auth.uid())
  AND user_id != auth.uid()
);

-- Limpar políticas de patients também
DROP POLICY IF EXISTS "Users can manage patients from their account" ON public.patients;
DROP POLICY IF EXISTS "Account users can manage patients" ON public.patients;
DROP POLICY IF EXISTS "Service role can access all patients" ON public.patients;

-- Criar política simples para patients
CREATE POLICY "Account members can manage patients" 
ON public.patients 
FOR ALL 
USING (account_id = public.get_user_account_id());

-- Comentários
COMMENT ON POLICY "Account members can view all profiles" ON public.profiles IS 'Membros da conta podem ver todos os perfis da conta';
COMMENT ON POLICY "Account members can manage patients" ON public.patients IS 'Membros da conta podem gerenciar todos os pacientes da conta';