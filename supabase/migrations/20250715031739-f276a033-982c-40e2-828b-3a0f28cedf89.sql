-- Adicionar política para permitir atualizações de pacientes via token válido
CREATE POLICY "Public patient update via valid registration token"
ON public.patients
FOR UPDATE
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
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.patient_registration_tokens 
    WHERE patient_registration_tokens.patient_data->>'existingPatientId' = patients.id::text
    AND patient_registration_tokens.used = false 
    AND patient_registration_tokens.expires_at > now()
    AND patient_registration_tokens.patient_data->>'isEdit' = 'true'
  )
);