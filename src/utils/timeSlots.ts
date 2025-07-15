import { format, addMinutes, isWithinInterval, parseISO } from 'date-fns';
import { SystemSettings } from '@/hooks/useSystemSettings';

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

export interface Session {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
}

export const generateTimeSlots = (
  date: Date,
  settings: SystemSettings,
  existingSessions: Session[]
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const dayOfWeek = getDayOfWeek(date);
  
  // Verificar se é dia útil
  if (!settings.working_days.includes(dayOfWeek)) {
    return [];
  }

  // Horário de funcionamento
  const startTime = parseTime(settings.working_hours_start);
  const endTime = parseTime(settings.working_hours_end);
  
  // Horário de almoço
  const lunchStart = parseTime(settings.lunch_break_start);
  const lunchEnd = parseTime(settings.lunch_break_end);

  let currentTime = startTime;
  
  while (currentTime < endTime) {
    const timeString = format(currentTime, 'HH:mm');
    
    // Verificar se está no horário de almoço
    if (isWithinInterval(currentTime, { start: lunchStart, end: lunchEnd })) {
      slots.push({
        time: timeString,
        available: false,
        reason: 'Horário de almoço'
      });
    } else {
      // Verificar se há conflito com consultas existentes
      const isConflict = existingSessions.some(session => {
        const sessionStart = new Date(session.scheduled_at);
        const sessionEnd = addMinutes(sessionStart, session.duration_minutes);
        
        // Verificar se o mesmo dia
        if (sessionStart.toDateString() !== date.toDateString()) {
          return false;
        }

        const slotStart = new Date(date);
        slotStart.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
        
        const slotEnd = addMinutes(slotStart, settings.appointment_duration);
        
        // Verificar sobreposição
        return (
          (slotStart >= sessionStart && slotStart < sessionEnd) ||
          (slotEnd > sessionStart && slotEnd <= sessionEnd) ||
          (slotStart <= sessionStart && slotEnd >= sessionEnd)
        );
      });

      slots.push({
        time: timeString,
        available: !isConflict,
        reason: isConflict ? 'Horário ocupado' : undefined
      });
    }
    
    currentTime = addMinutes(currentTime, settings.appointment_interval);
  }

  return slots;
};

const parseTime = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const getDayOfWeek = (date: Date): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

export const getAvailableSlots = (
  date: Date,
  settings: SystemSettings,
  existingSessions: Session[]
): TimeSlot[] => {
  const allSlots = generateTimeSlots(date, settings, existingSessions);
  return allSlots.filter(slot => slot.available);
};

export const getNextAvailableSlot = (
  date: Date,
  settings: SystemSettings,
  existingSessions: Session[]
): TimeSlot | null => {
  const availableSlots = getAvailableSlots(date, settings, existingSessions);
  const now = new Date();
  
  // Se for hoje, retornar apenas slots futuros
  if (date.toDateString() === now.toDateString()) {
    const currentTime = format(now, 'HH:mm');
    return availableSlots.find(slot => slot.time > currentTime) || null;
  }
  
  // Se for dia futuro, retornar primeiro slot disponível
  return availableSlots[0] || null;
};