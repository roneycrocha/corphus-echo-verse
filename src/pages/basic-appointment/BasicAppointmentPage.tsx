import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Mic, MicOff, Save, FileText, Users, Bold, Italic, Underline, List, ListOrdered, Play, Pause, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PatientNameWithTraits } from '@/components/common/PatientNameWithTraits';

interface BasicAppointmentState {
  patientId: string;
  patientName: string;
  userType: string;
}

export const BasicAppointmentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as BasicAppointmentState;
  
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  if (!state?.patientId || !state?.patientName) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Dados do paciente não encontrados</h2>
          <Button onClick={() => navigate('/agenda')}>
            Voltar para Agenda
          </Button>
        </div>
      </div>
    );
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.success('Gravação iniciada');
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast.error('Erro ao acessar microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Gravação finalizada');
      
      // Para o stream do microfone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioUrl) return;

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const insertTextAtCursor = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notes.substring(start, end);
    
    const newText = notes.substring(0, start) + before + selectedText + after + notes.substring(end);
    setNotes(newText);
    
    // Reposicionar cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const formatText = (type: 'bold' | 'italic' | 'underline' | 'list' | 'numberedList') => {
    switch (type) {
      case 'bold':
        insertTextAtCursor('**', '**');
        break;
      case 'italic':
        insertTextAtCursor('*', '*');
        break;
      case 'underline':
        insertTextAtCursor('_', '_');
        break;
      case 'list':
        insertTextAtCursor('\n• ');
        break;
      case 'numberedList':
        insertTextAtCursor('\n1. ');
        break;
    }
  };

  const saveSession = async () => {
    if (!notes.trim()) {
      toast.error('Adicione algumas anotações antes de salvar');
      return;
    }

    setIsSaving(true);
    
    try {
      // Salvar a sessão no banco
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          patient_id: state.patientId,
          session_type: 'atendimento_basico',
          scheduled_at: new Date().toISOString(),
          notes: notes,
          status: 'concluida',
          duration_minutes: null
        });

      if (sessionError) throw sessionError;

      // Se há gravação de áudio, processar e salvar
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const fileName = `session_${state.patientId}_${Date.now()}.wav`;
        
        // Upload do arquivo de áudio
        const { error: uploadError } = await supabase.storage
          .from('transcriptions')
          .upload(fileName, audioBlob);

        if (uploadError) {
          console.error('Erro no upload do áudio:', uploadError);
          toast.error('Sessão salva, mas houve problema com o áudio');
        } else {
          // Salvar referência da transcrição
          await supabase
            .from('transcriptions')
            .insert({
              patient_id: state.patientId,
              audio_url: fileName,
              session_type: 'atendimento_basico',
              created_by: (await supabase.auth.getUser()).data.user?.id || ''
            });
        }
      }

      toast.success('Atendimento salvo com sucesso!');
      navigate('/agenda');
      
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
      toast.error('Erro ao salvar atendimento');
    } finally {
      setIsSaving(false);
    }
  };

  const goToTreatmentPlan = () => {
    navigate('/gestao-terapeutica', { 
      state: { 
        patientId: state.patientId,
        patientName: state.patientName
      } 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/agenda')}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Atendimento Básico</h1>
              <PatientNameWithTraits 
                patientId={state.patientId}
                patientName={state.patientName}
                className="text-muted-foreground"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={goToTreatmentPlan}
              className="flex items-center"
            >
              <Users className="w-4 h-4 mr-2" />
              Plano Terapêutico
            </Button>
            <Button
              onClick={saveSession}
              disabled={isSaving}
              className="flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Sessão'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Anotações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Anotações da Sessão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barra de Ferramentas de Formatação */}
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => formatText('bold')}
                  className="h-8 w-8 p-0"
                  title="Negrito (**texto**)"
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => formatText('italic')}
                  className="h-8 w-8 p-0"
                  title="Itálico (*texto*)"
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => formatText('underline')}
                  className="h-8 w-8 p-0"
                  title="Sublinhado (_texto_)"
                >
                  <Underline className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-border" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => formatText('list')}
                  className="h-8 w-8 p-0"
                  title="Lista com marcadores"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => formatText('numberedList')}
                  className="h-8 w-8 p-0"
                  title="Lista numerada"
                >
                  <ListOrdered className="w-4 h-4" />
                </Button>
              </div>

              <Textarea
                ref={textareaRef}
                placeholder="Digite suas anotações sobre a sessão, observações clínicas, evolução do paciente, objetivos trabalhados...

Use as ferramentas de formatação:
**negrito**, *itálico*, _sublinhado_
• Listas com marcadores
1. Listas numeradas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[350px] resize-none font-mono"
                style={{ lineHeight: '1.6' }}
              />
            </CardContent>
          </Card>

          {/* Gravação de Áudio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="w-5 h-5 mr-2" />
                Gravação de Áudio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant={isRecording ? "destructive" : "default"}
                  size="lg"
                  className="w-32 h-32 rounded-full"
                >
                  {isRecording ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {isRecording ? (
                    <span className="text-red-600 font-medium">🔴 Gravando...</span>
                  ) : (
                    'Clique no botão para iniciar a gravação'
                  )}
                </p>
              </div>

              {/* Player de Áudio */}
              {audioUrl && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Volume2 className="w-4 h-4 mr-2" />
                    Reproduzir Gravação
                  </h4>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={toggleAudioPlayback}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {isPlaying ? 'Pausar' : 'Reproduzir'}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Clique para ouvir a gravação atual
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Instruções:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Clique no microfone para iniciar/parar a gravação</li>
                  <li>• Use o player acima para ouvir a gravação antes de salvar</li>
                  <li>• O áudio será salvo automaticamente ao finalizar a sessão</li>
                  <li>• Certifique-se de ter permissão para gravar</li>
                  <li>• A gravação é opcional e pode ser feita a qualquer momento</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={goToTreatmentPlan}
                className="h-16 flex flex-col items-center justify-center"
              >
                <Users className="w-6 h-6 mb-1" />
                <span className="text-sm">Criar/Editar Plano Terapêutico</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/prontuario', { state: { patientId: state.patientId } })}
                className="h-16 flex flex-col items-center justify-center"
              >
                <FileText className="w-6 h-6 mb-1" />
                <span className="text-sm">Acessar Prontuário</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/agenda')}
                className="h-16 flex flex-col items-center justify-center"
              >
                <ArrowLeft className="w-6 h-6 mb-1" />
                <span className="text-sm">Finalizar e Voltar</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};