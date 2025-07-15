import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { User, AlertTriangle } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface DeletePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  patient: Patient | null;
  isDeleting?: boolean;
}

export const DeletePatientModal: React.FC<DeletePatientModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  patient,
  isDeleting = false
}) => {
  if (!patient) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left">
                Excluir Paciente
              </AlertDialogTitle>
            </div>
          </div>
          
          <AlertDialogDescription className="text-left">
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                <User className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <div className="font-medium text-foreground">{patient.name}</div>
                  {patient.email && (
                    <div className="text-sm text-muted-foreground">{patient.email}</div>
                  )}
                  {patient.phone && (
                    <div className="text-sm text-muted-foreground">{patient.phone}</div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm">
                  Você tem certeza que deseja excluir este paciente permanentemente?
                </div>
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  <div className="text-sm text-destructive font-medium">
                    ⚠️ Esta ação não pode ser desfeita
                  </div>
                  <div className="text-xs text-destructive mt-1">
                    Todos os dados, históricos médicos, consultas e informações relacionadas a este paciente serão removidos permanentemente do sistema.
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel 
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};