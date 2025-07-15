import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, User, Bot, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TranscriptionMessage {
  id: string;
  text: string;
  speaker: 'therapist' | 'patient';
  timestamp: string;
}

interface SimpleRealTimeTranscriptionProps {
  patientName?: string;
  patientId?: string;
  onTranscriptionUpdate?: (messages: TranscriptionMessage[]) => void;
}

export const SimpleRealTimeTranscription: React.FC<SimpleRealTimeTranscriptionProps> = ({
  patientName,
  patientId,
  onTranscriptionUpdate
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'therapist' | 'patient'>('patient');
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const processingRef = useRef(false);
  const lastTextRef = useRef<string>('');

  const { toast } = useToast();

  useEffect(() => {
    return () => {
      stopRecording();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    onTranscriptionUpdate?.(messages);
  }, [messages, onTranscriptionUpdate]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Setup audio level monitoring
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (analyserRef.current && isRecordingRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          setAudioLevel(average);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

      // Use webm for better compatibility
      const mimeType = 'audio/webm;codecs=opus';
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm'
      });

      // Process each chunk individually for continuous transcription
      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 5000 && !processingRef.current && isRecordingRef.current) {
          console.log('Processing chunk:', event.data.size, 'bytes');
          processingRef.current = true;
          await processAudioChunk(event.data);
          processingRef.current = false;
        }
      };

      setIsRecording(true);
      isRecordingRef.current = true;
      lastTextRef.current = '';
      
      // Start with shorter intervals for more responsive transcription
      mediaRecorderRef.current.start(2000); // 2 second chunks
      console.log('Recording started with 2-second chunks');

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsRecording(false);
    setAudioLevel(0);
    console.log('Recording stopped');
  };

  const processAudioChunk = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          
          console.log('Sending audio to voice-to-text function');
          const { data, error } = await supabase.functions.invoke('voice-to-text', {
            body: { audio: base64Audio }
          });

          if (error) {
            console.error('Transcription error:', error);
            return;
          }

          if (data?.text && data.text.trim()) {
            const text = data.text.trim();
            console.log('Received transcription:', text);
            
            // Simple duplicate filter - only check if exactly same as last
            if (text !== lastTextRef.current && text.length > 2) {
              lastTextRef.current = text;
              
              const newMessage: TranscriptionMessage = {
                id: `${Date.now()}-${Math.random()}`,
                text: text,
                speaker: currentSpeaker,
                timestamp: new Date().toISOString()
              };

              console.log('Adding new message:', text);
              setMessages(prev => [...prev, newMessage].slice(-50));
            } else {
              console.log('Skipping duplicate or short text:', text);
            }
          }
        } catch (error) {
          console.error('Processing error:', error);
        }
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Chunk processing error:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            className="h-8"
          >
            {isRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>

          <div className="flex items-center space-x-1">
            <Button
              variant={currentSpeaker === 'patient' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentSpeaker('patient')}
              className="h-7 px-2 text-xs"
            >
              <User className="w-3 h-3" />
            </Button>
            <Button
              variant={currentSpeaker === 'therapist' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentSpeaker('therapist')}
              className="h-7 px-2 text-xs"
            >
              <Bot className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <Badge variant={isRecording ? "destructive" : "secondary"} className="text-xs">
          {isRecording ? 'Transcrevendo' : 'Pausado'}
        </Badge>
      </div>

      {/* Audio Level */}
      {isRecording && (
        <div className="px-3 py-2 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <div className="flex-1 bg-gray-200 rounded-full h-1">
              <div 
                className="bg-red-500 rounded-full h-1 transition-all duration-100"
                style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            {messages.slice(-10).map((message) => (
              <div key={message.id} className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={message.speaker === 'patient' ? 'default' : 'secondary'}
                    className="text-xs h-5"
                  >
                    {message.speaker === 'patient' ? 'P' : 'T'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-sm bg-muted/50 p-2 rounded text-foreground leading-relaxed">
                  {message.text}
                </p>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Clique em Play para iniciar a transcrição contínua</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Status */}
      <div className="p-2 border-t bg-muted/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {isRecording ? (
              <>
                <span className="inline-flex items-center space-x-1">
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Transcrição ativa - chunks de 2s</span>
                </span>
              </>
            ) : (
              messages.length > 0 ? `${messages.length} mensagens transcritas` : 'Clique em Play para iniciar'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};