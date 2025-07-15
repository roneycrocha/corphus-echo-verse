import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Brain, 
  PlusCircle, 
  Sparkles, 
  FileText,
  Target,
  Edit
} from 'lucide-react';
import { TreatmentPlanAISuggestionModal } from './TreatmentPlanAISuggestionModal';
import { CreateTreatmentPlanModal } from './CreateTreatmentPlanModal';

interface TreatmentPlanSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  transcription?: string;
  sessionNotes?: string;
  sessionId?: string; // Adicionar sessionId
  onPlanCreated?: (planId: string) => void;
}

export const TreatmentPlanSelector: React.FC<TreatmentPlanSelectorProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  patientEmail,
  patientPhone,
  transcription,
  sessionNotes,
  sessionId,
  onPlanCreated
}) => {
  const [showAIModal, setShowAIModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  const handleAIGeneration = () => {
    setShowAIModal(true);
  };

  const handleManualCreation = () => {
    setShowManualModal(true);
  };

  const handleCloseAI = () => {
    setShowAIModal(false);
    onClose();
  };

  const handleCloseManual = () => {
    setShowManualModal(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary" />
              <span>Criar Plano Terapêutico</span>
            </DialogTitle>
            <DialogDescription>
              Escolha como deseja criar o plano terapêutico para {patientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Opção de IA */}
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleAIGeneration}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-3 text-lg">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <span>Gerar com Inteligência Artificial</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Recomendado</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Baseado nos traços</span>
                    </div>
                  </div>
                </CardTitle>
                <CardDescription className="ml-14">
                  A IA analisará a conversa transcrita, os traços de caráter do paciente e planos anteriores para criar um plano personalizado
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Opção Manual */}
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleManualCreation}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-3 text-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Edit className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <span>Criar Manualmente</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Controle total</span>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Personalizado</span>
                    </div>
                  </div>
                </CardTitle>
                <CardDescription className="ml-14">
                  Crie um plano terapêutico personalizado com suas próprias observações e estratégias de tratamento
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de geração com IA */}
      <TreatmentPlanAISuggestionModal
        isOpen={showAIModal}
        onClose={handleCloseAI}
        patientId={patientId}
        patientName={patientName}
        patientEmail={patientEmail}
        patientPhone={patientPhone}
        transcription={transcription}
        sessionNotes={sessionNotes}
        sessionId={sessionId}
        onPlanCreated={onPlanCreated}
      />

      {/* Modal de criação manual */}
      <CreateTreatmentPlanModal
        isOpen={showManualModal}
        onClose={handleCloseManual}
        patientId={patientId}
        patientName={patientName}
        onPlanCreated={onPlanCreated}
      />
    </>
  );
};