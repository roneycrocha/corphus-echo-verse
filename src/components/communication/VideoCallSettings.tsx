import React, { useState, useEffect } from 'react';
import { Settings, Camera, Mic, Monitor, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useVideoCallSettings } from '@/hooks/useVideoCallSettings';
import { AdvancedVideoCallSettings } from './AdvancedVideoCallSettings';

interface VideoCallSettingsProps {
  onDeviceChange: (deviceId: string, type: 'video' | 'audio') => void;
  currentVideoDevice?: string;
  currentAudioDevice?: string;
}

export const VideoCallSettings: React.FC<VideoCallSettingsProps> = ({
  onDeviceChange,
  currentVideoDevice,
  currentAudioDevice,
}) => {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting, resetSettings } = useVideoCallSettings();

  useEffect(() => {
    getDevices();
  }, []);

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);
    } catch (error) {
      console.error('Erro ao obter dispositivos:', error);
      toast.error('Erro ao carregar dispositivos de mídia');
    }
  };

  const handleVideoDeviceChange = async (deviceId: string) => {
    onDeviceChange(deviceId, 'video');
    await updateSetting('videoDeviceId', deviceId);
  };

  const handleAudioDeviceChange = async (deviceId: string) => {
    onDeviceChange(deviceId, 'audio');
    await updateSetting('audioDeviceId', deviceId);
  };

  const handleQualityChange = async (quality: 'low' | 'medium' | 'high') => {
    await updateSetting('videoQuality', quality);
    toast.success(`Qualidade alterada para ${quality === 'low' ? 'baixa' : quality === 'medium' ? 'média' : 'alta'}`);
  };

  const handleAutoJoinChange = async (type: 'video' | 'audio', enabled: boolean) => {
    const key = type === 'video' ? 'autoJoinWithVideo' : 'autoJoinWithAudio';
    await updateSetting(key, enabled);
  };

  const handleResetSettings = async () => {
    await resetSettings();
    toast.success('Configurações resetadas para padrão');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de Videochamada</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Configurações de Vídeo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Camera className="w-4 h-4 mr-2" />
                Câmera
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={currentVideoDevice} onValueChange={handleVideoDeviceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar câmera" />
                </SelectTrigger>
                <SelectContent>
                  {videoDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Câmera ${device.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Configurações de Áudio */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Mic className="w-4 h-4 mr-2" />
                Microfone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={currentAudioDevice} onValueChange={handleAudioDeviceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar microfone" />
                </SelectTrigger>
                <SelectContent>
                  {audioDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microfone ${device.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Configurações de Qualidade */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Monitor className="w-4 h-4 mr-2" />
                Qualidade de Vídeo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={settings.videoQuality} onValueChange={handleQualityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa (320p)</SelectItem>
                  <SelectItem value="medium">Média (480p)</SelectItem>
                  <SelectItem value="high">Alta (720p)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Configurações de Auto-Join */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Preferências Iniciais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-video" className="text-sm">
                  Iniciar com vídeo ligado
                </Label>
                <Switch
                  id="auto-video"
                  checked={settings.autoJoinWithVideo}
                  onCheckedChange={(checked) => handleAutoJoinChange('video', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-audio" className="text-sm">
                  Iniciar com áudio ligado
                </Label>
                <Switch
                  id="auto-audio"
                  checked={settings.autoJoinWithAudio}
                  onCheckedChange={(checked) => handleAutoJoinChange('audio', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button 
              onClick={getDevices} 
              variant="outline" 
              className="flex-1"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Atualizar Dispositivos
            </Button>
            
            <Button 
              onClick={handleResetSettings}
              variant="outline" 
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar
            </Button>
          </div>

          {/* Configurações Avançadas */}
          <div className="pt-4 border-t">
            <AdvancedVideoCallSettings 
              onDeviceChange={onDeviceChange}
              currentVideoDevice={currentVideoDevice}
              currentAudioDevice={currentAudioDevice}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};