import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Edit, Eye, Calendar, User, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TraitScorePanel } from './TraitScorePanel';
import { PhotoGallery } from './PhotoGallery';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BodyAnalysis {
  id: string;
  patient_id: string;
  analysis_name: string;
  analysis_date: string;
  evaluation_data: Record<string, number>;
  trait_scores: Array<{
    code: string;
    name: string;
    color: string;
    total: number;
    percentage: number;
  }>;
  photos: string[];
  observations: string;
  status: string;
  created_at: string;
}

interface AnalysisViewerProps {
  analysis: BodyAnalysis;
  patientName: string;
  onClose: () => void;
  onEdit?: () => void;
  mode: 'view' | 'edit';
}

export const AnalysisViewer: React.FC<AnalysisViewerProps> = ({
  analysis,
  patientName,
  onClose,
  onEdit,
  mode = 'view'
}) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<string[]>(analysis.photos || []);
  const [observations, setObservations] = useState(analysis.observations || '');
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const formatNumber = (value: number) => {
    return Number(value).toFixed(1);
  };

  const totalPoints = analysis.trait_scores.reduce((sum, score) => sum + score.total, 0);

  const handleSaveChanges = async () => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('body_analyses')
        .update({
          photos: photos,
          observations: observations,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysis.id);

      if (error) throw error;

      toast({
        title: 'Análise Atualizada',
        description: 'As alterações foram salvas com sucesso!',
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              {mode === 'view' ? 'Visualizar' : 'Editar'} Análise Corporal
            </h2>
            <p className="text-muted-foreground">
              {analysis.analysis_name} - {patientName}
            </p>
          </div>
          <div className="flex gap-2">
            {mode === 'view' && onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Analysis Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-primary" />
              <span>Informações da Análise</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data da Análise</p>
                <p className="font-medium">{formatDate(analysis.analysis_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge 
                  variant={analysis.status === 'completed' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {analysis.status === 'completed' ? 'Concluída' : analysis.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Pontos</p>
                <p className="font-medium">{totalPoints}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fotos</p>
                <p className="font-medium">{photos.length} foto(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
          {/* Photo Gallery */}
          <div className="xl:col-span-4">
            <PhotoGallery
              photos={photos}
              onPhotosChange={mode === 'edit' ? setPhotos : () => {}}
              patientId={analysis.patient_id}
            />
          </div>

          {/* Trait Scores */}
          <div className="xl:col-span-4">
            <TraitScorePanel traitScores={analysis.trait_scores} />
          </div>

          {/* Detailed Results */}
          <div className="xl:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Resultados Detalhados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.trait_scores.map((score, index) => (
                    <div key={score.code} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: score.color }}
                          />
                          <span className="font-medium">{score.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold">{formatNumber(score.total)}</span>
                          <span className="text-sm text-muted-foreground ml-1">
                            ({formatNumber(score.percentage)}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${score.percentage}%`,
                            backgroundColor: score.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Observações */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-2">Observações</h4>
                  {mode === 'edit' ? (
                    <Textarea
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Adicione observações sobre a análise..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {observations || 'Nenhuma observação adicionada.'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        {mode === 'edit' && (
          <div className="fixed bottom-4 left-4 right-4 xl:relative xl:bottom-auto xl:left-auto xl:right-auto z-50 xl:z-auto bg-background xl:bg-transparent p-4 xl:p-0 rounded-lg xl:rounded-none border xl:border-none shadow-lg xl:shadow-none">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSaveChanges} disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};