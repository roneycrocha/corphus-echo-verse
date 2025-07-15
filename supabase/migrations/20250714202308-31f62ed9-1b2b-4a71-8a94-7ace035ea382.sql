-- Corrigir a função get_user_account_id para funcionar corretamente
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  result_account_id uuid;
BEGIN
  -- Buscar account_id do usuário atual
  SELECT account_id INTO result_account_id
  FROM public.profiles 
  WHERE user_id = auth.uid() 
  AND is_active = true
  LIMIT 1;
  
  -- Se não encontrou, retornar conta padrão
  IF result_account_id IS NULL THEN
    result_account_id := '00000000-0000-0000-0000-000000000000';
  END IF;
  
  RETURN result_account_id;
END;
$$;