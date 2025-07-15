-- Adicionar configurações de videochamada ao perfil do usuário
ALTER TABLE public.profiles 
ADD COLUMN video_call_settings JSONB DEFAULT '{
  "videoEnabled": true,
  "audioEnabled": true,
  "videoDeviceId": "",
  "audioDeviceId": "", 
  "videoQuality": "medium",
  "autoJoinWithVideo": true,
  "autoJoinWithAudio": true
}'::jsonb;