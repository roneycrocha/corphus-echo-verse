import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Maximize, Minimize, Maximize2, Minimize2, MessageSquare, AudioLines } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { VideoCallSettings } from './VideoCallSettings';
import { VideoCallRecording } from './VideoCallRecording';
import { CallReportGenerator } from './CallReportGenerator';
import { RealTimeTranscription } from './RealTimeTranscription';
import { AudioRecording } from './AudioRecording';
import { useVideoCallSettings, getVideoConstraints } from '@/hooks/useVideoCallSettings';

interface VideoCallProps {
  patientName: string;
  onCallEnd: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({ 
  patientName, 
  onCallEnd, 
  isOpen, 
  onOpenChange 
}) => {
  // Hook para configurações de videochamada
  const { settings, updateSetting } = useVideoCallSettings();
  
  // Estados baseados nas configurações salvas
  const [isVideoEnabled, setIsVideoEnabled] = useState(settings.autoJoinWithVideo);
  const [isAudioEnabled, setIsAudioEnabled] = useState(settings.autoJoinWithAudio);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentVideoDevice, setCurrentVideoDevice] = useState(settings.videoDeviceId);
  const [currentAudioDevice, setCurrentAudioDevice] = useState(settings.audioDeviceId);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [transcription, setTranscription] = useState<string>('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const fullscreenVideoRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      initializeCall();
      setCallStartTime(new Date());
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

  // Detectar mudanças no estado de tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const initializeCall = async (videoDeviceId?: string, audioDeviceId?: string) => {
    try {
      setIsConnecting(true);
      
      // Verificar se o navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta acesso à câmera/microfone');
      }
      
      // Usar dispositivos salvos se não fornecidos explicitamente
      const videoDevice = videoDeviceId || currentVideoDevice;
      const audioDevice = audioDeviceId || currentAudioDevice;
      
      // Configurações de mídia
      const constraints: MediaStreamConstraints = {
        video: videoDevice ? { deviceId: { exact: videoDevice } } : true,
        audio: audioDevice ? { deviceId: { exact: audioDevice } } : true
      };
      
      // Obter stream local
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Por enquanto, simulamos uma conexão bem-sucedida
      // O WebRTC completo será implementado quando necessário
      setIsConnecting(false);
      toast.success('Chamada iniciada - Aguardando paciente');
      
    } catch (error: any) {
      console.error('Erro ao inicializar chamada:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Permissão negada para câmera/microfone. Verifique as configurações do navegador.');
      } else if (error.name === 'NotFoundError') {
        toast.error('Câmera ou microfone não encontrados.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Câmera ou microfone já estão sendo usados por outro aplicativo.');
      } else {
        toast.error('Erro ao acessar câmera/microfone: ' + error.message);
      }
      
      setIsConnecting(false);
      // NÃO fechamos o modal automaticamente para o usuário poder tentar novamente
    }
  };

  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoState = videoTrack.enabled;
        setIsVideoEnabled(newVideoState);
        // Salvar configuração
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
        // Salvar configuração
        await updateSetting('audioEnabled', newAudioState);
      }
    }
  };

  const cleanup = () => {
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
    setIsConnecting(false);
  };

  const endCall = () => {
    cleanup();
    onCallEnd();
    onOpenChange(false);
    toast.info('Chamada finalizada');
  };

  const copyCallLink = () => {
    try {
      // Garantir que o nome do paciente seja válido e limpo
      const cleanPatientName = patientName.trim();
      if (!cleanPatientName) {
        toast.error('Nome do paciente inválido');
        return;
      }
      
      // Codificar o nome do paciente em base64
      const encodedName = btoa(cleanPatientName);
      
      // Gerar o link da videochamada
      const callLink = `${window.location.origin}/video-call/${encodedName}`;
      
      // Copiar para a área de transferência
      navigator.clipboard.writeText(callLink);
      toast.success('Link da chamada copiado!');
      
      console.log('Link gerado:', callLink);
    } catch (error) {
      console.error('Erro ao gerar link da videochamada:', error);
      toast.error('Erro ao gerar link da videochamada');
    }
  };

  const handleDeviceChange = async (deviceId: string, type: 'video' | 'audio') => {
    if (type === 'video') {
      setCurrentVideoDevice(deviceId);
      // Salvar configuração do dispositivo de vídeo
      await updateSetting('videoDeviceId', deviceId);
    } else {
      setCurrentAudioDevice(deviceId);
      // Salvar configuração do dispositivo de áudio
      await updateSetting('audioDeviceId', deviceId);
    }
    
    // Reinicializar stream com novo dispositivo
    cleanup();
    await initializeCall(
      type === 'video' ? deviceId : currentVideoDevice, 
      type === 'audio' ? deviceId : currentAudioDevice
    );
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // Entrar em tela cheia
        if (fullscreenVideoRef.current) {
          await fullscreenVideoRef.current.requestFullscreen();
        }
      } else {
        // Sair da tela cheia
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Erro ao alternar tela cheia:', error);
      toast.error('Não foi possível alterar o modo tela cheia');
    }
  };

  const getCallDuration = () => {
    if (!callStartTime) return 0;
    return Math.floor((Date.now() - callStartTime.getTime()) / 1000);
  };

  const handleTranscriptionGenerated = (text: string) => {
    setTranscription(text);
  };

  const handleReportGenerated = (report: string) => {
    console.log('Relatório gerado:', report);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className={`${isExpanded ? 'max-w-6xl' : 'max-w-4xl'} max-h-[90vh] overflow-hidden`}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Chamada de Vídeo - {patientName}</DialogTitle>
                <DialogDescription>
                  Interface de videochamada para consulta com o paciente {patientName}
                </DialogDescription>
              </div>
              <div className="flex items-center space-x-2">
                <VideoCallSettings
                  onDeviceChange={handleDeviceChange}
                  currentVideoDevice={currentVideoDevice}
                  currentAudioDevice={currentAudioDevice}
                />
                <Button
                  onClick={toggleFullscreen}
                  variant="outline"
                  size="sm"
                  title="Tela cheia"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={toggleExpanded}
                  variant="outline"
                  size="sm"
                  title="Expandir interface"
                >
                  {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status da conexão */}
            <div className="text-center">
              {isConnecting && (
                <p className="text-sm text-muted-foreground">Conectando à câmera/microfone...</p>
              )}
              {!isConnecting && !isConnected && localStreamRef.current && (
                <div className="space-y-2">
                  <p className="text-sm text-success">✅ Pronto para chamada</p>
                  <p className="text-xs text-muted-foreground">Aguardando paciente entrar na chamada...</p>
                  <Button onClick={copyCallLink} variant="outline" size="sm">
                    Copiar Link da Chamada
                  </Button>
                </div>
              )}
              {isConnected && (
                <p className="text-sm text-success">Conectado com {patientName}</p>
              )}
            </div>

            <div className={`grid ${isExpanded ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'} gap-4`}>
              {/* Área de vídeo */}
              <div className={`${isExpanded ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-4`}>
                {/* Vídeos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px] sm:h-[400px]">
                  {/* Vídeo local */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Você</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
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
                            <VideoOff className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Vídeo remoto */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{patientName}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
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
                              <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Aguardando paciente...
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Controles */}
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={toggleVideo}
                    variant={isVideoEnabled ? "default" : "destructive"}
                    size="lg"
                    disabled={isConnecting}
                  >
                    {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </Button>
                  
                  <Button
                    onClick={toggleAudio}
                    variant={isAudioEnabled ? "default" : "destructive"}
                    size="lg"
                    disabled={isConnecting}
                  >
                    {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </Button>
                  
                  <Button
                    onClick={endCall}
                    variant="destructive"
                    size="lg"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Painel lateral - Abas com funcionalidades */}
              <div className={`${isExpanded ? 'lg:col-span-1' : 'lg:col-span-1'} space-y-4 max-h-[600px] overflow-y-auto`}>
                <Tabs defaultValue="recording" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="recording" className="text-xs">Gravação</TabsTrigger>
                    <TabsTrigger value="transcription" className="text-xs">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      IA
                    </TabsTrigger>
                    <TabsTrigger value="audio" className="text-xs">
                      <AudioLines className="w-3 h-3 mr-1" />
                      Áudio
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="recording" className="space-y-4">
                    <VideoCallRecording
                      stream={localStreamRef.current}
                      patientName={patientName}
                      onTranscriptionGenerated={handleTranscriptionGenerated}
                    />
                    
                    <CallReportGenerator
                      patientName={patientName}
                      callDuration={getCallDuration()}
                      transcription={transcription}
                      onReportGenerated={handleReportGenerated}
                    />
                  </TabsContent>

                  <TabsContent value="transcription" className="space-y-4">
                    <RealTimeTranscription
                      patientName={patientName}
                      onTranscriptionUpdate={(messages) => {
                        const fullTranscription = messages
                          .map(msg => `${msg.speaker}: ${msg.text}`)
                          .join('\n');
                        setTranscription(fullTranscription);
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="audio" className="space-y-4">
                    <AudioRecording
                      patientName={patientName}
                      sessionId={callStartTime?.getTime().toString()}
                      onRecordingComplete={(audioBlob, duration) => {
                        console.log('Gravação de áudio concluída:', duration, 'segundos');
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modo Tela Cheia */}
      <div 
        ref={fullscreenVideoRef}
        className={`${isFullscreen ? 'fixed inset-0 bg-black z-[9999] flex flex-col' : 'hidden'}`}
      >
        {/* Header da tela cheia */}
        <div className="bg-black/80 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Chamada de Vídeo - {patientName}</h2>
            <p className="text-sm text-white/70">Modo Tela Cheia</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Área de vídeo em tela cheia */}
        <div className="flex-1 flex">
          {/* Vídeo principal (remoto ou local) */}
          <div className="flex-1 relative">
            <video
              ref={isConnected ? remoteVideoRef : localVideoRef}
              autoPlay
              playsInline
              muted={!isConnected} // Só mute o vídeo local
              className="w-full h-full object-cover"
            />
            {!isConnected && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <Video className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg">Aguardando paciente...</p>
                </div>
              </div>
            )}
          </div>

          {/* Vídeo em miniatura (picture-in-picture) */}
          <div className="absolute top-20 right-4 w-64 h-48 bg-black rounded-lg overflow-hidden border border-white/20">
            <video
              ref={isConnected ? localVideoRef : remoteVideoRef}
              autoPlay
              muted={isConnected} // Mute o vídeo local quando conectado
              playsInline
              className="w-full h-full object-cover"
            />
            {!isVideoEnabled && isConnected && (
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Controles da tela cheia */}
        <div className="bg-black/80 p-4 flex justify-center space-x-4">
          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            disabled={isConnecting}
            className="rounded-full"
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>
          
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            disabled={isConnecting}
            className="rounded-full"
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
          
          <Button
            onClick={endCall}
            variant="destructive"
            size="lg"
            className="rounded-full"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </>
  );
};