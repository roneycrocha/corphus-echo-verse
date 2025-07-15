-- Corrigir recursão infinita nas políticas RLS da tabela profiles

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Criar função para verificar se o usuário é admin (sem recursão)
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid 
    AND role = 'admin' 
    AND is_active = true
  );
$$;

-- Recriar política simples para visualização de perfis
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para admins usando a função SECURITY DEFINER
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Comentários explicativos
COMMENT ON FUNCTION public.is_admin(uuid) IS 'Verifica se o usuário é administrador sem causar recursão em RLS';
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 'Permite que usuários vejam apenas seu próprio perfil';
COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 'Permite que administradores vejam todos os perfis usando função SECURITY DEFINER';