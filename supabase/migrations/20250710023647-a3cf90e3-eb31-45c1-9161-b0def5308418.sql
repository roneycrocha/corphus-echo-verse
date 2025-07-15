-- Função para criar paciente com email já confirmado
CREATE OR REPLACE FUNCTION public.create_confirmed_patient_user(
  patient_email TEXT,
  patient_password TEXT,
  patient_name TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Esta função só deve ser chamada por usuários autenticados
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;
  
  -- Tentar criar o usuário usando o admin API
  -- (Isso precisa ser feito no edge function com service role key)
  RETURN json_build_object('message', 'Use edge function to create user');
END;
$$;