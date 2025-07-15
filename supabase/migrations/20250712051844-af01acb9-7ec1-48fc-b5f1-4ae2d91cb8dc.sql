-- Create table for storing transcriptions and audio recordings
CREATE TABLE public.transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'ai_assistance',
  transcription_text TEXT,
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for transcriptions
CREATE POLICY "Therapists can manage their patient transcriptions" 
ON public.transcriptions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = transcriptions.patient_id 
    AND p.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = transcriptions.patient_id 
    AND p.created_by = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Create policy for patients to view their own transcriptions
CREATE POLICY "Patients can view their own transcriptions" 
ON public.transcriptions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = transcriptions.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transcriptions_updated_at
BEFORE UPDATE ON public.transcriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_transcriptions_patient_id ON public.transcriptions(patient_id);
CREATE INDEX idx_transcriptions_created_by ON public.transcriptions(created_by);