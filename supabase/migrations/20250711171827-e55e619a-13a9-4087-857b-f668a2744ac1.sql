-- Criar tabela para avaliações corporais
CREATE TABLE public.body_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  body_part TEXT NOT NULL,
  evaluation_context TEXT,
  evaluation_description TEXT NOT NULL,
  trait_code TEXT NOT NULL,
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key para relacionar com body_traits
  CONSTRAINT fk_body_evaluations_trait_code 
    FOREIGN KEY (trait_code) 
    REFERENCES public.body_traits(codigo)
);

-- Índices para performance
CREATE INDEX idx_body_evaluations_body_part ON public.body_evaluations(body_part);
CREATE INDEX idx_body_evaluations_trait_code ON public.body_evaluations(trait_code);
CREATE INDEX idx_body_evaluations_active ON public.body_evaluations(is_active);

-- RLS policies
ALTER TABLE public.body_evaluations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view body evaluations
CREATE POLICY "Authenticated users can view body evaluations" 
ON public.body_evaluations FOR SELECT 
USING (is_authenticated());

-- Therapists can manage body evaluations
CREATE POLICY "Therapists can manage body evaluations" 
ON public.body_evaluations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'therapist' 
    AND is_active = true
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_body_evaluations_updated_at
  BEFORE UPDATE ON public.body_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais das avaliações
INSERT INTO public.body_evaluations (body_part, evaluation_context, evaluation_description, trait_code, weight) VALUES
('Cabeça', 'Sensação e Expressão', 'Parece que comporta um cérebro gigante', 'V', 1.00),
('Cabeça', 'Sensação e Expressão', 'Pele grossa', 'E', 1.00),
('Cabeça', 'Sensação e Expressão', 'Sensação - mais jovem que a idade ou de um bebê grande', 'C', 1.00),
('Cabeça', 'Sensação e Expressão', 'Sensação - panela de pressão que vai explodir', 'E', 1.00),
('Cabeça', 'Sensação e Expressão', 'Expressão brava, densa ou tensa', 'E', 1.00),
('Cabeça', 'Sensação e Expressão', 'Sensação admirável de estar tudo no lugar', 'R', 1.00),
('Cabeça', 'Sensação e Expressão', 'Sensação - Cabeça harmônica e proporcional', 'R', 1.00),
('Cabeça', 'Aspectos Gerais', 'Cabeça alongada', 'V', 1.00),
('Cabeça', 'Aspectos Gerais', 'Cabeça curta', 'C', 1.00),
('Cabeça', 'Aspectos Gerais', 'Cabeça arredondada', 'C', 1.00),
('Cabeça', 'Aspectos Gerais', 'Cabeça bem triangular (parte superior maior e vai afunilando)', 'D', 1.00),
('Cabeça', 'Aspectos Gerais', 'Cabeça média triangular (parte superior maior e vai afunilando)', 'D', 1.00),
('Cabeça', 'Aspectos Gerais', 'Linhas retas e quadradas nas laterais da cabeça', 'E', 1.00),
('Cabeça', 'Aspectos Gerais', '1 traço simétrico', 'R', 1.00),
('Cabeça', 'Aspectos Gerais', '2 traços simétricos', 'R', 1.00),
('Cabeça', 'Aspectos Gerais', '3 traços simétricos', 'R', 1.00),
('Cabeça', 'Aspectos Gerais', 'Calvice no topo central da cabeça (coroa)', 'E', 1.00),
('Testa', '', 'Testa grande', 'V', 1.00),
('Testa', '', 'Testa se adianta um pouco prá frente', 'V', 1.00),
('Testa', '', 'Têmporas afuniladas', 'V', 1.00),
('Testa', '', 'Cabelo mais afastado (cabelo começa lá atrás na cabeça)', 'V', 1.00),
('Testa', '', 'Entradas laterais nos cabelos', 'V', 1.00),
('Testa', '', 'Linhas retas e quadradas na testa', 'E', 1.00),
('Bochecha', '', 'Maça do rosto/bochecha fofinha', 'C', 1.00),
('Bochecha', '', 'Bochecha dura', 'E', 1.00),
('Bochecha', '', 'Linhas bem definidas e desenhadas (parece que passou blush na bochecha)', 'R', 1.00),
('Maxilar / Queixo', '', 'Queixo retraído e menor', 'C', 1.00),
('Maxilar / Queixo', '', 'Papada', 'C', 1.00),
('Maxilar / Queixo', '', 'Maxilar evidente e quadrado', 'E', 1.00),
('Maxilar / Queixo', '', 'Leve tensão no maxilar', 'E', 1.00),
('Maxilar / Queixo', '', 'Tensão no maxilar como se fossem nódulos (musculatura tensionada)', 'E', 1.00),
('Maxilar / Queixo', '', 'Grande afunilamento do queixo (quando começar a partir da orelha)', 'D', 1.00),
('Maxilar / Queixo', '', 'Médio afunilamento do queixo (qdo começar a partir da orelha)', 'D', 1.00),
('Maxilar / Queixo', '', 'Maxilar bem definido de frente e de lado', 'R', 1.00),
('Sobrancelhas', '', 'Contraídas, bagunçadas, desalinhadas ou tortas', 'E', 1.00),
('Sobrancelhas', '', 'Sobrancelhas unidas - mostram raiva', 'E', 1.00),
('Sobrancelhas', '', 'Côncavo com osso protuberante', 'V', 1.00),
('Sobrancelhas', '', 'Tensão (risco bem marcado) ou nódulos de tensão entre as sobrancelhas', 'E', 1.00),
('Olhos', '', 'Tem aspecto esbugalhado', 'V', 1.00),
('Olhos', '', 'Tem desconexão, os olhos não conectam, parecem desfocados', 'V', 1.00),
('Olhos', '', 'Olho de peixe morto (sem vida)', 'V', 1.00),
('Olhos', '', 'Quando sorri tem a expressão de tristeza e vazio', 'C', 1.00),
('Olhos', '', 'Olhar de pidão, me pega no colo', 'C', 1.00),
('Olhos', '', 'Olhar que conecta, tem conexão', 'C', 1.00),
('Olhos', '', 'Olho mais Oral - Direito', 'C', 1.00),
('Olhos', '', 'Olho mais Oral - Esquerdo', 'C', 1.00),
('Olhos', '', 'Sensação - avaliador e ou penetrante', 'D', 1.00),
('Olhos', '', 'Parece querer entender o que você quer dele', 'D', 1.00),
('Olhos', '', 'Olho mais avaliador - Direito', 'D', 1.00),
('Olhos', '', 'Olho mais avaliador - Esquerdo', 'D', 1.00),
('Olhos', '', 'Sensação de peso - tensão ou medo de se conectar. Se conecta evitando', 'E', 1.00),
('Olhos', '', 'Expressão de raiva ou pronto a se submeter a você', 'E', 1.00),
('Olhos', '', 'Olhos com conexão sedutora, atraentes, cheios de energia de vida e energia sexual', 'R', 1.00),
('Olhos', '', 'Olhos harmônicos e proporcional/ contornos dos olhos muito bem desenhados', 'R', 1.00),
('Olhos', '', 'Usa óculos', 'V', 1.00),
('Olhos', '', 'Olho fundo (em termos de cavidade ocular)', 'V', 1.00);

-- Continuar com mais dados...
INSERT INTO public.body_evaluations (body_part, evaluation_context, evaluation_description, trait_code, weight) VALUES
('Boca', 'Sensação e Expressão', 'Parece um lábio que não quer se expressar', 'V', 1.00),
('Boca', 'Sensação e Expressão', 'Parece estar emburrado e ou sensação de choro', 'C', 1.00),
('Boca', 'Sensação e Expressão', 'Sensação - quer se montar para mostrar a sua melhor versão, quer encantar', 'D', 1.00),
('Boca', 'Sensação e Expressão', 'Expressão de uma boca travada faz força para não abrir', 'E', 1.00),
('Boca', 'Sensação e Expressão', 'Segura a raiva nos dentes', 'E', 1.00),
('Boca', 'Sensação e Expressão', 'Sensação - essa boca beija', 'R', 1.00),
('Boca', 'Sensação e Expressão', 'Atraente e brilha naturalmente', 'R', 1.00),
('Boca', 'Sensação e Expressão', 'Boca sedutora que faz charme', 'R', 1.00),
('Boca', 'Aspectos Gerais', 'Tem biquinho e aspecto infantil', 'C', 1.00),
('Boca', 'Aspectos Gerais', 'Tende a ficar com a boca entreaberta com formato de O', 'C', 1.00),
('Lábios', '', 'Lábio sem cor e sem vida', 'V', 1.00),
('Lábios', '', 'É fina em cima', 'V', 1.00),
('Lábios', '', 'É fina em baixo', 'V', 1.00),
('Lábios', '', 'Quando sorri a parte de cima entra pra dentro', 'V', 1.00),
('Lábios', '', 'Lábios volumosos em cima', 'C', 1.00),
('Lábios', '', 'Lábios volumosos em baixo', 'C', 1.00),
('Lábios', '', 'Rosados', 'C', 1.00),
('Lábios', '', 'Boca puxa/abre mais para a direita', 'D', 1.00),
('Lábios', '', 'Boca puxa/abre mais para a esquerda', 'D', 1.00),
('Lábios', '', 'Formato em U de cabeça para baixo', 'E', 1.00),
('Lábios', '', 'Pode ter um vinco no final da boca que segue em direção ao queixo', 'E', 1.00),
('Lábios', '', 'Lábios retos - quando sorri fica mais reto ainda', 'E', 1.00),
('Lábios', '', 'Tipo um coração na boca - parte superior - arco do cupido', 'R', 1.00),
('Lábios', '', 'Lábios desenhados - contorno', 'R', 1.00),
('Dentes e Gengiva', '', 'Quando sorri vê todos os dentes', 'C', 1.00),
('Dentes e Gengiva', '', 'Quando sorri vê gengiva', 'C', 1.00),
('Dentes e Gengiva', '', 'Sorriso travado', 'E', 1.00),
('Dentes e Gengiva', '', 'Usou ou usa aparelho ortodôntico?', 'E', 1.00),
('Dentes e Gengiva', '', 'Dentes tortos e desproporcionais (com tamanhos diferentes)', 'E', 1.00),
('Dentes e Gengiva', '', 'Usou ou usa placa de dente para dormir?', 'E', 1.00),
('Dentes e Gengiva', '', 'Tem bruxismo', 'E', 1.00),
('Dentes e Gengiva', '', 'Expressão - sorriso colgate e perfeito, harmônico - tudo em seu lugar', 'R', 1.00),
('Dentes e Gengiva', '', 'Dentes grandes', 'R', 1.00);

-- Inserir dados do tronco e outras partes (limitando para não exceder o tamanho da query)
INSERT INTO public.body_evaluations (body_part, evaluation_context, evaluation_description, trait_code, weight) VALUES
('Tronco', 'Sensação e Expressão', 'Sensação - que não tem muita vida ali', 'V', 1.00),
('Tronco', 'Sensação e Expressão', 'Sensação - vontade de abraçar', 'C', 1.00),
('Tronco', 'Sensação e Expressão', 'Sensação - postura armada para parecer maior', 'D', 1.00),
('Tronco', 'Sensação e Expressão', 'Expressão - inflado', 'D', 1.00),
('Tronco', 'Sensação e Expressão', 'Sensação que suporta muita coisa', 'E', 1.00),
('Tronco', 'Sensação e Expressão', 'Sensação de Tensão', 'E', 1.00),
('Tronco', 'Sensação e Expressão', 'Sensação - da vontade de olhar analisar e admirar', 'R', 1.00),
('Tronco', 'Aspectos Gerais', 'É mais esticado e alongado', 'V', 1.00),
('Tronco', 'Aspectos Gerais', 'Mais fino e magro e não necessariamente alto', 'V', 1.00),
('Tronco', 'Aspectos Gerais', 'Corpo largado, parece um corpo montado, desajeitado', 'V', 1.00),
('Tronco', 'Aspectos Gerais', 'Arredondado', 'C', 1.00),
('Tronco', 'Aspectos Gerais', 'Macio', 'C', 1.00),
('Tronco', 'Aspectos Gerais', 'Triângulo invertido/casca de sorvete - ombros maiores que o início do quadril', 'D', 1.00),
('Tronco', 'Aspectos Gerais', 'Tronco Quadrado', 'E', 1.00),
('Tronco', 'Aspectos Gerais', 'Musculatura densa e dura', 'E', 1.00),
('Tronco', 'Aspectos Gerais', 'Musculoso mais sem definição muscular (Gordinho duro)', 'E', 1.00),
('Tronco', 'Aspectos Gerais', 'Postura ereta', 'R', 1.00),
('Tronco', 'Aspectos Gerais', 'Bem articulado com músculos', 'R', 1.00),
('Tronco', 'Aspectos Gerais', 'Curvas bem definidas', 'R', 1.00),
('Tronco', 'Aspectos Gerais', 'Formato violão/ampulheta', 'R', 1.00),
('Tronco', 'Aspectos Gerais', 'Tônus muscular muito mais presente e desenhado', 'R', 1.00);

-- Adicionar algumas avaliações das pernas para exemplo
INSERT INTO public.body_evaluations (body_part, evaluation_context, evaluation_description, trait_code, weight) VALUES
('Pernas', 'Sensação e Expressão', 'Sensação - Canela, joelho e canela (muito finas)', 'V', 1.00),
('Pernas', 'Sensação e Expressão', 'Sensação - pernas vão quebrar', 'V', 1.00),
('Pernas', 'Sensação e Expressão', 'Expressão - pernas não querem contato com o chão/manda toda energia pra cabeça', 'V', 1.00),
('Pernas', 'Sensação e Expressão', 'Expressão - pernas grandes mas sem força (não aguentou o peso do corpo e o joelho cedeu)', 'C', 1.00),
('Pernas', 'Sensação e Expressão', 'Sensação - pernas criam raízes onde para como um tronco de árvore e que não vai sair do lugar', 'E', 1.00),
('Pernas', 'Sensação e Expressão', 'Expressão - pernas com energia mais disposição para fazer acontecer', 'R', 1.00);