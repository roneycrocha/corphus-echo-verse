import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const VideoCallPublicPage: React.FC = () => {
  console.log('[DEBUG] VideoCallPublicPage montado! - timestamp:', Date.now());
  console.log('[DEBUG] URL atual:', window.location.href);
  
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  
  console.log('[VideoCallPublicPage] Componente carregado');
  console.log('[VideoCallPublicPage] CallId:', callId);
  console.log('[VideoCallPublicPage] URL atual:', window.location.href);
  
  const [patientName, setPatientName] = useState('');
  const [videoCallId, setVideoCallId] = useState('');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [therapistOnline, setTherapistOnline] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    console.log('[DEBUG] useEffect executado');
    console.log('[DEBUG] callId recebido:', callId);
    console.log('[DEBUG] URL atual:', window.location.href);
    console.log('[DEBUG] pathname:', window.location.pathname);
    
    if (callId) {
      try {
        console.log('[DEBUG] Tentando decodificar callId:', callId);
        
        // Converter URL-safe base64 de volta para base64 normal
        let base64String = callId
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        
        // Adicionar padding se necessário
        while (base64String.length % 4) {
          base64String += '=';
        }
        
        console.log('[DEBUG] Base64 restaurado:', base64String);
        
        // Decodificar os dados da chamada
        const decoded = atob(base64String);
        console.log('[DEBUG] Link decodificado:', decoded);
        
        // Tentar parsear como JSON (novo formato)
        try {
          const callData = JSON.parse(decoded);
          
          // Verificar se tem a estrutura esperada
          if (!callData.callId || !callData.patientName) {
            throw new Error('Dados da chamada incompletos');
          }
          
          // Verificar se o link não está muito antigo (24 horas)
          const linkAge = Date.now() - callData.timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 horas
          
          if (linkAge > maxAge) {
            throw new Error('Link expirado');
          }
          
          setPatientName(callData.patientName);
          setVideoCallId(callData.callId);
          console.log('[DEBUG] Call ID único extraído:', callData.callId);
        } catch (jsonError) {
          // Fallback para formato antigo (compatibilidade)
          console.log('[DEBUG] Tentando formato antigo...');
          
          if (decoded.includes('|')) {
            // Formato antigo com timestamp
            const parts = decoded.split('|');
            if (parts.length !== 2) {
              throw new Error('Formato de link inválido');
            }
            
            const [name, timestamp] = parts;
            
            if (!name.trim()) {
              throw new Error('Nome do paciente não pode estar vazio');
            }
            
            // Verificar se o link não está muito antigo (24 horas)
            const linkAge = Date.now() - parseInt(timestamp);
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas
            
            if (linkAge > maxAge) {
              throw new Error('Link expirado');
            }
            
            setPatientName(name);
            // Para formato antigo, usar o nome como fallback do callId
            setVideoCallId(name.replace(/\s+/g, '-').toLowerCase());
          } else {
            // Formato muito antigo (só nome)  
            setPatientName(decoded);
            setVideoCallId(decoded.replace(/\s+/g, '-').toLowerCase());
          }
        }
        
        console.log('[DEBUG] Nome do paciente definido com sucesso');
      } catch (error) {
        console.error('[DEBUG] Erro ao processar link da chamada:', error);
        console.error('[DEBUG] CallId problemático:', callId);
        toast.error('Link de chamada inválido ou expirado');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } else {
      console.log('[DEBUG] CallId não fornecido');
      toast.error('Link de chamada inválido - ID não fornecido');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  }, [callId, navigate]);

  // Sistema de comunicação real-time
  useEffect(() => {
    console.log('[DEBUG-PACIENTE] useEffect chamado - videoCallId:', videoCallId);
    console.log('[DEBUG-PACIENTE] patientName:', patientName);
    
    if (!videoCallId) {
      console.log('[DEBUG-PACIENTE] ERRO: videoCallId não definido!');
      return;
    }

    const roomId = `video-call-${videoCallId}`;
    
    console.log('[DEBUG-PACIENTE] Video Call ID:', videoCallId);
    console.log('[DEBUG-PACIENTE] RoomID gerado:', roomId);
    console.log('[DEBUG-PACIENTE] Criando canal Supabase...');
    
    // Criar canal para comunicação
    const channel = supabase.channel(roomId);
    channelRef.current = channel;

    // Configurar presença e troca de vídeo
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('[DEBUG] Presença sincronizada:', state);
        
        // Verificar se terapeuta está online
        const therapistPresent = Object.values(state).some((presences: any) => 
          presences.some((presence: any) => presence.user_type === 'therapist')
        );
        
        setTherapistOnline(therapistPresent);
        setIsConnected(therapistPresent);
        
        if (therapistPresent) {
          toast.success('Terapeuta conectado!');
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[DEBUG] Usuário entrou:', newPresences);
        
        const therapistJoined = newPresences.some((presence: any) => 
          presence.user_type === 'therapist'
        );
        
        if (therapistJoined) {
          toast.success('Terapeuta entrou na chamada!');
          setIsConnected(true);
          setTherapistOnline(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[DEBUG] Usuário saiu:', leftPresences);
        
        const therapistLeft = leftPresences.some((presence: any) => 
          presence.user_type === 'therapist'
        );
        
        if (therapistLeft) {
          toast.info('Terapeuta saiu da chamada');
          setIsConnected(false);
          setTherapistOnline(false);
          // Limpar vídeo remoto quando terapeuta sai
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        }
      })
      .on('broadcast', { event: 'video_stream' }, ({ payload }) => {
        console.log('[DEBUG-PACIENTE] Broadcast recebido:', payload);
        console.log('[DEBUG-PACIENTE] Tipo do usuário:', payload?.user_type);
        console.log('[DEBUG-PACIENTE] Tem video_data:', !!payload?.video_data);
        
        if (payload.user_type === 'therapist' && payload.video_data) {
          console.log('[DEBUG-PACIENTE] Processando vídeo do terapeuta...');
          // Receber e mostrar vídeo do terapeuta
          displayRemoteVideo(payload.video_data);
        } else {
          console.log('[DEBUG-PACIENTE] Broadcast ignorado - não é do terapeuta ou sem dados');
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Anunciar presença do paciente
          const presenceStatus = await channel.track({
            user_type: 'patient',
            patient_name: patientName,
            online_at: new Date().toISOString(),
          });
          
          console.log('[DEBUG] Paciente anunciado:', presenceStatus);
          
          // NÃO chamar startVideoSharing aqui - será chamado após obter o stream
        }
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [videoCallId]);

  const joinCall = async () => {
    try {
      console.log('[DEBUG] Iniciando joinCall...');
      setIsConnecting(true);
      
      // Verificar se o navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta acesso à câmera/microfone');
      }
      
      console.log('[DEBUG] Tentativa 1: Configurações básicas...');
      
      // Tentar com configurações muito básicas primeiro
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        console.log('[DEBUG] Sucesso com configurações básicas');
      } catch (basicError) {
        console.log('[DEBUG] Falhou configurações básicas, tentando sem áudio...');
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
          console.log('[DEBUG] Sucesso apenas com vídeo');
        } catch (videoOnlyError) {
          console.log('[DEBUG] Falhou sem áudio, tentando configurações específicas...');
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'user',
              width: { min: 320, ideal: 640 },
              height: { min: 240, ideal: 480 }
            },
            audio: true
          });
          console.log('[DEBUG] Sucesso com configurações específicas');
        }
      }
      console.log('[DEBUG] Stream obtido:', stream);
      console.log('[DEBUG] Video tracks:', stream.getVideoTracks());
      console.log('[DEBUG] Audio tracks:', stream.getAudioTracks());
      
      localStreamRef.current = stream;
      
      // Primeiro vamos entrar no estado "joined" para renderizar o elemento de vídeo
      setIsConnecting(false);
      setIsJoined(true);
      
      // Aguardar um pouco para o elemento ser renderizado
      setTimeout(() => {
        console.log('[DEBUG] Verificando elemento de vídeo após render...');
        console.log('[DEBUG] localVideoRef.current:', localVideoRef.current);
        
        if (localVideoRef.current) {
          console.log('[DEBUG] Conectando stream ao elemento de vídeo');
          localVideoRef.current.srcObject = stream;
          
          // Forçar o play do vídeo
          localVideoRef.current.onloadedmetadata = () => {
            console.log('[DEBUG] Metadata carregada, tentando play...');
            localVideoRef.current?.play().then(() => {
              console.log('[DEBUG] Vídeo local iniciado com sucesso');
            }).catch(playError => {
              console.warn('[DEBUG] Erro ao iniciar vídeo automaticamente:', playError);
            });
          };
          
          // Tentar play imediato também
          localVideoRef.current.play().catch(err => {
            console.log('[DEBUG] Play imediato falhou (normal):', err.message);
          });
          
        } else {
          console.error('[DEBUG] Elemento de vídeo local AINDA não encontrado após timeout!');
        }
      }, 100); // 100ms para garantir que o DOM foi atualizado

      // ✅ AGORA chamar startVideoSharing após obter o stream com sucesso
      console.log('📱 PACIENTE: Stream obtido com sucesso - iniciando envio de vídeo...');
      setTimeout(() => {
        startVideoSharing();
      }, 500); // Pequeno delay para garantir que tudo esteja pronto

      toast.success('Conectado à chamada!');
      
    } catch (error: any) {
      console.error('[DEBUG] Erro detalhado ao entrar na chamada:', error);
      console.error('[DEBUG] Error name:', error.name);
      console.error('[DEBUG] Error message:', error.message);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Permissão negada para câmera/microfone. Clique no ícone da câmera na barra de endereços para permitir.');
      } else if (error.name === 'NotFoundError') {
        toast.error('Câmera ou microfone não encontrados. Verifique se estão conectados.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Câmera ou microfone já estão sendo usados por outro aplicativo.');
      } else if (error.name === 'OverconstrainedError') {
        toast.error('Configurações de vídeo não suportadas. Tentando configuração básica...');
        
        // Tentar novamente com configurações mais simples
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          
          localStreamRef.current = simpleStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = simpleStream;
          }
          
          setIsConnecting(false);
          setIsJoined(true);
          toast.success('Conectado à chamada com configuração básica!');
          return;
        } catch (retryError) {
          console.error('[DEBUG] Erro na segunda tentativa:', retryError);
        }
      } else {
        toast.error('Erro ao acessar câmera/microfone: ' + error.message);
      }
      
      setIsConnecting(false);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const leaveCall = () => {
    // Parar stream local
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Limpar vídeos
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsConnected(false);
    setIsJoined(false);
    toast.info('Você saiu da chamada');
    navigate('/');
  };

  const simulateRemoteVideo = async () => {
    try {
      // Simular stream do terapeuta usando câmera local espelhada
      if (localStreamRef.current && remoteVideoRef.current) {
        console.log('[DEBUG] Simulando vídeo remoto do terapeuta...');
        
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
              context.fillStyle = 'rgba(200, 100, 0, 0.7)';
              context.fillRect(10, 10, 150, 30);
              context.fillStyle = 'white';
              context.font = '14px Arial';
              context.fillText('MÉDICO', 15, 30);
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
        
        console.log('[DEBUG] Vídeo remoto do terapeuta simulado com sucesso');
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
              // Desenhar a imagem real recebida do terapeuta
              context.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              // Adicionar uma pequena marca d'água
              context.fillStyle = 'rgba(200, 100, 0, 0.8)';
              context.fillRect(10, 10, 120, 25);
              context.fillStyle = 'white';
              context.font = 'bold 12px Arial';
              context.fillText('MÉDICO', 15, 27);
              
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
      console.log('[DEBUG] Iniciando compartilhamento de vídeo do paciente...');
      
      if (!localStreamRef.current) {
        console.log('❌ ERRO: localStreamRef.current é null');
        return;
      }
      
      if (!channelRef.current) {
        console.log('❌ ERRO: channelRef.current é null');
        return;
      }
      
      console.log('✅ Refs válidas - continuando...');
      
      if (localStreamRef.current && channelRef.current) {
        // Capturar frame do vídeo local e enviar via broadcast
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const video = document.createElement('video');
        
        console.log('✅ Elementos criados:', { canvas, context, video });
        
        let lastFrameSent = 0;
        let isActive = true;
        
        // Configuração otimizada para melhor performance
        canvas.width = 240; // Reduzido para melhor performance
        canvas.height = 180;
        
        video.srcObject = localStreamRef.current;
        console.log('✅ Stream conectado ao vídeo');
        
        video.play().then(() => {
          console.log('✅ Vídeo reproduzindo');
        }).catch(err => {
          console.log('❌ Erro no play:', err);
        });
        
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
                  
                  console.log('📱 PACIENTE: Enviando frame de vídeo...');
                  
                  channelRef.current.send({
                    type: 'broadcast',
                    event: 'video_stream',
                    payload: {
                      user_type: 'patient',
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

  if (!callId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Link Inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              O link da videochamada é inválido ou expirado.
            </p>
            <Button onClick={() => navigate('/')}>
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Videochamada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">
                Consulta com Dr./Dra.
              </p>
              <p className="text-muted-foreground mb-6">
                Você foi convidado para uma videochamada médica.
              </p>
            </div>
            
            <Button 
              onClick={joinCall} 
              className="w-full" 
              size="lg"
              disabled={isConnecting}
            >
              {isConnecting ? 'Conectando...' : 'Entrar na Chamada'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Videochamada Médica</h1>
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${therapistOnline ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <p className="text-sm sm:text-base text-muted-foreground">
              {therapistOnline ? 'Conectado com o médico' : 'Aguardando médico...'}
            </p>
          </div>
        </div>

        {/* Vídeos */}
        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-2 sm:gap-4 mb-4 sm:mb-6">
          {/* Vídeo local */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Você</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="relative bg-muted rounded-lg overflow-hidden h-48 sm:h-60 md:h-full">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vídeo remoto */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Médico</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="relative bg-muted rounded-lg overflow-hidden h-48 sm:h-60 md:h-full">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isConnected && (
                  <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Aguardando médico...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 py-4 sm:py-6 px-2">
          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            disabled={isConnecting}
            className="flex-1 min-w-[140px] max-w-[200px]"
          >
            {isVideoEnabled ? <Video className="w-5 h-5 mr-1 sm:mr-2" /> : <VideoOff className="w-5 h-5 mr-1 sm:mr-2" />}
            <span className="text-sm sm:text-base">Vídeo</span>
          </Button>
          
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            disabled={isConnecting}
            className="flex-1 min-w-[140px] max-w-[200px]"
          >
            {isAudioEnabled ? <Mic className="w-5 h-5 mr-1 sm:mr-2" /> : <MicOff className="w-5 h-5 mr-1 sm:mr-2" />}
            <span className="text-sm sm:text-base">Áudio</span>
          </Button>
          
          <Button
            onClick={leaveCall}
            variant="destructive"
            size="lg"
            className="flex-1 min-w-[140px] max-w-[200px]"
          >
            <PhoneOff className="w-5 h-5 mr-1 sm:mr-2" />
            <span className="text-sm sm:text-base">Sair</span>
          </Button>
        </div>
      </div>
    </div>
  );
};