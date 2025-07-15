import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PhotoGallery } from './PhotoGallery';
import { TraitScorePanel } from './TraitScorePanel';
import { AnalysisResults } from './AnalysisResults';
import { PatientNameWithTraits } from '@/components/common/PatientNameWithTraits';

interface BodyTrait {
  codigo: string;
  nome_simbolico: string;
  nome_tecnico: string;
  color: string;
}

interface TraitScore {
  code: string;
  name: string;
  color: string;
  total: number;
  percentage: number;
}

interface SimplifiedAnalysisProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

interface BodyPartTraits {
  bodyPart: string;
  traits: BodyTrait[];
  scores: Record<string, number>;
}

export const SimplifiedAnalysis: React.FC<SimplifiedAnalysisProps> = ({
  patientId,
  patientName,
  onClose
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [bodyParts, setBodyParts] = useState<BodyPartTraits[]>([]);
  const [traitScores, setTraitScores] = useState<TraitScore[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    loadBodyPartsAndTraits();
  }, []);

  useEffect(() => {
    calculateTraitScores();
  }, [bodyParts]);

  const loadBodyPartsAndTraits = async () => {
    try {
      setLoading(true);
      
      // Buscar avaliações e traços agrupados por parte do corpo
      const { data: evaluations, error } = await supabase
        .from('body_evaluations')
        .select(`
          body_part,
          trait_code,
          body_traits:trait_code (
            codigo,
            nome_simbolico,
            nome_tecnico,
            color
          )
        `)
        .eq('is_active', true)
        .order('body_part');

      if (error) throw error;

      // Agrupar por parte do corpo
      const grouped: Record<string, BodyTrait[]> = {};
      
      evaluations?.forEach(evaluation => {
        const bodyPart = evaluation.body_part;
        const trait = evaluation.body_traits;
        
        if (!grouped[bodyPart]) {
          grouped[bodyPart] = [];
        }
        
        // Evitar duplicatas
        const exists = grouped[bodyPart].some(t => t.codigo === trait.codigo);
        if (!exists && trait) {
          grouped[bodyPart].push(trait);
        }
      });

      // Converter para array de BodyPartTraits
      const bodyPartsArray: BodyPartTraits[] = Object.entries(grouped).map(([bodyPart, traits]) => ({
        bodyPart,
        traits,
        scores: traits.reduce((acc, trait) => {
          acc[trait.codigo] = 0;
          return acc;
        }, {} as Record<string, number>)
      }));

      setBodyParts(bodyPartsArray);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da análise.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTraitScores = () => {
    const scores: Record<string, { total: number; trait: BodyTrait }> = {};

    bodyParts.forEach(bodyPart => {
      bodyPart.traits.forEach(trait => {
        const score = bodyPart.scores[trait.codigo] || 0;
        
        if (!scores[trait.codigo]) {
          scores[trait.codigo] = {
            total: 0,
            trait: trait
          };
        }
        scores[trait.codigo].total += score;
      });
    });

    const totalPoints = Object.values(scores).reduce((sum, score) => sum + score.total, 0);
    
    const traitScoresList: TraitScore[] = Object.entries(scores).map(([code, { total, trait }]) => ({
      code,
      name: trait.nome_simbolico,
      color: trait.color,
      total,
      percentage: totalPoints > 0 ? (total / totalPoints) * 100 : 0
    }));

    // Ordenar por pontuação
    traitScoresList.sort((a, b) => b.total - a.total);
    setTraitScores(traitScoresList);
  };

  const updateTraitScore = (bodyPartIndex: number, traitCode: string, score: number) => {
    const newBodyParts = [...bodyParts];
    newBodyParts[bodyPartIndex].scores[traitCode] = score;
    setBodyParts(newBodyParts);
  };

  const handleNext = () => {
    if (currentStep < bodyParts.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveAnalysis = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar dados de avaliação simplificada
      const evaluationData: Record<string, number> = {};
      bodyParts.forEach(bodyPart => {
        Object.entries(bodyPart.scores).forEach(([traitCode, score]) => {
          evaluationData[`${bodyPart.bodyPart}_${traitCode}`] = score;
        });
      });

      const { error } = await supabase
        .from('body_analyses')
        .insert({
          patient_id: patientId,
          analysis_name: `Análise Resumida - ${patientName}`,
          evaluation_data: evaluationData as any,
          trait_scores: traitScores as any,
          photos: photos,
          observations: '',
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: 'Análise Salva',
        description: 'A análise resumida foi salva com sucesso!',
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar análise:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a análise.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando análise...</div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <AnalysisResults
        patientName={patientName}
        traitScores={traitScores}
        evaluationData={{}}
        evaluations={[]}
        onSave={handleSaveAnalysis}
        onBack={() => setIsCompleted(false)}
      />
    );
  }

  const currentBodyPart = bodyParts[currentStep];
  const progress = ((currentStep + 1) / bodyParts.length) * 100;

  if (!currentBodyPart) {
    return <div>Nenhuma parte do corpo encontrada</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Análise Corporal Resumida</h2>
            <PatientNameWithTraits 
              patientId={patientId}
              patientName={patientName}
              className="text-muted-foreground"
            />
          </div>
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso da Análise</span>
                <span>{currentStep + 1} de {bodyParts.length}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 min-h-[calc(100vh-16rem)]">
          {/* Photo Gallery */}
          <div className="xl:col-span-3 order-1 xl:order-1">
            <PhotoGallery
              photos={photos}
              onPhotosChange={setPhotos}
              patientId={patientId}
            />
          </div>

          {/* Body Part Scoring */}
          <div className="xl:col-span-6 order-3 xl:order-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  {currentBodyPart.bodyPart}
                </CardTitle>
                <p className="text-muted-foreground">
                  Pontue cada traço de 0 a 3 conforme a intensidade observada
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentBodyPart.traits.map((trait) => (
                  <div key={trait.codigo} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: trait.color }}
                        />
                        <div>
                          <span className="font-medium">{trait.nome_simbolico}</span>
                          <p className="text-sm text-muted-foreground">{trait.nome_tecnico}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {[0, 1, 2, 3].map((score) => (
                          <Button
                            key={score}
                            variant={currentBodyPart.scores[trait.codigo] === score ? "default" : "outline"}
                            size="sm"
                            className="w-12 h-12"
                            onClick={() => updateTraitScore(currentStep, trait.codigo, score)}
                          >
                            {score}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      0 = Ausente | 1 = Leve | 2 = Moderado | 3 = Intenso
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="fixed bottom-4 left-4 right-4 xl:relative xl:bottom-auto xl:left-auto xl:right-auto z-50 xl:z-auto bg-background xl:bg-transparent p-4 xl:p-0 rounded-lg xl:rounded-none border xl:border-none shadow-lg xl:shadow-none">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex-1 mr-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
                <Button onClick={handleNext} className="flex-1 ml-2">
                  {currentStep === bodyParts.length - 1 ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Finalizar
                    </>
                  ) : (
                    <>
                      Próximo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Trait Scores Panel */}
          <div className="xl:col-span-3 order-2 xl:order-3">
            <TraitScorePanel traitScores={traitScores} />
          </div>
        </div>
      </div>
    </div>
  );
};