import React from 'react';
import { Calendar, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SimpleDateFilterProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  filterStatus: string;
  onStatusChange: (status: string) => void;
  customDate?: Date;
  onCustomDateChange?: (date: Date | undefined) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  title?: string;
}

export const SimpleDateFilter: React.FC<SimpleDateFilterProps> = ({
  selectedPeriod,
  onPeriodChange,
  filterStatus,
  onStatusChange,
  customDate,
  onCustomDateChange,
  statusOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'paid', label: 'Pago' },
    { value: 'pending', label: 'Pendente' },
    { value: 'overdue', label: 'Atrasado' }
  ],
  title = "Filtros"
}) => {
  const periodOptions = [
    { value: 'hoje', label: 'Hoje' },
    { value: 'mes-atual', label: 'Mês Atual' },
    { value: 'mes-anterior', label: 'Mês Anterior' },
    { value: 'trimestre-atual', label: 'Trimestre Atual' },
    { value: 'ano-atual', label: 'Ano Atual' },
    { value: 'ultimos-30-dias', label: 'Últimos 30 dias' },
    { value: 'ultimos-90-dias', label: 'Últimos 90 dias' },
    { value: 'personalizado', label: 'Personalizado' }
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Período</label>
          <Select value={selectedPeriod} onValueChange={onPeriodChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={filterStatus} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPeriod === 'personalizado' && onCustomDateChange && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Específica</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !customDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDate ? (
                    format(customDate, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecionar data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={customDate}
                  onSelect={onCustomDateChange}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
};