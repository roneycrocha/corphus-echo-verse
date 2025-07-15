import React, { useState } from 'react';
import { UserCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AppointmentTypeDialog } from './AppointmentTypeDialog';

interface AttendButtonProps {
  patientId: string;
  patientName: string;
  sessionId?: string; // Adicionar sessionId para atualizar o status
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export const AttendButton: React.FC<AttendButtonProps> = ({
  patientId,
  patientName,
  sessionId,
  variant = 'outline',
  size = 'sm'
}) => {
  const navigate = useNavigate();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showTypeDialog, setShowTypeDialog] = useState(false);

  const updateSessionStatus = async () => {
    if (sessionId) {
      // Se temos sessionId específico, usar ele
      try {
        const { error } = await supabase
          .from('sessions')
          .update({ status: 'confirmada' })
          .eq('id', sessionId);

        if (error) {
          console.error('Erro ao atualizar status da sessão:', error);
        } else {
          console.log('Status da sessão atualizado para "confirmada"');
        }
      } catch (error) {
        console.error('Erro ao atualizar status da sessão:', error);
      }
    } else {
      // Se não temos sessionId, buscar sessão agendada do paciente de hoje
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('id')
          .eq('patient_id', patientId)
          .eq('status', 'agendada')
          .gte('scheduled_at', today.toISOString())
          .lt('scheduled_at', tomorrow.toISOString())
          .limit(1);

        if (error) {
          console.error('Erro ao buscar sessão:', error);
          return;
        }

        if (sessions && sessions.length > 0) {
          const { error: updateError } = await supabase
            .from('sessions')
            .update({ status: 'confirmada' })
            .eq('id', sessions[0].id);

          if (updateError) {
            console.error('Erro ao atualizar status da sessão:', updateError);
          } else {
            console.log('Status da sessão atualizado para "confirmada"');
          }
        }
      } catch (error) {
        console.error('Erro ao atualizar status da sessão:', error);
      }
    }
  };

  const handleAttend = async () => {
    await updateSessionStatus(); // Atualizar status para confirmada ao iniciar atendimento
    setShowTypeDialog(true);
  };

  const handleVideoCall = async () => {
    setShowTypeDialog(false);
    setIsCreatingRoom(true);
    
    try {
      // Criar um callId único para esta sessão específica
      const callId = `${patientId}-${Date.now()}`;
      
      console.log('[DEBUG] Criando sala Daily.co para:', patientName);
      console.log('[DEBUG] Call ID único:', callId);
      
      const { data, error } = await supabase.functions.invoke('create-daily-room', {
        body: {
          patientName,
          patientId,
          callId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha ao criar sala de videochamada');
      }

      const callData = {
        callId,
        patientName,
        patientId,
        roomUrl: data.roomUrl,
        timestamp: Date.now()
      };
      
      const encodedData = btoa(JSON.stringify(callData))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      // Navegar para a nova página de videochamada
      navigate(`/daily-video-call/${callId}`, { 
        state: { 
          roomUrl: data.roomUrl, 
          patientName,
          userType: 'doctor'
        } 
      });
      
      const publicLink = `${window.location.origin}/daily-patient/${encodedData}`;
      navigator.clipboard.writeText(publicLink).then(() => {
        toast.success('Link copiado!', {
          description: `Link para ${patientName} copiado. Cole em WhatsApp ou email.`
        });
      }).catch(() => {
        toast.info('Link gerado', {
          description: `Copie este link: ${publicLink}`
        });
      });
      
    } catch (error) {
      console.error('Erro ao criar videochamada:', error);
      toast.error('Erro ao criar videochamada', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleAIAssistance = () => {
    setShowTypeDialog(false);
    // Navegar para página de atendimento com IA otimizada
    navigate('/ai-assistance', { 
      state: { 
        patientId,
        patientName,
        userType: 'doctor'
      } 
    });
  };

  const handleBasicAppointment = () => {
    setShowTypeDialog(false);
    // Navegar para página de atendimento básico
    navigate('/basic-appointment', { 
      state: { 
        patientId,
        patientName,
        userType: 'doctor'
      } 
    });
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleAttend}
        disabled={isCreatingRoom}
        className="text-green-600 border-green-600 hover:bg-green-50 disabled:opacity-50"
        title="Iniciar atendimento"
      >
        {isCreatingRoom ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <UserCheck className="w-4 h-4 mr-1" />
        )}
        {isCreatingRoom ? 'Criando...' : 'Atender'}
      </Button>

      <AppointmentTypeDialog
        isOpen={showTypeDialog}
        onClose={() => setShowTypeDialog(false)}
        onVideoCall={handleVideoCall}
        onAIAssistance={handleAIAssistance}
        onBasicAppointment={handleBasicAppointment}
        patientName={patientName}
      />
    </>
  );
};