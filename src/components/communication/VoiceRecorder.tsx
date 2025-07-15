import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Square, Play, Loader2, Save, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  patientId?: string;
  onTranscriptionComplete: (text: string) => void;
  className?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  patientId,
  onTranscriptionComplete,
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const endTime = Date.now();
        const duration = Math.round((endTime - startTimeRef.current) / 1000);
        setAudioDuration(duration);
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();
      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Gravação iniciada",
        description: "Fale agora para gravar sua mensagem",
      });

    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      toast({
        title: "Gravação finalizada",
        description: "Clique em transcrever para processar o áudio",
      });
    }
  };

  const transcribeAudio = async () => {
    if (!recordedBlob) {
      toast({
        title: "Erro",
        description: "Nenhum áudio gravado para transcrever",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Convert blob to base64
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(recordedBlob);
      });

      console.log('Enviando áudio para transcrição...');

      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) {
        throw error;
      }

      const transcription = data.text;
      console.log('Transcrição recebida:', transcription);

      setTranscriptionText(transcription);
      onTranscriptionComplete(transcription);

      toast({
        title: "Transcrição concluída",
        description: "O áudio foi transcrito com sucesso",
      });

    } catch (error) {
      console.error('Erro na transcrição:', error);
      toast({
        title: "Erro na transcrição",
        description: "Não foi possível transcrever o áudio",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const saveTranscription = async () => {
    if (!patientId) {
      toast({
        title: "Erro",
        description: "ID do paciente não encontrado",
        variant: "destructive"
      });
      return;
    }

    if (!transcriptionText.trim()) {
      toast({
        title: "Erro",
        description: "Não há transcrição para salvar",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      let audioBase64 = null;
      
      if (recordedBlob) {
        audioBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(recordedBlob);
        });
      }

      const { data, error } = await supabase.functions.invoke('save-transcription', {
        body: {
          patientId,
          transcriptionText,
          audioBlob: audioBase64,
          audioDuration,
          sessionType: 'ai_assistance'
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Transcrição salva",
        description: "A transcrição e áudio foram salvos com sucesso",
      });

      // Clear data after saving
      clearRecording();
      setTranscriptionText('');

    } catch (error) {
      console.error('Erro ao salvar transcrição:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a transcrição",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTranscriptionChange = (value: string) => {
    setTranscriptionText(value);
    onTranscriptionComplete(value);
  };

  const clearRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordedBlob(null);
    setAudioDuration(0);
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Gravação e Transcrição</h3>
            {isRecording && (
              <div className="flex items-center space-x-2 text-red-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs">Gravando...</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-2">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                size="sm"
                variant="outline"
                disabled={isProcessing || isSaving}
              >
                <Mic className="w-4 h-4 mr-2" />
                Gravar
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                size="sm"
                variant="destructive"
              >
                <Square className="w-4 h-4 mr-2" />
                Parar
              </Button>
            )}

            {audioUrl && (
              <>
                <div className="flex items-center space-x-2">
                  <audio controls className="max-w-xs">
                    <source src={audioUrl} type="audio/webm" />
                    Seu navegador não suporta áudio.
                  </audio>
                  
                  {audioDuration > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {audioDuration}s
                    </span>
                  )}
                </div>

                <Button
                  onClick={transcribeAudio}
                  size="sm"
                  disabled={isProcessing || isSaving}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Transcrever
                </Button>

                <Button
                  onClick={clearRecording}
                  size="sm"
                  variant="ghost"
                  disabled={isProcessing || isSaving}
                >
                  Limpar
                </Button>
              </>
            )}
          </div>

          {/* Editable Transcription Field */}
          {transcriptionText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Transcrição:</label>
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              </div>
              
              {isEditing ? (
                <Textarea
                  value={transcriptionText}
                  onChange={(e) => handleTranscriptionChange(e.target.value)}
                  className="min-h-[100px] text-sm"
                  placeholder="Edite a transcrição aqui..."
                />
              ) : (
                <div className="p-3 bg-muted rounded-lg min-h-[100px]">
                  <p className="text-sm whitespace-pre-wrap">{transcriptionText}</p>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={saveTranscription}
                  size="sm"
                  disabled={isSaving || !patientId}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>

                <Button
                  onClick={() => {
                    setTranscriptionText('');
                    onTranscriptionComplete('');
                  }}
                  size="sm"
                  variant="outline"
                  disabled={isSaving}
                >
                  Limpar Texto
                </Button>
              </div>
            </div>
          )}

          {(isProcessing || isSaving) && (
            <div className="text-xs text-muted-foreground flex items-center">
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              {isProcessing ? 'Processando transcrição...' : 'Salvando...'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};