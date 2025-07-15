-- Corrigir política RLS de INSERT para permitir que admins/especialistas criem perfis para outros usuários

-- Remover política atual de INSERT
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Política para usuários criarem seu próprio perfil
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política para admins e especialistas criarem perfis para outros usuários
CREATE POLICY "Admins and specialists can create user profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'specialist') 
    AND p.is_active = true
  )
);

-- Comentários explicativos
COMMENT ON POLICY "Users can insert their own profile" ON public.profiles IS 'Permite que usuários criem seu próprio perfil';
COMMENT ON POLICY "Admins and specialists can create user profiles" ON public.profiles IS 'Permite que administradores e especialistas criem perfis para outros usuários';