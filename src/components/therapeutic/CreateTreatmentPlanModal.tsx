import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Target, 
  Calendar, 
  Trash2,
  Edit,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateTreatmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName: string;
  onPlanCreated?: (planId: string) => void;
}

interface TherapeuticAction {
  id?: string;
  name: string;
  objective: string;
  frequency: string;
  priority: 'low' | 'medium' | 'high';
  start_date: string;
  end_date?: string;
  observations?: string;
}

export const CreateTreatmentPlanModal: React.FC<CreateTreatmentPlanModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  onPlanCreated
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields for treatment plan
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo' | 'concluido' | 'pausado'>('ativo');
  const [goals, setGoals] = useState<string[]>(['']);
  const [observations, setObservations] = useState('');
  
  // Therapeutic actions
  const [actions, setActions] = useState<TherapeuticAction[]>([]);
  const [showAddAction, setShowAddAction] = useState(false);
  const [editingAction, setEditingAction] = useState<number | null>(null);
  
  // Form for new/edit action
  const [actionForm, setActionForm] = useState<TherapeuticAction>({
    name: '',
    objective: '',
    frequency: '',
    priority: 'medium',
    start_date: new Date().toISOString().split('T')[0],
    observations: ''
  });

  const addGoal = () => {
    setGoals([...goals, '']);
  };

  const updateGoal = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };

  const removeGoal = (index: number) => {
    if (goals.length > 1) {
      setGoals(goals.filter((_, i) => i !== index));
    }
  };

  const resetActionForm = () => {
    setActionForm({
      name: '',
      objective: '',
      frequency: '',
      priority: 'medium',
      start_date: new Date().toISOString().split('T')[0],
      observations: ''
    });
    setEditingAction(null);
    setShowAddAction(false);
  };

  const handleAddAction = () => {
    if (!actionForm.name || !actionForm.objective || !actionForm.frequency) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, objetivo e frequência da ação",
        variant: "destructive",
      });
      return;
    }

    if (editingAction !== null) {
      // Edit existing action
      const newActions = [...actions];
      newActions[editingAction] = actionForm;
      setActions(newActions);
    } else {
      // Add new action
      setActions([...actions, actionForm]);
    }
    
    resetActionForm();
  };

  const handleEditAction = (index: number) => {
    setActionForm(actions[index]);
    setEditingAction(index);
    setShowAddAction(true);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Média';
    }
  };

  const handleSavePlan = async () => {
    if (!title || !description || !patientId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha título, descrição e selecione um paciente",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create treatment plan
      const { data: planData, error: planError } = await supabase
        .from('treatment_plans')
        .insert({
          patient_id: patientId,
          title,
          description,
          start_date: startDate,
          end_date: endDate || null,
          goals: goals.filter(goal => goal.trim() !== ''),
          status,
          observations
        })
        .select()
        .single();

      if (planError) {
        throw planError;
      }

      // Create therapeutic actions
      if (actions.length > 0) {
        const actionsToInsert = actions.map(action => ({
          treatment_plan_id: planData.id,
          name: action.name,
          objective: action.objective,
          frequency: action.frequency,
          priority: action.priority,
          start_date: action.start_date,
          end_date: action.end_date || null,
          observations: action.observations || null
        }));

        const { error: actionsError } = await supabase
          .from('therapeutic_actions')
          .insert(actionsToInsert);

        if (actionsError) {
          console.error('Erro ao criar ações:', actionsError);
          // Don't fail the whole process if actions can't be created
        }
      }

      toast({
        title: "Plano criado com sucesso",
        description: `Plano terapêutico "${title}" foi criado com ${actions.length} ações`,
      });

      onPlanCreated?.(planData.id);
      onClose();

    } catch (error) {
      console.error('Erro ao criar plano:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o plano terapêutico",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span>Criar Plano Terapêutico Manual</span>
          </DialogTitle>
          <DialogDescription>
            Crie um plano terapêutico personalizado para {patientName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] px-1">
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Título do Plano *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Reabilitação Postural Cervical"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva o objetivo geral do plano terapêutico..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="startDate">Data de Início *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Data de Término (Opcional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status do Plano</Label>
                    <Select value={status} onValueChange={(value: 'ativo' | 'inativo' | 'concluido' | 'pausado') => setStatus(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Objetivos do Tratamento</Label>
                  <div className="space-y-2">
                    {goals.map((goal, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          placeholder={`Objetivo ${index + 1}`}
                          value={goal}
                          onChange={(e) => updateGoal(index, e.target.value)}
                        />
                        {goals.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeGoal(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addGoal}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Objetivo
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="observations">Observações Gerais</Label>
                  <Textarea
                    id="observations"
                    placeholder="Observações adicionais sobre o plano..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Therapeutic Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Ações Terapêuticas
                  <Button
                    onClick={() => setShowAddAction(true)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Ação
                  </Button>
                </CardTitle>
                <CardDescription>
                  {actions.length} ações planejadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {actions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma ação terapêutica adicionada</p>
                    <p className="text-sm">Clique em "Adicionar Ação" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actions.map((action, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{action.name}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(action.priority)}>
                              {getPriorityLabel(action.priority)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAction(index)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAction(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{action.objective}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span>Frequência: {action.frequency}</span>
                          <span>Início: {new Date(action.start_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {action.observations && (
                          <p className="text-xs bg-muted p-2 rounded mt-2">{action.observations}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add/Edit Action Form */}
            {showAddAction && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {editingAction !== null ? 'Editar Ação' : 'Nova Ação Terapêutica'}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetActionForm}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="actionName">Nome da Ação *</Label>
                    <Input
                      id="actionName"
                      placeholder="Ex: Exercícios de fortalecimento cervical"
                      value={actionForm.name}
                      onChange={(e) => setActionForm({...actionForm, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="actionObjective">Objetivo *</Label>
                    <Textarea
                      id="actionObjective"
                      placeholder="Descreva o objetivo desta ação..."
                      value={actionForm.objective}
                      onChange={(e) => setActionForm({...actionForm, objective: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="actionFrequency">Frequência *</Label>
                      <Input
                        id="actionFrequency"
                        placeholder="Ex: 3x por semana"
                        value={actionForm.frequency}
                        onChange={(e) => setActionForm({...actionForm, frequency: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="actionPriority">Prioridade</Label>
                      <Select 
                        value={actionForm.priority} 
                        onValueChange={(value: 'low' | 'medium' | 'high') => 
                          setActionForm({...actionForm, priority: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="actionStartDate">Data de Início</Label>
                      <Input
                        id="actionStartDate"
                        type="date"
                        value={actionForm.start_date}
                        onChange={(e) => setActionForm({...actionForm, start_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="actionEndDate">Data de Término (Opcional)</Label>
                      <Input
                        id="actionEndDate"
                        type="date"
                        value={actionForm.end_date || ''}
                        onChange={(e) => setActionForm({...actionForm, end_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="actionObservations">Instruções/Observações</Label>
                    <Textarea
                      id="actionObservations"
                      placeholder="Instruções específicas, materiais necessários, observações..."
                      value={actionForm.observations}
                      onChange={(e) => setActionForm({...actionForm, observations: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={resetActionForm}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddAction}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingAction !== null ? 'Salvar Alterações' : 'Adicionar Ação'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSavePlan} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-transparent border-t-current" />
                Criando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Criar Plano Terapêutico
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};