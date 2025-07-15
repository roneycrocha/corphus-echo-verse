import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleTranscription } from '@/components/communication/SimpleTranscription';
import { toast } from 'sonner';

export const VideoCallTestPage: React.FC = () => {
  console.log('[TEST] VideoCallTestPage carregada - timestamp:', Date.now());
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamInfo, setStreamInfo] = useState('');
  const [showSettings, setShowSettings] = useState(true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Carregar dispositivos disponíveis
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Primeira tentativa para obter permissões básicas
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('[TEST] Dispositivos encontrados:', devices);
        
        const videoDevs = devices.filter(device => device.kind === 'videoinput');
        const audioDevs = devices.filter(device => device.kind === 'audioinput');
        
        setVideoDevices(videoDevs);
        setAudioDevices(audioDevs);
        
        // Selecionar primeiro dispositivo por padrão
        if (videoDevs.length > 0) setSelectedVideoDevice(videoDevs[0].deviceId);
        if (audioDevs.length > 0) setSelectedAudioDevice(audioDevs[0].deviceId);
        
        console.log('[TEST] Câmeras disponíveis:', videoDevs.length);
        console.log('[TEST] Microfones disponíveis:', audioDevs.length);
        
      } catch (error) {
        console.log('[TEST] Erro ao carregar dispositivos:', error);
        setStreamInfo('Clique para permitir acesso e carregar dispositivos');
      }
    };
    
    loadDevices();
  }, []);

  const joinCallBasic = async () => {
    console.log('[TEST] joinCallBasic iniciado');
    setIsConnecting(true);
    setStreamInfo('Solicitando permissões...');
    
    try {
      // Verificar se getUserMedia está disponível
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia não disponível');
      }

      console.log('[TEST] Tentativa 1: Configurações básicas...');
      
      // Tentar com configurações muito básicas primeiro
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        console.log('[TEST] Sucesso com configurações básicas');
      } catch (basicError) {
        console.log('[TEST] Falhou configurações básicas, tentando sem áudio...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        console.log('[TEST] Sucesso apenas com vídeo');
      }

      console.log('[TEST] Stream obtido:', stream);
      console.log('[TEST] Video tracks:', stream.getVideoTracks().length);
      console.log('[TEST] Audio tracks:', stream.getAudioTracks().length);

      localStreamRef.current = stream;
      setStreamInfo(`Video tracks: ${stream.getVideoTracks().length}, Audio tracks: ${stream.getAudioTracks().length}`);

      // Primeiro vamos entrar no estado "joined" para renderizar o elemento de vídeo
      setIsJoined(true);
      setIsConnecting(false);
      
      // Aguardar um pouco para o elemento ser renderizado
      setTimeout(() => {
        console.log('[TEST] Verificando elemento de vídeo...');
        console.log('[TEST] localVideoRef.current:', localVideoRef.current);
        
        if (localVideoRef.current) {
          console.log('[TEST] Conectando stream ao elemento de vídeo');
          localVideoRef.current.srcObject = stream;
          
          // Aguardar o vídeo carregar e tentar dar play
          localVideoRef.current.onloadedmetadata = () => {
            console.log('[TEST] Metadata carregada');
            localVideoRef.current?.play().then(() => {
              console.log('[TEST] Vídeo iniciado com sucesso');
              setStreamInfo('Vídeo funcionando!');
            }).catch(err => {
              console.error('[TEST] Erro ao iniciar vídeo:', err);
              setStreamInfo('Erro ao iniciar vídeo: ' + err.message);
            });
          };
          
          // Tentar dar play imediatamente também
          localVideoRef.current.play().catch(err => {
            console.log('[TEST] Play imediato falhou (normal):', err.message);
          });
          
        } else {
          console.error('[TEST] Elemento de vídeo AINDA não encontrado após timeout');
          setStreamInfo('Elemento de vídeo não renderizado');
        }
      }, 100); // 100ms para garantir que o DOM foi atualizado

      toast.success('Stream conectado!');

    } catch (error: any) {
      console.error('[TEST] Erro:', error);
      setStreamInfo('Erro: ' + error.message);
      setIsConnecting(false);
      
      let errorMessage = 'Erro desconhecido';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permissão negada - clique no ícone da câmera na barra de endereços';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Câmera/microfone não encontrados';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Câmera/microfone em uso por outro app';
      } else {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const joinCallAdvanced = async (tryAllCameras = false) => {
    console.log('[TEST] joinCallAdvanced iniciado - tryAll:', tryAllCameras);
    setIsConnecting(true);
    setStreamInfo('Tentando configurações avançadas...');
    
    try {
      let stream;
      
      if (tryAllCameras) {
        // Tentar com cada câmera disponível
        setStreamInfo('Testando todas as câmeras...');
        let lastError;
        
        for (let i = 0; i < videoDevices.length; i++) {
          try {
            console.log(`[TEST] Tentando câmera ${i + 1}/${videoDevices.length}:`, videoDevices[i].label);
            setStreamInfo(`Tentando câmera ${i + 1}/${videoDevices.length}: ${videoDevices[i].label || 'Sem nome'}`);
            
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: videoDevices[i].deviceId } },
              audio: true
            });
            
            console.log(`[TEST] Sucesso com câmera ${i + 1}`);
            break;
          } catch (error) {
            console.log(`[TEST] Falhou câmera ${i + 1}:`, error);
            lastError = error;
          }
        }
        
        if (!stream) {
          throw lastError || new Error('Nenhuma câmera funcionou');
        }
      } else {
        // Forçar câmera padrão com configurações específicas
        setStreamInfo('Forçando câmera padrão...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { min: 320, ideal: 640, max: 1920 },
            height: { min: 240, ideal: 480, max: 1080 }
          },
          audio: true
        });
      }

      console.log('[TEST] Stream avançado obtido:', stream);
      localStreamRef.current = stream;
      
      setIsJoined(true);
      setIsConnecting(false);
      
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(console.log);
          setStreamInfo('Vídeo funcionando com configurações avançadas!');
        }
      }, 100);

      toast.success('Conectado com configurações avançadas!');

    } catch (error: any) {
      console.error('[TEST] Erro avançado:', error);
      setStreamInfo('Erro avançado: ' + error.message);
      setIsConnecting(false);
      toast.error('Falha nas configurações avançadas: ' + error.message);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('[TEST] Vídeo toggled:', videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('[TEST] Áudio toggled:', audioTrack.enabled);
      }
    }
  };

  const leaveCall = () => {
    console.log('[TEST] Saindo da chamada');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[TEST] Track parado:', track.kind);
      });
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setIsJoined(false);
    setStreamInfo('Desconectado');
    toast.info('Chamada encerrada');
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Teste de Videochamada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">
                Teste de Câmera/Microfone
              </p>
              <p className="text-muted-foreground mb-4">
                Esta página testa se a câmera e microfone funcionam
              </p>
              {streamInfo && (
                <div className="bg-muted p-3 rounded text-sm">
                  Status: {streamInfo}
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={joinCallBasic} 
                className="w-full" 
                size="lg"
                disabled={isConnecting}
              >
                {isConnecting ? 'Conectando...' : 'Testar Câmera/Microfone'}
              </Button>
              
              <details className="bg-muted/50 p-3 rounded">
                <summary className="cursor-pointer text-sm font-medium">
                  ⚙️ Opções Avançadas
                </summary>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Se o teste básico falhar, tente estas opções:
                  </p>
                  <Button 
                    onClick={() => joinCallAdvanced()} 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    disabled={isConnecting}
                  >
                    Forçar Câmera Padrão
                  </Button>
                  <Button 
                    onClick={() => joinCallAdvanced(true)} 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    disabled={isConnecting}
                  >
                    Tentar Todas as Câmeras
                  </Button>
                </div>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Teste de Videochamada</h1>
          <p className="text-muted-foreground">
            Status: {streamInfo}
          </p>
        </div>

        {/* Vídeo local */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sua Câmera</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-muted rounded-lg overflow-hidden h-64 sm:h-80">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <VideoOff className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Controles */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
          >
            {isVideoEnabled ? <Video className="w-5 h-5 mr-2" /> : <VideoOff className="w-5 h-5 mr-2" />}
            Vídeo
          </Button>
          
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
          >
            {isAudioEnabled ? <Mic className="w-5 h-5 mr-2" /> : <MicOff className="w-5 h-5 mr-2" />}
            Áudio
          </Button>
          
          <Button
            onClick={leaveCall}
            variant="destructive"
            size="lg"
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            Sair
          </Button>
        </div>

        {/* Transcrição */}
        <div className="mt-8">
          <SimpleTranscription />
        </div>
      </div>
    </div>
  );
};