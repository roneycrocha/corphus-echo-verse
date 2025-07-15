// DEPRECATED: Use useVideoCallSettings hook instead
// Utilitários para gerenciar configurações de videochamada

export interface VideoCallSettings {
  videoEnabled: boolean;
  audioEnabled: boolean;
  videoDeviceId: string;
  audioDeviceId: string;
  videoQuality: 'low' | 'medium' | 'high';
  autoJoinWithVideo: boolean;
  autoJoinWithAudio: boolean;
}

const DEFAULT_SETTINGS: VideoCallSettings = {
  videoEnabled: true,
  audioEnabled: true,
  videoDeviceId: '',
  audioDeviceId: '',
  videoQuality: 'medium',
  autoJoinWithVideo: true,
  autoJoinWithAudio: true
};

const STORAGE_KEY = 'videoCall_settings';

export const getVideoCallSettings = (): VideoCallSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Erro ao carregar configurações de videochamada:', error);
  }
  return { ...DEFAULT_SETTINGS };
};

export const saveVideoCallSettings = (settings: Partial<VideoCallSettings>) => {
  try {
    const current = getVideoCallSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Erro ao salvar configurações de videochamada:', error);
    return getVideoCallSettings();
  }
};

export const updateVideoCallSetting = <K extends keyof VideoCallSettings>(
  key: K, 
  value: VideoCallSettings[K]
): VideoCallSettings => {
  return saveVideoCallSettings({ [key]: value });
};

export const resetVideoCallSettings = (): VideoCallSettings => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.error('Erro ao resetar configurações de videochamada:', error);
    return { ...DEFAULT_SETTINGS };
  }
};

// Configurações de qualidade de vídeo
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