-- Atualizar política RLS para limitar visualização de perfis
-- Cada terapeuta deve ver apenas seus próprios perfis criados e o próprio perfil

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Política para usuários verem seu próprio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para admins verem todos os perfis
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role = 'admin' 
  AND p.is_active = true
));

-- Política para terapeutas verem apenas perfis do tipo 'therapist' (para listagem de outros terapeutas)
-- Mas não criamos essa política por enquanto para focar apenas no próprio perfil e admins

-- Comentário explicativo
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 'Permite que usuários vejam apenas seu próprio perfil';
COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 'Permite que administradores vejam todos os perfis do sistema';