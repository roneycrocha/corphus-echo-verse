-- Criar tabela para traços corporais
CREATE TABLE public.body_traits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(1) NOT NULL UNIQUE,
  nome_tecnico TEXT NOT NULL,
  nome_simbolico TEXT NOT NULL,
  descricao TEXT NOT NULL,
  atributos_principais TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.body_traits ENABLE ROW LEVEL SECURITY;

-- Política para visualização (todos usuários autenticados)
CREATE POLICY "Authenticated users can view body traits" 
ON public.body_traits 
FOR SELECT 
USING (is_authenticated());

-- Política para administração (apenas terapeutas podem gerenciar)
CREATE POLICY "Therapists can manage body traits" 
ON public.body_traits 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist'
    AND is_active = true
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_body_traits_updated_at
BEFORE UPDATE ON public.body_traits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir os traços fornecidos
INSERT INTO public.body_traits (codigo, nome_tecnico, nome_simbolico, descricao, atributos_principais) VALUES
(
  'V',
  'Esquizoide',
  'Visionário',
  'O esquizoide é o traço mais ligado à imaginação, criatividade e percepção profunda do invisível. É introspectivo, vive muito no mundo das ideias, e tem uma necessidade visceral de espaço e autonomia. O nome "Visionário" expressa perfeitamente essa natureza: alguém que vê o que os outros ainda não veem. Ele está à frente do tempo, pensa fora da caixa, conecta informações de forma original.',
  ARRAY[
    'Visão de longo prazo',
    'Capacidade de criação e inovação sem pressão externa',
    'Pensamento abstrato e estratégico',
    'Distanciamento emocional (favorece decisões racionais)',
    'Excelente em pesquisa, desenvolvimento e ideias disruptivas'
  ]
),
(
  'C',
  'Oral',
  'Comunicador',
  'O oral tem como base o vínculo emocional e a troca. Sua inteligência está na fala, na empatia e na conexão humana. Ele sente o ambiente, lê as emoções dos outros e traduz isso em palavras, carinho ou colaboração. "Comunicador" revela não só a facilidade verbal, mas a habilidade de criar pontes, escutar e pertencer.',
  ARRAY[
    'Comunicação fluida e persuasiva',
    'Grande sensibilidade emocional',
    'Busca constante por conexão e validação',
    'Ideal para atendimento, liderança humanizada e vendas com empatia',
    'Forte senso de grupo; precisa se sentir parte de algo'
  ]
),
(
  'D',
  'Psicopata',
  'Dominador',
  'Esse nome carrega autoridade, controle, capacidade de influência e presença dominante — tudo que define esse traço. O Dominador tem a habilidade natural de liderar cenários, articular bastidores e conquistar espaços. Ele não só pensa estrategicamente, mas também assume o controle emocional e territorial da situação.',
  ARRAY[
    'Capacidade de comando',
    'Tomada de decisões rápidas',
    'Postura de liderança natural',
    'Influência e articulação política',
    'Foco em resultado e posicionamento'
  ]
),
(
  'E',
  'Masoquista',
  'Executor',
  'O traço masoquista é estruturado na contenção, na capacidade de suportar e entregar com profundidade e consistência. Mesmo com pressões e sobrecargas, mantém a organização e o foco no que precisa ser feito. "Executor" é quem segura o tranco, estrutura, cuida dos detalhes e executa com qualidade.',
  ARRAY[
    'Alto senso de responsabilidade',
    'Gosta de seguir processos, criar rotinas e manter a ordem',
    'Capacidade de suportar pressão sem perder o foco',
    'Preocupação com os outros (às vezes até se anulando)',
    'Ideal para bastidores, entrega constante e planejamento'
  ]
),
(
  'R',
  'Rígido',
  'Resolutivo',
  'O rígido tem como base o desejo de ser o melhor. Busca excelência, estética e resultado. Não suporta mediocridade, é competitivo e quer sempre estar em destaque. "Resolutivo" traduz o impulso de resolver, agir, entregar e se provar.',
  ARRAY[
    'Alta performance e busca por perfeição',
    'Autonomia, proatividade e presença forte',
    'Tem dificuldade com críticas, mas aprende rápido',
    'Precisa de reconhecimento e gosta de visibilidade',
    'Ideal para liderança, gestão de projetos, performance e inovação visível'
  ]
);