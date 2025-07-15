import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface BodyTrait {
  codigo: string;
  nome_simbolico: string;
  nome_tecnico: string;
  color: string;
}

interface BodyEvaluation {
  id: string;
  body_part: string;
  evaluation_context: string;
  evaluation_description: string;
  trait_code: string;
  weight: number;
  body_traits?: BodyTrait;
}

interface EvaluationStepProps {
  bodyPart: string;
  context: string;
  evaluations: BodyEvaluation[];
  evaluationData: Record<string, number>;
  onEvaluationChange: (evaluationId: string, weight: number) => void;
}

export const EvaluationStep: React.FC<EvaluationStepProps> = ({
  bodyPart,
  context,
  evaluations,
  evaluationData,
  onEvaluationChange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-3">
          <div className="text-2xl">🎯</div>
          <div>
            <div>{bodyPart}</div>
            {context !== 'Geral' && (
              <div className="text-sm font-normal text-muted-foreground">
                {context}
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground">
          Avalie cada característica observada nas fotos do paciente. Ajuste o peso conforme a intensidade observada.
        </div>

        {evaluations.map((evaluation) => {
          const currentWeight = evaluationData[evaluation.id] || 0;
          const trait = evaluation.body_traits;

          return (
            <div key={evaluation.id} className="space-y-4 p-4 border rounded-lg">
              {/* Evaluation Description */}
              <div className="space-y-2">
                <p className="font-medium">{evaluation.evaluation_description}</p>
                {trait && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: trait.color }}
                    />
                    <Badge variant="outline" className="text-xs">
                      {trait.codigo} - {trait.nome_simbolico}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Weight Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Peso da Avaliação
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="3"
                      step="0.1"
                      value={currentWeight}
                      onChange={(e) => onEvaluationChange(evaluation.id, parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 text-center"
                    />
                    <span className="text-sm text-muted-foreground">/ 3</span>
                  </div>
                </div>

                {/* Slider */}
                <div className="px-1">
                  <Slider
                    value={[currentWeight]}
                    onValueChange={(value) => onEvaluationChange(evaluation.id, value[0])}
                    max={3}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Não observado</span>
                    <span>Moderado</span>
                    <span>Muito evidente</span>
                  </div>
                </div>

                {/* Weight Description */}
                <div className="text-xs text-muted-foreground">
                  {currentWeight === 0 && "Característica não observada"}
                  {currentWeight > 0 && currentWeight <= 1 && "Características leves ou sutis"}
                  {currentWeight > 1 && currentWeight <= 2 && "Características moderadas e visíveis"}
                  {currentWeight > 2 && "Características muito evidentes e marcantes"}
                </div>
              </div>
            </div>
          );
        })}

        {evaluations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">🤔</div>
            <p>Nenhuma avaliação disponível para esta etapa</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};