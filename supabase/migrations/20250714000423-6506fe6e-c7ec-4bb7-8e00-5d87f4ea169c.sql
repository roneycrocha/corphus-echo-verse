-- Corrigir políticas RLS da tabela system_settings para permitir acesso público de leitura

-- Remover política existente
DROP POLICY IF EXISTS "Authenticated users can manage system settings" ON public.system_settings;

-- Criar políticas mais específicas
-- Permitir leitura pública para configurações básicas (necessário para agendamento)
CREATE POLICY "Public can read system settings" 
ON public.system_settings 
FOR SELECT 
USING (true);

-- Apenas admins podem modificar configurações
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
);