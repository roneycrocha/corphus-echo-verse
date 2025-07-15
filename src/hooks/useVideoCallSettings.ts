import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface VideoCallSettings {
  videoEnabled: boolean;
  audioEnabled: boolean;
  videoDeviceId: string;
  audioDeviceId: string;
  videoQuality: 'low' | 'medium' | 'high';
  autoJoinWithVideo: boolean;
  autoJoinWithAudio: boolean;
  language: string;
  backgroundBlur: boolean;
  backgroundType: 'none' | 'blur' | 'image';
  backgroundImage: string;
  noiseCancellation: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  screenShareQuality: 'low' | 'medium' | 'high';
  recordingQuality: 'low' | 'medium' | 'high';
  transcriptionEnabled: boolean;
  transcriptionLanguage: string;
}

const DEFAULT_SETTINGS: VideoCallSettings = {
  videoEnabled: true,
  audioEnabled: true,
  videoDeviceId: '',
  audioDeviceId: '',
  videoQuality: 'medium',
  autoJoinWithVideo: true,
  autoJoinWithAudio: true,
  language: 'pt-BR',
  backgroundBlur: false,
  backgroundType: 'none',
  backgroundImage: '',
  noiseCancellation: true,
  echoCancellation: true,
  autoGainControl: true,
  screenShareQuality: 'high',
  recordingQuality: 'medium',
  transcriptionEnabled: false,
  transcriptionLanguage: 'pt-BR'
};

export const useVideoCallSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<VideoCallSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar configurações do perfil do usuário
  useEffect(() => {
    if (user) {
      loadUserSettings();
    } else {
      // Se não estiver logado, usar localStorage como fallback
      loadLocalSettings();
    }
  }, [user?.id]); // Usar user?.id para evitar re-renders desnecessários

  const loadUserSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('video_call_settings')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        loadLocalSettings();
        return;
      }

      const userSettings = data?.video_call_settings as unknown as VideoCallSettings;
      if (userSettings) {
        console.log('Configurações carregadas do banco:', userSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...userSettings });
      } else {
        console.log('Nenhuma configuração encontrada, usando padrão:', DEFAULT_SETTINGS);
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      loadLocalSettings();
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocalSettings = () => {
    try {
      const saved = localStorage.getItem('videoCall_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações locais:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<VideoCallSettings>) => {
    console.log('updateSettings called with:', newSettings);
    const updatedSettings = { ...settings, ...newSettings };
    console.log('Final updated settings:', updatedSettings);
    setSettings(updatedSettings);

    // Salvar no perfil do usuário se estiver logado
    if (user) {
      try {
        // Garantir que salvamos todas as configurações, incluindo as padrões
        const fullSettings = { ...DEFAULT_SETTINGS, ...updatedSettings };
        console.log('Salvando configurações completas no banco:', fullSettings);
        
        const { data, error } = await supabase
          .from('profiles')
          .update({ video_call_settings: fullSettings })
          .eq('user_id', user.id)
          .select();

        if (error) {
          console.error('Erro ao salvar configurações:', error);
          toast.error('Erro ao salvar configurações');
          // Fallback para localStorage
          localStorage.setItem('videoCall_settings', JSON.stringify(fullSettings));
        } else {
          console.log('Configurações salvas com sucesso no banco:', data);
          toast.success('Configurações salvas com sucesso');
        }
      } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        localStorage.setItem('videoCall_settings', JSON.stringify({ ...DEFAULT_SETTINGS, ...updatedSettings }));
      }
    } else {
      // Salvar no localStorage se não estiver logado
      localStorage.setItem('videoCall_settings', JSON.stringify({ ...DEFAULT_SETTINGS, ...updatedSettings }));
    }

    return updatedSettings;
  };

  const updateSetting = async <K extends keyof VideoCallSettings>(
    key: K, 
    value: VideoCallSettings[K]
  ): Promise<VideoCallSettings> => {
    console.log('Updating setting:', key, 'to value:', value);
    console.log('Current user:', user?.id);
    const result = await updateSettings({ [key]: value });
    console.log('Settings updated, new settings:', result);
    return result;
  };

  const resetSettings = async (): Promise<VideoCallSettings> => {
    const resetSettings = { ...DEFAULT_SETTINGS };
    setSettings(resetSettings);

    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ video_call_settings: resetSettings })
          .eq('user_id', user.id);

        if (error) {
          console.error('Erro ao resetar configurações:', error);
          localStorage.setItem('videoCall_settings', JSON.stringify(resetSettings));
        }
      } catch (error) {
        console.error('Erro ao resetar configurações:', error);
        localStorage.setItem('videoCall_settings', JSON.stringify(resetSettings));
      }
    } else {
      localStorage.removeItem('videoCall_settings');
    }

    return resetSettings;
  };

  return {
    settings,
    updateSettings,
    updateSetting,
    resetSettings,
    isLoading
  };
};

// Função para obter restrições de vídeo baseadas na qualidade
export const getVideoConstraints = (quality: 'low' | 'medium' | 'high', deviceId?: string) => {
  const baseConstraints = deviceId ? { deviceId: { exact: deviceId } } : true;
  
  if (typeof baseConstraints === 'boolean') {
    switch (quality) {
      case 'low':
        return { width: 320, height: 240, frameRate: 15 };
      case 'medium':
        return { width: 640, height: 480, frameRate: 24 };
      case 'high':
        return { width: 1280, height: 720, frameRate: 30 };
      default:
        return true;
    }
  }
  
  const qualityConstraints = (() => {
    switch (quality) {
      case 'low':
        return { width: 320, height: 240, frameRate: 15 };
      case 'medium':
        return { width: 640, height: 480, frameRate: 24 };
      case 'high':
        return { width: 1280, height: 720, frameRate: 30 };
      default:
        return {};
    }
  })();
  
  return { ...baseConstraints, ...qualityConstraints };
};