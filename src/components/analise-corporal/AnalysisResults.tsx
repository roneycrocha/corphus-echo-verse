import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Save, FileText, ArrowLeft, Download, Bot, Brain } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useCustomAIAgent } from '@/hooks/useCustomAIAgent';
import { useAIAgentConfig } from '@/hooks/useAIAgentConfig';
import { toast } from 'sonner';

interface TraitScore {
  code: string;
  name: string;
  color: string;
  total: number;
  percentage: number;
}

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

interface AnalysisResultsProps {
  patientName: string;
  patientId?: string;
  traitScores: TraitScore[];
  evaluationData: Record<string, number>;
  evaluations: BodyEvaluation[];
  onSave: () => void;
  onBack: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  patientName,
  patientId,
  traitScores,
  evaluationData,
  evaluations,
  onSave,
  onBack
}) => {
  const [aiInsights, setAiInsights] = useState<string>('');
  const [showAiInsights, setShowAiInsights] = useState(false);
  
  const { analyzeBodyComposition, loading } = useCustomAIAgent();
  const { agentId } = useAIAgentConfig();
  const totalPoints = traitScores.reduce((sum, trait) => sum + trait.total, 0);
  const dominantTrait = traitScores[0];
  const evaluatedCount = Object.values(evaluationData).filter(weight => weight > 0).length;

  const getTraitDescription = (code: string) => {
    const descriptions = {
      'V': 'Pessoas com alta pontuação em Visionário tendem a ser criativas, inovadoras e orientadas para o futuro.',
      'C': 'Pessoas com alta pontuação em Comunicador são expressivas, sociáveis e hábeis em relacionamentos.',
      'D': 'Pessoas com alta pontuação em Dominador demonstram liderança, assertividade e gosto pelo controle.',
      'E': 'Pessoas com alta pontuação em Executor são práticas, orientadas para resultados e focadas em ação.',
      'R': 'Pessoas com alta pontuação em Resolutivo são analíticas, detalhistas e orientadas para soluções.'
    };
    return descriptions[code as keyof typeof descriptions] || '';
  };

  const generateAIInsights = async () => {
    if (!patientId || !agentId) {
      toast.error('ID do paciente ou agente não disponível');
      return;
    }

    const analysisData = {
      patientName,
      traitScores,
      evaluationData,
      totalPoints,
      dominantTrait: dominantTrait?.name,
      evaluatedCount
    };

    try {
      const result = await analyzeBodyComposition(
        patientId,
        `Análise Corporal Completa:
        
Paciente: ${patientName}
Traços identificados: ${traitScores.map(t => `${t.name} (${t.code}): ${t.percentage.toFixed(1)}% - ${t.total} pontos`).join(', ')}
Traço dominante: ${dominantTrait?.name} (${dominantTrait?.percentage.toFixed(1)}%)
Total de avaliações: ${evaluatedCount}
Total de pontos: ${totalPoints.toFixed(1)}

Por favor, forneça uma análise detalhada dos traços identificados, suas implicações psicológicas e terapêuticas, e recomendações específicas para este perfil.`,
        agentId
      );

      if (result) {
        setAiInsights(result);
        setShowAiInsights(true);
      }
    } catch (error) {
      console.error('Erro ao gerar insights:', error);
    }
  };

  const exportReport = () => {
    // Implementar exportação de relatório
    console.log('Exportando relatório...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resultado da Análise</h2>
          <p className="text-muted-foreground">Paciente: {patientName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          {patientId && agentId && (
            <Button 
              variant="outline" 
              onClick={generateAIInsights}
              disabled={loading}
            >
              <Brain className="w-4 h-4 mr-2" />
              {loading ? 'Analisando...' : 'Insights IA'}
            </Button>
          )}
          <Button onClick={onSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Análise
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Resumo da Análise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{evaluatedCount}</div>
                <div className="text-sm text-muted-foreground">Avaliações</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalPoints.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Pontos Totais</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{traitScores.length}</div>
                <div className="text-sm text-muted-foreground">Traços Ativos</div>
              </div>
            </div>

            <Separator />

            {/* Dominant Trait */}
            {dominantTrait && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Traço Dominante</h3>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: `${dominantTrait.color}15` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full border-2"
                      style={{ backgroundColor: dominantTrait.color }}
                    />
                    <div>
                      <div className="font-semibold text-lg">
                        {dominantTrait.code} - {dominantTrait.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {dominantTrait.total.toFixed(1)} pontos ({dominantTrait.percentage.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                  <p className="text-sm">{getTraitDescription(dominantTrait.code)}</p>
                </div>
              </div>
            )}

            {/* All Traits Ranking */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Ranking Completo</h3>
              <div className="space-y-3">
                {traitScores.map((trait, index) => (
                  <div key={trait.code} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="text-lg font-bold text-muted-foreground w-8">
                      #{index + 1}
                    </div>
                    <div
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: trait.color }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {trait.code} - {trait.name}
                        </span>
                        <div className="text-sm text-muted-foreground">
                          {trait.total.toFixed(1)} pts ({trait.percentage.toFixed(1)}%)
                        </div>
                      </div>
                      <Progress value={trait.percentage} className="h-2 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Visual Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição Visual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {traitScores.map((trait) => (
                  <div key={trait.code} className="text-center">
                    <div
                      className="w-full h-8 rounded-full mb-2 flex items-center justify-center text-white font-bold"
                      style={{ 
                        backgroundColor: trait.color,
                        opacity: 0.3 + (trait.percentage / 100) * 0.7
                      }}
                    >
                      {trait.code}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {trait.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Analysis Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Data da Análise:</span>
                <br />
                <span className="font-medium">
                  {new Date().toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Método:</span>
                <br />
                <span className="font-medium">Análise Visual Guiada</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Status:</span>
                <br />
                <Badge variant="outline" className="text-green-600">
                  Completa
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Insights */}
      {showAiInsights && aiInsights && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Bot className="w-5 h-5" />
              Insights do Agente Especializado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-blue-900 bg-white p-4 rounded border">
                {aiInsights}
              </pre>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAiInsights(false)}
              >
                Fechar Insights
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};