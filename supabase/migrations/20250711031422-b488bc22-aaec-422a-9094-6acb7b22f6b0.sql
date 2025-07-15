-- Criar função RPC para cadastro público de pacientes
CREATE OR REPLACE FUNCTION public.create_public_patient(
  p_token TEXT,
  p_patient_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_data RECORD;
  new_patient_id UUID;
BEGIN
  -- Verificar se o token é válido
  SELECT * INTO token_data 
  FROM public.patient_registration_tokens 
  WHERE token = p_token 
  AND NOT used 
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido ou expirado';
  END IF;
  
  -- Inserir paciente
  INSERT INTO public.patients (
    name, email, phone, birth_date, gender, occupation,
    whatsapp, document, document_type, avatar_url,
    social_media, address, emergency_contact,
    created_by, is_active
  ) VALUES (
    p_patient_data->>'name',
    p_patient_data->>'email',
    p_patient_data->>'phone',
    (p_patient_data->>'birth_date')::DATE,
    p_patient_data->>'gender',
    p_patient_data->>'occupation',
    p_patient_data->>'whatsapp',
    p_patient_data->>'document',
    p_patient_data->>'document_type',
    p_patient_data->>'avatar_url',
    (p_patient_data->>'social_media')::JSONB,
    (p_patient_data->>'address')::JSONB,
    (p_patient_data->>'emergency_contact')::JSONB,
    token_data.created_by,
    true
  ) RETURNING id INTO new_patient_id;
  
  -- Marcar token como usado
  UPDATE public.patient_registration_tokens 
  SET used = true, used_at = now(), patient_id = new_patient_id
  WHERE token = p_token;
  
  RETURN jsonb_build_object('patient_id', new_patient_id, 'success', true);
END;
$$;