-- Atualizar configurações de videochamada com mais opções
ALTER TABLE public.profiles 
ALTER COLUMN video_call_settings SET DEFAULT '{
  "videoEnabled": true,
  "audioEnabled": true,
  "videoDeviceId": "",
  "audioDeviceId": "", 
  "videoQuality": "medium",
  "autoJoinWithVideo": true,
  "autoJoinWithAudio": true,
  "language": "pt-BR",
  "backgroundBlur": false,
  "backgroundType": "none",
  "backgroundImage": "",
  "noiseCancellation": true,
  "echoCancellation": true,
  "autoGainControl": true,
  "screenShareQuality": "high",
  "recordingQuality": "medium",
  "transcriptionEnabled": false,
  "transcriptionLanguage": "pt-BR"
}'::jsonb;