-- Atualizar configurações de videochamada existentes para incluir configurações de idioma
UPDATE profiles 
SET video_call_settings = jsonb_set(
  jsonb_set(
    COALESCE(video_call_settings, '{}'::jsonb),
    '{language}', 
    '"pt-BR"'
  ),
  '{transcriptionLanguage}', 
  '"pt-BR"'
)
WHERE video_call_settings IS NOT NULL 
AND (
  video_call_settings->>'language' IS NULL 
  OR video_call_settings->>'transcriptionLanguage' IS NULL
);