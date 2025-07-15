-- Atualizar a função get_user_account_id para ser mais robusta
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT account_id FROM public.profiles WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;