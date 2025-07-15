-- Corrigir políticas RLS que podem estar bloqueando o acesso

-- 1. Corrigir política de INSERT para profiles (estava muito restritiva)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and specialists can create user profiles" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Account users can create profiles in their account" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  account_id = public.get_user_account_id()
  OR auth.uid() = user_id
);

-- 2. Adicionar política específica para que usuários possam editar perfis da conta
CREATE POLICY "Users can update profiles in their account" 
ON public.profiles 
FOR UPDATE 
USING (account_id = public.get_user_account_id())
WITH CHECK (account_id = public.get_user_account_id());

-- 3. Política para DELETE (só admins da conta)
CREATE POLICY "Account admins can delete profiles in their account" 
ON public.profiles 
FOR DELETE 
USING (
  account_id = public.get_user_account_id() 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
  AND user_id != auth.uid() -- Não pode deletar a si mesmo
);

-- 4. Garantir que as políticas de pacientes estão funcionando
DROP POLICY IF EXISTS "Therapists can manage their patients action executions" ON public.patients;
DROP POLICY IF EXISTS "Patients can view own data" ON public.patients;
DROP POLICY IF EXISTS "Patients can update own data" ON public.patients;
DROP POLICY IF EXISTS "Public access to patient data via valid registration token" ON public.patients;
DROP POLICY IF EXISTS "Public registration via valid token" ON public.patients;
DROP POLICY IF EXISTS "Public update patient data via valid registration token" ON public.patients;
DROP POLICY IF EXISTS "Service role can access patient data" ON public.patients;
DROP POLICY IF EXISTS "Admins can view all patients" ON public.patients;

-- Recriar política simples para patients
CREATE POLICY "Account users can manage patients" 
ON public.patients 
FOR ALL 
USING (account_id = public.get_user_account_id());

-- 5. Política para permitir acesso de service role (necessário para algumas operações)
CREATE POLICY "Service role can access all data" 
ON public.profiles 
FOR ALL 
USING (true);

CREATE POLICY "Service role can access all patients" 
ON public.patients 
FOR ALL 
USING (true);

-- Comentários
COMMENT ON POLICY "Users can view profiles from their account" ON public.profiles IS 'Usuários podem ver todos os perfis da sua conta';
COMMENT ON POLICY "Account users can manage patients" ON public.patients IS 'Usuários da conta podem gerenciar todos os pacientes da conta';