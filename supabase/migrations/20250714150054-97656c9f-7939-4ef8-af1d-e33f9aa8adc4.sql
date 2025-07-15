-- Adicionar coluna timezone na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN timezone text DEFAULT 'America/Sao_Paulo';

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.timezone IS 'Fuso horário do usuário no formato IANA (ex: America/Sao_Paulo)';