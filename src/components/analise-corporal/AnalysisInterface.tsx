import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Image as ImageIcon, Check, ArrowLeft, ArrowRight, Save, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PhotoGallery } from './PhotoGallery';
import { EvaluationStep } from './EvaluationStep';
import { TraitScorePanel } from './TraitScorePanel';
import { AnalysisResults } from './AnalysisResults';
import { PatientNameWithTraits } from '@/components/common/PatientNameWithTraits';

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

interface EvaluationData {
  evaluation_id: string;
  weight: number;
}

interface TraitScore {
  code: string;
  name: string;
  color: string;
  total: number;
  percentage: number;
}

interface AnalysisInterfaceProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  existingAnalysis?: {
    id: string;
    evaluation_data: Record<string, number>;
    trait_scores: TraitScore[];
    photos: string[];
  } | null;
  mode?: 'create' | 'edit';
}

export const AnalysisInterface: React.FC<AnalysisInterfaceProps> = ({
  patientId,
  patientName,
  onClose
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [evaluations, setEvaluations] = useState<BodyEvaluation[]>([]);
  const [evaluationData, setEvaluationData] = useState<Record<string, number>>({});
  const [traitScores, setTraitScores] = useState<TraitScore[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    loadEvaluations();
  }, []);

  useEffect(() => {
    calculateTraitScores();
  }, [evaluationData, evaluations]);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('body_evaluations')
        .select(`
          id,
          body_part,
          evaluation_context,
          evaluation_description,
          trait_code,
          weight,
          body_traits:trait_code (
            codigo,
            nome_simbolico,
            nome_tecnico,
            color
          )
        `)
        .eq('is_active', true)
        .order('body_part')
        .order('evaluation_context');

      if (error) throw error;
      setEvaluations(data || []);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as avaliações.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTraitScores = () => {
    const scores: Record<string, { total: number; trait: BodyTrait }> = {};

    evaluations.forEach(evaluation => {
      const weight = evaluationData[evaluation.id] || 0;
      if (weight > 0 && evaluation.body_traits) {
        const traitCode = evaluation.trait_code;
        if (!scores[traitCode]) {
          scores[traitCode] = {
            total: 0,
            trait: evaluation.body_traits
          };
        }
        scores[traitCode].total += weight;
      }
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

  const groupedEvaluations = evaluations.reduce((groups, evaluation) => {
    const key = `${evaluation.body_part}-${evaluation.evaluation_context || 'Geral'}`;
    if (!groups[key]) {
      groups[key] = {
        body_part: evaluation.body_part,
        context: evaluation.evaluation_context || 'Geral',
        evaluations: []
      };
    }
    groups[key].evaluations.push(evaluation);
    return groups;
  }, {} as Record<string, { body_part: string; context: string; evaluations: BodyEvaluation[] }>);

  const steps = Object.values(groupedEvaluations);

  const handleEvaluationChange = (evaluationId: string, weight: number) => {
    setEvaluationData(prev => ({
      ...prev,
      [evaluationId]: weight
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
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

      const { error } = await supabase
        .from('body_analyses')
        .insert({
          patient_id: patientId,
          analysis_name: `Análise Corporal - ${patientName}`,
          evaluation_data: evaluationData as any,
          trait_scores: traitScores as any,
          photos: photos,
          observations: '',
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: 'Análise Salva',
        description: 'A análise corporal foi salva com sucesso!',
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
        evaluationData={evaluationData}
        evaluations={evaluations}
        onSave={handleSaveAnalysis}
        onBack={() => setIsCompleted(false)}
      />
    );
  }

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Análise Corporal</h2>
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
                <span>{currentStep + 1} de {steps.length}</span>
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

          {/* Evaluation Step */}
          <div className="xl:col-span-6 order-3 xl:order-2 space-y-4">
            {currentStepData && (
              <EvaluationStep
                bodyPart={currentStepData.body_part}
                context={currentStepData.context}
                evaluations={currentStepData.evaluations}
                evaluationData={evaluationData}
                onEvaluationChange={handleEvaluationChange}
              />
            )}

            {/* Navigation - Fixed at bottom on mobile */}
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
                  {currentStep === steps.length - 1 ? (
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