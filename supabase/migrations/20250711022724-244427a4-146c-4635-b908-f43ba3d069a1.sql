-- Adicionar novos campos à tabela profiles para perfil completo do usuário
ALTER TABLE public.profiles 
ADD COLUMN logo_url TEXT,
ADD COLUMN public_email TEXT,
ADD COLUMN instagram TEXT,
ADD COLUMN facebook TEXT,
ADD COLUMN linkedin TEXT,
ADD COLUMN whatsapp TEXT,
ADD COLUMN website TEXT,
ADD COLUMN address JSONB,
ADD COLUMN job_title TEXT;