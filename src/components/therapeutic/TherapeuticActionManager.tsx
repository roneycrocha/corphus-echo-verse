import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  TrendingUp,
  Award,
  Upload,
  Send,
  Smile,
  Meh,
  Frown,
  ThumbsUp,
  Heart,
  Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TherapeuticAction {
  id: string;
  treatment_plan_id: string;
  name: string;
  objective: string;
  frequency: 'daily' | 'weekly' | 'unique';
  start_date: string;
  end_date?: string;
  priority: 'low' | 'medium' | 'high';
  observations?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ActionExecution {
  id: string;
  action_id: string;
  patient_id: string;
  execution_date: string;
  completed: boolean;
  patient_report?: string;
  emotional_state?: number;
  difficulty_level?: 'low' | 'medium' | 'high';
  evidence_files?: string[];
  created_at: string;
  updated_at: string;
}

interface TherapistFeedback {
  id: string;
  execution_id: string;
  therapist_id: string;
  feedback_text?: string;
  quick_reaction?: string;
  action_completed: boolean;
  created_at: string;
}

interface TherapeuticActionManagerProps {
  treatmentPlanId: string;
  patientId: string;
  userRole: 'therapist' | 'patient';
}

export const TherapeuticActionManager: React.FC<TherapeuticActionManagerProps> = ({
  treatmentPlanId,
  patientId,
  userRole
}) => {
  const [actions, setActions] = useState<TherapeuticAction[]>([]);
  const [executions, setExecutions] = useState<ActionExecution[]>([]);
  const [feedbacks, setFeedbacks] = useState<TherapistFeedback[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form states
  const [actionForm, setActionForm] = useState({
    name: '',
    objective: '',
    frequency: 'daily' as 'daily' | 'weekly' | 'unique',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    observations: ''
  });

  const [executionForm, setExecutionForm] = useState({
    patient_report: '',
    emotional_state: 3,
    difficulty_level: 'medium' as 'low' | 'medium' | 'high'
  });

  const [feedbackForm, setFeedbackForm] = useState({
    feedback_text: '',
    quick_reaction: ''
  });

  useEffect(() => {
    loadData();
  }, [treatmentPlanId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar ações terapêuticas
      const { data: actionsData, error: actionsError } = await supabase
        .from('therapeutic_actions')
        .select('*')
        .eq('treatment_plan_id', treatmentPlanId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (actionsError) throw actionsError;

      // Carregar execuções
      const { data: executionsData, error: executionsError } = await supabase
        .from('action_executions')
        .select('*')
        .eq('patient_id', patientId)
        .order('execution_date', { ascending: false });

      if (executionsError) throw executionsError;

      // Carregar feedbacks
      const { data: feedbacksData, error: feedbacksError } = await supabase
        .from('therapist_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (feedbacksError) throw feedbacksError;

      setActions(actionsData as TherapeuticAction[] || []);
      setExecutions(executionsData as ActionExecution[] || []);
      setFeedbacks(feedbacksData as TherapistFeedback[] || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as ações terapêuticas.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createAction = async () => {
    try {
      if (!actionForm.name || !actionForm.objective) {
        toast({
          title: 'Erro',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('therapeutic_actions')
        .insert([{
          treatment_plan_id: treatmentPlanId,
          ...actionForm
        }]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Ação terapêutica criada com sucesso!',
      });

      setIsCreateDialogOpen(false);
      resetActionForm();
      loadData();

    } catch (error) {
      console.error('Erro ao criar ação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a ação terapêutica.',
        variant: 'destructive'
      });
    }
  };

  const executeAction = async (actionId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('action_executions')
        .upsert([{
          action_id: actionId,
          patient_id: patientId,
          execution_date: today,
          completed: true,
          ...executionForm
        }]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Ação registrada com sucesso!',
      });

      resetExecutionForm();
      loadData();

    } catch (error) {
      console.error('Erro ao executar ação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a execução.',
        variant: 'destructive'
      });
    }
  };

  const addFeedback = async (executionId: string) => {
    try {
      const { error } = await supabase
        .from('therapist_feedback')
        .insert([{
          execution_id: executionId,
          therapist_id: 'current-user-id', // Substituir pela ID real do usuário
          ...feedbackForm
        }]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Feedback adicionado com sucesso!',
      });

      resetFeedbackForm();
      loadData();

    } catch (error) {
      console.error('Erro ao adicionar feedback:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o feedback.',
        variant: 'destructive'
      });
    }
  };

  const resetActionForm = () => {
    setActionForm({
      name: '',
      objective: '',
      frequency: 'daily',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      priority: 'medium',
      observations: ''
    });
  };

  const resetExecutionForm = () => {
    setExecutionForm({
      patient_report: '',
      emotional_state: 3,
      difficulty_level: 'medium'
    });
  };

  const resetFeedbackForm = () => {
    setFeedbackForm({
      feedback_text: '',
      quick_reaction: ''
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Diária';
      case 'weekly': return 'Semanal';
      case 'unique': return 'Única';
      default: return frequency;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getEmotionalIcon = (state: number) => {
    if (state <= 2) return <Frown className="w-4 h-4 text-red-500" />;
    if (state <= 3) return <Meh className="w-4 h-4 text-yellow-500" />;
    return <Smile className="w-4 h-4 text-green-500" />;
  };

  const calculateProgress = () => {
    if (actions.length === 0) return 0;
    const completedActions = executions.filter(e => e.completed).length;
    return Math.round((completedActions / actions.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Plano de Ação Terapêutico</h2>
          <p className="text-muted-foreground">
            {userRole === 'therapist' 
              ? 'Gerencie e acompanhe as ações do paciente'
              : 'Acompanhe suas atividades terapêuticas'
            }
          </p>
        </div>

        {userRole === 'therapist' && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Nova Ação</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Ação Terapêutica</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Ação *</Label>
                    <Input
                      id="name"
                      value={actionForm.name}
                      onChange={(e) => setActionForm({...actionForm, name: e.target.value})}
                      placeholder="Ex: Exercícios de respiração"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequência *</Label>
                    <Select value={actionForm.frequency} onValueChange={(value) => setActionForm({...actionForm, frequency: value as any})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="unique">Única</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objective">Objetivo *</Label>
                  <Textarea
                    id="objective"
                    value={actionForm.objective}
                    onChange={(e) => setActionForm({...actionForm, objective: e.target.value})}
                    placeholder="Descreva o objetivo desta ação..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Data de Início *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={actionForm.start_date}
                      onChange={(e) => setActionForm({...actionForm, start_date: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Data de Término</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={actionForm.end_date}
                      onChange={(e) => setActionForm({...actionForm, end_date: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select value={actionForm.priority} onValueChange={(value) => setActionForm({...actionForm, priority: value as any})}>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    value={actionForm.observations}
                    onChange={(e) => setActionForm({...actionForm, observations: e.target.value})}
                    placeholder="Instruções adicionais..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createAction}>
                    Criar Ação
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Progresso Geral</h3>
            <Badge variant="outline">{calculateProgress()}% Concluído</Badge>
          </div>
          <Progress value={calculateProgress()} className="w-full" />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>{actions.length} ações criadas</span>
            <span>{executions.filter(e => e.completed).length} execuções registradas</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions List */}
      <div className="space-y-4">
        {actions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhuma ação criada</h3>
              <p className="text-muted-foreground">
                {userRole === 'therapist' 
                  ? 'Comece criando uma nova ação terapêutica para o paciente'
                  : 'Aguarde seu terapeuta criar ações para você'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          actions.map((action) => {
            const actionExecutions = executions.filter(e => e.action_id === action.id);
            const latestExecution = actionExecutions[0];
            const isCompleted = latestExecution?.completed || false;

            return (
              <Card key={action.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <CardTitle className="text-lg">{action.name}</CardTitle>
                        <Badge className={getPriorityColor(action.priority)}>
                          {action.priority === 'high' ? 'Alta' : action.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                        <Badge variant="outline">
                          {getFrequencyLabel(action.frequency)}
                        </Badge>
                      </div>
                      <CardDescription>{action.objective}</CardDescription>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Início:</span>
                      <p className="font-medium">{format(new Date(action.start_date), 'dd/MM/yyyy')}</p>
                    </div>
                    {action.end_date && (
                      <div>
                        <span className="text-muted-foreground">Término:</span>
                        <p className="font-medium">{format(new Date(action.end_date), 'dd/MM/yyyy')}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Execuções:</span>
                      <p className="font-medium">{actionExecutions.length}</p>
                    </div>
                  </div>

                  {/* Patient View */}
                  {userRole === 'patient' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Registrar Execução</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={isCompleted}
                            onCheckedChange={() => executeAction(action.id)}
                          />
                          <span className="text-sm">Marcar como realizada hoje</span>
                        </div>
                        
                        <Textarea
                          placeholder="Como foi a execução? Descreva sua experiência..."
                          value={executionForm.patient_report}
                          onChange={(e) => setExecutionForm({...executionForm, patient_report: e.target.value})}
                          rows={2}
                        />
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">Humor:</span>
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map((level) => (
                                <Button
                                  key={level}
                                  variant={executionForm.emotional_state === level ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setExecutionForm({...executionForm, emotional_state: level})}
                                >
                                  {getEmotionalIcon(level)}
                                </Button>
                              ))}
                            </div>
                          </div>
                          
                          <Select 
                            value={executionForm.difficulty_level} 
                            onValueChange={(value) => setExecutionForm({...executionForm, difficulty_level: value as any})}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Fácil</SelectItem>
                              <SelectItem value="medium">Médio</SelectItem>
                              <SelectItem value="high">Difícil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Therapist View */}
                  {userRole === 'therapist' && latestExecution && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Última Execução</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4 text-sm">
                          <span>Data: {format(new Date(latestExecution.execution_date), 'dd/MM/yyyy')}</span>
                          <span className="flex items-center space-x-1">
                            {getEmotionalIcon(latestExecution.emotional_state || 3)}
                            <span>Humor: {latestExecution.emotional_state}/5</span>
                          </span>
                          <span className={getDifficultyColor(latestExecution.difficulty_level || 'medium')}>
                            Dificuldade: {latestExecution.difficulty_level || 'Não informada'}
                          </span>
                        </div>
                        
                        {latestExecution.patient_report && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm">{latestExecution.patient_report}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 mt-3">
                          <Input
                            placeholder="Adicionar feedback..."
                            value={feedbackForm.feedback_text}
                            onChange={(e) => setFeedbackForm({...feedbackForm, feedback_text: e.target.value})}
                          />
                          <Button size="sm" onClick={() => addFeedback(latestExecution.id)}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex space-x-2">
                          {['👍', '❤️', '⭐', '🎯', '💪'].map((emoji) => (
                            <Button
                              key={emoji}
                              variant="outline"
                              size="sm"
                              onClick={() => setFeedbackForm({...feedbackForm, quick_reaction: emoji})}
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};