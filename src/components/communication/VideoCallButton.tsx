import React, { useState } from 'react';
import { Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VideoCallButtonProps {
  patientId: string;
  patientName: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export const VideoCallButton: React.FC<VideoCallButtonProps> = ({
  patientId,
  patientName,
  variant = 'outline',
  size = 'sm'
}) => {
  const navigate = useNavigate();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const startVideoCall = async () => {
    if (isCreatingRoom) return;
    
    setIsCreatingRoom(true);
    
    try {
      // Gerar UUID único para a videochamada
      const callId = crypto.randomUUID();
      
      console.log('[DEBUG] Criando sala Daily.co para:', patientName);
      console.log('[DEBUG] Call ID único:', callId);
      
      // Criar sala no Daily.co
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

      // Criar dados da chamada com a URL do Daily.co
      const callData = {
        callId,
        patientName,
        patientId,
        roomUrl: data.roomUrl,
        timestamp: Date.now()
      };
      
      // Codificar dados em base64 URL-safe
      const encodedData = btoa(JSON.stringify(callData))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      // Navegar para página do terapeuta com o callId
      navigate(`/daily-call/${callId}`, { 
        state: { 
          roomUrl: data.roomUrl, 
          patientName,
          userType: 'doctor'
        } 
      });
      
      // Mostrar o link para compartilhar com o paciente
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

  return (
    <Button
      variant={variant}
      size={size}
      onClick={startVideoCall}
      disabled={isCreatingRoom}
      title="Gerar link de videochamada para o paciente"
    >
      {isCreatingRoom ? (
        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
      ) : (
        <Video className="w-4 h-4 mr-1" />
      )}
      {isCreatingRoom ? 'Criando...' : 'Gerar Link'}
    </Button>
  );
};