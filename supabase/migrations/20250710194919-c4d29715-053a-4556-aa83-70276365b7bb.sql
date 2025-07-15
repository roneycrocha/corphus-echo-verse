-- Criar políticas RLS para permitir administradores gerenciarem planos de assinatura

-- Política para administradores poderem atualizar planos
CREATE POLICY "Admins can update subscription plans"
ON public.subscription_plans
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);

-- Política para administradores poderem inserir planos
CREATE POLICY "Admins can insert subscription plans"
ON public.subscription_plans
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);

-- Política para administradores poderem deletar planos (se necessário)
CREATE POLICY "Admins can delete subscription plans"
ON public.subscription_plans
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);