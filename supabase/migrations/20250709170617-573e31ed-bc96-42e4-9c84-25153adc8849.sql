-- Criar tabelas para o sistema de gestão terapêutica

-- Tabela de pacientes
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('masculino', 'feminino', 'outro')),
  address JSONB, -- {street, city, state, zipcode, complement}
  emergency_contact JSONB, -- {name, phone, relationship}
  occupation TEXT,
  medical_history TEXT,
  current_medications TEXT,
  allergies TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de planos de tratamento
CREATE TABLE public.treatment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT CHECK (status IN ('ativo', 'concluido', 'pausado', 'cancelado')) DEFAULT 'ativo',
  goals TEXT[], -- Array de objetivos
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de sessões/consultas
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  session_type TEXT NOT NULL, -- 'consulta', 'fisioterapia', 'avaliacao', etc
  status TEXT CHECK (status IN ('agendada', 'confirmada', 'em_andamento', 'concluida', 'cancelada', 'faltou')) DEFAULT 'agendada',
  notes TEXT,
  price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de prontuários/fichas de evolução
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT, -- Queixa principal
  physical_exam JSONB, -- Exame físico estruturado
  assessment TEXT, -- Avaliação
  treatment_performed TEXT, -- Tratamento realizado
  patient_response TEXT, -- Resposta do paciente
  homework TEXT, -- Exercícios para casa
  next_steps TEXT, -- Próximos passos
  attachments TEXT[], -- URLs de arquivos anexos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de exercícios/protocolos
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'alongamento', 'fortalecimento', 'respiratorio', etc
  instructions TEXT,
  duration_minutes INTEGER,
  repetitions INTEGER,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de prescrições de exercícios
CREATE TABLE public.exercise_prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  frequency TEXT, -- '3x semana', 'diário', etc
  duration_weeks INTEGER,
  specific_instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_prescriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (assumindo autenticação futura)
-- Por enquanto, permitir acesso total para testes
CREATE POLICY "Allow all operations for authenticated users" ON public.patients FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.treatment_plans FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.medical_records FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.exercises FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.exercise_prescriptions FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_treatment_plans_updated_at BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exercise_prescriptions_updated_at BEFORE UPDATE ON public.exercise_prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns exercícios padrão
INSERT INTO public.exercises (name, description, category, instructions, duration_minutes, repetitions) VALUES
('Alongamento Cervical Lateral', 'Alongamento para músculos laterais do pescoço', 'alongamento', 'Incline a cabeça para o lado direito, mantendo o ombro esquerdo relaxado. Segure por 30 segundos e repita do outro lado.', 2, 3),
('Fortalecimento Glúteo Médio', 'Exercício para fortalecimento do glúteo médio', 'fortalecimento', 'Deitado de lado, eleve a perna de cima mantendo o joelho estendido. Desça lentamente.', 5, 15),
('Respiração Diafragmática', 'Exercício de reeducação respiratória', 'respiratorio', 'Coloque uma mão no peito e outra no abdome. Respire lentamente pelo nariz, expandindo o abdome.', 10, 10),
('Ponte Simples', 'Fortalecimento de glúteos e isquiotibiais', 'fortalecimento', 'Deitado de costas, joelhos flexionados, eleve o quadril contraindo glúteos. Desça lentamente.', 3, 12),
('Alongamento Posterior de Coxa', 'Alongamento dos músculos isquiotibiais', 'alongamento', 'Sentado, estenda uma perna e incline o tronco para frente mantendo as costas retas.', 3, 3);

-- Inserir alguns pacientes de exemplo para testes
INSERT INTO public.patients (name, email, phone, birth_date, gender, occupation) VALUES
('Maria Silva Santos', 'maria.silva@email.com', '(11) 99999-1234', '1985-03-15', 'feminino', 'Professora'),
('João Carlos Oliveira', 'joao.oliveira@email.com', '(11) 99999-5678', '1978-07-22', 'masculino', 'Engenheiro'),
('Ana Paula Costa', 'ana.costa@email.com', '(11) 99999-9012', '1992-11-08', 'feminino', 'Designer'),
('Carlos Eduardo Lima', 'carlos.lima@email.com', '(11) 99999-3456', '1980-01-30', 'masculino', 'Advogado'),
('Lucia Fernanda Pereira', 'lucia.pereira@email.com', '(11) 99999-7890', '1975-09-12', 'feminino', 'Médica');