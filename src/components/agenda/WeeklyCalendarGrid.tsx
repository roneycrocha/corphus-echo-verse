import React from 'react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, addMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SystemSettings } from '@/hooks/useSystemSettings';
import { TimeSlot, generateTimeSlots } from '@/utils/timeSlots';

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

interface WeeklyCalendarGridProps {
  selectedDate: Date;
  sessions: Session[];
  systemSettings: SystemSettings;
  onTimeSlotClick: (date: Date, time: string) => void;
  onSessionEdit: (session: Session) => void;
  onSessionStatusUpdate: (sessionId: string, newStatus: string) => void;
}

export const WeeklyCalendarGrid: React.FC<WeeklyCalendarGridProps> = ({
  selectedDate,
  sessions,
  systemSettings,
  onTimeSlotClick,
  onSessionEdit,
  onSessionStatusUpdate
}) => {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ 
    start: weekStart, 
    end: endOfWeek(selectedDate, { weekStartsOn: 1 }) 
  });

  // Gerar horários de funcionamento
  const generateTimeSlots = (settings: SystemSettings) => {
    const slots = [];
    const [startHour, startMinute] = settings.working_hours_start.split(':').map(Number);
    const [endHour, endMinute] = settings.working_hours_end.split(':').map(Number);
    
    let currentTime = new Date();
    currentTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0, 0);
    
    while (currentTime < endTime) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = addMinutes(currentTime, settings.appointment_interval);
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots(systemSettings);

  const getSessionForSlot = (day: Date, time: string) => {
    return sessions.find(session => {
      const sessionDate = new Date(session.scheduled_at);
      const sessionTime = format(sessionDate, 'HH:mm');
      return isSameDay(sessionDate, day) && sessionTime === time;
    });
  };

  const isLunchTime = (time: string) => {
    return time >= systemSettings.lunch_break_start && time < systemSettings.lunch_break_end;
  };

  const isWorkingDay = (date: Date) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    return systemSettings.working_days.includes(dayName);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada': return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'confirmada': return 'bg-success/20 text-success border-success/30';
      case 'em_andamento': return 'bg-warning/20 text-warning border-warning/30';
      case 'concluida': return 'bg-primary/20 text-primary border-primary/30';
      case 'cancelada': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted/20 text-muted-foreground border-border';
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-8 bg-muted/30">
        {/* Cabeçalho com horários */}
        <div className="p-4 text-center border-r border-border">
          <Clock className="w-4 h-4 mx-auto text-muted-foreground" />
        </div>
        
        {/* Dias da semana */}
        {weekDays.map(day => (
          <div 
            key={day.toISOString()} 
            className="p-4 text-center border-r border-border last:border-r-0"
          >
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">
                {format(day, 'EEEEE', { locale: pt })}
              </div>
              <div className={`text-lg font-semibold ${
                isSameDay(day, new Date()) 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}>
                {format(day, 'd', { locale: pt })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid de horários */}
      <div className="max-h-[600px] overflow-y-auto">
        {timeSlots.map((time, timeIndex) => (
          <div key={time} className="grid grid-cols-8 border-b border-border/50 hover:bg-muted/20 transition-colors">
            {/* Coluna de horários */}
            <div className="p-3 text-center border-r border-border bg-muted/10">
              <div className="text-sm font-medium text-muted-foreground">
                {time}
              </div>
            </div>
            
            {/* Slots para cada dia */}
            {weekDays.map(day => {
              const session = getSessionForSlot(day, time);
              const isWorking = isWorkingDay(day);
              const isLunch = isLunchTime(time);
              const isToday = isSameDay(day, new Date());
              const isPast = new Date() > new Date(day.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1])));
              
              return (
                <div 
                  key={`${day.toISOString()}-${time}`}
                  className={`relative p-2 border-r border-border/50 last:border-r-0 min-h-[60px] transition-all duration-200 ${
                    !isWorking 
                      ? 'bg-muted/30 cursor-not-allowed' 
                      : isLunch 
                        ? 'bg-warning/10 cursor-not-allowed' 
                        : session 
                          ? 'cursor-pointer hover:bg-muted/30' 
                          : 'cursor-pointer hover:bg-primary/5 hover:border-primary/20'
                  } ${isToday ? 'bg-primary/5' : ''}`}
                  onClick={() => {
                    if (isWorking && !isLunch && !session && !isPast) {
                      onTimeSlotClick(day, time);
                    } else if (session) {
                      onSessionEdit(session);
                    }
                  }}
                >
                  {!isWorking ? (
                    <div className="text-xs text-muted-foreground text-center">
                      Não funcionamento
                    </div>
                  ) : isLunch ? (
                    <div className="text-xs text-warning text-center">
                      Almoço
                    </div>
                  ) : session ? (
                    <div className="space-y-1 animate-fade-in">
                      <div className={`text-xs px-2 py-1 rounded-md border ${getStatusColor(session.status)}`}>
                        <div className="font-medium truncate">
                          {session.patient?.name}
                        </div>
                        <div className="text-xs opacity-75 truncate">
                          {session.session_type}
                        </div>
                      </div>
                      {session.status === 'agendada' && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSessionStatusUpdate(session.id, 'confirmada');
                            }}
                          >
                            Confirmar
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : isPast ? (
                    <div className="text-xs text-muted-foreground text-center opacity-50">
                      Passado
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
};