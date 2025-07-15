-- Criar tabela para configurações do sistema
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  working_hours_start TIME NOT NULL DEFAULT '08:00',
  working_hours_end TIME NOT NULL DEFAULT '18:00',
  appointment_duration INTEGER NOT NULL DEFAULT 60,
  appointment_interval INTEGER NOT NULL DEFAULT 15,
  lunch_break_start TIME NOT NULL DEFAULT '12:00',
  lunch_break_end TIME NOT NULL DEFAULT '13:00',
  working_days TEXT[] NOT NULL DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  buffer_time INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso
CREATE POLICY "Allow all operations for authenticated users" 
ON public.system_settings 
FOR ALL 
USING (true);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configurações padrão
INSERT INTO public.system_settings (
  working_hours_start,
  working_hours_end,
  appointment_duration,
  appointment_interval,
  lunch_break_start,
  lunch_break_end,
  working_days,
  buffer_time
) VALUES (
  '08:00',
  '18:00',
  60,
  15,
  '12:00',
  '13:00',
  ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  15
);