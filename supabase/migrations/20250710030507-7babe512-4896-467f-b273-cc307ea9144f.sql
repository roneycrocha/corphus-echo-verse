-- Criar tabela para controlar leitura de feedbacks pelos pacientes
CREATE TABLE public.patient_feedback_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  feedback_id UUID NOT NULL REFERENCES therapist_feedback(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, feedback_id)
);

-- RLS para a tabela de leituras
ALTER TABLE public.patient_feedback_reads ENABLE ROW LEVEL SECURITY;

-- Política para pacientes verem apenas suas próprias leituras
CREATE POLICY "Patients can view own feedback reads"
ON public.patient_feedback_reads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_feedback_reads.patient_id 
    AND patients.user_id = auth.uid()
  )
);

-- Política para pacientes inserirem suas próprias leituras
CREATE POLICY "Patients can insert own feedback reads"
ON public.patient_feedback_reads
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_feedback_reads.patient_id 
    AND patients.user_id = auth.uid()
  )
);

-- Adicionar campo para controlar notificação de novas ações
ALTER TABLE therapeutic_actions 
ADD COLUMN patient_notified BOOLEAN DEFAULT FALSE;

-- Função para marcar ações como não notificadas quando criadas
CREATE OR REPLACE FUNCTION notify_patient_new_action()
RETURNS TRIGGER AS $$
BEGIN
  NEW.patient_notified = FALSE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para novas ações
CREATE TRIGGER set_patient_notification_on_new_action
  BEFORE INSERT ON therapeutic_actions
  FOR EACH ROW
  EXECUTE FUNCTION notify_patient_new_action();