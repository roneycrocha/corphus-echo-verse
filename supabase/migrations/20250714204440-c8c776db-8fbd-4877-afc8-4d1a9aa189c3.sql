-- Criar trigger para inicializar créditos do usuário
CREATE OR REPLACE TRIGGER trigger_initialize_user_credits
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_user_credits();

-- Verificar se a função de inicialização de créditos está funcionando corretamente
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log para debug
  RAISE LOG 'initialize_user_credits: Starting for user_id: %', NEW.user_id;
  
  -- Inserir créditos iniciais para o usuário
  INSERT INTO public.user_credits (user_id, balance, total_purchased, total_consumed)
  VALUES (NEW.user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE LOG 'initialize_user_credits: Successfully initialized credits for user_id: %', NEW.user_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log detalhado do erro
    RAISE LOG 'initialize_user_credits ERROR: % % - user_id: %', 
              SQLERRM, SQLSTATE, NEW.user_id;
    
    -- Não bloquear a criação do perfil
    RETURN NEW;
END;
$$;