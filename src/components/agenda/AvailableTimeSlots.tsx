import React from 'react';
import { Clock, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TimeSlot } from '@/utils/timeSlots';

interface AvailableTimeSlotsProps {
  date: Date;
  slots: TimeSlot[];
  onTimeSelect: (time: string) => void;
  isLoading: boolean;
}

export const AvailableTimeSlots: React.FC<AvailableTimeSlotsProps> = ({
  date,
  slots,
  onTimeSelect,
  isLoading
}) => {
  const availableSlots = slots.filter(slot => slot.available);
  const unavailableSlots = slots.filter(slot => !slot.available);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>Horários Disponíveis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-primary" />
          <span>Horários Disponíveis</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {date.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableSlots.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Não há horários disponíveis para esta data
            </p>
          </div>
        ) : (
          <>
            <div>
              <h4 className="font-medium text-sm text-foreground mb-3">
                Disponíveis ({availableSlots.length})
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant="outline"
                    size="sm"
                    onClick={() => onTimeSelect(slot.time)}
                    className="text-xs h-8 hover:bg-primary/10 hover:text-primary hover:border-primary"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            </div>
            
            {unavailableSlots.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">
                  Indisponíveis ({unavailableSlots.length})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {unavailableSlots.map((slot) => (
                    <div
                      key={slot.time}
                      className="relative group"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-xs h-8 w-full opacity-50"
                      >
                        {slot.time}
                      </Button>
                      {slot.reason && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                          {slot.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};