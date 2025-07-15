-- Atualizar o perfil do terapeuta com dados completos
UPDATE public.profiles 
SET 
  job_title = 'Fisioterapeuta Especialista',
  phone = '(12) 98765-4321',
  public_email = 'contato@roney-fisio.com.br',
  whatsapp = '12987654321',
  website = 'https://www.roney-fisio.com.br',
  instagram = '@roneyfisio',
  facebook = 'https://facebook.com/roneyfisio',
  linkedin = 'https://linkedin.com/in/roney-fisio',
  address = '{
    "street": "Rua das Flores, 123",
    "neighborhood": "Centro",
    "city": "São José dos Campos",
    "state": "SP",
    "zipcode": "12210-000"
  }'::jsonb,
  updated_at = now()
WHERE user_id = '5a0df07c-09de-42f1-9237-2c171d7d47a3';