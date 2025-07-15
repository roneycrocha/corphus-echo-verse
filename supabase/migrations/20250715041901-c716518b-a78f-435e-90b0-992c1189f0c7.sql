-- Corrigir políticas RLS problemáticas para prevenir vazamento de dados entre contas

-- 1. Remover políticas problemáticas que permitem acesso público via tokens
DROP POLICY IF EXISTS "Public access to patient data via valid registration token" ON public.patients;
DROP POLICY IF EXISTS "Public patient update via valid registration token" ON public.patients;

-- 2. Criar política mais restritiva para visualização de pacientes via tokens
CREATE POLICY "Restricted token-based patient access" 
ON public.patients 
FOR SELECT 
USING (
  -- Só permite acesso se o usuário atual é o criador original do token OU
  -- se o token foi criado por alguém da mesma conta
  EXISTS (
    SELECT 1 FROM public.patient_registration_tokens prt
    JOIN public.profiles p ON prt.created_by = p.user_id
    WHERE (
      (prt.patient_data->>'existingPatientId')::uuid = patients.id
      AND prt.used = false 
      AND prt.expires_at > now()
      AND (prt.patient_data->>'isEdit')::boolean = true
      AND (
        prt.created_by = auth.uid() OR 
        p.account_id = (
          SELECT account_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
      )
    )
  )
);

-- 3. Criar política mais restritiva para atualização de pacientes via tokens
CREATE POLICY "Restricted token-based patient update" 
ON public.patients 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.patient_registration_tokens prt
    JOIN public.profiles p ON prt.created_by = p.user_id
    WHERE (
      (prt.patient_data->>'existingPatientId')::uuid = patients.id
      AND prt.used = false 
      AND prt.expires_at > now()
      AND (prt.patient_data->>'isEdit')::boolean = true
      AND (
        prt.created_by = auth.uid() OR 
        p.account_id = (
          SELECT account_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patient_registration_tokens prt
    JOIN public.profiles p ON prt.created_by = p.user_id
    WHERE (
      (prt.patient_data->>'existingPatientId')::uuid = patients.id
      AND prt.used = false 
      AND prt.expires_at > now()
      AND (prt.patient_data->>'isEdit')::boolean = true
      AND (
        prt.created_by = auth.uid() OR 
        p.account_id = (
          SELECT account_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
      )
    )
  )
);

-- 4. Invalidar tokens de edição problemáticos que foram usados incorretamente
UPDATE public.patient_registration_tokens 
SET used = true, used_at = now()
WHERE (patient_data->>'isEdit')::boolean = true
AND used = false
AND (
  (patient_data->>'existingPatientId')::uuid IN ('7006d20f-dadb-4b3a-94cb-fbef6462be9c', 'b51a931b-8c42-46c2-9139-6df223bb6bfc')
);

-- 5. Adicionar log da correção
INSERT INTO public.accounts (id, name, email, is_active)
VALUES ('99999999-9999-9999-9999-999999999999', 'Security Fix Log', 'security@system', false)
ON CONFLICT (id) DO UPDATE SET 
  name = 'Security Fix Applied - ' || now()::text;