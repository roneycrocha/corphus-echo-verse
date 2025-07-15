-- Criar política RLS para permitir exclusão de perfis
-- Usuários podem excluir apenas seu próprio perfil
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE 
USING (auth.uid() = user_id AND is_authenticated());

-- Admins podem excluir qualquer perfil (exceto seu próprio para evitar se trancar fora)
CREATE POLICY "Admins can delete other profiles"
ON public.profiles
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.role = 'admin' 
    AND admin_profile.is_active = true
  ) 
  AND user_id != auth.uid()
);