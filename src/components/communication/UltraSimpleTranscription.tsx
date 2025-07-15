import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, User, Bot, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TranscriptionMessage {
  id: string;
  text: string;
  speaker: 'therapist' | 'patient';
  timestamp: string;
}

interface UltraSimpleTranscriptionProps {
  patientName?: string;
  patientId?: string;
  onTranscriptionUpdate?: (messages: TranscriptionMessage[]) => void;
}

export const UltraSimpleTranscription: React.FC<UltraSimpleTranscriptionProps> = ({
  patientName,
  patientId,
  onTranscriptionUpdate
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'therapist' | 'patient'>('patient');
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>('Pronto para iniciar');
  const [chunkCount, setChunkCount] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const isRecordingRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef<string>('');

  const { toast } = useToast();

  useEffect(() => {
    return () => {
      stopRecording();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    onTranscriptionUpdate?.(messages);
  }, [messages, onTranscriptionUpdate]);

  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${info}`);
    setDebugInfo(`[${timestamp}] ${info}`);
  };

  const startRecording = async () => {
    try {
      addDebugInfo('Iniciando gravação...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: 'default', // Força microfone padrão
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true, // Ativar para filtrar ruído externo
          autoGainControl: true
        }
      });

      addDebugInfo('Stream de áudio obtida');

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      let chunkCounter = 0;

      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (!isRecordingRef.current) return;
        
        chunkCounter++;
        setChunkCount(chunkCounter);
        addDebugInfo(`Chunk ${chunkCounter} recebido: ${event.data.size} bytes`);
        
        if (event.data.size > 5000) { // Aumentar threshold para evitar ruído
          addDebugInfo(`Processando chunk ${chunkCounter}...`);
          await processAudioChunkSimple(event.data, chunkCounter);
        } else {
          addDebugInfo(`Chunk ${chunkCounter} muito pequeno (${event.data.size} bytes), ignorando`);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        addDebugInfo('MediaRecorder parado');
      };

      mediaRecorderRef.current.onerror = (error) => {
        addDebugInfo(`Erro no MediaRecorder: ${error}`);
      };

      setIsRecording(true);
      isRecordingRef.current = true;
      setChunkCount(0);
      
      // Chunks muito pequenos (1 segundo) para maior responsividade
      mediaRecorderRef.current.start(1000);
      addDebugInfo('Gravação iniciada com chunks de 1 segundo');

      // Auto restart a cada 30 segundos para garantir funcionamento contínuo
      restartTimeoutRef.current = setTimeout(() => {
        if (isRecordingRef.current) {
          addDebugInfo('Auto-restart ativado');
          restartRecording();
        }
      }, 30000);

    } catch (error) {
      addDebugInfo(`Erro ao iniciar: ${error}`);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    addDebugInfo('Parando gravação...');
    isRecordingRef.current = false;
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }

    setIsRecording(false);
    addDebugInfo('Gravação parada');
  };

  const restartRecording = async () => {
    addDebugInfo('Reiniciando gravação...');
    stopRecording();
    // Pequeno delay antes de reiniciar
    setTimeout(() => {
      if (isRecordingRef.current !== false) { // Se não foi manualmente parado
        startRecording();
      }
    }, 500);
  };

  const processAudioChunkSimple = async (audioBlob: Blob, chunkNumber: number) => {
    try {
      addDebugInfo(`Convertendo chunk ${chunkNumber} para base64...`);
      
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          addDebugInfo(`Enviando chunk ${chunkNumber} para API...`);
          
          const { data, error } = await supabase.functions.invoke('voice-to-text', {
            body: { audio: base64Audio }
          });

          if (error) {
            addDebugInfo(`Erro API chunk ${chunkNumber}: ${JSON.stringify(error)}`);
            return;
          }

          if (data?.text && data.text.trim()) {
            const text = data.text.trim();
            addDebugInfo(`Transcription chunk ${chunkNumber}: "${text}"`);
            
            // Filtros para evitar transcrições inválidas
            const isValidText = text && 
              text.length > 2 && 
              text !== lastTextRef.current &&
              !text.toLowerCase().includes('amara.org') &&
              !text.toLowerCase().includes('legendas') &&
              !text.toLowerCase().includes('comunidade');
              
            if (isValidText) {
              lastTextRef.current = text;
              
              const newMessage: TranscriptionMessage = {
                id: `${Date.now()}-${chunkNumber}`,
                text: text,
                speaker: currentSpeaker,
                timestamp: new Date().toISOString()
              };

              addDebugInfo(`Adicionando mensagem: "${text}"`);
              setMessages(prev => [...prev, newMessage].slice(-50));
            } else {
              addDebugInfo(`Texto ignorado: "${text}" (muito curto ou duplicata)`);
            }
          } else {
            addDebugInfo(`Chunk ${chunkNumber} sem texto válido`);
          }
        } catch (error) {
          addDebugInfo(`Erro processamento chunk ${chunkNumber}: ${error}`);
        }
      };

      reader.onerror = () => {
        addDebugInfo(`Erro ao ler chunk ${chunkNumber}`);
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      addDebugInfo(`Erro geral chunk ${chunkNumber}: ${error}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            className="h-8"
          >
            {isRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>

          <Button
            onClick={restartRecording}
            variant="outline"
            size="sm"
            className="h-8"
            disabled={!isRecording}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <div className="flex items-center space-x-1">
            <Button
              variant={currentSpeaker === 'patient' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentSpeaker('patient')}
              className="h-7 px-2 text-xs"
            >
              <User className="w-3 h-3" />
            </Button>
            <Button
              variant={currentSpeaker === 'therapist' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentSpeaker('therapist')}
              className="h-7 px-2 text-xs"
            >
              <Bot className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={isRecording ? "destructive" : "secondary"} className="text-xs">
            {isRecording ? `Chunk ${chunkCount}` : 'Pausado'}
          </Badge>
        </div>
      </div>

      {/* Debug Info */}
      <div className="px-3 py-2 border-b bg-muted/30">
        <p className="text-xs text-muted-foreground font-mono">
          {debugInfo}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            {messages.slice(-10).map((message) => (
              <div key={message.id} className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={message.speaker === 'patient' ? 'default' : 'secondary'}
                    className="text-xs h-5"
                  >
                    {message.speaker === 'patient' ? 'P' : 'T'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-sm bg-muted/50 p-2 rounded text-foreground leading-relaxed">
                  {message.text}
                </p>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Clique em Play para iniciar - Debug ativo</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Status */}
      <div className="p-2 border-t bg-muted/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {isRecording ? (
              <>
                <span className="inline-flex items-center space-x-1">
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Debug ativo - chunks 1s - auto restart 30s</span>
                </span>
              </>
            ) : (
              messages.length > 0 ? `${messages.length} mensagens | ${debugInfo}` : 'Clique em Play para debug'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};