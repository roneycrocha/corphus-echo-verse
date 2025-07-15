import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Calendar, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TranscriptionRecord {
  id: string;
  transcription_text: string;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  session_type: string;
  created_at: string;
}

interface TranscriptionHistoryProps {
  patientId?: string;
  className?: string;
}

export const TranscriptionHistory: React.FC<TranscriptionHistoryProps> = ({
  patientId,
  className = ''
}) => {
  const [transcriptions, setTranscriptions] = useState<TranscriptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (patientId) {
      fetchTranscriptions();
    }
  }, [patientId]);

  const fetchTranscriptions = async () => {
    if (!patientId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTranscriptions(data || []);

    } catch (error) {
      console.error('Erro ao buscar transcrições:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de transcrições",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!patientId) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Selecione um paciente para ver o histórico de transcrições
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Histórico de Transcrições</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : transcriptions.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma transcrição encontrada
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {transcriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(transcription.created_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {transcription.audio_duration_seconds && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(transcription.audio_duration_seconds)}
                          </span>
                        </div>
                      )}
                      
                      <Badge variant="outline" className="text-xs">
                        {transcription.session_type === 'ai_assistance' ? 'IA' : transcription.session_type}
                      </Badge>
                    </div>
                  </div>

                  {transcription.transcription_text && (
                    <div className="text-sm">
                      <p className="whitespace-pre-wrap">
                        {transcription.transcription_text.length > 200 
                          ? `${transcription.transcription_text.substring(0, 200)}...`
                          : transcription.transcription_text
                        }
                      </p>
                    </div>
                  )}

                  {transcription.audio_url && (
                    <div className="flex items-center space-x-2 pt-2">
                      <audio controls className="flex-1 max-w-xs">
                        <source src={transcription.audio_url} type="audio/webm" />
                        Seu navegador não suporta áudio.
                      </audio>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};