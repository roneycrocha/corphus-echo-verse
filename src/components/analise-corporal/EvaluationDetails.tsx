import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface BodyEvaluation {
  id: string;
  body_part: string;
  evaluation_context: string;
  evaluation_description: string;
  trait_code: string;
  weight: number;
  created_at: string;
  updated_at: string;
}

interface EvaluationDetailsProps {
  evaluation: BodyEvaluation;
}

export const EvaluationDetails: React.FC<EvaluationDetailsProps> = ({ evaluation }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Parte do Corpo</h4>
              <p className="text-lg font-semibold">{evaluation.body_part}</p>
            </div>
            
            {evaluation.evaluation_context && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Contexto</h4>
                <p>{evaluation.evaluation_context}</p>
              </div>
            )}

            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Traço Relacionado</h4>
              <Badge variant="outline" className="font-mono text-base px-3 py-1">
                {evaluation.trait_code}
              </Badge>
            </div>

            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Peso da Avaliação</h4>
              <p className="text-lg font-semibold">{evaluation.weight.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Descrição da Avaliação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{evaluation.evaluation_description}</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
        <div>
          <span className="font-medium">Criado em: </span>
          {new Date(evaluation.created_at).toLocaleString('pt-BR')}
        </div>
        <div>
          <span className="font-medium">Atualizado em: </span>
          {new Date(evaluation.updated_at).toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
};