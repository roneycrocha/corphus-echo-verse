-- Adicionar coluna de cor para os traços corporais
ALTER TABLE public.body_traits 
ADD COLUMN color TEXT DEFAULT '#3B82F6';