-- Create storage bucket for transcriptions
INSERT INTO storage.buckets (id, name, public) VALUES ('transcriptions', 'transcriptions', true);

-- Create policies for transcription storage
CREATE POLICY "Therapists can upload transcription files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'transcriptions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Therapists can view transcription files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'transcriptions');

CREATE POLICY "Therapists can update transcription files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'transcriptions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Therapists can delete transcription files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'transcriptions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);