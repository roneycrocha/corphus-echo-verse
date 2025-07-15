import React, { useState, useRef } from 'react';
import { Circle, Square, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface VideoCallRecordingProps {
  stream: MediaStream | null;
  patientName: string;
  onTranscriptionGenerated: (transcription: string) => void;
}

export const VideoCallRecording: React.FC<VideoCallRecordingProps> = ({
  stream,
  patientName,
  onTranscriptionGenerated,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isProcessingTranscription, setIsProcessingTranscription] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (!stream) {
      toast.error('Stream de vídeo não disponível');
      return;
    }

    try {
      recordedChunksRef.current = [];
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        });
        setRecordedBlob(blob);
        toast.success('Gravação finalizada');
      };

      mediaRecorderRef.current.start(1000); // Capture em chunks de 1 segundo
      setIsRecording(true);
      toast.success('Gravação iniciada');
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast.error('Erro ao iniciar gravação');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadRecording = () => {
    if (!recordedBlob) {
      toast.error('Nenhuma gravação disponível');
      return;
    }

    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chamada-${patientName}-${new Date().toISOString().slice(0, 19)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Download iniciado');
  };

  const generateTranscription = async () => {
    if (!recordedBlob) {
      toast.error('Nenhuma gravação disponível para transcrição');
      return;
    }

    setIsProcessingTranscription(true);
    
    try {
      // Converter para base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Chamar edge function para transcrição
        const response = await fetch('https://jqystivdecrjuulxyxet.supabase.co/functions/v1/voice-to-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeXN0aXZkZWNyanV1bHh5eGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNzk0NDQsImV4cCI6MjA2NzY1NTQ0NH0.k5yyzWEhK17narXB6VSA6rTBMOP929lQcWqr21Z8C2g`,
          },
          body: JSON.stringify({
            audio: base64Audio
          }),
        });

        if (!response.ok) {
          throw new Error('Erro na transcrição');
        }

        const { text } = await response.json();
        onTranscriptionGenerated(text);
        toast.success('Transcrição gerada com sucesso');
      };
      
      reader.onerror = () => {
        throw new Error('Erro ao processar arquivo de áudio');
      };
      
      reader.readAsDataURL(recordedBlob);
      
    } catch (error) {
      console.error('Erro na transcrição:', error);
      toast.error('Erro ao gerar transcrição');
    } finally {
      setIsProcessingTranscription(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Gravação da Chamada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-2">
          {!isRecording ? (
            <Button 
              onClick={startRecording} 
              variant="default" 
              size="sm"
              disabled={!stream}
            >
              <Circle className="w-4 h-4 mr-2 text-red-500" />
              Iniciar Gravação
            </Button>
          ) : (
            <Button 
              onClick={stopRecording} 
              variant="destructive" 
              size="sm"
            >
              <Square className="w-4 h-4 mr-2" />
              Parar Gravação
            </Button>
          )}
          
          {isRecording && (
            <div className="flex items-center text-red-500 text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
              Gravando...
            </div>
          )}
        </div>

        {recordedBlob && (
          <div className="flex space-x-2">
            <Button 
              onClick={downloadRecording} 
              variant="outline" 
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            
            <Button 
              onClick={generateTranscription} 
              variant="outline" 
              size="sm"
              disabled={isProcessingTranscription}
            >
              <FileText className="w-4 h-4 mr-2" />
              {isProcessingTranscription ? 'Processando...' : 'Transcrever'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};