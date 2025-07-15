-- Atualizar política para permitir acesso público aos dados do paciente via token válido
DROP POLICY IF EXISTS "Public access to patient data via valid registration token" ON public.patients;

CREATE POLICY "Public access to patient data via valid registration token"
ON public.patients
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM public.patient_registration_tokens 
    WHERE patient_registration_tokens.patient_data->>'existingPatientId' = patients.id::text
    AND patient_registration_tokens.used = false 
    AND patient_registration_tokens.expires_at > now()
    AND patient_registration_tokens.patient_data->>'isEdit' = 'true'
  )
);

-- Também permitir inserção pública via token (para casos de novos cadastros)
DROP POLICY IF EXISTS "Public patient creation via valid token" ON public.patients;

CREATE POLICY "Public patient creation via valid token"
ON public.patients
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.patient_registration_tokens 
    WHERE patient_registration_tokens.used = false 
    AND patient_registration_tokens.expires_at > now()
  )
);