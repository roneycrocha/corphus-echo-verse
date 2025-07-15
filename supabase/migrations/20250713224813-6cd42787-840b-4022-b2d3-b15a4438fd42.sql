-- Atualizar a política RLS para action_executions para permitir que pacientes criem suas próprias execuções
DROP POLICY IF EXISTS "Therapists can manage action executions" ON action_executions;
DROP POLICY IF EXISTS "Users can view own action executions" ON action_executions;

-- Política para permitir que terapeutas vejam e gerenciem execuções de seus pacientes
CREATE POLICY "Therapists can manage their patients action executions" ON action_executions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.user_type = 'therapist'
    ) AND EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = action_executions.patient_id 
      AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.user_type = 'therapist'
    ) AND EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = action_executions.patient_id 
      AND p.created_by = auth.uid()
    )
  );

-- Política para permitir que pacientes vejam suas próprias execuções
CREATE POLICY "Patients can view own action executions" ON action_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = action_executions.patient_id 
      AND p.user_id = auth.uid()
    )
  );

-- Política para permitir que pacientes criem suas próprias execuções de ação
CREATE POLICY "Patients can create own action executions" ON action_executions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = action_executions.patient_id 
      AND p.user_id = auth.uid()
    )
  );

-- Política para permitir que pacientes atualizem suas próprias execuções
CREATE POLICY "Patients can update own action executions" ON action_executions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = action_executions.patient_id 
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = action_executions.patient_id 
      AND p.user_id = auth.uid()
    )
  );