-- Remover todas as políticas UPDATE problemáticas da tabela patient_booking_tokens
-- pois agora usamos edge function com service role
DROP POLICY IF EXISTS "Allow anonymous token updates" ON public.patient_booking_tokens;
DROP POLICY IF EXISTS "Public can update valid tokens" ON public.patient_booking_tokens;

-- Manter apenas as políticas básicas necessárias para leitura
-- A política "Public can read valid tokens" já existe e está funcionando
-- A política "Therapists can create tokens" já existe e está funcionando  
-- A política "Therapists can view own tokens" já existe e está funcionando

-- Adicionar comentário para documentar a mudança
COMMENT ON TABLE public.patient_booking_tokens IS 'Token updates are now handled via edge function with service role to avoid RLS conflicts';