-- Primeiro, vamos corrigir as políticas RLS para garantir isolamento de dados por usuário

-- Remover políticas existentes da tabela patients
DROP POLICY IF EXISTS "Patients can view own data" ON public.patients;
DROP POLICY IF EXISTS "Patients can update own data" ON public.patients;
DROP POLICY IF EXISTS "Therapists can manage all patients" ON public.patients;

-- Remover políticas existentes de outras tabelas relacionadas
DROP POLICY IF EXISTS "Authenticated users can manage sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated users can manage medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Authenticated users can manage transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can manage treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Authenticated users can manage therapeutic actions" ON public.therapeutic_actions;
DROP POLICY IF EXISTS "Authenticated users can manage action executions" ON public.action_executions;

-- Criar novas políticas mais restritivas para pacientes
-- 1. Pacientes podem ver e editar apenas seus próprios dados
CREATE POLICY "Patients can view own data" 
ON public.patients 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Patients can update own data" 
ON public.patients 
FOR UPDATE 
USING (user_id = auth.uid());

-- 2. Terapeutas podem ver e gerenciar apenas pacientes que ELES criaram
CREATE POLICY "Therapists can view own patients" 
ON public.patients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND (created_by = auth.uid() OR user_id = auth.uid())
);

CREATE POLICY "Therapists can create patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Therapists can update own patients" 
ON public.patients 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND (created_by = auth.uid() OR user_id = auth.uid())
);

CREATE POLICY "Therapists can delete own patients" 
ON public.patients 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND created_by = auth.uid()
);

-- Políticas para sessões - apenas do terapeuta ou do próprio paciente
CREATE POLICY "Users can view own sessions" 
ON public.sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = sessions.patient_id 
    AND (p.user_id = auth.uid() OR p.created_by = auth.uid())
  )
);

CREATE POLICY "Therapists can manage sessions" 
ON public.sessions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = sessions.patient_id 
    AND p.created_by = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = sessions.patient_id 
    AND p.created_by = auth.uid()
  )
);

-- Políticas para prontuários médicos
CREATE POLICY "Users can view own medical records" 
ON public.medical_records 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = medical_records.patient_id 
    AND (p.user_id = auth.uid() OR p.created_by = auth.uid())
  )
);

CREATE POLICY "Therapists can manage medical records" 
ON public.medical_records 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = medical_records.patient_id 
    AND p.created_by = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = medical_records.patient_id 
    AND p.created_by = auth.uid()
  )
);

-- Políticas para transações financeiras
CREATE POLICY "Users can view own transactions" 
ON public.transactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = transactions.patient_id 
    AND (p.user_id = auth.uid() OR p.created_by = auth.uid())
  )
);

CREATE POLICY "Therapists can manage transactions" 
ON public.transactions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = transactions.patient_id 
    AND p.created_by = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = transactions.patient_id 
    AND p.created_by = auth.uid()
  )
);

-- Políticas para planos de tratamento
CREATE POLICY "Users can view own treatment plans" 
ON public.treatment_plans 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = treatment_plans.patient_id 
    AND (p.user_id = auth.uid() OR p.created_by = auth.uid())
  )
);

CREATE POLICY "Therapists can manage treatment plans" 
ON public.treatment_plans 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = treatment_plans.patient_id 
    AND p.created_by = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = treatment_plans.patient_id 
    AND p.created_by = auth.uid()
  )
);

-- Políticas para ações terapêuticas
CREATE POLICY "Users can view own therapeutic actions" 
ON public.therapeutic_actions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    JOIN public.patients p ON tp.patient_id = p.id
    WHERE tp.id = therapeutic_actions.treatment_plan_id 
    AND (p.user_id = auth.uid() OR p.created_by = auth.uid())
  )
);

CREATE POLICY "Therapists can manage therapeutic actions" 
ON public.therapeutic_actions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    JOIN public.patients p ON tp.patient_id = p.id
    WHERE tp.id = therapeutic_actions.treatment_plan_id 
    AND p.created_by = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    JOIN public.patients p ON tp.patient_id = p.id
    WHERE tp.id = therapeutic_actions.treatment_plan_id 
    AND p.created_by = auth.uid()
  )
);

-- Políticas para execuções de ações
CREATE POLICY "Users can view own action executions" 
ON public.action_executions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = action_executions.patient_id 
    AND (p.user_id = auth.uid() OR p.created_by = auth.uid())
  )
);

CREATE POLICY "Therapists can manage action executions" 
ON public.action_executions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = action_executions.patient_id 
    AND p.created_by = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = action_executions.patient_id 
    AND p.created_by = auth.uid()
  )
);

-- Atualizar a função de criação de perfil para garantir que novos usuários sejam terapeutas por padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verificar se é um paciente (baseado em metadata)
  IF NEW.raw_user_meta_data ->> 'user_type' = 'patient' THEN
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      'assistant',
      'patient'
    );
  ELSE
    -- Usuário terapeuta padrão (qualquer registro via signup normal)
    INSERT INTO public.profiles (user_id, full_name, email, role, user_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      'specialist', -- Definir como specialist por padrão para terapeutas
      'therapist'
    );
  END IF;
  RETURN NEW;
END;
$$;