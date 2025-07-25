-- Criar política para permitir acesso a dados de pacientes via token de registro válido
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