import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Edit2, Save, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// Declarações para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    webkitAudioContext: any;
  }
}

interface TranscriptionMessage {
  id: string;
  text: string;
  speaker: 'user' | 'system';
  timestamp: string;
  final: boolean;
  confidence?: number;
}

interface WebSpeechTranscriptionProps {
  patientName?: string;
  patientId?: string;
  onTranscriptionUpdate?: (messages: TranscriptionMessage[]) => void;
}

export const WebSpeechTranscription: React.FC<WebSpeechTranscriptionProps> = ({
  patientName,
  patientId,
  onTranscriptionUpdate
}) => {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Verificar suporte para Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      const recognition = new SpeechRecognition();
      
      // Configurações para reconhecimento contínuo
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      recognition.maxAlternatives = 1;
      
      // Eventos de reconhecimento
      recognition.onstart = () => {
        console.log('Reconhecimento de voz iniciado');
        setIsListening(true);
        if (soundEnabled) {
          playBeepSound('start');
        }
      };

      recognition.onend = () => {
        console.log('Reconhecimento de voz finalizado');
        setIsListening(false);
        if (soundEnabled) {
          playBeepSound('stop');
        }
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Atualizar transcrição em tempo real
        setCurrentTranscript(interimTranscript);

        // Se houve resultado final, adicionar às mensagens
        if (finalTranscript.trim()) {
          const newMessage: TranscriptionMessage = {
            id: Date.now().toString(),
            text: finalTranscript.trim(),
            speaker: 'user',
            timestamp: new Date().toLocaleTimeString('pt-BR'),
            final: true,
            confidence: event.results[event.results.length - 1][0].confidence
          };

          setMessages(prev => {
            const newMessages = [...prev, newMessage];
            onTranscriptionUpdate?.(newMessages);
            return newMessages;
          });

          setCurrentTranscript('');
        }
      };

      recognition.onerror = (event) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        
        let errorMessage = 'Erro no reconhecimento de voz';
        
        switch (event.error) {
          case 'network':
            errorMessage = 'Erro de conexão de rede';
            break;
          case 'not-allowed':
            errorMessage = 'Permissão para microfone negada';
            break;
          case 'service-not-allowed':
            errorMessage = 'Serviço de reconhecimento não permitido';
            break;
          case 'bad-grammar':
            errorMessage = 'Erro de gramática';
            break;
          case 'language-not-supported':
            errorMessage = 'Idioma não suportado';
            break;
          case 'no-speech':
            // Não mostrar erro para "no-speech" em reconhecimento contínuo
            return;
          case 'audio-capture':
            errorMessage = 'Erro ao capturar áudio';
            break;
        }

        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
        
        setIsListening(false);
      };

      recognition.onnomatch = () => {
        console.log('Nenhuma correspondência encontrada');
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      toast({
        title: "Não suportado",
        description: "Seu navegador não suporta reconhecimento de voz",
        variant: "destructive",
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [soundEnabled, toast, onTranscriptionUpdate]);

  const playBeepSound = (type: 'start' | 'stop') => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar frequência baseada no tipo
      oscillator.frequency.setValueAtTime(type === 'start' ? 800 : 400, audioContext.currentTime);
      oscillator.type = 'sine';

      // Configurar volume
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Erro ao reproduzir som:', error);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current || !isSupported) return;

    try {
      recognitionRef.current.start();
      toast({
        title: "Reconhecimento iniciado",
        description: "Fale normalmente. O reconhecimento é contínuo.",
      });
    } catch (error) {
      console.error('Erro ao iniciar reconhecimento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o reconhecimento de voz",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
      setCurrentTranscript('');
      toast({
        title: "Reconhecimento parado",
        description: "Transcrição finalizada",
      });
    } catch (error) {
      console.error('Erro ao parar reconhecimento:', error);
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

  const clearMessages = () => {
    setMessages([]);
    onTranscriptionUpdate?.([]);
    toast({
      title: "Transcrições apagadas",
      description: "Todas as transcrições foram removidas",
    });
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <MicOff className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Reconhecimento de voz não suportado</h3>
        <p className="text-muted-foreground text-center">
          Seu navegador não suporta a Web Speech API. 
          Recomendamos usar Google Chrome ou Microsoft Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controles */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "destructive" : "default"}
            size="sm"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening ? "Parar" : "Iniciar"}
          </Button>

          <Button
            onClick={() => setSoundEnabled(!soundEnabled)}
            variant="outline"
            size="sm"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {messages.length > 0 && (
            <Button
              onClick={clearMessages}
              variant="outline"
              size="sm"
            >
              Limpar
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isListening && (
            <Badge variant="default" className="animate-pulse">
              Ouvindo...
            </Badge>
          )}
        </div>
      </div>

      {/* Transcrição em tempo real */}
      {currentTranscript && (
        <div className="p-3 border-b bg-primary/5">
          <Badge variant="secondary" className="mb-2">
            Transcrevendo...
          </Badge>
          <p className="text-sm text-muted-foreground italic">
            {currentTranscript}
          </p>
        </div>
      )}

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
                    {message.confidence && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(message.confidence * 100)}% confiança
                      </span>
                    )}
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
            
            {messages.length === 0 && !currentTranscript && (
              <div className="text-center text-muted-foreground py-8">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm mb-2">
                  Clique em "Iniciar" para começar o reconhecimento contínuo de voz
                </p>
                <p className="text-xs">
                  Funciona melhor no Chrome e Edge
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
            {isListening ? 
              'Reconhecimento ativo. Fale normalmente - a transcrição é automática' :
              'Pressione "Iniciar" para ativar o reconhecimento contínuo de voz'
            }
          </p>
        </div>
      </div>
    </div>
  );
};