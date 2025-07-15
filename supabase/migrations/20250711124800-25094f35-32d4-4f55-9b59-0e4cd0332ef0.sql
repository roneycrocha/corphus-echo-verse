-- Inserir um token de teste válido para o terapeuta Roney Cabreira
INSERT INTO public.patient_registration_tokens (
  token,
  expires_at,
  created_by,
  patient_data
) VALUES (
  'test-token-2025',
  '2025-12-31 23:59:59+00',
  '5a0df07c-09de-42f1-9237-2c171d7d47a3', -- ID do terapeuta RONEY CABREIRA DA ROCHA
  '{
    "source": "test_token",
    "description": "Token de teste para demonstração"
  }'
) ON CONFLICT (token) DO UPDATE SET
  expires_at = EXCLUDED.expires_at,
  used = false,
  used_at = null;