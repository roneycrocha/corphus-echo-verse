-- Corrigir políticas RLS para permitir registro público de pacientes
-- Adicionar política para criação via token de registro
CREATE POLICY "Public registration via valid token" 
ON public.patients 
FOR INSERT 
WITH CHECK (
  -- Permite inserção se existe um token válido para este created_by
  EXISTS (
    SELECT 1 FROM public.patient_registration_tokens 
    WHERE created_by = patients.created_by 
    AND NOT used 
    AND expires_at > now()
  )
);

-- Corrigir políticas de storage para upload de avatares durante registro público
CREATE POLICY "Public avatar upload during registration" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NULL  -- Permite upload sem autenticação durante registro
);

CREATE POLICY "Public avatar access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');