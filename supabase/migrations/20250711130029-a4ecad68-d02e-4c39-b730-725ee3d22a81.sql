-- Adicionar política para permitir que admins vejam todos os pacientes independente do user_type
CREATE POLICY "Admins can view all patients" 
ON public.patients 
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