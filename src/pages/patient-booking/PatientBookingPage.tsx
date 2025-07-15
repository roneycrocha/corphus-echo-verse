import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, addDays, isSameDay, parseISO, addMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';
import { generateTimeSlots } from '@/utils/timeSlots';
import { SystemSettings } from '@/hooks/useSystemSettings';

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export const PatientBookingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    selectedTime: '',
    sessionType: '',
    notes: ''
  });

  const sessionTypes = [
    'Consulta Inicial',
    'Consulta de Retorno',
    'Fisioterapia',
    'RPG',
    'Pilates Terapêutico',
    'Massoterapia',
    'Análise Postural',
    'Avaliação'
  ];

  useEffect(() => {
    if (token) {
      validateTokenAndLoadData();
    } else {
      navigate('/404');
    }
  }, [token]);

  useEffect(() => {
    if (selectedDate && systemSettings) {
      loadAvailableSlots();
    }
  }, [selectedDate, systemSettings]);

  const validateTokenAndLoadData = async () => {
    try {
      setLoading(true);

      // Validar token
      const { data: tokenData, error: tokenError } = await supabase
        .from('patient_booking_tokens')
        .select(`
          *,
          patient:patients(id, name, email, phone)
        `)
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        toast({
          title: 'Link Inválido',
          description: 'Este link de agendamento é inválido ou expirou.',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      setPatient(tokenData.patient);

      // Carregar configurações do sistema
      const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (settingsError || !settings) {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as configurações.',
          variant: 'destructive'
        });
        return;
      }

      setSystemSettings(settings);
      generateAvailableDates(settings);

    } catch (error) {
      console.error('Erro ao validar token:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao validar o link.',
        variant: 'destructive'
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableDates = (settings: SystemSettings) => {
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    
    console.log('Configurações do sistema:', settings);
    console.log('Dias úteis configurados:', settings.working_days);
    
    // Gerar próximos 45 dias
    for (let i = 1; i <= 45; i++) {
      const date = addDays(today, i);
      
      // Usar getDayOfWeek do timeSlots.ts para consistência
      const dayOfWeek = getDayOfWeek(date);
      
      console.log(`Data: ${format(date, 'dd/MM/yyyy')} - Dia da semana: ${dayOfWeek}`);
      
      if (settings.working_days.includes(dayOfWeek)) {
        dates.push(date);
        console.log(`Data adicionada: ${format(date, 'dd/MM/yyyy')}`);
      }

      if (dates.length >= 20) break; // Limitar a 20 datas
    }
    
    console.log('Total de datas disponíveis:', dates.length);
    setAvailableDates(dates);
  };

  const getDayOfWeek = (date: Date): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !systemSettings || !patient) return;

    try {
      // Carregar sessões existentes para o dia selecionado
      const startOfSelectedDate = startOfDay(selectedDate);
      const endOfSelectedDate = addDays(startOfSelectedDate, 1);

      const { data: existingSessions, error } = await supabase
        .from('sessions')
        .select('id, scheduled_at, duration_minutes')
        .gte('scheduled_at', startOfSelectedDate.toISOString())
        .lt('scheduled_at', endOfSelectedDate.toISOString());

      if (error) throw error;

      // Gerar slots disponíveis
      const allSlots = generateTimeSlots(selectedDate, systemSettings, existingSessions || []);
      const availableSlotTimes = allSlots.filter(slot => slot.available).map(slot => slot.time);
      setAvailableSlots(availableSlotTimes);
      setFormData(prev => ({ ...prev, selectedTime: '' }));

    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os horários disponíveis.',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !formData.selectedTime || !formData.sessionType || !patient) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmitting(true);

      // Criar data/hora do agendamento
      const [hours, minutes] = formData.selectedTime.split(':').map(Number);
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      // Usar edge function para confirmar o agendamento
      const { data, error } = await supabase.functions.invoke('confirm-booking', {
        body: {
          token,
          scheduledAt: scheduledAt.toISOString(),
          sessionType: formData.sessionType,
          notes: formData.notes,
          appointmentDuration: systemSettings?.appointment_duration || 60
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Erro ao confirmar agendamento');
      }

      toast({
        title: 'Agendamento Confirmado!',
        description: `Sua consulta foi agendada para ${format(scheduledAt, "d 'de' MMMM 'às' HH:mm", { locale: pt })}.`,
      });

      // Redirecionar para página de sucesso
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error) {
      console.error('Erro ao agendar:', error);
      toast({
        title: 'Erro no Agendamento',
        description: 'Não foi possível confirmar seu agendamento. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Agendar Consulta
          </h1>
          <p className="text-muted-foreground">
            Olá {patient?.name}, escolha o melhor horário para sua consulta
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Novo Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informações do Paciente */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Paciente
                </h3>
                <p className="text-sm">{patient?.name}</p>
                {patient?.email && <p className="text-sm text-muted-foreground">{patient.email}</p>}
                {patient?.phone && <p className="text-sm text-muted-foreground">{patient.phone}</p>}
              </div>

              {/* Seleção de Data */}
              <div className="space-y-2">
                <Label>Data da Consulta *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableDates.map((date) => (
                    <Button
                      key={date.toISOString()}
                      type="button"
                      variant={selectedDate && isSameDay(date, selectedDate) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedDate(date)}
                      className="text-xs"
                    >
                      {format(date, "d 'de' MMM", { locale: pt })}
                      <br />
                      <span className="text-[10px] opacity-75">
                        {format(date, 'EEEE', { locale: pt })}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Seleção de Horário */}
              {selectedDate && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Horário *
                  </Label>
                  {availableSlots.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p>Nenhum horário disponível para esta data</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          type="button"
                          variant={formData.selectedTime === slot ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, selectedTime: slot }))}
                          className="text-xs"
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tipo de Consulta */}
              <div className="space-y-2">
                <Label htmlFor="sessionType">Tipo de Consulta *</Label>
                <Select
                  value={formData.sessionType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sessionType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de consulta" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Descreva sintomas, dúvidas ou informações importantes..."
                  rows={3}
                />
              </div>

              {/* Botão de Confirmação */}
              <Button
                type="submit"
                disabled={submitting || !selectedDate || !formData.selectedTime || !formData.sessionType}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar Agendamento
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};