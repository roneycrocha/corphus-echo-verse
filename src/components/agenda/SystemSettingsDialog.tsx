import React, { useState } from 'react';
import { Settings, Clock, Calendar, Coffee, AlertCircle } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { SystemSettings, useSystemSettings } from '@/hooks/useSystemSettings';

export const SystemSettingsDialog: React.FC = () => {
  const { settings, updateSettings, isLoading } = useSystemSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const success = await updateSettings(formData);
      
      if (success) {
        toast({
          title: 'Sucesso',
          description: 'Configurações atualizadas com sucesso!',
        });
        setIsOpen(false);
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar as configurações.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro interno do sistema.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleWorkingDayToggle = (day: string, checked: boolean) => {
    const newWorkingDays = checked
      ? [...formData.working_days, day]
      : formData.working_days.filter(d => d !== day);
    
    setFormData({ ...formData, working_days: newWorkingDays });
  };

  const workingDayLabels = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span>Configurações</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configurações do Sistema</span>
          </DialogTitle>
          <DialogDescription>
            Configure os horários de funcionamento e intervalos entre consultas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Horário de Funcionamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Horário de Funcionamento</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Início</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.working_hours_start}
                    onChange={(e) => setFormData({
                      ...formData,
                      working_hours_start: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Fim</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.working_hours_end}
                    onChange={(e) => setFormData({
                      ...formData,
                      working_hours_end: e.target.value
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Consultas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Configurações de Consultas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração Padrão (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.appointment_duration}
                    onChange={(e) => setFormData({
                      ...formData,
                      appointment_duration: parseInt(e.target.value)
                    })}
                    min="15"
                    max="180"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Intervalo entre Consultas (minutos)</Label>
                  <Input
                    id="interval"
                    type="number"
                    value={formData.appointment_interval}
                    onChange={(e) => setFormData({
                      ...formData,
                      appointment_interval: parseInt(e.target.value)
                    })}
                    min="5"
                    max="60"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer">Tempo de Preparação (minutos)</Label>
                <Input
                  id="buffer"
                  type="number"
                  value={formData.buffer_time}
                  onChange={(e) => setFormData({
                    ...formData,
                    buffer_time: parseInt(e.target.value)
                  })}
                  min="0"
                  max="30"
                />
                <p className="text-xs text-muted-foreground">
                  Tempo adicional entre consultas para preparação
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Horário de Almoço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coffee className="w-4 h-4" />
                <span>Horário de Almoço</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lunch_start">Início</Label>
                  <Input
                    id="lunch_start"
                    type="time"
                    value={formData.lunch_break_start}
                    onChange={(e) => setFormData({
                      ...formData,
                      lunch_break_start: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lunch_end">Fim</Label>
                  <Input
                    id="lunch_end"
                    type="time"
                    value={formData.lunch_break_end}
                    onChange={(e) => setFormData({
                      ...formData,
                      lunch_break_end: e.target.value
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dias de Funcionamento */}
          <Card>
            <CardHeader>
              <CardTitle>Dias de Funcionamento</CardTitle>
              <CardDescription>
                Selecione os dias da semana em que a clínica funciona
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(workingDayLabels).map(([day, label]) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={formData.working_days.includes(day)}
                      onCheckedChange={(checked) => 
                        handleWorkingDayToggle(day, checked as boolean)
                      }
                    />
                    <Label htmlFor={day} className="text-sm">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Aviso */}
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-warning">
                    Importante
                  </p>
                  <p className="text-sm text-muted-foreground">
                    As alterações nas configurações afetarão os horários disponíveis 
                    para novos agendamentos. Agendamentos existentes não serão alterados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};