import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, User, Bot, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI } from '@/utils/RealtimeAudio';

interface TranscriptionMessage {
  id: string;
  text: string;
  speaker: 'therapist' | 'patient';
  timestamp: string;
}

interface WebSocketRealTimeTranscriptionProps {
  patientName?: string;
  patientId?: string;
  onTranscriptionUpdate?: (messages: TranscriptionMessage[]) => void;
}

export const WebSocketRealTimeTranscription: React.FC<WebSocketRealTimeTranscriptionProps> = ({
  patientName,
  patientId,
  onTranscriptionUpdate
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'therapist' | 'patient'>('patient');
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    onTranscriptionUpdate?.(messages);
  }, [messages, onTranscriptionUpdate]);

  const connect = async () => {
    try {
      // Connect to WebSocket
      const wsUrl = `wss://jqystivdecrjuulxyxet.functions.supabase.co/functions/v1/realtime-transcription-ws`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        toast({
          title: "Conectado",
          description: "Transcrição em tempo real ativa",
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);
          
          if (data.type === 'session_ready') {
            console.log('Session is ready for audio input');
          }
          
          if (data.type === 'speech_started') {
            console.log('Speech detection started');
          }
          
          if (data.type === 'speech_stopped') {
            console.log('Speech detection stopped');
          }
          
          if (data.type === 'transcription_completed') {
            const text = data.transcript?.trim();
            console.log('Transcription received:', text);
            
            if (text && text.length > 2) {
              const newMessage: TranscriptionMessage = {
                id: `${Date.now()}-${Math.random()}`,
                text: text,
                speaker: currentSpeaker,
                timestamp: new Date().toISOString()
              };
              
              console.log('Adding transcription:', text);
              setMessages(prev => [...prev, newMessage].slice(-50));
            }
          }
          
          if (data.type === 'transcription_failed') {
            console.error('Transcription failed:', data.error);
          }
          
          if (data.type === 'error') {
            console.error('WebSocket error:', data.message);
            toast({
              title: "Erro",
              description: data.message,
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setIsRecording(false);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Erro",
          description: "Erro na conexão WebSocket",
          variant: "destructive",
        });
      };

    } catch (error) {
      console.error('Error connecting:', error);
      toast({
        title: "Erro",
        description: "Falha ao conectar",
        variant: "destructive",
      });
    }
  };

  const disconnect = () => {
    stopRecording();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  const startRecording = async () => {
    if (!isConnected) {
      await connect();
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    try {
      recorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const encodedAudio = encodeAudioForAPI(audioData);
          wsRef.current.send(JSON.stringify({
            type: 'audio_chunk',
            audio: encodedAudio
          }));
        }
      });

      await recorderRef.current.start();
      setIsRecording(true);
      
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsRecording(false);
    console.log('Recording stopped');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact Controls */}
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
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </Badge>
          <Badge variant={isRecording ? "destructive" : "secondary"} className="text-xs">
            {isRecording ? 'Gravando' : 'Pausado'}
          </Badge>
        </div>
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
                      minute: '2-digit'
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
                <p className="text-sm">
                  {isConnected ? 
                    'Clique em Play para iniciar a transcrição' : 
                    'Aguardando conexão...'
                  }
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Status Footer */}
      <div className="p-2 border-t bg-muted/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {isRecording ? (
              <>
                <span className="inline-flex items-center space-x-1">
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Transcrevendo via OpenAI Realtime API...</span>
                </span>
              </>
            ) : (
              messages.length > 0 ? `${messages.length} mensagens transcritas` : 
              isConnected ? 'Conectado - Clique em Play para iniciar' : 'Clique em Play para conectar'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};