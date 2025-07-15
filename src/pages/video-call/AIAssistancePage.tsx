import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  MessageSquare, 
  Brain,
  Sparkles,
  Settings,
  ArrowLeft,
  Clock,
  Users,
  MessageSquareQuote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DailyIframe from '@daily-co/daily-js';
import { EnhancedRealTimeTranscription } from '@/components/communication/EnhancedRealTimeTranscription';
import { TreatmentPlanSelector } from '@/components/therapeutic/TreatmentPlanSelector';

import { ConversationAnalysisModal } from '@/components/communication/ConversationAnalysisModal';
import { useResourceCosts } from '@/hooks/useResourceCosts';
import { PatientNameWithTraits } from '@/components/common/PatientNameWithTraits';
import { useVideoCallSettings } from '@/hooks/useVideoCallSettings';

interface AIAssistancePageProps {}

export const AIAssistancePage: React.FC<AIAssistancePageProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { consumeCreditsForResource } = useResourceCosts();
  const { settings } = useVideoCallSettings();

  // Estados do componente
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [transcriptionMessages, setTranscriptionMessages] = useState<any[]>([]);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [savedTranscriptions, setSavedTranscriptions] = useState<any[]>([]);
  const [showTreatmentPlanModal, setShowTreatmentPlanModal] = useState(false);
  const [showTreatmentPlanSelector, setShowTreatmentPlanSelector] = useState(false);
  const [showConversationAnalysisModal, setShowConversationAnalysisModal] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isLoadingTranscriptions, setIsLoadingTranscriptions] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);

  // Dados do paciente vindos da navegação
  const { patientId, patientName, userType } = location.state || {};

  // Refs para Daily.co
  const callFrameRef = useRef<HTMLDivElement>(null);
  const callObjectRef = useRef<any>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Carregar transcrições salvas e dados do paciente ao montar o componente
    if (patientId) {
      loadSavedTranscriptions();
      loadPatientData();
    }

    return () => {
      // Cleanup ao desmontar
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('email, whatsapp, phone')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      
      setPatientData(data);
    } catch (error: any) {
      console.error('Erro ao carregar dados do paciente:', error);
    }
  };

  const loadSavedTranscriptions = async () => {
    setIsLoadingTranscriptions(true);
    try {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setSavedTranscriptions(data || []);
      
      // Se houver transcrições, carregar a mais recente
      if (data && data.length > 0 && data[0].transcription_text) {
        setTranscriptionText(data[0].transcription_text);
      }
    } catch (error: any) {
      console.error('Erro ao carregar transcrições:', error);
    } finally {
      setIsLoadingTranscriptions(false);
    }
  };

  const hasTranscriptionContent = () => {
    return transcriptionMessages.length > 0 || 
           transcriptionText.trim() || 
           savedTranscriptions.some(t => t.transcription_text?.trim());
  };

  const getCurrentTranscription = () => {
    if (transcriptionText.trim()) {
      return transcriptionText;
    }
    
    if (transcriptionMessages.length > 0) {
      return transcriptionMessages
        .map(m => `${m.speaker === 'patient' ? 'Paciente' : 'Terapeuta'}: ${m.text}`)
        .join('\n');
    }
    
    if (savedTranscriptions.length > 0 && savedTranscriptions[0].transcription_text) {
      return savedTranscriptions[0].transcription_text;
    }
    
    return '';
  };

  const createDailyRoom = async () => {
    setIsCreatingRoom(true);
    try {
      console.log('[AI Assistance] Criando sala Daily.co para atendimento com IA');
      
      const { data, error } = await supabase.functions.invoke('create-daily-room', {
        body: {
          patientId,
          patientName: patientName || 'Paciente',
          sessionType: 'ai_assistance'
        }
      });

      if (error) {
        throw error;
      }

      const { roomUrl, callId } = data;
      console.log('[AI Assistance] Sala criada:', { roomUrl, callId });

      // Primeiro ativar o call para renderizar o elemento
      setIsCallActive(true);
      
      // Aguardar um pouco para garantir que o elemento seja renderizado
      setTimeout(async () => {
        try {
          await initializeDailyCall(roomUrl);
          toast({
            title: "Atendimento iniciado",
            description: "Sala de atendimento com IA criada com sucesso",
          });
        } catch (error: any) {
          console.error('[AI Assistance] Erro ao inicializar Daily.co após renderização:', error);
          setIsCallActive(false); // Reverter o estado se falhar
          toast({
            title: "Erro",
            description: "Não foi possível inicializar a videochamada",
            variant: "destructive",
          });
        }
      }, 100);

    } catch (error: any) {
      console.error('[AI Assistance] Erro ao criar sala:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a sala de atendimento",
        variant: "destructive",
      });
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const initializeDailyCall = async (roomUrl: string) => {
    try {
      if (!callFrameRef.current) {
        throw new Error('Elemento do frame não encontrado');
      }

      // Criar frame do Daily.co com configurações de idioma
      // Mapear idiomas para códigos aceitos pelo Daily.co
      let dailyLang: any = 'en'; // padrão
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

      const callFrame = DailyIframe.createFrame(callFrameRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px'
        },
        showLeaveButton: false,
        showFullscreenButton: false,
        showLocalVideo: true,
        showParticipantsBar: false,
        lang: dailyLang
      });

      callObjectRef.current = callFrame;

      // Event listeners para Daily.co
      callFrame
        .on('joined-meeting', () => {
          console.log('[AI Assistance] Entrou na reunião');
          setIsCallActive(true);
          
          // Iniciar timer de duração
          const startTime = Date.now();
          durationIntervalRef.current = setInterval(() => {
            setCallDuration(Math.floor((Date.now() - startTime) / 1000));
          }, 1000);

          toast({
            title: "Conectado",
            description: "Atendimento com IA iniciado",
          });
        })
        .on('left-meeting', () => {
          console.log('[AI Assistance] Saiu da reunião');
          setIsCallActive(false);
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
          }
        })
        .on('error', (error: any) => {
          console.error('[AI Assistance] Erro Daily.co:', error);
          toast({
            title: "Erro na videochamada",
            description: error.errorMsg || "Erro desconhecido",
            variant: "destructive",
          });
        });

      // Entrar na sala
      await callFrame.join({ url: roomUrl });

    } catch (error: any) {
      console.error('[AI Assistance] Erro ao inicializar Daily.co:', error);
      toast({
        title: "Erro",
        description: "Não foi possível inicializar a videochamada",
        variant: "destructive",
      });
    }
  };

  const toggleVideo = async () => {
    if (callObjectRef.current) {
      try {
        await callObjectRef.current.setLocalVideo(!isVideoEnabled);
        setIsVideoEnabled(!isVideoEnabled);
      } catch (error) {
        console.error('[AI Assistance] Erro ao alternar vídeo:', error);
      }
    }
  };

  const toggleAudio = async () => {
    if (callObjectRef.current) {
      try {
        await callObjectRef.current.setLocalAudio(!isAudioEnabled);
        setIsAudioEnabled(!isAudioEnabled);
      } catch (error) {
        console.error('[AI Assistance] Erro ao alternar áudio:', error);
      }
    }
  };

  const endCall = async () => {
    if (callObjectRef.current) {
      try {
        await callObjectRef.current.leave();
        callObjectRef.current.destroy();
        callObjectRef.current = null;
      } catch (error) {
        console.error('[AI Assistance] Erro ao encerrar chamada:', error);
      }
    }
    
    navigate('/agenda');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateTreatmentPlan = () => {
    if (!hasTranscriptionContent()) {
      toast({
        title: "Aviso",
        description: "Não há transcrição disponível para gerar o plano",
        variant: "destructive",
      });
      return;
    }
    setShowTreatmentPlanSelector(true);
  };

  const handleTranscriptionComplete = async (text: string) => {
    const newText = transcriptionText ? `${transcriptionText}\n\n${text}` : text;
    setTranscriptionText(newText);
    
    // Salvar transcrição automaticamente
    if (patientId && text.trim()) {
      try {
        await supabase.functions.invoke('save-transcription', {
          body: {
            patientId,
            transcriptionText: newText,
            sessionType: 'ai_assistance'
          }
        });
        console.log('Transcrição salva automaticamente');
      } catch (error: any) {
        console.error('Erro ao salvar transcrição:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Responsivo */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
            <div className="flex items-center space-x-3 md:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/agenda')}
                className="p-2 md:px-3"
              >
                <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg md:text-xl font-bold flex items-center space-x-2">
                  <Brain className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                  <span className="truncate">Atendimento com IA</span>
                </h1>
                {patientName && (
                  <div className="text-xs md:text-sm text-muted-foreground">
                    <span className="mr-2">Paciente:</span>
                    <PatientNameWithTraits 
                      patientId={patientId}
                      patientName={patientName}
                      className="inline-flex"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end space-x-3 md:space-x-4">
              {isCallActive && (
                <div className="flex items-center space-x-2 text-xs md:text-sm">
                  <Clock className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="font-mono">{formatDuration(callDuration)}</span>
                </div>
              )}
              <Badge variant={isCallActive ? "default" : "secondary"} className="text-xs">
                {isCallActive ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {!isCallActive ? (
          /* Tela inicial - Antes de iniciar o atendimento */
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  <span>Atendimento Inteligente</span>
                </CardTitle>
                <p className="text-muted-foreground">
                  Inicie um atendimento com videochamada integrada à IA para transcrição 
                  em tempo real e geração automática de planos de tratamento
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Video className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-medium">Videochamada HD</h3>
                    <p className="text-xs text-muted-foreground">
                      Powered by Daily.co
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <h3 className="font-medium">Transcrição</h3>
                    <p className="text-xs text-muted-foreground">
                      Tempo real otimizada
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Brain className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <h3 className="font-medium">IA Integrada</h3>
                    <p className="text-xs text-muted-foreground">
                      Planos automáticos
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={createDailyRoom}
                  disabled={isCreatingRoom}
                  className="w-full h-12"
                  size="lg"
                >
                  {isCreatingRoom ? (
                    <>
                      <Settings className="w-5 h-5 mr-2 animate-spin" />
                      Preparando atendimento...
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5 mr-2" />
                      Iniciar Atendimento com IA
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Seção de IA sem videochamada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transcrições existentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <span>Transcrições Salvas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingTranscriptions ? (
                    <div className="flex items-center justify-center py-8">
                      <Settings className="w-6 h-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
                    </div>
                  ) : savedTranscriptions.length > 0 ? (
                    <div className="space-y-2">
                      {savedTranscriptions.slice(0, 3).map((transcription, index) => (
                        <div key={transcription.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">
                            {new Date(transcription.created_at).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(transcription.created_at).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          <p className="text-sm line-clamp-3">
                            {transcription.transcription_text || 'Transcrição sem texto'}
                          </p>
                        </div>
                      ))}
                      {savedTranscriptions.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{savedTranscriptions.length - 3} transcrições mais antigas
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma transcrição encontrada</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* IA Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <span>Ferramentas de IA</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-600/50" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Analise conversas existentes e gere insights terapêuticos
                    </p>
                    
                    <div className="space-y-2">
                      <Button 
                        onClick={generateTreatmentPlan}
                        disabled={!hasTranscriptionContent()}
                        className="w-full h-11"
                        size="sm"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Gerar Plano com IA
                      </Button>

                      <Button 
                        onClick={() => setShowConversationAnalysisModal(true)}
                        disabled={!hasTranscriptionContent()}
                        className="w-full h-11"
                        size="sm"
                        variant="outline"
                      >
                        <MessageSquareQuote className="w-4 h-4 mr-2" />
                        Analisar Conversa
                      </Button>
                    </div>

                    {!hasTranscriptionContent() && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {isLoadingTranscriptions ? 'Carregando transcrições...' : 'Nenhuma transcrição encontrada'}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Layout principal durante o atendimento */
          <div className="space-y-6">
            {/* Videochamada - parte superior */}
            <div className="w-full">
              <Card>
                <CardContent className="p-0">
                  {/* Daily.co Video Frame */}
                  <div 
                    ref={callFrameRef} 
                    className="w-full h-[500px] rounded-lg overflow-hidden bg-muted"
                  />
                </CardContent>
              </Card>

              {/* Controls da videochamada - Responsivos */}
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mt-4 px-4">
                <Button
                  onClick={toggleVideo}
                  variant={isVideoEnabled ? "default" : "destructive"}
                  size="lg"
                  className="h-10 md:h-12 px-4 md:px-6 text-sm md:text-base"
                >
                  {isVideoEnabled ? (
                    <Video className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                  ) : (
                    <VideoOff className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                  )}
                  <span className="hidden sm:inline">
                    {isVideoEnabled ? 'Desligar Vídeo' : 'Ligar Vídeo'}
                  </span>
                  <span className="sm:hidden">
                    {isVideoEnabled ? 'Vídeo' : 'Vídeo'}
                  </span>
                </Button>

                <Button
                  onClick={toggleAudio}
                  variant={isAudioEnabled ? "default" : "destructive"}
                  size="lg"
                  className="h-10 md:h-12 px-4 md:px-6 text-sm md:text-base"
                >
                  {isAudioEnabled ? (
                    <Mic className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                  ) : (
                    <MicOff className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                  )}
                  <span className="hidden sm:inline">
                    {isAudioEnabled ? 'Desligar Microfone' : 'Ligar Microfone'}
                  </span>
                  <span className="sm:hidden">
                    {isAudioEnabled ? 'Microfone' : 'Microfone'}
                  </span>
                </Button>

                <Button
                  onClick={endCall}
                  variant="destructive"
                  size="lg"
                  className="h-10 md:h-12 px-4 md:px-6 text-sm md:text-base"
                >
                  <PhoneOff className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                  Encerrar
                </Button>
              </div>
            </div>

            {/* Área de Transcrição com IA integrada - Responsiva */}
            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                  <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                  <span>Transcrição e Análise da Conversa</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 p-0">
                {/* Componente de transcrição completo com IA integrada */}
                <div className="h-[600px]">
                  <EnhancedRealTimeTranscription
                    patientName={patientName}
                    patientId={patientId}
                    onTranscriptionUpdate={setTranscriptionMessages}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Treatment Plan Selector */}
      <TreatmentPlanSelector
        isOpen={showTreatmentPlanSelector}
        onClose={() => setShowTreatmentPlanSelector(false)}
        patientId={patientId}
        patientName={patientName || 'Paciente'}
        patientEmail={patientData?.email}
        patientPhone={patientData?.whatsapp || patientData?.phone}
        transcription={getCurrentTranscription()}
        onPlanCreated={(planId) => {
          toast({
            title: "Plano criado",
            description: "Plano terapêutico criado com sucesso",
          });
        }}
      />

      {/* Conversation Analysis Modal */}
      <ConversationAnalysisModal
        isOpen={showConversationAnalysisModal}
        onClose={() => setShowConversationAnalysisModal(false)}
        patientId={patientId}
        patientName={patientName || 'Paciente'}
        transcription={getCurrentTranscription()}
      />
    </div>
  );
};