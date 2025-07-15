import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface BodyTrait {
  codigo: string;
  nome_simbolico: string;
}

interface BodyEvaluation {
  id?: string;
  body_part: string;
  evaluation_context: string;
  evaluation_description: string;
  trait_code: string;
  weight: number;
}

interface EvaluationFormProps {
  initialData?: BodyEvaluation;
  onSubmit: (data: Omit<BodyEvaluation, 'id'>) => void;
  onCancel: () => void;
}

export const EvaluationForm: React.FC<EvaluationFormProps> = ({
  initialData,
  onSubmit,
  onCancel
}) => {
  const [traits, setTraits] = useState<BodyTrait[]>([]);
  const [formData, setFormData] = useState<Omit<BodyEvaluation, 'id'>>({
    body_part: initialData?.body_part || '',
    evaluation_context: initialData?.evaluation_context || '',
    evaluation_description: initialData?.evaluation_description || '',
    trait_code: initialData?.trait_code || '',
    weight: initialData?.weight || 1.0
  });

  useEffect(() => {
    loadTraits();
  }, []);

  const loadTraits = async () => {
    try {
      const { data, error } = await supabase
        .from('body_traits')
        .select('codigo, nome_simbolico')
        .eq('is_active', true)
        .order('nome_simbolico');

      if (error) throw error;
      setTraits(data || []);
    } catch (error) {
      console.error('Erro ao carregar traços:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="body_part">Parte do Corpo</Label>
          <Input
            id="body_part"
            value={formData.body_part}
            onChange={(e) => handleChange('body_part', e.target.value)}
            placeholder="Ex: Cabeça, Testa, Olhos..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="evaluation_context">Contexto de Avaliação</Label>
          <Input
            id="evaluation_context"
            value={formData.evaluation_context}
            onChange={(e) => handleChange('evaluation_context', e.target.value)}
            placeholder="Ex: Sensação e Expressão, Aspectos Gerais..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="evaluation_description">Descrição da Avaliação</Label>
        <Textarea
          id="evaluation_description"
          value={formData.evaluation_description}
          onChange={(e) => handleChange('evaluation_description', e.target.value)}
          placeholder="Descreva o critério de avaliação..."
          required
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trait_code">Traço Relacionado</Label>
          <Select value={formData.trait_code} onValueChange={(value) => handleChange('trait_code', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um traço" />
            </SelectTrigger>
            <SelectContent>
              {traits.map((trait) => (
                <SelectItem key={trait.codigo} value={trait.codigo}>
                  {trait.codigo} - {trait.nome_simbolico}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">Peso da Avaliação</Label>
          <Input
            id="weight"
            type="number"
            step="0.01"
            min="0"
            max="10"
            value={formData.weight}
            onChange={(e) => handleChange('weight', parseFloat(e.target.value) || 0)}
            placeholder="1.00"
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {initialData ? 'Atualizar' : 'Criar'} Avaliação
        </Button>
      </div>
    </form>
  );
};