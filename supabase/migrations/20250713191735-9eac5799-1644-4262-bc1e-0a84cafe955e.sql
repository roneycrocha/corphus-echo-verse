-- Permitir que edge functions acessem dados dos pacientes
CREATE POLICY "Service role can access patient data"
ON public.patients
FOR SELECT
USING (true);