import React, { useState } from 'react';
import { Settings, Palette, Globe, Mic, Video, Headphones, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useVideoCallSettings } from '@/hooks/useVideoCallSettings';

interface AdvancedVideoCallSettingsProps {
  onDeviceChange?: (deviceId: string, type: 'video' | 'audio') => void;
  currentVideoDevice?: string;
  currentAudioDevice?: string;
}

export const AdvancedVideoCallSettings: React.FC<AdvancedVideoCallSettingsProps> = ({
  onDeviceChange,
  currentVideoDevice,
  currentAudioDevice,
}) => {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting, resetSettings, isLoading } = useVideoCallSettings();

  React.useEffect(() => {
    console.log('AdvancedVideoCallSettings - Configurações atuais:', settings);
    console.log('AdvancedVideoCallSettings - COMPONENTE RENDERIZADO!');
  }, [settings]);

  React.useEffect(() => {
    if (isOpen) {
      getDevices();
    }
  }, [isOpen]);

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
    onDeviceChange?.(deviceId, 'video');
    await updateSetting('videoDeviceId', deviceId);
  };

  const handleAudioDeviceChange = async (deviceId: string) => {
    onDeviceChange?.(deviceId, 'audio');
    await updateSetting('audioDeviceId', deviceId);
  };

  const handleResetSettings = async () => {
    await resetSettings();
    toast.success('Configurações resetadas para padrão');
  };

  const languageOptions = [
    { value: 'pt-BR', label: 'Português (Brasil)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'es-ES', label: 'Español' },
    { value: 'fr-FR', label: 'Français' },
    { value: 'de-DE', label: 'Deutsch' },
    { value: 'it-IT', label: 'Italiano' },
  ];

  const backgroundImages = [
    { value: '', label: 'Nenhuma' },
    { value: 'office', label: 'Escritório' },
    { value: 'library', label: 'Biblioteca' },
    { value: 'nature', label: 'Natureza' },
    { value: 'abstract', label: 'Abstrato' },
  ];

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          🔧 CONFIGURAÇÕES AVANÇADAS 🔧
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações Avançadas de Videochamada</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="devices" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="devices">Dispositivos</TabsTrigger>
            <TabsTrigger value="video">Vídeo</TabsTrigger>
            <TabsTrigger value="audio">Áudio</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>

          {/* Aba Dispositivos */}
          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Video className="w-4 h-4 mr-2" />
                  Câmera
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={settings.videoDeviceId || currentVideoDevice} onValueChange={handleVideoDeviceChange}>
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Mic className="w-4 h-4 mr-2" />
                  Microfone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={settings.audioDeviceId || currentAudioDevice} onValueChange={handleAudioDeviceChange}>
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
          </TabsContent>

          {/* Aba Vídeo */}
          <TabsContent value="video" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Qualidade de Vídeo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Qualidade da Chamada</Label>
                  <Select 
                    value={settings.videoQuality} 
                    onValueChange={(value: 'low' | 'medium' | 'high') => updateSetting('videoQuality', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa (320p)</SelectItem>
                      <SelectItem value="medium">Média (480p)</SelectItem>
                      <SelectItem value="high">Alta (720p)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Qualidade de Compartilhamento de Tela</Label>
                  <Select 
                    value={settings.screenShareQuality} 
                    onValueChange={(value: 'low' | 'medium' | 'high') => updateSetting('screenShareQuality', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Palette className="w-4 h-4 mr-2" />
                  Background
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tipo de Background</Label>
                  <Select 
                    value={settings.backgroundType} 
                    onValueChange={(value: 'none' | 'blur' | 'image') => updateSetting('backgroundType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="blur">Desfoque</SelectItem>
                      <SelectItem value="image">Imagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.backgroundType === 'image' && (
                  <div>
                    <Label>Imagem de Background</Label>
                    <Select 
                      value={settings.backgroundImage} 
                      onValueChange={(value) => updateSetting('backgroundImage', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {backgroundImages.map((bg) => (
                          <SelectItem key={bg.value} value={bg.value}>
                            {bg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="background-blur">Desfoque de Background</Label>
                  <Switch
                    id="background-blur"
                    checked={settings.backgroundBlur}
                    onCheckedChange={(checked) => updateSetting('backgroundBlur', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Áudio */}
          <TabsContent value="audio" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Headphones className="w-4 h-4 mr-2" />
                  Qualidade de Áudio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Qualidade de Gravação</Label>
                  <Select 
                    value={settings.recordingQuality} 
                    onValueChange={(value: 'low' | 'medium' | 'high') => updateSetting('recordingQuality', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="noise-cancellation">Cancelamento de Ruído</Label>
                    <Switch
                      id="noise-cancellation"
                      checked={settings.noiseCancellation}
                      onCheckedChange={(checked) => updateSetting('noiseCancellation', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="echo-cancellation">Cancelamento de Eco</Label>
                    <Switch
                      id="echo-cancellation"
                      checked={settings.echoCancellation}
                      onCheckedChange={(checked) => updateSetting('echoCancellation', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-gain">Controle Automático de Ganho</Label>
                    <Switch
                      id="auto-gain"
                      checked={settings.autoGainControl}
                      onCheckedChange={(checked) => updateSetting('autoGainControl', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Avançado */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  Idioma e Localização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Idioma da Interface (Atual: {settings.language})</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    ⚠️ O Daily.co suporta apenas português genérico (pt), não diferencia pt-BR de pt-PT
                  </p>
                  <Select 
                    value={settings.language} 
                    onValueChange={async (value) => {
                      console.log('=== INÍCIO MUDANÇA DE IDIOMA ===');
                      console.log('ANTES - Configuração atual:', settings.language);
                      console.log('NOVO VALOR selecionado:', value);
                      console.log('updateSetting function:', updateSetting);
                      try {
                        console.log('Chamando updateSetting...');
                        const result = await updateSetting('language', value);
                        console.log('updateSetting retornou:', result);
                        console.log('=== FIM MUDANÇA DE IDIOMA ===');
                      } catch (error) {
                        console.error('ERRO no updateSetting:', error);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Button 
                    onClick={async () => {
                      console.log('Teste: Forçando pt-BR');
                      await updateSetting('language', 'pt-BR');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Forçar PT-BR (Teste)
                  </Button>
                </div>

                <div>
                  <Label>Idioma da Transcrição</Label>
                  <Select 
                    value={settings.transcriptionLanguage} 
                    onValueChange={async (value) => {
                      console.log('Mudando idioma da transcrição para:', value);
                      await updateSetting('transcriptionLanguage', value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Preferências Iniciais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-video">Iniciar com vídeo ligado</Label>
                  <Switch
                    id="auto-video"
                    checked={settings.autoJoinWithVideo}
                    onCheckedChange={(checked) => updateSetting('autoJoinWithVideo', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-audio">Iniciar com áudio ligado</Label>
                  <Switch
                    id="auto-audio"
                    checked={settings.autoJoinWithAudio}
                    onCheckedChange={(checked) => updateSetting('autoJoinWithAudio', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-transcription">Ativar transcrição automaticamente</Label>
                  <Switch
                    id="auto-transcription"
                    checked={settings.transcriptionEnabled}
                    onCheckedChange={(checked) => updateSetting('transcriptionEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Ações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    onClick={getDevices} 
                    variant="outline" 
                    className="flex-1"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Atualizar Dispositivos
                  </Button>
                  
                  <Button 
                    onClick={handleResetSettings}
                    variant="outline" 
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Resetar Tudo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};