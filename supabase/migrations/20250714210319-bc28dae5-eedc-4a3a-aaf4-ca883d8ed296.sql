-- Recriar o trigger de forma mais robusta e simples
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Inserir apenas se não existir ainda
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email, 
    role, 
    user_type, 
    created_by,
    account_id,
    is_active
  ) 
  SELECT 
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    'assistant'::user_role,
    'therapist'::user_type,
    NEW.id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = NEW.id
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de qualquer erro, apenas retornar NEW sem bloquear
    RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();