-- Remover policies existentes para body_traits
DROP POLICY IF EXISTS "Therapists can manage body traits" ON public.body_traits;

-- Remover policies existentes para body_evaluations  
DROP POLICY IF EXISTS "Therapists can manage body evaluations" ON public.body_evaluations;

-- Criar novas policies apenas para administradores

-- Body Traits - apenas admins podem gerenciar
CREATE POLICY "Admins can manage body traits" 
ON public.body_traits FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
);

-- Body Evaluations - apenas admins podem gerenciar
CREATE POLICY "Admins can manage body evaluations" 
ON public.body_evaluations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
);