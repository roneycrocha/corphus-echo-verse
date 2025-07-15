import React, { useState } from 'react';
import { Calendar, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangeFilterProps {
  onRangeChange: (range: DateRange) => void;
  defaultRange?: DateRange;
  title?: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  onRangeChange,
  defaultRange,
  title = "Filtro de Período"
}) => {
  const [dateRange, setDateRange] = useState<DateRange>(
    defaultRange || { from: startOfMonth(new Date()), to: endOfMonth(new Date()) }
  );
  const [quickSelect, setQuickSelect] = useState<string>('mes-atual');

  const handleQuickSelect = (value: string) => {
    setQuickSelect(value);
    const now = new Date();
    let newRange: DateRange = { from: undefined, to: undefined };

    switch (value) {
      case 'hoje':
        newRange = { from: now, to: now };
        break;
      case 'mes-atual':
        newRange = { from: startOfMonth(now), to: endOfMonth(now) };
        break;
      case 'mes-anterior':
        const lastMonth = subMonths(now, 1);
        newRange = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        break;
      case 'trimestre-atual':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        newRange = { from: quarterStart, to: quarterEnd };
        break;
      case 'ano-atual':
        newRange = { from: startOfYear(now), to: endOfYear(now) };
        break;
      case 'ano-anterior':
        const lastYear = subYears(now, 1);
        newRange = { from: startOfYear(lastYear), to: endOfYear(lastYear) };
        break;
      case 'ultimos-30-dias':
        newRange = { from: subMonths(now, 1), to: now };
        break;
      case 'ultimos-90-dias':
        newRange = { from: subMonths(now, 3), to: now };
        break;
      default:
        return;
    }

    setDateRange(newRange);
    onRangeChange(newRange);
  };

  const handleCustomDateChange = (range: DateRange) => {
    setDateRange(range);
    setQuickSelect('personalizado');
    onRangeChange(range);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Período Rápido</label>
            <Select value={quickSelect} onValueChange={handleQuickSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="mes-atual">Mês Atual</SelectItem>
                <SelectItem value="mes-anterior">Mês Anterior</SelectItem>
                <SelectItem value="trimestre-atual">Trimestre Atual</SelectItem>
                <SelectItem value="ano-atual">Ano Atual</SelectItem>
                <SelectItem value="ano-anterior">Ano Anterior</SelectItem>
                <SelectItem value="ultimos-30-dias">Últimos 30 dias</SelectItem>
                <SelectItem value="ultimos-90-dias">Últimos 90 dias</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Período Personalizado</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Data inicial</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange?.from}
                    onSelect={(date) => handleCustomDateChange({ ...dateRange, from: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !dateRange?.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.to ? (
                      format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Data final</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange?.to}
                    onSelect={(date) => handleCustomDateChange({ ...dateRange, to: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {dateRange?.from && dateRange?.to && (
            <p>
              Período selecionado: {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} até{" "}
              {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};