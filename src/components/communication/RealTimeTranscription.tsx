import React, { useState, useRef } from 'react';
import { Mic, MicOff, Play, Square, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useVideoCallSettings } from '@/hooks/useVideoCallSettings';

interface TranscriptionMessage {
  id: string;
  text: string;
  speaker: 'user' | 'system';
  timestamp: string;
  final: boolean;
}

interface RealTimeTranscriptionProps {
  patientName?: string;
  patientId?: string;
  onTranscriptionUpdate?: (messages: TranscriptionMessage[]) => void;
}

export const RealTimeTranscription: React.FC<RealTimeTranscriptionProps> = ({
  patientName,
  patientId,
  onTranscriptionUpdate
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);
  const { settings } = useVideoCallSettings();
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseCancellation,
          autoGainControl: settings.autoGainControl
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        await processAudio();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      toast({
        title: "Gravação iniciada",
        description: "Fale claramente para uma melhor transcrição",
      });

    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
  };

  const processAudio = async () => {
    if (chunksRef.current.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum áudio foi gravado",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      
      // Converter para base64 de forma segura para arquivos grandes
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Processar em chunks para evitar stack overflow
      let base64Audio = '';
      const chunkSize = 8192; // 8KB chunks
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        base64Audio += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
      }

      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: {
          audio: base64Audio
        }
      });

      if (error) {
        console.error('Erro na transcrição:', error);
        toast({
          title: "Erro na transcrição",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data?.text && data.text.trim().length > 0) {
        const newMessage: TranscriptionMessage = {
          id: Date.now().toString(),
          text: data.text,
          speaker: 'user',
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          final: true
        };

        setMessages(prev => {
          const newMessages = [...prev, newMessage];
          onTranscriptionUpdate?.(newMessages);
          return newMessages;
        });

        toast({
          title: "Transcrição concluída",
          description: "Áudio transcrito com sucesso",
        });
      } else {
        toast({
          title: "Transcrição vazia",
          description: "Não foi possível transcrever o áudio. Tente falar mais alto ou próximo ao microfone.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      toast({
        title: "Erro no processamento",
        description: "Falha ao processar o áudio gravado",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startEdit = (message: TranscriptionMessage) => {
    setEditingMessage(message.id);
    setEditText(message.text);
  };

  const saveEdit = () => {
    if (editingMessage) {
      setMessages(prev => {
        const newMessages = prev.map(msg => 
          msg.id === editingMessage 
            ? { ...msg, text: editText }
            : msg
        );
        onTranscriptionUpdate?.(newMessages);
        return newMessages;
      });
      
      setEditingMessage(null);
      setEditText('');
      
      toast({
        title: "Transcrição editada",
        description: "Alterações salvas com sucesso",
      });
    }
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controles */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            disabled={isProcessing}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              Gravando
            </Badge>
          )}
          
          {isProcessing && (
            <Badge variant="secondary">
              Processando...
            </Badge>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={message.speaker === 'user' ? 'default' : 'secondary'} className="text-xs">
                      {message.speaker === 'user' ? 'Você' : 'Sistema'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(message)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
                
                {editingMessage === message.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[100px]"
                      placeholder="Edite a transcrição..."
                    />
                    <div className="flex items-center space-x-2">
                      <Button size="sm" onClick={saveEdit}>
                        <Save className="w-3 h-3 mr-1" />
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        <X className="w-3 h-3 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm bg-muted/50 p-3 rounded whitespace-pre-wrap">
                    {message.text}
                  </p>
                )}
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Clique no microfone para gravar e transcrever
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-2 border-t bg-muted/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {isRecording ? 
              'Gravando... Clique no botão para parar e transcrever' :
              isProcessing ?
              'Transcrevendo áudio...' :
              'Pressione e segure para gravar. As transcrições são editáveis'
            }
          </p>
        </div>
      </div>
    </div>
  );
};