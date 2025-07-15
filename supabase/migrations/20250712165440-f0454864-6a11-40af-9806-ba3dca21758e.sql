-- Create conversation_analyses table
CREATE TABLE public.conversation_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  transcription_id UUID NULL,
  session_type TEXT NOT NULL DEFAULT 'ai_assistance',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  patient_traits_summary TEXT NULL,
  conversation_summary TEXT NULL,
  raw_response TEXT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversation_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation_analyses
CREATE POLICY "Therapists can manage their patient conversation analyses" 
ON public.conversation_analyses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) 
  AND EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = conversation_analyses.patient_id 
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
    WHERE p.id = conversation_analyses.patient_id 
    AND p.created_by = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Patients can view their own conversation analyses" 
ON public.conversation_analyses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = conversation_analyses.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_conversation_analyses_updated_at
BEFORE UPDATE ON public.conversation_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();