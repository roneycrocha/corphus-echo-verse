-- Adicionar campo CPF/CNPJ na tabela patients
ALTER TABLE public.patients 
ADD COLUMN document TEXT,
ADD COLUMN document_type TEXT CHECK (document_type IN ('cpf', 'cnpj'));