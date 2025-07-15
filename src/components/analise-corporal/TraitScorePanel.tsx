import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface TraitScore {
  code: string;
  name: string;
  color: string;
  total: number;
  percentage: number;
}

interface TraitScorePanelProps {
  traitScores: TraitScore[];
}

export const TraitScorePanel: React.FC<TraitScorePanelProps> = ({
  traitScores
}) => {
  const totalPoints = traitScores.reduce((sum, trait) => sum + trait.total, 0);

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
            📊
          </div>
          Pontuação por Traço
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalPoints > 0 ? (
          <>
            <div className="text-sm text-muted-foreground">
              Total de pontos: <span className="font-medium">{totalPoints.toFixed(1)}</span>
            </div>

            <div className="space-y-3">
              {traitScores.map((trait, index) => (
                <div key={trait.code} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: trait.color }}
                      />
                      <span className="font-medium text-sm">{trait.code}</span>
                      <span className="text-sm text-muted-foreground">
                        {trait.name}
                      </span>
                    </div>
                    {index === 0 && trait.percentage > 0 && (
                      <Badge variant="default" className="text-xs">
                        Dominante
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <Progress 
                      value={trait.percentage} 
                      className="h-2"
                      style={{
                        '--progress-background': trait.color
                      } as React.CSSProperties}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{trait.total.toFixed(1)} pts</span>
                      <span>{trait.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trait Descriptions */}
            <div className="pt-4 border-t space-y-2">
              <div className="text-sm font-medium">Legenda dos Traços:</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div><strong>V - Visionário:</strong> Criatividade e inovação</div>
                <div><strong>C - Comunicador:</strong> Expressão e relacionamento</div>
                <div><strong>D - Dominador:</strong> Liderança e controle</div>
                <div><strong>E - Executor:</strong> Ação e resultado</div>
                <div><strong>R - Resolutivo:</strong> Análise e solução</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-sm">Nenhuma pontuação registrada</p>
            <p className="text-xs">As pontuações aparecerão conforme você avalia</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};