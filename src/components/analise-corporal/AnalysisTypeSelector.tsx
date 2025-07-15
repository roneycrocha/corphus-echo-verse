import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Clock, Zap, BarChart3 } from 'lucide-react';

interface AnalysisTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDetailed: () => void;
  onSelectSimplified: () => void;
  patientName: string;
}

export const AnalysisTypeSelector: React.FC<AnalysisTypeSelectorProps> = ({
  isOpen,
  onClose,
  onSelectDetailed,
  onSelectSimplified,
  patientName
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Escolha o Tipo de Análise Corporal
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Paciente: <span className="font-medium">{patientName}</span>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Análise Detalhada */}
          <Card className="relative cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Análise Detalhada</CardTitle>
                  <p className="text-sm text-muted-foreground">Processo completo com avaliações específicas</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Avaliações específicas por parte do corpo</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Perguntas contextualizadas</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Maior precisão nos resultados</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">Tempo estimado: 15-25 minutos</span>
                </div>
              </div>

              <Button 
                onClick={onSelectDetailed}
                className="w-full"
                size="lg"
              >
                Iniciar Análise Detalhada
              </Button>
            </CardContent>
          </Card>

          {/* Análise Resumida */}
          <Card className="relative cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Análise Resumida</CardTitle>
                  <p className="text-sm text-muted-foreground">Processo rápido com pontuação manual</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Pontuação direta por traço</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Interface simplificada</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Controle manual dos valores</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Tempo estimado: 5-10 minutos</span>
                </div>
              </div>

              <Button 
                onClick={onSelectSimplified}
                className="w-full"
                variant="outline"
                size="lg"
              >
                Iniciar Análise Resumida
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            💡 <strong>Dica:</strong> Use a análise detalhada para uma avaliação mais precisa ou a resumida quando você já conhece bem o paciente e quer uma avaliação rápida.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};