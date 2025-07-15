-- Remove medical information columns from patients table
ALTER TABLE public.patients 
DROP COLUMN IF EXISTS medical_history,
DROP COLUMN IF EXISTS current_medications,
DROP COLUMN IF EXISTS allergies;