-- Criar tabela para gerenciar a ordem das avaliações
CREATE TABLE public.evaluation_order (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  body_part TEXT NOT NULL,
  evaluation_context TEXT,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint para garantir ordem única por parte do corpo e contexto
  UNIQUE(body_part, evaluation_context, sort_order)
);

-- Índices para performance
CREATE INDEX idx_evaluation_order_body_part ON public.evaluation_order(body_part);
CREATE INDEX idx_evaluation_order_sort ON public.evaluation_order(sort_order);
CREATE INDEX idx_evaluation_order_active ON public.evaluation_order(is_active);

-- RLS policies
ALTER TABLE public.evaluation_order ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view evaluation order
CREATE POLICY "Authenticated users can view evaluation order" 
ON public.evaluation_order FOR SELECT 
USING (is_authenticated());

-- Admins can manage evaluation order
CREATE POLICY "Admins can manage evaluation order" 
ON public.evaluation_order FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_evaluation_order_updated_at
  BEFORE UPDATE ON public.evaluation_order
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais baseados nas avaliações existentes
INSERT INTO public.evaluation_order (body_part, evaluation_context, sort_order)
SELECT DISTINCT 
  body_part,
  evaluation_context,
  ROW_NUMBER() OVER (ORDER BY 
    CASE body_part
      WHEN 'Cabeça' THEN 1
      WHEN 'Testa' THEN 2
      WHEN 'Sobrancelhas' THEN 3
      WHEN 'Olhos' THEN 4
      WHEN 'Bochecha' THEN 5
      WHEN 'Maxilar / Queixo' THEN 6
      WHEN 'Boca' THEN 7
      WHEN 'Lábios' THEN 8
      WHEN 'Dentes e Gengiva' THEN 9
      WHEN 'Tronco' THEN 10
      WHEN 'Ombros' THEN 11
      WHEN 'Braços' THEN 12
      WHEN 'Peitoral' THEN 13
      WHEN 'Barriga' THEN 14
      WHEN 'Costas (Parte de Cima)' THEN 15
      WHEN 'Costas (Parte de Baixo)' THEN 16
      WHEN 'Quadril (Frente)' THEN 17
      WHEN 'Quadril (Lado)' THEN 18
      WHEN 'Costas' THEN 19
      WHEN 'Pernas' THEN 20
      WHEN 'Pernas (Frente)' THEN 21
      WHEN 'Pernas (Lado)' THEN 22
      WHEN 'Pernas (Costas)' THEN 23
      ELSE 99
    END,
    evaluation_context
  ) as sort_order
FROM public.body_evaluations
WHERE is_active = true
ORDER BY sort_order;