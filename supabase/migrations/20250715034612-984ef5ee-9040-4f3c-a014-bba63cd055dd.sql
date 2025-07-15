-- Adicionar política para permitir que admins vejam todas as contas da plataforma
CREATE POLICY "Platform admins can view all accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  )
);