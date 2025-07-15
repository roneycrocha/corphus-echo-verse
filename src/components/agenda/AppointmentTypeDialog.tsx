import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, Bot, FileText } from 'lucide-react';

interface AppointmentTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoCall: () => void;
  onAIAssistance: () => void;
  onBasicAppointment: () => void;
  patientName: string;
}

export const AppointmentTypeDialog: React.FC<AppointmentTypeDialogProps> = ({
  isOpen,
  onClose,
  onVideoCall,
  onAIAssistance,
  onBasicAppointment,
  patientName
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tipo de Atendimento</DialogTitle>
          <DialogDescription>
            Selecione o tipo de atendimento para {patientName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          <Button
            onClick={onVideoCall}
            className="w-full h-20 flex flex-col items-center justify-center space-y-2"
            variant="outline"
          >
            <Video className="w-8 h-8 text-blue-600" />
            <div className="text-center">
              <div className="font-semibold">Videochamada</div>
              <div className="text-xs text-muted-foreground">Atendimento via Daily.co</div>
            </div>
          </Button>
          
          <Button
            onClick={onAIAssistance}
            className="w-full h-20 flex flex-col items-center justify-center space-y-2"
            variant="outline"
          >
            <Bot className="w-8 h-8 text-purple-600" />
            <div className="text-center">
              <div className="font-semibold">Atendimento com IA</div>
              <div className="text-xs text-muted-foreground">Assistente inteligente</div>
            </div>
          </Button>
          
          <Button
            onClick={onBasicAppointment}
            className="w-full h-20 flex flex-col items-center justify-center space-y-2"
            variant="outline"
          >
            <FileText className="w-8 h-8 text-green-600" />
            <div className="text-center">
              <div className="font-semibold">Atendimento Básico</div>
              <div className="text-xs text-muted-foreground">Anotações e gravação manual</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};