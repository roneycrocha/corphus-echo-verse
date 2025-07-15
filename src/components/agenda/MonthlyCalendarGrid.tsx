import React from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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

interface MonthlyCalendarGridProps {
  selectedDate: Date;
  sessions: Session[];
  onDateClick: (date: Date) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
}

export const MonthlyCalendarGrid: React.FC<MonthlyCalendarGridProps> = ({
  selectedDate,
  sessions,
  onDateClick,
  onTimeSlotClick
}) => {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ 
    start: calendarStart, 
    end: calendarEnd 
  });

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => 
      isSameDay(new Date(session.scheduled_at), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada': return 'bg-secondary/20 text-secondary';
      case 'confirmada': return 'bg-success/20 text-success';
      case 'em_andamento': return 'bg-warning/20 text-warning';
      case 'concluida': return 'bg-primary/20 text-primary';
      case 'cancelada': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === selectedDate.getMonth();
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  return (
    <Card className="overflow-hidden">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 bg-muted/30 border-b border-border">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="p-4 text-center border-r border-border last:border-r-0">
            <div className="text-sm font-medium text-muted-foreground">
              {day}
            </div>
          </div>
        ))}
      </div>

      {/* Grid do calendário */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const daySessions = getSessionsForDate(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const isInCurrentMonth = isCurrentMonth(day);
          
          return (
            <div
              key={day.toISOString()}
              className={`relative min-h-[120px] p-2 border-r border-b border-border/50 last:border-r-0 transition-all duration-200 cursor-pointer hover:bg-muted/20 ${
                !isInCurrentMonth 
                  ? 'bg-muted/10 opacity-50' 
                  : isSelected 
                    ? 'bg-primary/5 border-primary/20' 
                    : isToday 
                      ? 'bg-primary/10' 
                      : ''
              } ${index % 7 === 6 ? 'border-r-0' : ''}`}
              onClick={() => onDateClick(day)}
            >
              {/* Número do dia */}
              <div className="flex items-center justify-between mb-2">
                <div className={`text-sm font-medium ${
                  isToday 
                    ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center' 
                    : !isInCurrentMonth 
                      ? 'text-muted-foreground' 
                      : 'text-foreground'
                }`}>
                  {format(day, 'd')}
                </div>
                
                {isInCurrentMonth && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTimeSlotClick(day, '09:00');
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Sessões do dia */}
              <div className="space-y-1">
                {daySessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className={`text-xs px-2 py-1 rounded-md border cursor-pointer hover:scale-105 transition-transform animate-fade-in ${getStatusColor(session.status)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Implementar edição de sessão
                    }}
                  >
                    <div className="font-medium truncate">
                      {formatTime(session.scheduled_at)} - {session.patient?.name}
                    </div>
                    <div className="opacity-75 truncate">
                      {session.session_type}
                    </div>
                  </div>
                ))}
                
                {daySessions.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{daySessions.length - 3} mais
                  </div>
                )}
              </div>

              {/* Indicador de capacidade */}
              {daySessions.length > 0 && (
                <div className="absolute top-2 right-2">
                  <div className={`w-2 h-2 rounded-full ${
                    daySessions.length >= 8 
                      ? 'bg-destructive' 
                      : daySessions.length >= 5 
                        ? 'bg-warning' 
                        : 'bg-success'
                  }`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};