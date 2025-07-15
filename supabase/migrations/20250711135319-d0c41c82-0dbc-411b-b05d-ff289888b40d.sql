-- Update foreign key constraints to allow CASCADE delete for patient-related tables
-- This will ensure that when a patient is deleted, all related records are automatically deleted

-- Drop existing constraints and recreate with CASCADE
ALTER TABLE public.treatment_plans 
DROP CONSTRAINT IF EXISTS treatment_plans_patient_id_fkey,
ADD CONSTRAINT treatment_plans_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.sessions 
DROP CONSTRAINT IF EXISTS sessions_patient_id_fkey,
ADD CONSTRAINT sessions_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.medical_records 
DROP CONSTRAINT IF EXISTS medical_records_patient_id_fkey,
ADD CONSTRAINT medical_records_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.exercise_prescriptions 
DROP CONSTRAINT IF EXISTS exercise_prescriptions_patient_id_fkey,
ADD CONSTRAINT exercise_prescriptions_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_patient_id_fkey,
ADD CONSTRAINT transactions_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.action_executions 
DROP CONSTRAINT IF EXISTS action_executions_patient_id_fkey,
ADD CONSTRAINT action_executions_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.patient_achievements 
DROP CONSTRAINT IF EXISTS patient_achievements_patient_id_fkey,
ADD CONSTRAINT patient_achievements_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.patient_feedback_reads 
DROP CONSTRAINT IF EXISTS patient_feedback_reads_patient_id_fkey,
ADD CONSTRAINT patient_feedback_reads_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- Patient registration tokens should be set to NULL when patient is deleted
ALTER TABLE public.patient_registration_tokens 
DROP CONSTRAINT IF EXISTS patient_registration_tokens_patient_id_fkey,
ADD CONSTRAINT patient_registration_tokens_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;