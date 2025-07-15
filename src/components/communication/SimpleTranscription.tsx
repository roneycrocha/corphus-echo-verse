import React, { useState, useRef } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TranscriptionMessage {
  id: string;
  text: string;
  timestamp: string;
}

interface SimpleTranscriptionProps {
  patientName?: string;
  patientId?: string;
  onTranscriptionUpdate?: (messages: TranscriptionMessage[]) => void;
}

export const SimpleTranscription: React.FC<SimpleTranscriptionProps> = ({
  patientName,
  patientId,
  onTranscriptionUpdate
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);
  const [status, setStatus] = useState('Pronto para gravar');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      setStatus('Iniciando gravação...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
        }
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      const audioChunks: Blob[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setStatus('Processando áudio...');
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(',')[1];
            
            setStatus('Enviando para transcrição...');
            
            const { data, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: base64Audio }
            });

            if (error) {
              console.error('Supabase error:', error);
              throw new Error(error.message || 'Erro na transcrição');
            }

            if (data?.text) {
              const newMessage: TranscriptionMessage = {
                id: Date.now().toString(),
                text: data.text,
                timestamp: new Date().toLocaleTimeString('pt-BR')
              };
              
              setMessages(prev => {
                const newMessages = [...prev, newMessage];
                onTranscriptionUpdate?.(newMessages);
                return newMessages;
              });
              setStatus(`Transcrição concluída: "${data.text}"`);
              
              toast({
                title: "Transcrição realizada",
                description: data.text,
              });
            } else {
              setStatus('Nenhum texto detectado');
            }
          } catch (error) {
            console.error('Transcription error:', error);
            setStatus(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            
            toast({
              title: "Erro na transcrição",
              description: error instanceof Error ? error.message : 'Erro desconhecido',
              variant: "destructive",
            });
          }
        };
        
        reader.readAsDataURL(audioBlob);
      };

      setIsRecording(true);
      setStatus('Gravando... Clique em parar quando terminar');
      mediaRecorderRef.current.start();

    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus('Erro ao acessar microfone');
      
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setStatus('Parando gravação...');
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Transcrição de Áudio</h3>
        
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          variant={isRecording ? "destructive" : "default"}
          className="flex items-center space-x-2"
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4" />
              <span>Parar</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Gravar</span>
            </>
          )}
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        Status: {status}
      </div>

      {messages.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Transcrições:</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className="p-2 bg-muted rounded text-sm">
                <div className="text-xs text-muted-foreground mb-1">
                  {message.timestamp}
                </div>
                <div>{message.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};