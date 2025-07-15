-- Create table for body analyses
CREATE TABLE public.body_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  analysis_name TEXT NOT NULL DEFAULT 'Análise Corporal',
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  evaluation_data JSONB NOT NULL DEFAULT '{}',
  trait_scores JSONB NOT NULL DEFAULT '[]',
  photos TEXT[] DEFAULT NULL,
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.body_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for body analyses
CREATE POLICY "Therapists can manage body analyses" 
ON public.body_analyses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) AND
  EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = body_analyses.patient_id 
    AND p.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'therapist'
  ) AND
  EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = body_analyses.patient_id 
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can view own body analyses" 
ON public.body_analyses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = body_analyses.patient_id 
    AND (p.user_id = auth.uid() OR p.created_by = auth.uid())
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_body_analyses_updated_at
BEFORE UPDATE ON public.body_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraint
ALTER TABLE public.body_analyses 
ADD CONSTRAINT fk_body_analyses_patient_id 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;