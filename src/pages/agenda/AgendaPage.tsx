import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Search,
  Filter,
  Users,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
  CalendarDays,
  Send,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatTimeInTimezone, convertToTimezone } from '@/utils/dateUtils';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { generateTimeSlots } from '@/utils/timeSlots';
import { AvailableTimeSlots } from '@/components/agenda/AvailableTimeSlots';
import { SystemSettingsDialog } from '@/components/agenda/SystemSettingsDialog';
import { WeeklyCalendarGrid } from '@/components/agenda/WeeklyCalendarGrid';
import { MonthlyCalendarGrid } from '@/components/agenda/MonthlyCalendarGrid';
import { AttendButton } from '@/components/agenda/AttendButton';
import { WhatsAppButton } from '@/components/communication/WhatsAppButton';
import { SendBookingLinkDialog } from '@/components/agenda/SendBookingLinkDialog';

interface Session {
  id: string;
  patient_id: string;
  scheduled_at: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  notes?: string;
  price?: number;
  patient?: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
}

/**
 * Página de Agenda do corphus.ai
 * Sistema completo para gerenciamento de consultas e agendamentos
 */
export const AgendaPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('day');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [sendBookingLinkDialog, setSendBookingLinkDialog] = useState<{
    open: boolean;
    patient: { id: string; name: string; email?: string; phone?: string; whatsapp?: string } | null;
  }>({ open: false, patient: null });
  const [patientSearchDialog, setPatientSearchDialog] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const { toast } = useToast();
  const { settings: systemSettings, isLoading: settingsLoading } = useSystemSettings();
  const { timezone } = useTimezone();

  const [formData, setFormData] = useState({
    patient_id: '',
    scheduled_at: '',
    duration_minutes: 60,
    session_type: '',
    notes: '',
    price: 0
  });

  const sessionTypes = [
    'Consulta Inicial',
    'Consulta de Retorno',
    'Fisioterapia',
    'RPG',
    'Pilates Terapêutico',
    'Massoterapia',
    'Análise Postural',
    'Avaliação',
    'Outro'
  ];

  useEffect(() => {
    loadData();
    loadUserProfile();
  }, [selectedDate, currentView]);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('user_id', user.id)
          .single();
        
        setCurrentUserProfile(profile);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Definir o período baseado na visualização
      let startDate, endDate;
      
      switch (currentView) {
        case 'day':
          startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
          endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(selectedDate);
          endDate = endOfMonth(selectedDate);
          break;
        default:
          startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
      }

      // Obter ID do usuário atual para filtrar sessões
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          patient:patients!inner(id, name, phone, email, account_id)
        `)
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString())
        .order('scheduled_at', { ascending: true });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Carregar lista de pacientes para o formulário (agora via RLS)
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, phone, email')
        .order('name', { ascending: true });

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da agenda.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSession = async () => {
    try {
      if (!formData.patient_id || !formData.scheduled_at || !formData.session_type) {
        toast({
          title: 'Erro',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive'
        });
        return;
      }

      // Converter o scheduled_at considerando o timezone do usuário
      const scheduledAtConverted = convertToTimezone(formData.scheduled_at, timezone);
      const scheduledAtISO = scheduledAtConverted.toISOString();

      const sessionData = {
        ...formData,
        scheduled_at: scheduledAtISO,
        account_id: currentUserProfile?.account_id,
        status: 'agendada'
      };

      if (editingSession) {
        const { error } = await supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', editingSession.id);

        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Agendamento atualizado com sucesso!',
        });
      } else {
        const { error } = await supabase
          .from('sessions')
          .insert([sessionData]);

        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Agendamento criado com sucesso!',
        });
      }

      setIsDialogOpen(false);
      setEditingSession(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o agendamento.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateSessionStatus = async (sessionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: newStatus })
        .eq('id', sessionId);

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Status atualizado com sucesso!',
      });
      
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive'
      });
    }
  };

  const handleEditSession = (session: Session) => {
    setEditingSession(session);
    
    // Converter para o timezone local antes de definir no form
    const sessionDate = new Date(session.scheduled_at);
    const localISOString = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}T${String(sessionDate.getHours()).padStart(2, '0')}:${String(sessionDate.getMinutes()).padStart(2, '0')}`;
    
    setFormData({
      patient_id: session.patient_id,
      scheduled_at: localISOString,
      duration_minutes: session.duration_minutes,
      session_type: session.session_type,
      notes: session.notes || '',
      price: session.price || 0
    });
    setIsDialogOpen(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Agendamento excluído com sucesso!',
      });
      
      loadData();
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o agendamento.',
        variant: 'destructive'
      });
    }
  };

  const handleSendBookingLink = (patient: { id: string; name: string; email?: string; phone?: string; whatsapp?: string }) => {
    setSendBookingLinkDialog({ open: true, patient });
  };

  const resetForm = () => {
    setFormData({
      patient_id: '',
      scheduled_at: '',
      duration_minutes: 60,
      session_type: '',
      notes: '',
      price: 0
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    switch (currentView) {
      case 'day':
        if (direction === 'prev') {
          setSelectedDate(subDays(newDate, 1));
        } else {
          setSelectedDate(addDays(newDate, 1));
        }
        break;
      case 'week':
        if (direction === 'prev') {
          setSelectedDate(subWeeks(newDate, 1));
        } else {
          setSelectedDate(addWeeks(newDate, 1));
        }
        break;
      case 'month':
        if (direction === 'prev') {
          setSelectedDate(subMonths(newDate, 1));
        } else {
          setSelectedDate(addMonths(newDate, 1));
        }
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'confirmada': return 'bg-success/10 text-success border-success/20';
      case 'em_andamento': return 'bg-warning/10 text-warning border-warning/20';
      case 'concluida': return 'bg-primary/10 text-primary border-primary/20';
      case 'cancelada': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'faltou': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmada':
      case 'concluida':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelada':
      case 'faltou':
        return <XCircle className="w-4 h-4" />;
      case 'em_andamento':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'agendada': 'Agendada',
      'confirmada': 'Confirmada',
      'em_andamento': 'Em Andamento',
      'concluida': 'Concluída',
      'cancelada': 'Cancelada',
      'faltou': 'Faltou'
    };
    return labels[status] || status;
  };

  const formatTime = (dateString: string) => {
    return formatTimeInTimezone(dateString, timezone);
  };

  const formatDate = (date: Date) => {
    switch (currentView) {
      case 'day':
        return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt });
      case 'week':
        const startWeek = startOfWeek(date, { weekStartsOn: 1 });
        const endWeek = endOfWeek(date, { weekStartsOn: 1 });
        return `${format(startWeek, "d 'de' MMMM", { locale: pt })} - ${format(endWeek, "d 'de' MMMM 'de' yyyy", { locale: pt })}`;
      case 'month':
        return format(date, "MMMM 'de' yyyy", { locale: pt });
      default:
        return format(date, "d 'de' MMMM 'de' yyyy", { locale: pt });
    }
  };

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => 
      isSameDay(new Date(session.scheduled_at), date)
    );
  };

  const handleTimeSlotSelect = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const dateInTimezone = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
    
    // Criar ISO string considerando o timezone
    const isoString = `${dateInTimezone.getFullYear()}-${String(dateInTimezone.getMonth() + 1).padStart(2, '0')}-${String(dateInTimezone.getDate()).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    setFormData({
      ...formData,
      scheduled_at: isoString
    });
    setEditingSession(null);
    setIsDialogOpen(true);
  };

  const renderDayView = () => {
    const dayTitle = formatDate(selectedDate);
    const daySessions = getSessionsForDate(selectedDate);
    const timeSlots = generateTimeSlots(selectedDate, systemSettings, sessions);
    
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm sm:text-base lg:text-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="truncate">Agendamentos do Dia</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {daySessions.length} agendamento(s) para hoje
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 px-3 sm:px-6">
            {daySessions.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <CalendarIcon className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground">Nenhum agendamento para este dia</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {daySessions.map((session) => (
                  <div key={session.id} className="p-2 sm:p-3 border border-border rounded-lg space-y-2 hover:bg-muted/30 transition-colors overflow-hidden">
                    <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1.5 sm:gap-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <div className="text-center flex-shrink-0">
                          <div className="text-xs sm:text-sm font-semibold text-primary">
                            {formatTime(session.scheduled_at)}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                            {session.duration_minutes}min
                          </div>
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-medium text-foreground truncate">
                            {session.patient?.name}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {session.session_type}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-start xs:justify-end flex-shrink-0">
                        <Badge className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 ${getStatusColor(session.status)}`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(session.status)}
                            <span className="hidden xs:inline">{getStatusLabel(session.status)}</span>
                            <span className="xs:hidden">
                              {session.status === 'agendada' ? 'Ag' : 
                               session.status === 'confirmada' ? 'Conf' : 
                               session.status === 'concluida' ? 'Conc' : 
                               session.status === 'cancelada' ? 'Canc' : session.status}
                            </span>
                          </div>
                        </Badge>
                      </div>
                    </div>
                    
                    {session.notes && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground bg-muted/50 p-1.5 sm:p-2 rounded text-left">
                        {session.notes}
                      </p>
                    )}
                    
                    
                    <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1.5 sm:gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground min-w-0">
                        {session.patient?.phone && (
                          <div className="flex items-center space-x-1 min-w-0">
                            <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                            <span className="truncate text-[9px] sm:text-[10px]">{session.patient.phone}</span>
                          </div>
                        )}
                        {session.price && (
                          <div className="font-medium text-success text-[9px] sm:text-[10px] whitespace-nowrap">
                            R$ {session.price.toFixed(2)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 overflow-x-auto">
                        {session.patient?.phone && (
                          <WhatsAppButton
                            phoneNumber={session.patient.phone}
                            patientName={session.patient.name}
                            message={`Olá ${session.patient.name}, lembrete do seu agendamento de ${session.session_type} hoje às ${formatTime(session.scheduled_at)}.`}
                            size="sm"
                          />
                        )}
                        
                        {/* Botão de atender aparece para sessões confirmadas, em andamento ou agendadas */}
                        {(session.status === 'confirmada' || session.status === 'em_andamento' || session.status === 'agendada') && (
                          <AttendButton 
                            patientId={session.patient_id}
                            patientName={session.patient?.name || 'Paciente'}
                            sessionId={session.id}
                          />
                        )}
                        
                        {session.status === 'agendada' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-[9px] sm:text-[10px] h-6 sm:h-7 px-1.5 sm:px-2 whitespace-nowrap"
                            onClick={() => handleUpdateSessionStatus(session.id, 'confirmada')}
                          >
                            Confirmar
                          </Button>
                        )}
                        {(session.status === 'agendada' || session.status === 'confirmada') && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-[9px] sm:text-[10px] h-6 sm:h-7 px-1.5 sm:px-2 whitespace-nowrap"
                            onClick={() => handleUpdateSessionStatus(session.id, 'concluida')}
                          >
                            Concluir
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-[9px] sm:text-[10px] h-6 sm:h-7 px-1.5 sm:px-2 whitespace-nowrap"
                          onClick={() => handleEditSession(session)}
                        >
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-[9px] sm:text-[10px] h-6 sm:h-7 px-1.5 sm:px-2 whitespace-nowrap text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Agendamento</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                                <br /><br />
                                <strong>Paciente:</strong> {session.patient?.name}<br />
                                <strong>Data/Hora:</strong> {formatTime(session.scheduled_at)}<br />
                                <strong>Tipo:</strong> {session.session_type}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSession(session.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <AvailableTimeSlots
          date={selectedDate}
          slots={timeSlots}
          onTimeSelect={(time) => handleTimeSlotSelect(selectedDate, time)}
          isLoading={settingsLoading}
        />
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <WeeklyCalendarGrid
        selectedDate={selectedDate}
        sessions={sessions}
        systemSettings={systemSettings}
        onTimeSlotClick={handleTimeSlotSelect}
        onSessionEdit={handleEditSession}
        onSessionStatusUpdate={handleUpdateSessionStatus}
      />
    );
  };

  const renderMonthView = () => {
    return (
      <MonthlyCalendarGrid
        selectedDate={selectedDate}
        sessions={sessions}
        onDateClick={(date) => {
          setSelectedDate(date);
          setCurrentView('day');
        }}
        onTimeSlotClick={handleTimeSlotSelect}
      />
    );
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'day':
        return renderDayView();
      case 'week':
        return renderWeekView();
      case 'month':
        return renderMonthView();
      default:
        return renderDayView();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 p-3 sm:p-4 lg:p-6 max-w-full overflow-hidden">
      {/* Cabeçalho otimizado para mobile */}
      <div className="flex flex-col space-y-2 sm:space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 lg:gap-4">
        <div className="text-center lg:text-left min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-foreground truncate">Agenda</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
            Gerencie seus agendamentos e consultas
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={patientSearchDialog} onOpenChange={setPatientSearchDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="flex items-center justify-center space-x-1.5 sm:space-x-2 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4 flex-shrink-0"
                onClick={() => setPatientSearch('')}
              >
                <Send className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Enviar Link de Agendamento</span>
                <span className="sm:hidden">Link</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Selecionar Paciente</DialogTitle>
                <DialogDescription>
                  Busque e escolha o paciente que receberá o link de agendamento.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar paciente..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {patients
                    .filter(patient => 
                      patient.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
                      patient.email?.toLowerCase().includes(patientSearch.toLowerCase()) ||
                      patient.phone?.includes(patientSearch)
                    )
                    .map((patient) => (
                      <Button
                        key={patient.id}
                        variant="outline"
                        className="w-full justify-start text-left p-3 h-auto"
                        onClick={() => {
                          handleSendBookingLink({
                            id: patient.id,
                            name: patient.name,
                            email: patient.email,
                            phone: patient.phone,
                            whatsapp: patient.phone
                          });
                          setPatientSearchDialog(false);
                        }}
                      >
                        <div className="flex flex-col items-start">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">{patient.name}</span>
                          </div>
                          {patient.email && (
                            <span className="text-xs text-muted-foreground mt-1">{patient.email}</span>
                          )}
                          {patient.phone && (
                            <span className="text-xs text-muted-foreground">{patient.phone}</span>
                          )}
                        </div>
                      </Button>
                    ))}
                  {patients.filter(patient => 
                    patient.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
                    patient.email?.toLowerCase().includes(patientSearch.toLowerCase()) ||
                    patient.phone?.includes(patientSearch)
                  ).length === 0 && patientSearch && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum paciente encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center justify-center space-x-1.5 sm:space-x-2 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4 flex-shrink-0"
                onClick={() => {
                  setEditingSession(null);
                  resetForm();
                }}
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden xs:inline whitespace-nowrap">Novo Agendamento</span>
                <span className="xs:hidden">Novo</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-lg sm:text-xl">
                {editingSession ? 'Editar Agendamento' : 'Novo Agendamento'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Preencha os dados do agendamento. Todos os campos são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient">Paciente *</Label>
                  <Select value={formData.patient_id} onValueChange={(value) => setFormData({...formData, patient_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="session_type">Tipo de Sessão *</Label>
                  <Select value={formData.session_type} onValueChange={(value) => setFormData({...formData, session_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
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
                
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Data e Hora *</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                    min="15"
                    max="180"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Valor (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Observações sobre a consulta..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveSession}
                className="w-full sm:w-auto"
              >
                {editingSession ? 'Atualizar' : 'Agendar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Navegação da data e seletor de visualização - Mobile Optimized */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          {/* Mobile: Stack vertically, Desktop: Horizontal */}
          <div className="flex flex-col space-y-3 sm:space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            {/* Date Navigation */}
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 lg:justify-start">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateDate('prev')} 
                className="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9 flex-shrink-0"
              >
                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="sr-only">Data anterior</span>
              </Button>
              
              <div className="flex-1 text-center lg:flex-none min-w-0 px-1 sm:px-2">
                <h2 className="text-sm sm:text-base lg:text-lg xl:text-xl font-semibold text-foreground truncate">
                  {formatDate(selectedDate)}
                </h2>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateDate('next')} 
                className="p-1.5 sm:p-2 h-8 sm:h-9 w-8 sm:w-9 flex-shrink-0"
              >
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="sr-only">Próxima data</span>
              </Button>
            </div>
            
            {/* Controls - Mobile: Stack, Desktop: Horizontal */}
            <div className="flex flex-col space-y-2 xs:flex-row xs:items-center xs:justify-center xs:space-y-0 xs:space-x-1 sm:space-x-2 lg:justify-end">
              {/* View Selector */}
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-0.5 border rounded-lg p-0.5 bg-muted/50">
                  <Button
                    variant={currentView === 'day' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('day')}
                    className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 sm:py-1 h-6 sm:h-7"
                  >
                    <span className="hidden xs:inline">Dia</span>
                    <span className="xs:hidden">D</span>
                  </Button>
                  <Button
                    variant={currentView === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('week')}
                    className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 sm:py-1 h-6 sm:h-7"
                  >
                    <span className="hidden xs:inline">Semana</span>
                    <span className="xs:hidden">S</span>
                  </Button>
                  <Button
                    variant={currentView === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('month')}
                    className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 sm:py-1 h-6 sm:h-7"
                  >
                    <span className="hidden xs:inline">Mês</span>
                    <span className="xs:hidden">M</span>
                  </Button>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                    >
                      <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1 flex-shrink-0" />
                      <span className="hidden sm:inline">Calendário</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setShowCalendar(false);
                        }
                      }}
                      initialFocus
                      locale={pt}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                >
                  Hoje
                </Button>
                
                <div className="hidden lg:block">
                  <SystemSettingsDialog />
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile: Settings button separately */}
          <div className="flex justify-center lg:hidden pt-2 sm:pt-3 border-t border-border/50">
            <SystemSettingsDialog />
          </div>
        </CardHeader>
      </Card>

      {/* Resumo do período - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-2 sm:px-4 pt-2 sm:pt-4">
            <CardTitle className="text-[9px] sm:text-[10px] lg:text-xs font-medium text-muted-foreground truncate">
              Total
            </CardTitle>
            <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-0 px-2 sm:px-4 pb-2 sm:pb-4">
            <div className="text-base sm:text-lg lg:text-xl font-bold truncate">{sessions.length}</div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-2 sm:px-4 pt-2 sm:pt-4">
            <CardTitle className="text-[9px] sm:text-[10px] lg:text-xs font-medium text-muted-foreground truncate">
              Confirmadas
            </CardTitle>
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-0 px-2 sm:px-4 pb-2 sm:pb-4">
            <div className="text-base sm:text-lg lg:text-xl font-bold text-success truncate">
              {sessions.filter(s => s.status === 'confirmada').length}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-2 sm:px-4 pt-2 sm:pt-4">
            <CardTitle className="text-[9px] sm:text-[10px] lg:text-xs font-medium text-muted-foreground truncate">
              Pendentes
            </CardTitle>
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-warning flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-0 px-2 sm:px-4 pb-2 sm:pb-4">
            <div className="text-base sm:text-lg lg:text-xl font-bold text-warning truncate">
              {sessions.filter(s => s.status === 'agendada').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualização principal */}
      {renderCurrentView()}

      {/* Dialog para envio de link de agendamento */}
      {sendBookingLinkDialog.patient && (
        <SendBookingLinkDialog
          open={sendBookingLinkDialog.open}
          onOpenChange={(open) => setSendBookingLinkDialog({ open, patient: open ? sendBookingLinkDialog.patient : null })}
          patient={sendBookingLinkDialog.patient}
        />
      )}
    </div>
  );
};