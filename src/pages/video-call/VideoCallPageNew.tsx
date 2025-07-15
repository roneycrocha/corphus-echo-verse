import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Settings, 
  Maximize2, 
  MessageSquare, 
  AudioLines,
  ArrowLeft,
  Users,
  Clock,
  Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { VideoCallSettings } from '@/components/communication/VideoCallSettings';
import { VideoCallRecording } from '@/components/communication/VideoCallRecording';
import { CallReportGenerator } from '@/components/communication/CallReportGenerator';
import { RealTimeTranscription } from '@/components/communication/RealTimeTranscription';
import { AudioRecording } from '@/components/communication/AudioRecording';
import { useVideoCallSettings } from '@/hooks/useVideoCallSettings';
import { supabase } from '@/integrations/supabase/client';

export const VideoCallPage: React.FC = () => {
  const navigate = useNavigate();
  const { patientName: encodedPatientName } = useParams<{ patientName: string }>();
  const { toast } = useToast();

  // O parâmetro agora é o callId, não mais o nome do paciente
  const callId = encodedPatientName; // Recebe o UUID da chamada
  const [patientName, setPatientName] = useState("Paciente");

  // Usar hook de configurações em vez do sistema deprecated
  const { settings, updateSetting } = useVideoCallSettings();
  
  // Estados baseados nas configurações salvas
  const [isVideoEnabled, setIsVideoEnabled] = useState(settings.videoEnabled);
  const [isAudioEnabled, setIsAudioEnabled] = useState(settings.audioEnabled);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentVideoDevice, setCurrentVideoDevice] = useState(settings.videoDeviceId);
  const [currentAudioDevice, setCurrentAudioDevice] = useState(settings.audioDeviceId);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [transcription, setTranscription] = useState<string>('');
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [patientOnline, setPatientOnline] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    initializeCall();
    setCallStartTime(new Date());

    // Timer para duração da chamada
    durationIntervalRef.current = setInterval(() => {
      if (callStartTime) {
        setCallDuration(Math.floor((Date.now() - callStartTime.getTime()) / 1000));
      }
    }, 1000);

    return () => {
      cleanup();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Detectar mudanças no estado de tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Sistema de comunicação real-time
  useEffect(() => {
    console.log('[DEBUG-TERAPEUTA] useEffect chamado - callId:', callId);
    console.log('[DEBUG-TERAPEUTA] patientName:', patientName);
    
    if (!callId) {
      console.log('[DEBUG-TERAPEUTA] ERRO: callId não definido!');
      return;
    }

    const roomId = `video-call-${callId}`;
    
    console.log('[DEBUG-TERAPEUTA] Call ID:', callId);
    console.log('[DEBUG-TERAPEUTA] RoomID gerado:', roomId);
    console.log('[DEBUG-TERAPEUTA] Criando canal Supabase...');
    
    // Criar canal para comunicação
    const channel = supabase.channel(roomId);
    channelRef.current = channel;

    // Configurar presença e troca de vídeo
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('[DEBUG] Presença sincronizada (terapeuta):', state);
        
        // Verificar se paciente está online
        const patientPresent = Object.values(state).some((presences: any) => 
          presences.some((presence: any) => presence.user_type === 'patient')
        );
        
        setPatientOnline(patientPresent);
        if (patientPresent && !isConnected) {
          setIsConnected(true);
          toast({
            title: "Paciente conectado",
            description: `${patientName} entrou na chamada`,
          });
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[DEBUG] Usuário entrou (terapeuta):', newPresences);
        
        const patientJoined = newPresences.some((presence: any) => 
          presence.user_type === 'patient'
        );
        
        if (patientJoined) {
          setIsConnected(true);
          setPatientOnline(true);
          toast({
            title: "Paciente conectado",
            description: `${patientName} entrou na chamada`,
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[DEBUG] Usuário saiu (terapeuta):', leftPresences);
        
        const patientLeft = leftPresences.some((presence: any) => 
          presence.user_type === 'patient'
        );
        
        if (patientLeft) {
          setIsConnected(false);
          setPatientOnline(false);
          // Limpar vídeo remoto quando paciente sai
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          toast({
            title: "Paciente desconectado",
            description: `${patientName} saiu da chamada`,
          });
        }
      })
      .on('broadcast', { event: 'video_stream' }, ({ payload }) => {
        console.log('[DEBUG-TERAPEUTA] Broadcast recebido:', payload);
        console.log('[DEBUG-TERAPEUTA] Tipo do usuário:', payload?.user_type);
        console.log('[DEBUG-TERAPEUTA] Tem video_data:', !!payload?.video_data);
        
        if (payload.user_type === 'patient' && payload.video_data) {
          console.log('[DEBUG-TERAPEUTA] Processando vídeo do paciente...');
          // Receber e mostrar vídeo do paciente
          displayRemoteVideo(payload.video_data);
        } else {
          console.log('[DEBUG-TERAPEUTA] Broadcast ignorado - não é do paciente ou sem dados');
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Anunciar presença do terapeuta
          const presenceStatus = await channel.track({
            user_type: 'therapist',
            therapist_name: 'Dr. Terapeuta',
            online_at: new Date().toISOString(),
          });
          
          console.log('[DEBUG] Terapeuta anunciado:', presenceStatus);
          
          // Verificar se o track foi bem-sucedido antes de iniciar o vídeo
          if (presenceStatus === 'ok') {
            // Começar a enviar vídeo local para o paciente
            console.log('🎥 TERAPEUTA: Iniciando envio de vídeo...');
            startVideoSharing();
          } else {
            console.log('[DEBUG] Erro ao anunciar presença:', presenceStatus);
          }
        }
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [callId, isConnected, toast]);

  const initializeCall = async (videoDeviceId?: string, audioDeviceId?: string) => {
    try {
      setIsConnecting(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta acesso à câmera/microfone');
      }
      
      const videoDevice = videoDeviceId || currentVideoDevice;
      const audioDevice = audioDeviceId || currentAudioDevice;
      
      const constraints: MediaStreamConstraints = {
        video: videoDevice ? { deviceId: { exact: videoDevice } } : {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: audioDevice ? { deviceId: { exact: audioDevice } } : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsConnecting(false);
      toast({
        title: "Chamada iniciada",
        description: "Aguardando paciente se conectar...",
      });
      
      // REMOVIDO: simulação automática que causava problema no botão
      
    } catch (error: any) {
      console.error('Erro ao inicializar chamada:', error);
      
      let errorMessage = 'Erro ao acessar câmera/microfone';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permissão negada para câmera/microfone';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Câmera ou microfone não encontrados';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Câmera ou microfone já estão sendo usados';
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      
      setIsConnecting(false);
    }
  };

  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoState = videoTrack.enabled;
        setIsVideoEnabled(newVideoState);
        await updateSetting('videoEnabled', newVideoState);
      }
    }
  };

  const toggleAudio = async () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newAudioState = audioTrack.enabled;
        setIsAudioEnabled(newAudioState);
        await updateSetting('audioEnabled', newAudioState);
      }
    }
  };

  const simulateRemoteVideo = async () => {
    try {
      // Simular stream do paciente usando câmera local espelhada
      if (localStreamRef.current && remoteVideoRef.current) {
        console.log('[DEBUG] Simulando vídeo remoto do paciente...');
        
        // Clonar o stream local para simular o vídeo remoto
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const video = document.createElement('video');
        
        canvas.width = 640;
        canvas.height = 480;
        
        video.srcObject = localStreamRef.current;
        video.play();
        
        video.onloadedmetadata = () => {
          const drawFrame = () => {
            if (context && video.videoWidth && video.videoHeight) {
              // Desenhar frame espelhado (flip horizontal)
              context.save();
              context.scale(-1, 1);
              context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
              context.restore();
              
              // Adicionar overlay indicando que é simulação
              context.fillStyle = 'rgba(0, 100, 200, 0.7)';
              context.fillRect(10, 10, 150, 30);
              context.fillStyle = 'white';
              context.font = '14px Arial';
              context.fillText('SIMULAÇÃO', 15, 30);
            }
            
            if (isConnected) {
              requestAnimationFrame(drawFrame);
            }
          };
          
          drawFrame();
        };
        
        // Converter canvas para stream e conectar ao vídeo remoto
        const simulatedStream = canvas.captureStream(30);
        remoteVideoRef.current.srcObject = simulatedStream;
        remoteVideoRef.current.play();
        
        console.log('[DEBUG] Vídeo remoto simulado configurado com sucesso');
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao simular vídeo remoto:', error);
    }
  };

  const displayRemoteVideo = (videoData: string) => {
    try {
      if (remoteVideoRef.current) {
        // Verificar se já existe um canvas ativo para evitar recriar constantemente
        let existingCanvas = remoteVideoRef.current.dataset.canvas;
        
        if (!existingCanvas) {
          // Criar uma imagem a partir dos dados base64
          const img = new Image();
          
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.width = 640;
            canvas.height = 480;
            
            if (context) {
              // Desenhar a imagem real recebida do paciente
              context.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              // Adicionar uma pequena marca d'água
              context.fillStyle = 'rgba(0, 100, 200, 0.8)';
              context.fillRect(10, 10, 120, 25);
              context.fillStyle = 'white';
              context.font = 'bold 12px Arial';
              context.fillText('PACIENTE', 15, 27);
              
              // Converter para stream e exibir
              const stream = canvas.captureStream(15); // 15 FPS para suavizar
              remoteVideoRef.current.srcObject = stream;
              remoteVideoRef.current.dataset.canvas = 'active';
              remoteVideoRef.current.play();
            }
          };
          
          img.onerror = () => {
            console.error('[DEBUG] Erro ao carregar imagem base64');
          };
          
          img.src = videoData;
        } else {
          // Canvas já existe, apenas atualizar a imagem se necessário
          const img = new Image();
          img.onload = () => {
            const stream = remoteVideoRef.current?.srcObject as any;
            if (stream && stream.getVideoTracks) {
              // Stream já existe, não precisamos recriar
              console.log('[DEBUG] Stream remoto já ativo, mantendo...');
            }
          };
          img.src = videoData;
        }
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao exibir vídeo remoto:', error);
    }
  };

  const startVideoSharing = () => {
    try {
      console.log('[DEBUG] Iniciando compartilhamento de vídeo...');
      
      if (localStreamRef.current && channelRef.current) {
        // Capturar frame do vídeo local e enviar via broadcast
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const video = document.createElement('video');
        
        let lastFrameSent = 0;
        let isActive = true;
        
        // Configuração otimizada para melhor performance
        canvas.width = 240; // Reduzido para melhor performance
        canvas.height = 180;
        
        video.srcObject = localStreamRef.current;
        video.play();
        
        video.onloadedmetadata = () => {
          const sendFrame = () => {
            if (!isActive) return; // Parar se não estiver ativo
            
            const hasValidVideo = context && video.videoWidth && video.videoHeight;
            
            if (hasValidVideo && isConnected) {
              const now = Date.now();
              
              // Throttling otimizado - 1 frame por segundo para reduzir carga
              if (!lastFrameSent || now - lastFrameSent > 1000) {
                lastFrameSent = now;
                
                try {
                  // Capturar frame atual
                  context.drawImage(video, 0, 0, canvas.width, canvas.height);
                  
                  // Converter para base64 com qualidade otimizada
                  const frameData = canvas.toDataURL('image/jpeg', 0.7);
                  
                  console.log('🎥 TERAPEUTA: Enviando frame de vídeo...');
                  
                  channelRef.current.send({
                    type: 'broadcast',
                    event: 'video_stream',
                    payload: {
                      user_type: 'therapist',
                      video_data: frameData,
                      timestamp: now
                    }
                  });
                } catch (error) {
                  console.error('Erro ao enviar frame:', error);
                }
              }
            }
            
            // Usar setTimeout com intervalo maior para reduzir carga de CPU
            if (isActive) {
              setTimeout(sendFrame, 500); // 2 FPS
            }
          };
          
          // Iniciar após 1 segundo
          setTimeout(sendFrame, 1000);
        };
        
        // Limpar quando o componente for desmontado
        return () => {
          isActive = false;
        };
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao iniciar compartilhamento de vídeo:', error);
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  };

  const endCall = () => {
    cleanup();
    toast({
      title: "Chamada finalizada",
      description: `Duração: ${formatDuration(callDuration)}`,
    });
    navigate('/agenda');
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (fullscreenContainerRef.current) {
          await fullscreenContainerRef.current.requestFullscreen();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Erro ao alternar tela cheia:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o modo tela cheia",
        variant: "destructive",
      });
    }
  };

  const handleDeviceChange = async (deviceId: string, type: 'video' | 'audio') => {
    if (type === 'video') {
      await updateSetting('videoDeviceId', deviceId);
      setCurrentVideoDevice(deviceId);
    } else if (type === 'audio') {
      await updateSetting('audioDeviceId', deviceId);
      setCurrentAudioDevice(deviceId);
    }
    
    cleanup();
    await initializeCall(
      type === 'video' ? deviceId : currentVideoDevice, 
      type === 'audio' ? deviceId : currentAudioDevice
    );
  };

  const copyCallLink = () => {
    try {
      if (!callId) {
        toast({
          title: "Erro",
          description: "ID da chamada não encontrado",
          variant: "destructive",
        });
        return;
      }
      
      // Criar dados da chamada usando o callId atual
      const callData = {
        callId,
        patientName,
        patientId: 'unknown', // Como estamos na página do terapeuta, pode não ter o patientId
        timestamp: Date.now()
      };
      
      // Codificar dados em base64 URL-safe
      const encodedData = btoa(JSON.stringify(callData))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      const callLink = `${window.location.origin}/video-call/${encodedData}`;
      
      navigator.clipboard.writeText(callLink);
      toast({
        title: "Link copiado!",
        description: "Link da chamada foi copiado para a área de transferência",
      });
    } catch (error) {
      console.error('Erro ao gerar link da videochamada:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar link da videochamada",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionQualityColor = (quality: string) => {
    switch (quality) {
      case 'good': return 'text-green-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div 
      ref={fullscreenContainerRef}
      className={`min-h-screen bg-background video-fade-in ${isFullscreen ? 'bg-black' : ''}`}
    >
      {/* Header */}
      <div className={`${isFullscreen ? 'hidden' : 'block'} border-b bg-card shadow-sm`}>
        <div className="container mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <Button
                onClick={() => navigate('/agenda')}
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 control-button-hover"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </Button>
              
              <div>
                <h1 className="text-xl font-semibold">Videochamada</h1>
                <p className="text-sm text-muted-foreground">
                  Consulta com {patientName}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Status da conexão */}
              <div className="flex items-center space-x-2">
                <Wifi className={`w-4 h-4 ${getConnectionQualityColor(connectionQuality)}`} />
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? 'Conectado' : isConnecting ? 'Conectando...' : 'Aguardando'}
                </Badge>
              </div>

              {/* Duração da chamada */}
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono">{formatDuration(callDuration)}</span>
              </div>

              {/* Participantes */}
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{isConnected ? 2 : 1}/2</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${isFullscreen ? 'h-screen' : 'container mx-auto px-4 py-6'}`}>
        {!isFullscreen ? (
          /* Layout com abas principais */
          <Tabs defaultValue="video" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-14 bg-muted/50">
              <TabsTrigger 
                value="video" 
                className="text-base font-medium py-3 flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Video className="w-5 h-5" />
                <span>Videochamada</span>
              </TabsTrigger>
              <TabsTrigger 
                value="ai" 
                className="text-base font-medium py-3 flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <MessageSquare className="w-5 h-5" />
                <span>IA Assistente</span>
              </TabsTrigger>
              <TabsTrigger 
                value="recording" 
                className="text-base font-medium py-3 flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <AudioLines className="w-5 h-5" />
                <span>Gravações</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba Videochamada */}
            <TabsContent value="video" className="space-y-6 video-fade-in">
              {/* Status Banner */}
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                      <div>
                        <p className="font-medium">
                          {isConnecting && 'Iniciando chamada...'}
                          {!isConnecting && !isConnected && 'Pronto para chamada'}
                          {isConnected && `Conectado com ${patientName}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {!isConnected && 'Compartilhe o link da chamada com o paciente'}
                          {isConnected && 'Chamada em andamento'}
                        </p>
                      </div>
                    </div>
                    
                    {!isConnected && (
                      <Button onClick={copyCallLink} variant="outline" size="sm">
                        Copiar Link
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Video Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Remote Video */}
                <Card className={`aspect-video ${!isConnected ? 'order-2' : 'order-1'}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {isConnected ? patientName : 'Aguardando paciente...'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 h-full">
                    <div className="relative bg-muted rounded-lg overflow-hidden h-full">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {!isConnected && (
                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                          <div className="text-center">
                            <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg text-muted-foreground">
                              Aguardando {patientName}...
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Local Video */}
                <Card className={`aspect-video ${!isConnected ? 'order-1' : 'order-2'}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Você</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 h-full">
                    <div className="relative bg-muted rounded-lg overflow-hidden h-full">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {!isVideoEnabled && (
                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                          <VideoOff className="w-16 h-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Controls */}
              <div className="flex justify-center space-x-4 py-6">
                <Button
                  onClick={toggleVideo}
                  variant={isVideoEnabled ? "default" : "destructive"}
                  size="lg"
                  disabled={isConnecting}
                  className="control-button-hover px-8 py-3"
                >
                  {isVideoEnabled ? <Video className="w-6 h-6 mr-2" /> : <VideoOff className="w-6 h-6 mr-2" />}
                  {isVideoEnabled ? 'Desabilitar Vídeo' : 'Habilitar Vídeo'}
                </Button>
                
                <Button
                  onClick={toggleAudio}
                  variant={isAudioEnabled ? "default" : "destructive"}
                  size="lg"
                  disabled={isConnecting}
                  className="control-button-hover px-8 py-3"
                >
                  {isAudioEnabled ? <Mic className="w-6 h-6 mr-2" /> : <MicOff className="w-6 h-6 mr-2" />}
                  {isAudioEnabled ? 'Desabilitar Áudio' : 'Habilitar Áudio'}
                </Button>

                <VideoCallSettings
                  onDeviceChange={handleDeviceChange}
                  currentVideoDevice={currentVideoDevice}
                  currentAudioDevice={currentAudioDevice}
                />

                <Button
                  onClick={toggleFullscreen}
                  variant="outline"
                  size="lg"
                  className="control-button-hover px-8 py-3"
                >
                  <Maximize2 className="w-6 h-6 mr-2" />
                  Tela Cheia
                </Button>

                <Button
                  onClick={endCall}
                  variant="destructive"
                  size="lg"
                  className="control-button-hover px-8 py-3"
                >
                  <PhoneOff className="w-6 h-6 mr-2" />
                  Finalizar
                </Button>
              </div>
            </TabsContent>

            {/* Aba IA Assistente */}
            <TabsContent value="ai" className="space-y-6 video-fade-in">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Painel principal da IA */}
                <div className="xl:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <MessageSquare className="w-6 h-6 text-primary" />
                        <span>Assistente Inteligente</span>
                        <Badge variant="secondary">Ativo</Badge>
                      </CardTitle>
                      <p className="text-muted-foreground">
                        Transcrição em tempo real com sugestões inteligentes para a consulta
                      </p>
                    </CardHeader>
                    <CardContent>
                      <RealTimeTranscription
                        patientName={patientName}
                        patientId={callId}
                        onTranscriptionUpdate={(messages) => {
                          const fullTranscription = messages
                            .map(msg => `${msg.speaker}: ${msg.text}`)
                            .join('\n');
                          setTranscription(fullTranscription);
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Video preview lateral */}
                <div className="space-y-4">
                  <Card className="aspect-video">
                    <CardContent className="p-2 h-full">
                      <div className="relative bg-muted rounded-lg overflow-hidden h-full">
                        <video
                          ref={localVideoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Preview da consulta</p>
                    <div className="flex justify-center space-x-2">
                      <Button onClick={toggleAudio} variant={isAudioEnabled ? "default" : "outline"} size="sm">
                        {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </Button>
                      <Button onClick={toggleVideo} variant={isVideoEnabled ? "default" : "outline"} size="sm">
                        {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Aba Gravações */}
            <TabsContent value="recording" className="space-y-6 video-fade-in">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Gravação de Áudio */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AudioLines className="w-6 h-6 text-green-600" />
                      <span>Gravação de Áudio</span>
                    </CardTitle>
                    <p className="text-muted-foreground">
                      Capture o áudio completo da consulta para revisão posterior
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AudioRecording
                      patientName={patientName}
                      sessionId={callStartTime?.getTime().toString()}
                      onRecordingComplete={(audioBlob, duration) => {
                        console.log('Gravação de áudio concluída:', duration, 'segundos');
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Gravação de Vídeo e Relatórios */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="w-6 h-6 text-blue-600" />
                      <span>Vídeo e Relatórios</span>
                    </CardTitle>
                    <p className="text-muted-foreground">
                      Gravação de vídeo e geração automática de relatórios
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <VideoCallRecording
                      stream={localStreamRef.current}
                      patientName={patientName}
                      onTranscriptionGenerated={(text) => setTranscription(text)}
                    />
                    
                    <CallReportGenerator
                      patientName={patientName}
                      callDuration={callDuration}
                      transcription={transcription}
                      onReportGenerated={(report) => console.log('Relatório gerado:', report)}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Preview da consulta */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview da Consulta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                        Você
                      </div>
                    </div>
                    <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                        {patientName}
                      </div>
                      {!isConnected && (
                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                          <p className="text-muted-foreground">Aguardando conexão...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          /* Layout em tela cheia */
          <div className="h-full grid grid-cols-1">
            {/* Remote Video (Principal em tela cheia) */}
            <div className="relative h-full">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!isConnected && (
                <div className="absolute inset-0 bg-black flex items-center justify-center">
                  <div className="text-center text-white">
                    <Video className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-lg">Aguardando {patientName}...</p>
                  </div>
                </div>
              )}

              {/* Local Video (mini) */}
              <div className="absolute bottom-4 right-4 w-64 h-48 bg-muted rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>

              {/* Controls em tela cheia */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex space-x-4">
                <Button
                  onClick={toggleVideo}
                  variant={isVideoEnabled ? "default" : "destructive"}
                  size="lg"
                  className="bg-black/50 hover:bg-black/70"
                >
                  {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
                
                <Button
                  onClick={toggleAudio}
                  variant={isAudioEnabled ? "default" : "destructive"}
                  size="lg"
                  className="bg-black/50 hover:bg-black/70"
                >
                  {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>

                <Button
                  onClick={toggleFullscreen}
                  variant="outline"
                  size="lg"
                  className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                >
                  <Maximize2 className="w-5 h-5" />
                </Button>

                <Button
                  onClick={endCall}
                  variant="destructive"
                  size="lg"
                  className="bg-red-600/80 hover:bg-red-600"
                >
                  <PhoneOff className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};