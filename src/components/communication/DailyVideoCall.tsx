import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Square, Circle, FileText, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useResourceCosts } from '@/hooks/useResourceCosts';
import { useVideoCallSettings } from '@/hooks/useVideoCallSettings';
import { AdvancedVideoCallSettings } from './AdvancedVideoCallSettings';

interface DailyVideoCallProps {
  roomUrl: string;
  onCallEnd: () => void;
  patientName: string;
  userType: 'doctor' | 'patient';
}

export const DailyVideoCall: React.FC<DailyVideoCallProps> = ({
  roomUrl,
  onCallEnd,
  patientName,
  userType
}) => {
  const { user } = useAuth();
  const { consumeCreditsForResource } = useResourceCosts();
  const { settings } = useVideoCallSettings();
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(!settings.autoJoinWithAudio);
  const [isVideoOff, setIsVideoOff] = useState(!settings.autoJoinWithVideo);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [transcript, setTranscript] = useState<string>('');
  const [transcriptionEntries, setTranscriptionEntries] = useState<any[]>([]);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [creditConsumptionCount, setCreditConsumptionCount] = useState(0);
  const callObjectRef = useRef<any>(null);
  const callFrameRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const creditTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Obter nome do usuário logado
  const doctorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Terapeuta';

  // Função para iniciar o timer de consumo de créditos (a cada 30 minutos)
  const startCreditTimer = () => {
    // Só inicia o timer para terapeuta
    if (userType !== 'doctor') return;

    // Limpar timer anterior se existir
    if (creditTimerRef.current) {
      clearInterval(creditTimerRef.current);
    }

    console.log('[DailyVideoCall] Iniciando timer de consumo de créditos a cada 30 minutos');
    
    // Timer para consumir créditos a cada 30 minutos (1800000 ms)
    // Para demonstração, usando 1 minuto (60000 ms) - em produção usar 30 * 60 * 1000
    creditTimerRef.current = setInterval(async () => {
      try {
        console.log('[DailyVideoCall] Tentando consumir créditos para extensão da videochamada');
        
        const canProceed = await consumeCreditsForResource(
          'video_call_extended', 
          `Videochamada ${patientName} - ${creditConsumptionCount + 1}° período de 30 min`
        );
        
        if (canProceed) {
          setCreditConsumptionCount(prev => prev + 1);
          toast.info(`Consumo automático: mais 30 minutos de videochamada (${creditConsumptionCount + 1} créditos extras)`);
          console.log('[DailyVideoCall] Créditos consumidos para extensão da videochamada');
        } else {
          toast.warning('Créditos insuficientes para continuar a videochamada. A chamada será encerrada em breve.');
          stopCreditTimer(); // Parar o timer se não há créditos
          // Opcional: encerrar a chamada automaticamente após 1 minuto
          setTimeout(() => {
            if (isJoined) {
              leaveCall();
            }
          }, 60000); // Dar 1 minuto para o usuário tomar uma ação
        }
      } catch (error) {
        console.error('[DailyVideoCall] Erro ao consumir créditos:', error);
      }
    }, 60 * 1000); // 1 minuto para demonstração - em produção usar 30 * 60 * 1000
  };

  // Função para parar o timer de consumo de créditos
  const stopCreditTimer = () => {
    if (creditTimerRef.current) {
      clearInterval(creditTimerRef.current);
      creditTimerRef.current = null;
      console.log('[DailyVideoCall] Timer de consumo de créditos parado');
    }
  };

  const joinCall = async () => {
    // Consumir créditos para videochamada (apenas para terapeuta)
    if (userType === 'doctor') {
      const canProceed = await consumeCreditsForResource(
        'video_call', 
        `Videochamada com ${patientName}`
      );
      
      if (!canProceed) {
        toast.error('Não foi possível iniciar a videochamada devido a créditos insuficientes');
        return;
      }
    }

    if (callObjectRef.current) {
      console.log('[DailyVideoCall] Call object already exists, joining...');
      try {
        await callObjectRef.current.join({
          url: roomUrl,
          userName: userType === 'doctor' ? doctorName : patientName,
        });
      } catch (error: any) {
        console.error('[DailyVideoCall] Error joining call:', error);
        toast.error(`Erro ao entrar na chamada: ${error.message}`);
      }
      return;
    }

    if (!callFrameRef.current) {
      toast.error('Sistema de videochamada não está pronto');
      return;
    }

    try {
      console.log('[DailyVideoCall] Creating Daily.co frame and joining call...');
      
      // Garantir que não há instâncias duplicadas
      if (callObjectRef.current) {
        console.log('[DailyVideoCall] Destroying existing call instance...');
        try {
          callObjectRef.current.destroy();
        } catch (destroyError) {
          console.warn('[DailyVideoCall] Error destroying existing call:', destroyError);
        }
        callObjectRef.current = null;
      }

      // Verificar se não há outras instâncias do Daily no DOM
      const existingFrames = document.querySelectorAll('iframe[src*="daily.co"]');
      if (existingFrames.length > 0) {
        console.log('[DailyVideoCall] Removing existing Daily.co frames from DOM...');
        existingFrames.forEach(frame => frame.remove());
      }
      
      // Create the call frame
      console.log('[DailyVideoCall] Configurando idioma Daily.co:');
      console.log('- settings.language:', settings.language);
      
      // Mapear idiomas para códigos aceitos pelo Daily.co
      // Suportados: da, de, en-us, en, es, fi, fr, it, jp, ka, nl, no, pl, pt, pt-BR, ru, sv, tr, user
      let dailyLang: any = 'en'; // padrão - usando any por causa das limitações dos tipos do Daily.co
      if (settings.language === 'pt-BR') {
        dailyLang = 'pt-BR';
      } else if (settings.language.startsWith('pt')) {
        dailyLang = 'pt';
      } else if (settings.language.startsWith('en')) {
        dailyLang = settings.language === 'en-US' ? 'en-us' : 'en';
      } else if (settings.language.startsWith('de')) {
        dailyLang = 'de';
      } else if (settings.language.startsWith('es')) {
        dailyLang = 'es';
      } else if (settings.language.startsWith('fr')) {
        dailyLang = 'fr';
      } else if (settings.language.startsWith('it')) {
        dailyLang = 'it';
      }
      
      console.log('- Idioma mapeado para Daily.co:', dailyLang);
      
      const callFrame = DailyIframe.createFrame(callFrameRef.current, {
        showLeaveButton: false,
        showFullscreenButton: false,
        showLocalVideo: true,
        showParticipantsBar: false,
        activeSpeakerMode: false,
        customLayout: false,
        lang: dailyLang
      });

      callObjectRef.current = callFrame;
      
      // Set up event listeners
      callFrame.on('joined-meeting', (event: any) => {
        console.log('[DailyVideoCall] Joined meeting successfully');
        setIsJoined(true);
        setCallStartTime(new Date());
        startCreditTimer();
        toast.success('Conectado à videochamada!');
      });

      callFrame.on('participant-joined', (event: any) => {
        console.log('[DailyVideoCall] Participant joined:', event.participant);
        setParticipants(prev => [...prev, event.participant]);
        toast.info(`${event.participant.user_name || 'Participante'} entrou na chamada`);
      });

      callFrame.on('participant-left', (event: any) => {
        console.log('[DailyVideoCall] Participant left:', event.participant);
        setParticipants(prev => prev.filter(p => p.session_id !== event.participant.session_id));
        toast.info(`${event.participant.user_name || 'Participante'} saiu da chamada`);
      });

      callFrame.on('error', (event: any) => {
        console.error('[DailyVideoCall] Daily error:', event);
        toast.error(`Erro na videochamada: ${event.errorMsg || 'Erro desconhecido'}`);
      });

      callFrame.on('left-meeting', () => {
        console.log('[DailyVideoCall] Left meeting');
        stopCreditTimer();
        setIsJoined(false);
        setParticipants([]);
        onCallEnd();
      });

      // Join the meeting
      await callFrame.join({
        url: roomUrl,
        userName: userType === 'doctor' ? doctorName : patientName,
      });
      
    } catch (error: any) {
      console.error('[DailyVideoCall] Error creating frame or joining call:', error);
      // Limpar o frame em caso de erro para evitar instâncias duplicadas
      if (callObjectRef.current) {
        try {
          callObjectRef.current.destroy();
        } catch (destroyError) {
          console.warn('[DailyVideoCall] Error destroying call frame:', destroyError);
        }
        callObjectRef.current = null;
      }
      toast.error(`Erro ao entrar na chamada: ${error.message}`);
    }
  };

  // Cleanup on mount to ensure clean state
  useEffect(() => {
    // Limpeza inicial para garantir que não há instâncias antigas
    const existingFrames = document.querySelectorAll('iframe[src*="daily.co"]');
    if (existingFrames.length > 0) {
      console.log('[DailyVideoCall] Mount cleanup: removing existing Daily.co frames');
      existingFrames.forEach(frame => frame.remove());
    }
    
    return () => {
      console.log('[DailyVideoCall] Cleaning up call frame');
      stopCreditTimer();
      if (callObjectRef.current) {
        try {
          callObjectRef.current.destroy();
        } catch (error) {
          console.warn('[DailyVideoCall] Error destroying call frame:', error);
        }
        callObjectRef.current = null;
      }
      
      // Limpeza final no DOM
      const framesToClean = document.querySelectorAll('iframe[src*="daily.co"]');
      if (framesToClean.length > 0) {
        console.log('[DailyVideoCall] Unmount cleanup: removing Daily.co frames');
        framesToClean.forEach(frame => frame.remove());
      }
    };
  }, []);

  const leaveCall = async () => {
    if (!callObjectRef.current) return;

    try {
      await callObjectRef.current.leave();
    } catch (error) {
      console.error('[DailyVideoCall] Error leaving call:', error);
    }
  };

  const toggleMute = async () => {
    if (!callObjectRef.current) return;
    
    try {
      const newMutedState = !isMuted;
      await callObjectRef.current.setLocalAudio(!newMutedState);
      setIsMuted(newMutedState);
    } catch (error) {
      console.error('[DailyVideoCall] Error toggling audio:', error);
    }
  };

  const toggleVideo = async () => {
    if (!callObjectRef.current) return;
    
    try {
      const newVideoState = !isVideoOff;
      await callObjectRef.current.setLocalVideo(!newVideoState);
      setIsVideoOff(newVideoState);
    } catch (error) {
      console.error('[DailyVideoCall] Error toggling video:', error);
    }
  };

  const toggleRecording = async () => {
    if (!callObjectRef.current) return;
    
    try {
      if (isRecording) {
        await callObjectRef.current.stopRecording();
        setIsRecording(false);
        toast.success('Gravação parada');
      } else {
        await callObjectRef.current.startRecording();
        setIsRecording(true);
        toast.success('Gravação iniciada');
      }
    } catch (error: any) {
      console.error('[DailyVideoCall] Error toggling recording:', error);
      toast.error(`Erro na gravação: ${error.message}`);
    }
  };

  const toggleTranscription = async () => {
    // Consumir créditos para transcrição (apenas para terapeuta)
    if (!isTranscribing && userType === 'doctor') {
      const canProceed = await consumeCreditsForResource(
        'transcription', 
        'Transcrição em tempo real durante videochamada'
      );
      
      if (!canProceed) {
        toast.error('Não foi possível iniciar a transcrição devido a créditos insuficientes');
        return;
      }
    }

    if (!isTranscribing) {
      await startTranscription();
    } else {
      stopTranscription();
    }
  };

  const startTranscription = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      let audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunks.length > 0) {
          await processTranscriptionChunk(audioChunks);
          audioChunks = [];
        }
      };

      // Gravar em chunks de 3 segundos
      const recordingInterval = setInterval(() => {
        if (mediaRecorder.state === 'recording' && isTranscribing) {
          mediaRecorder.stop();
          setTimeout(() => {
            if (isTranscribing && streamRef.current) {
              audioChunks = [];
              mediaRecorder.start();
            }
          }, 100);
        } else if (!isTranscribing) {
          clearInterval(recordingInterval);
        }
      }, 3000);

      mediaRecorder.start();
      setIsTranscribing(true);
      toast.success('Transcrição iniciada');

    } catch (error: any) {
      console.error('[DailyVideoCall] Error starting transcription:', error);
      toast.error(`Erro ao iniciar transcrição: ${error.message}`);
    }
  };

  const stopTranscription = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    setIsTranscribing(false);
    toast.success('Transcrição parada');
  };

  const processTranscriptionChunk = async (audioChunks: Blob[]) => {
    try {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Converter para base64
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Audio = btoa(binary);

      // Enviar para transcrição
      const { data, error } = await supabase.functions.invoke('real-time-transcription', {
        body: {
          audio: base64Audio,
          speaker: userType === 'doctor' ? 'therapist' : 'patient'
        }
      });

      if (error) {
        console.error('[DailyVideoCall] Transcription error:', error);
        return;
      }

      if (data?.text && data.text.trim().length > 0) {
        const newEntry = {
          id: Date.now().toString(),
          text: data.text,
          speaker: userType === 'doctor' ? 'therapist' : 'patient',
          timestamp: data.timestamp || new Date().toISOString()
        };

        setTranscriptionEntries(prev => [...prev, newEntry]);
        setTranscript(prev => prev + ' ' + data.text);
        
        console.log('[DailyVideoCall] Transcription:', data.text);
      }

    } catch (error) {
      console.error('[DailyVideoCall] Error processing transcription chunk:', error);
    }
  };

  // Cleanup transcription on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Daily.co call frame container - always rendered but hidden when not joined */}
      <div 
        ref={callFrameRef}
        className={`w-full h-full ${!isJoined ? 'hidden' : ''}`}
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Join call dialog - shown when not joined */}
      {!isJoined && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <Card className="p-8 max-w-md mx-auto">
            <div className="text-center space-y-6">
              <h3 className="text-xl font-semibold">
                {userType === 'doctor' 
                  ? `Videochamada com ${patientName}` 
                  : `Entrar na videochamada com ${doctorName}`
                }
              </h3>
              <p className="text-muted-foreground">
                {userType === 'doctor' 
                  ? 'Clique para iniciar a chamada' 
                  : 'Clique para se conectar com seu terapeuta'
                }
              </p>
              <Button onClick={joinCall} size="lg" className="w-full">
                <Phone className="w-5 h-5 mr-2" />
                Entrar na Chamada
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Control panel - only shown when joined */}
      {isJoined && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[60]">
          <Card className="p-4 bg-black/80 border-gray-700">
            <div className="flex items-center space-x-4">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="sm"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              
              <Button
                variant={isVideoOff ? "destructive" : "outline"}
                size="sm"
                onClick={toggleVideo}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </Button>

              {/* Controles de gravação e transcrição - apenas para terapeuta */}
              {userType === 'doctor' && (
                <>
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    onClick={toggleRecording}
                    title={isRecording ? "Parar gravação" : "Iniciar gravação"}
                  >
                    {isRecording ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant={isTranscribing ? "destructive" : "outline"}
                    size="sm"
                    onClick={toggleTranscription}
                    title={isTranscribing ? "Parar transcrição" : "Iniciar transcrição"}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                </>
               )}
               
               {/* Botão de Configurações - apenas para terapeuta */}
               {userType === 'doctor' && (
                 <AdvancedVideoCallSettings 
                   onDeviceChange={(deviceId, type) => {
                     // Aplicar mudanças de dispositivo imediatamente se possível
                     console.log(`Dispositivo ${type} alterado para:`, deviceId);
                   }}
                   currentVideoDevice={settings.videoDeviceId}
                   currentAudioDevice={settings.audioDeviceId}
                 />
               )}
              
              <Button
                variant="destructive"
                size="sm"
                onClick={leaveCall}
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                Encerrar
              </Button>
            </div>
          </Card>
         </div>
       )}

      {/* Painel de transcrição - apenas para terapeuta */}
      {isJoined && userType === 'doctor' && isTranscribing && (
        <div className="fixed top-6 left-6 z-[60] max-w-md">
          <Card className="p-3 bg-black/80 border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white flex items-center">
                <FileText className="w-4 h-4 mr-1" />
                Transcrição em Tempo Real
              </h4>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <div className="max-h-32 overflow-y-auto text-xs text-gray-300">
              {transcriptionEntries.length === 0 ? (
                <p className="text-gray-500">Aguardando fala...</p>
              ) : (
                transcriptionEntries.slice(-5).map((entry, index) => (
                  <div key={entry.id} className="mb-1">
                    <span className="font-medium">
                      {entry.speaker === 'therapist' ? 'Você' : patientName}:
                    </span>{' '}
                    <span>{entry.text}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Call info and timer - only shown when joined and for doctor */}
      {isJoined && userType === 'doctor' && callStartTime && (
        <div className="fixed top-6 right-6 z-[60]">
          <Card className="p-3 bg-black/80 border-gray-700">
            <div className="text-sm text-white space-y-1">
              <p>
                {participants.length + 1} participante{participants.length !== 0 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-300">
                Tempo: {Math.floor((Date.now() - callStartTime.getTime()) / 60000)} min
              </p>
              {creditConsumptionCount > 0 && (
                <p className="text-xs text-yellow-400">
                  Créditos extras: {creditConsumptionCount}
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Simple participants counter for patient */}
      {isJoined && userType === 'patient' && (
        <div className="fixed top-6 right-6 z-[60]">
          <Card className="p-3 bg-black/80 border-gray-700">
            <p className="text-sm text-white">
              {participants.length + 1} participante{participants.length !== 0 ? 's' : ''}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};