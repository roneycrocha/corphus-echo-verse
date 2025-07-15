import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Edit2, 
  Save, 
  X, 
  Volume2, 
  VolumeX, 
  Brain,
  Play,
  Pause,
  Settings,
  MessageSquareQuote,
  Lightbulb,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserAIAgent } from '@/hooks/useUserAIAgent';

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

interface AnalysisQuestion {
  id: string;
  question: string;
  reason: string;
  trait_relevance?: string;
  timestamp: string;
  rating?: 'useful' | 'not_useful' | null;
}

interface EnhancedRealTimeTranscriptionProps {
  patientName?: string;
  patientId?: string;
  onTranscriptionUpdate?: (messages: TranscriptionMessage[]) => void;
}

export const EnhancedRealTimeTranscription: React.FC<EnhancedRealTimeTranscriptionProps> = ({
  patientName,
  patientId,
  onTranscriptionUpdate
}) => {
  // Estados principais
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Estados de análise automática
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(false);
  const [analysisQuestions, setAnalysisQuestions] = useState<AnalysisQuestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  const [nextAnalysisCountdown, setNextAnalysisCountdown] = useState(30);
  const [transcriptionText, setTranscriptionText] = useState('');
  
  // Estados de salvamento
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  // Estados do carrossel de perguntas
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { getSelectedAgentId } = useUserAIAgent();

  // Sincronizar ref com state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Configurar reconhecimento de voz
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('🎤 Reconhecimento contínuo iniciado');
        setIsListening(true);
        if (soundEnabled) {
          playBeepSound('start');
        }
      };

      recognition.onend = () => {
        console.log('🔇 Reconhecimento finalizado');
        
        // Verifica se deve reiniciar automaticamente usando a ref atualizada
        setTimeout(() => {
          // Usa a ref para ter o estado mais atual
          if (recognitionRef.current && isListeningRef.current) {
            console.log('🔄 Reiniciando reconhecimento automático...');
            try {
              // Verificar se já não está rodando antes de tentar start
              if (recognitionRef.current.state !== 'listening') {
                recognitionRef.current.start();
              }
            } catch (error) {
              console.warn('⚠️ Erro ao reiniciar reconhecimento:', error);
              // Parar tentativas de reiniciar para evitar loop
              setIsListening(false);
            }
          } else {
            console.log('🛑 Reconhecimento parado intencionalmente');
            setIsListening(false);
            if (soundEnabled) {
              playBeepSound('stop');
            }
          }
        }, 500); // Aumentar delay para evitar conflitos
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

        setCurrentTranscript(interimTranscript);

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

          // Atualizar texto contínuo da transcrição
          setTranscriptionText(prev => {
            const newText = prev ? `${prev} ${finalTranscript.trim()}` : finalTranscript.trim();
            return newText;
          });

          setCurrentTranscript('');
        }
      };

      recognition.onerror = (event) => {
        console.error('Erro no reconhecimento:', event.error);
        
        // Não mostrar erro para "no-speech" e "aborted" - são normais em reconhecimento contínuo
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }

        let errorMessage = 'Erro no reconhecimento de voz';
        
        switch (event.error) {
          case 'network':
            errorMessage = 'Erro de conexão de rede';
            break;
          case 'not-allowed':
            errorMessage = 'Permissão para microfone negada';
            setIsListening(false);
            break;
          case 'service-not-allowed':
            errorMessage = 'Serviço de reconhecimento não permitido';
            setIsListening(false);
            break;
          case 'audio-capture':
            errorMessage = 'Erro ao capturar áudio';
            setIsListening(false);
            break;
        }

        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
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

  // Configurar auto-save das transcrições
  useEffect(() => {
    if (messages.length > 0 && patientId) {
      autoSaveIntervalRef.current = setInterval(() => {
        saveTranscription();
      }, 30000); // Salvar a cada 30 segundos

      return () => {
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
        }
      };
    }
  }, [messages, patientId]);

  // Ativar auto-análise automaticamente quando iniciar a transcrição
  useEffect(() => {
    if (isListening && !autoAnalysisEnabled) {
      console.log('🧠 Ativando análise automática de IA');
      setAutoAnalysisEnabled(true);
      toast({
        title: "Análise automática ativada",
        description: "Perguntas de IA serão geradas a cada 30 segundos",
      });
    }
  }, [isListening, autoAnalysisEnabled, toast]);

  // Configurar análise automática
  useEffect(() => {
    if (autoAnalysisEnabled && messages.length > 0) {
      // Iniciar countdown
      setNextAnalysisCountdown(30);
      countdownIntervalRef.current = setInterval(() => {
        setNextAnalysisCountdown(prev => {
          if (prev <= 1) {
            performAutomaticAnalysis();
            return 30; // Reset para próxima análise (30 segundos)
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }
  }, [autoAnalysisEnabled, messages]);

  const playBeepSound = (type: 'start' | 'stop') => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(type === 'start' ? 800 : 400, audioContext.currentTime);
      oscillator.type = 'sine';

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
        title: "Transcrição iniciada",
        description: "Reconhecimento contínuo ativado. Fale normalmente.",
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

    setIsListening(false);
    setAutoAnalysisEnabled(false); // Parar análise automática
    
    try {
      recognitionRef.current.stop();
      setCurrentTranscript('');
      
      // Salvar transcrição final
      if (messages.length > 0) {
        saveTranscription();
      }
      
      // Realizar análise final
      if (transcriptionText.trim()) {
        performFinalAnalysis();
      }
      
      toast({
        title: "Transcrição finalizada",
        description: "Reconhecimento parado, transcrição salva e análise final iniciada",
      });
    } catch (error) {
      console.error('Erro ao parar reconhecimento:', error);
    }
  };

  const saveTranscription = async () => {
    if (!patientId || messages.length === 0) return;

    setIsSaving(true);
    try {
      const transcriptionText = messages
        .map(m => `[${m.timestamp}] ${m.speaker === 'user' ? 'Paciente' : 'Sistema'}: ${m.text}`)
        .join('\n');

      const { error } = await supabase
        .from('transcriptions')
        .insert({
          patient_id: patientId,
          transcription_text: transcriptionText,
          session_type: 'ai_assistance',
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      setLastSaveTime(new Date());
      
    } catch (error: any) {
      console.error('Erro ao salvar transcrição:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a transcrição",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const performAutomaticAnalysis = async () => {
    if (!patientId || transcriptionText.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('conversation-analysis', {
        body: {
          transcription: transcriptionText,
          patientId,
          assistantId: getSelectedAgentId()
        }
      });

      if (error) throw error;

      if (data?.questions && Array.isArray(data.questions)) {
        const newQuestions: AnalysisQuestion[] = data.questions.map((q: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          question: q.question,
          reason: q.reason,
          trait_relevance: q.trait_relevance,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          rating: null
        }));

        setAnalysisQuestions(prev => [...newQuestions, ...prev].slice(0, 20)); // Manter mais perguntas para filtragem
        setLastAnalysisTime(new Date());

        toast({
          title: "🧠 Análise IA concluída",
          description: `${newQuestions.length} perguntas geradas automaticamente`,
        });
      }

    } catch (error: any) {
      console.error('Erro na análise automática:', error);
      toast({
        title: "Erro na análise",
        description: "Falha na análise automática da conversa",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performFinalAnalysis = async () => {
    if (!patientId || transcriptionText.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('conversation-analysis', {
        body: {
          transcription: transcriptionText,
          patientId,
          finalAnalysis: true
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Análise final concluída",
        description: "Relatório final da conversa processado",
      });

    } catch (error: any) {
      console.error('Erro na análise final:', error);
      toast({
        title: "Erro na análise final",
        description: "Falha ao processar análise final",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleAutoAnalysis = () => {
    setAutoAnalysisEnabled(!autoAnalysisEnabled);
    
    if (!autoAnalysisEnabled) {
      toast({
        title: "Análise automática ativada",
        description: "Perguntas serão geradas a cada 30 segundos durante a transcrição",
      });
    } else {
      toast({
        title: "Análise automática desativada",
        description: "Geração automática de perguntas pausada",
      });
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
    setAnalysisQuestions([]);
    setTranscriptionText('');
    onTranscriptionUpdate?.([]);
    toast({
      title: "Dados limpos",
      description: "Transcrições e análises removidas",
    });
  };

  const rateQuestion = (questionId: string, rating: 'useful' | 'not_useful') => {
    setAnalysisQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, rating } : q
    ));
    
    toast({
      title: rating === 'useful' ? "Pergunta marcada como útil" : "Pergunta marcada como não útil",
      description: rating === 'not_useful' ? "A pergunta será removida da lista" : "Obrigado pelo feedback!",
    });
  };

  const removeUselessQuestions = () => {
    setAnalysisQuestions(prev => prev.filter(q => q.rating !== 'not_useful'));
    toast({
      title: "Perguntas não úteis removidas",
      description: "Lista de perguntas atualizada",
    });
  };

  const getFilteredQuestions = () => {
    return analysisQuestions.filter(q => q.rating !== 'not_useful');
  };

  // Funções do carrossel de perguntas
  const goToNextQuestion = () => {
    const filteredQuestions = getFilteredQuestions();
    if (filteredQuestions.length > 0) {
      setCurrentQuestionIndex(prev => (prev + 1) % filteredQuestions.length);
    }
  };

  const goToPreviousQuestion = () => {
    const filteredQuestions = getFilteredQuestions();
    if (filteredQuestions.length > 0) {
      setCurrentQuestionIndex(prev => 
        prev === 0 ? filteredQuestions.length - 1 : prev - 1
      );
    }
  };

  // Reset do índice quando as perguntas mudam
  useEffect(() => {
    const filteredQuestions = getFilteredQuestions();
    if (currentQuestionIndex >= filteredQuestions.length) {
      setCurrentQuestionIndex(0);
    }
  }, [analysisQuestions, currentQuestionIndex]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    <div className="flex flex-col h-full" data-listening={isListening}>
      {/* Controles principais */}
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
            onClick={toggleAutoAnalysis}
            variant={autoAnalysisEnabled ? "default" : "outline"}
            size="sm"
          >
            <Brain className="w-4 h-4 mr-1" />
            IA {autoAnalysisEnabled ? "ON" : "OFF"}
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
              Gravando...
            </Badge>
          )}
          
          {autoAnalysisEnabled && isListening && (
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              {formatDuration(nextAnalysisCountdown)}
            </Badge>
          )}
          
          {isSaving && (
            <Badge variant="outline">
              <Settings className="w-3 h-3 mr-1 animate-spin" />
              Salvando...
            </Badge>
          )}
        </div>
      </div>

      {/* Status da análise automática */}
      {autoAnalysisEnabled && (
        <div className="p-3 border-b bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Análise Automática Ativa
              </span>
              {isAnalyzing && (
                <Settings className="w-3 h-3 text-blue-600 animate-spin" />
              )}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {isAnalyzing ? 'Analisando...' : `Próxima análise em ${formatDuration(nextAnalysisCountdown)}`}
            </div>
          </div>
        </div>
      )}

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

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-3 overflow-hidden">
        {/* Coluna de Transcrição Contínua - 33% */}
        <div className="lg:w-1/3 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h3 className="text-sm font-medium">Transcrição da Conversa</h3>
            <Badge variant="outline" className="text-xs">
              {transcriptionText.split(' ').filter(word => word.length > 0).length} palavras
            </Badge>
          </div>
          
          <div className="flex-1 min-h-0 border rounded-lg bg-muted/5 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {transcriptionText ? (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {transcriptionText}
                    </p>
                    
                    {currentTranscript && (
                      <div className="border-t pt-3 mt-3">
                        <Badge variant="secondary" className="mb-2">
                          Transcrevendo...
                        </Badge>
                        <p className="text-sm text-muted-foreground italic">
                          {currentTranscript}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h4 className="text-lg font-medium mb-2">Inicie a Transcrição</h4>
                    <p className="text-sm mb-2">
                      Clique em "Iniciar" para começar a capturar sua conversa
                    </p>
                    <p className="text-xs">
                      O texto aparecerá aqui de forma contínua e será salvo automaticamente
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          
          {editingMessage && (
            <div className="mt-3 p-3 border rounded-lg bg-muted/30 flex-shrink-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Editando transcrição</span>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[80px]"
                  placeholder="Edite o texto da transcrição..."
                />
                <Button size="sm" onClick={saveEdit}>
                  <Save className="w-3 h-3 mr-1" />
                  Salvar Edição
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Coluna de Perguntas da IA - 67% */}
        <div className="lg:w-2/3 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h3 className="text-sm font-medium">Perguntas da IA</h3>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {getFilteredQuestions().length} úteis
              </Badge>
              {analysisQuestions.some(q => q.rating === 'not_useful') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={removeUselessQuestions}
                  className="text-xs h-6"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
          
           <Card className="flex-1 min-h-0 overflow-hidden">
             <CardContent className="p-3 h-full flex flex-col">
               {getFilteredQuestions().length > 0 ? (
                 <div className="flex flex-col h-full min-h-0">
                   {/* Cabeçalho do carrossel com navegação */}
                   <div className="flex items-center justify-between mb-3 flex-shrink-0">
                     <div className="flex items-center space-x-2">
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={goToPreviousQuestion}
                         disabled={getFilteredQuestions().length <= 1}
                         className="h-8 w-8 p-0"
                       >
                         <ChevronLeft className="w-4 h-4" />
                       </Button>
                       
                       <Badge variant="secondary" className="text-xs">
                         {currentQuestionIndex + 1} de {getFilteredQuestions().length}
                       </Badge>
                       
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={goToNextQuestion}
                         disabled={getFilteredQuestions().length <= 1}
                         className="h-8 w-8 p-0"
                       >
                         <ChevronRight className="w-4 h-4" />
                       </Button>
                     </div>
                     
                     {/* Botão de limpar perguntas não úteis */}
                     {analysisQuestions.some(q => q.rating === 'not_useful') && (
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={removeUselessQuestions}
                         className="text-xs h-6"
                       >
                         Limpar
                       </Button>
                     )}
                   </div>

                   {/* Pergunta atual */}
                   <div className="flex-1 min-h-0 overflow-hidden">
                     {(() => {
                       const filteredQuestions = getFilteredQuestions();
                       const currentQuestion = filteredQuestions[currentQuestionIndex];
                       
                       if (!currentQuestion) return null;
                       
                       return (
                         <div className={`border rounded-lg p-4 h-full flex flex-col transition-colors ${
                           currentQuestion.rating === 'useful' ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20' :
                           currentQuestion.rating === 'not_useful' ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20' :
                           'bg-purple-50/50 dark:bg-purple-950/20'
                         }`}>
                           <div className="flex items-center justify-between mb-3 flex-shrink-0">
                             <Badge variant="secondary" className="text-xs">
                               {currentQuestion.timestamp}
                             </Badge>
                             <div className="flex items-center space-x-1">
                               {currentQuestion.rating === 'useful' && (
                                 <Badge variant="default" className="bg-green-100 text-green-700 text-xs">
                                   Útil
                                 </Badge>
                               )}
                               <Lightbulb className="w-4 h-4 text-purple-600" />
                             </div>
                           </div>
                           
                           <div className="flex-1 min-h-0 overflow-hidden mb-4">
                             <ScrollArea className="h-full">
                               <div className="pr-3">
                                 <h4 className="font-medium text-base mb-3 text-purple-700 dark:text-purple-300 leading-relaxed">
                                   {currentQuestion.question}
                                 </h4>
                                 
                                 <div className="text-sm text-muted-foreground mb-3">
                                   <span className="font-medium">Objetivo:</span> {currentQuestion.reason}
                                 </div>
                                 
                                 {currentQuestion.trait_relevance && (
                                   <div className="text-sm text-blue-600 dark:text-blue-400">
                                     <span className="font-medium">Traços:</span> {currentQuestion.trait_relevance}
                                   </div>
                                 )}
                               </div>
                             </ScrollArea>
                           </div>
                           
                           {/* Botões de avaliação */}
                           <div className="flex items-center justify-center space-x-3 pt-3 border-t flex-shrink-0">
                             <span className="text-sm text-muted-foreground">Esta pergunta é:</span>
                             <Button
                               size="sm"
                               variant={currentQuestion.rating === 'useful' ? 'default' : 'outline'}
                               onClick={() => rateQuestion(currentQuestion.id, 'useful')}
                               className="text-sm h-8 px-4"
                             >
                               👍 Útil
                             </Button>
                             <Button
                               size="sm"
                               variant={currentQuestion.rating === 'not_useful' ? 'destructive' : 'outline'}
                               onClick={() => rateQuestion(currentQuestion.id, 'not_useful')}
                               className="text-sm h-8 px-4"
                             >
                               👎 Não útil
                             </Button>
                           </div>
                         </div>
                       );
                     })()}
                   </div>
                 </div>
               ) : (
                 <div className="flex flex-col h-full">
                   {getFilteredQuestions().length === 0 && analysisQuestions.length > 0 ? (
                     <div className="text-center text-muted-foreground py-8 flex-1 flex flex-col justify-center">
                       <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                       <p className="text-base mb-3">
                         Todas as perguntas foram marcadas como não úteis
                       </p>
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => setAnalysisQuestions(prev => prev.map(q => ({ ...q, rating: null })))}
                         className="text-sm mx-auto"
                       >
                         Restaurar todas
                       </Button>
                     </div>
                   ) : (
                     <div className="text-center text-muted-foreground py-8 flex-1 flex flex-col justify-center">
                       <MessageSquareQuote className="w-12 h-12 mx-auto mb-3 opacity-50" />
                       <p className="text-base mb-2">
                         Nenhuma pergunta gerada ainda
                       </p>
                       <p className="text-sm">
                         {autoAnalysisEnabled ? 
                           'As perguntas aparecerão automaticamente durante a transcrição' :
                           'Ative a análise automática para gerar perguntas em tempo real'
                         }
                       </p>
                     </div>
                   )}
                 </div>
               )}
             </CardContent>
           </Card>
        </div>
      </div>

      {/* Footer com informações */}
      <div className="p-2 border-t bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="text-center">
            {isListening ? 
              'Transcrição ativa - fale normalmente' :
              'Pressione "Iniciar" para ativar a transcrição contínua'
            }
          </div>
          <div className="text-center">
            {lastSaveTime && `Último salvamento: ${lastSaveTime.toLocaleTimeString('pt-BR')}`}
          </div>
          <div className="text-center">
            {lastAnalysisTime && `Última análise: ${lastAnalysisTime.toLocaleTimeString('pt-BR')}`}
          </div>
        </div>
      </div>
    </div>
  );
};