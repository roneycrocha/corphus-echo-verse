import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, DollarSign, Activity, Target, FileText, LogOut, MessageSquare, Eye, Bell, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';

interface TreatmentPlan {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: string | null;
  goals: string[] | null;
  patient_id: string;
}

interface TherapeuticAction {
  id: string;
  name: string;
  objective: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  priority: string;
  is_active: boolean;
  treatment_plan_id: string;
}

interface ActionExecution {
  id: string;
  action_id: string;
  execution_date: string;
  completed: boolean;
  patient_report: string | null;
  emotional_state: number | null;
  difficulty_level: string | null;
}

interface Session {
  id: string;
  scheduled_at: string;
  session_type: string;
  status: string | null;
  duration_minutes: number | null;
  price: number | null;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  status: string;
  payment_date: string | null;
  due_date: string | null;
}

interface TherapistFeedback {
  id: string;
  execution_id: string;
  therapist_id: string;
  feedback_text: string | null;
  quick_reaction: string | null;
  action_completed: boolean;
  created_at: string;
  is_read?: boolean;
}

export const MonitorPage: React.FC = () => {
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [actions, setActions] = useState<TherapeuticAction[]>([]);
  const [executions, setExecutions] = useState<ActionExecution[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feedbacks, setFeedbacks] = useState<TherapistFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [executionReport, setExecutionReport] = useState('');
  const [emotionalState, setEmotionalState] = useState<number | null>(null);
  const [difficultyLevel, setDifficultyLevel] = useState('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [editingExecution, setEditingExecution] = useState<ActionExecution | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [newActionsCount, setNewActionsCount] = useState(0);
  const [unreadFeedbacksCount, setUnreadFeedbacksCount] = useState(0);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const [therapistProfile, setTherapistProfile] = useState<any>(null);

  useEffect(() => {
    loadPatientData();
  }, [user]);

  useEffect(() => {
    if (selectedPatientId) {
      loadData();
    }
  }, [selectedPatientId]);

  const loadPatientData = async () => {
    if (!user) return;
    
    try {
      // Carregar dados do paciente logado
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (patientError) {
        console.error('Erro ao carregar dados do paciente:', patientError);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar seus dados.',
          variant: 'destructive'
        });
        return;
      }

      if (patientData) {
        setPatients([patientData]);
        setSelectedPatientId(patientData.id);
        
        // Carregar perfil do terapeuta responsável
        if (patientData.created_by) {
          loadTherapistProfile(patientData.created_by);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar paciente:', error);
    }
  };

  // Função para carregar perfil do terapeuta
  const loadTherapistProfile = async (therapistUserId: string) => {
    try {
      const { data: therapistData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', therapistUserId)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil do terapeuta:', error);
        return;
      }

      setTherapistProfile(therapistData);
    } catch (error) {
      console.error('Erro ao carregar perfil do terapeuta:', error);
    }
  };

  const loadData = async () => {
    if (!selectedPatientId) return;
    
    setLoading(true);
    try {
      // Reset estados para evitar dados de outros pacientes
      setTreatmentPlans([]);
      setActions([]);
      setExecutions([]);
      
      // Load treatment plans
      const { data: plansData, error: plansError } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', selectedPatientId)
        .eq('status', 'ativo');

      if (plansError) throw plansError;
      
      console.log('Planos de tratamento para o paciente:', selectedPatientId, plansData);
      setTreatmentPlans(plansData || []);

      // Load therapeutic actions apenas se houver planos
      if (plansData && plansData.length > 0) {
        const planIds = plansData.map(plan => plan.id);
        console.log('IDs dos planos:', planIds);
        
        const { data: actionsData, error: actionsError } = await supabase
          .from('therapeutic_actions')
          .select('*')
          .in('treatment_plan_id', planIds)
          .eq('is_active', true);

        if (actionsError) throw actionsError;
        
        console.log('Ações terapêuticas encontradas:', actionsData);
        setActions(actionsData || []);

        // Load action executions apenas se houver ações
        if (actionsData && actionsData.length > 0) {
          const actionIds = actionsData.map(action => action.id);
          
          const { data: executionsData, error: executionsError } = await supabase
            .from('action_executions')
            .select('*')
            .in('action_id', actionIds)
            .eq('patient_id', selectedPatientId);

          if (executionsError) throw executionsError;
          
          console.log('Execuções de ações encontradas:', executionsData);
          setExecutions(executionsData || []);
        }
      } else {
        console.log('Nenhum plano terapêutico ativo encontrado para o paciente:', selectedPatientId);
      }

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', selectedPatientId)
        .order('scheduled_at', { ascending: false })
        .limit(10);

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Load transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('patient_id', selectedPatientId)
        .order('transaction_date', { ascending: false })
        .limit(10);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Load feedbacks e contar notificações
      await loadFeedbacks();
      await countNotifications();

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus dados.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar feedbacks dos terapeutas
  const loadFeedbacks = async () => {
    if (!selectedPatientId) return;

    try {
      // Buscar execuções do paciente
      const { data: patientExecutions, error: executionsError } = await supabase
        .from('action_executions')
        .select('id')
        .eq('patient_id', selectedPatientId);

      if (executionsError) throw executionsError;

      const executionIds = patientExecutions?.map(exec => exec.id) || [];

      if (executionIds.length === 0) {
        setFeedbacks([]);
        return;
      }

      // Buscar feedbacks para essas execuções
      const { data: feedbacksData, error } = await supabase
        .from('therapist_feedback')
        .select(`
          id,
          execution_id,
          therapist_id,
          feedback_text,
          quick_reaction,
          action_completed,
          created_at
        `)
        .in('execution_id', executionIds);

      if (error) throw error;

      // Buscar quais feedbacks já foram lidos pelo paciente
      const feedbackIds = feedbacksData?.map(f => f.id) || [];

      if (feedbackIds.length > 0) {
        const { data: readFeedbacks } = await supabase
          .from('patient_feedback_reads')
          .select('feedback_id')
          .eq('patient_id', selectedPatientId)
          .in('feedback_id', feedbackIds);

        const readFeedbackIds = new Set(readFeedbacks?.map(r => r.feedback_id) || []);

        // Marcar feedbacks como lidos ou não lidos
        const allFeedbacks = feedbacksData?.map(f => ({
          ...f,
          is_read: readFeedbackIds.has(f.id)
        })) || [];

        setFeedbacks(allFeedbacks);
      }
    } catch (error) {
      console.error('Erro ao carregar feedbacks:', error);
    }
  };

  // Função para contar notificações
  const countNotifications = async () => {
    if (!selectedPatientId) return;

    try {
      // Contar novas ações (não notificadas)
      const { data: newActions } = await supabase
        .from('therapeutic_actions')
        .select('id')
        .eq('patient_notified', false)
        .eq('is_active', true)
        .in('treatment_plan_id', 
          treatmentPlans.map(plan => plan.id)
        );

      setNewActionsCount(newActions?.length || 0);

      // Contar feedbacks não lidos
      const unreadFeedbacks = feedbacks.filter(f => !f.is_read);
      setUnreadFeedbacksCount(unreadFeedbacks.length);

    } catch (error) {
      console.error('Erro ao contar notificações:', error);
    }
  };

  // Função para marcar feedback como lido
  const markFeedbackAsRead = async (feedbackId: string) => {
    if (!selectedPatientId) return;

    try {
      const { error } = await supabase
        .from('patient_feedback_reads')
        .insert({
          patient_id: selectedPatientId,
          feedback_id: feedbackId
        });

      if (error && !error.message.includes('duplicate')) {
        throw error;
      }

      // Atualizar estado local
      setFeedbacks(feedbacks.map(f => 
        f.id === feedbackId ? { ...f, is_read: true } : f
      ));

      // Atualizar contador
      setUnreadFeedbacksCount(prev => Math.max(0, prev - 1));

      toast({
        title: 'Feedback marcado como lido',
        description: 'Obrigado por ler o feedback!',
      });

    } catch (error) {
      console.error('Erro ao marcar feedback como lido:', error);
    }
  };

  // Função para marcar todas as ações como notificadas
  const markActionsAsNotified = async () => {
    if (!selectedPatientId) return;

    try {
      const planIds = treatmentPlans.map(plan => plan.id);
      
      await supabase
        .from('therapeutic_actions')
        .update({ patient_notified: true })
        .eq('patient_notified', false)
        .in('treatment_plan_id', planIds);

      setNewActionsCount(0);
    } catch (error) {
      console.error('Erro ao marcar ações como notificadas:', error);
    }
  };

  const markActionAsCompleted = async (actionId: string) => {
    if (!executionReport.trim()) {
      toast({
        title: 'Atenção',
        description: 'Por favor, descreva como você realizou a ação.',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedPatientId) {
      toast({
        title: 'Erro',
        description: 'Dados do paciente não encontrados.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Verificar se já existe uma execução para hoje
      const today = new Date().toISOString().split('T')[0];
      const { data: existingExecution } = await supabase
        .from('action_executions')
        .select('id')
        .eq('action_id', actionId)
        .eq('patient_id', selectedPatientId)
        .eq('execution_date', today)
        .single();

      if (existingExecution) {
        toast({
          title: 'Atenção',
          description: 'Esta ação já foi registrada hoje.',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('action_executions')
        .insert({
          action_id: actionId,
          patient_id: selectedPatientId,
          execution_date: today,
          completed: true,
          patient_report: executionReport.trim(),
          emotional_state: emotionalState && emotionalState >= 1 && emotionalState <= 5 ? emotionalState : null,
          difficulty_level: difficultyLevel || null
        });

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Ação marcada como concluída!',
        variant: 'default'
      });

      // Reset form
      setExecutionReport('');
      setEmotionalState(null);
      setDifficultyLevel('');
      setSelectedAction(null);

      // Reload executions
      await loadData();

    } catch (error: any) {
      console.error('Erro ao marcar ação como concluída:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível marcar a ação como concluída.',
        variant: 'destructive'
      });
    }
  };

  // Função para iniciar edição de uma execução
  const startEditingExecution = (execution: ActionExecution) => {
    // Limpar estados antes de definir os novos valores
    setSelectedAction(null);
    setExecutionReport('');
    setEmotionalState(null);
    setDifficultyLevel('');
    
    // Definir os valores da execução sendo editada
    setEditingExecution(execution);
    setExecutionReport(execution.patient_report || '');
    setEmotionalState(execution.emotional_state);
    setDifficultyLevel(execution.difficulty_level || '');
  };

  // Função para salvar edição de execução
  const saveExecutionEdit = async () => {
    if (!editingExecution || !executionReport.trim()) {
      toast({
        title: 'Atenção',
        description: 'Por favor, preencha o relatório da ação.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('action_executions')
        .update({
          patient_report: executionReport.trim(),
          emotional_state: emotionalState && emotionalState >= 1 && emotionalState <= 5 ? emotionalState : null,
          difficulty_level: difficultyLevel || null
        })
        .eq('id', editingExecution.id);

      if (error) {
        console.error('Erro detalhado ao atualizar:', error);
        throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Execução da ação atualizada com sucesso!',
        variant: 'default'
      });

      // Reset form
      setExecutionReport('');
      setEmotionalState(null);
      setDifficultyLevel('');
      setEditingExecution(null);

      // Reload executions
      await loadData();

    } catch (error: any) {
      console.error('Erro ao atualizar execução:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar a execução.',
        variant: 'destructive'
      });
    }
  };

  // Função para cancelar edição
  const cancelEdit = () => {
    setEditingExecution(null);
    setExecutionReport('');
    setEmotionalState(null);
    setDifficultyLevel('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logout realizado',
      description: 'Até logo!'
    });
  };

  const getActionProgress = (actionId: string) => {
    const actionExecutions = executions.filter(exec => exec.action_id === actionId);
    const completedExecutions = actionExecutions.filter(exec => exec.completed);
    return {
      total: actionExecutions.length,
      completed: completedExecutions.length,
      percentage: actionExecutions.length > 0 ? (completedExecutions.length / actionExecutions.length) * 100 : 0
    };
  };

  const getTotalProgress = () => {
    if (actions.length === 0) return 0;
    const totalCompleted = actions.reduce((acc, action) => {
      return acc + getActionProgress(action.id).completed;
    }, 0);
    return (totalCompleted / actions.length) * 100;
  };

  const getTreatmentPlanProgress = (planId: string) => {
    const planActions = actions.filter(action => action.treatment_plan_id === planId);
    if (planActions.length === 0) return 0;

    const completedActions = planActions.filter(action => {
      return executions.some(exec => 
        exec.action_id === action.id && 
        exec.completed === true
      );
    });

    return (completedActions.length / planActions.length) * 100;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada': return 'bg-blue-500';
      case 'realizada': return 'bg-green-500';
      case 'cancelada': return 'bg-red-500';
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading || !selectedPatientId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header com Logo e Dados do Usuário */}
      <div className="bg-white shadow-sm border-b px-4 py-4 md:px-6">
        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
          {/* Logo e Título */}
          <div className="flex items-center space-x-3">
            {therapistProfile?.logo_url ? (
              <Avatar className="h-10 w-10 md:h-12 md:w-12">
                <AvatarImage src={therapistProfile.logo_url} alt="Logo" />
                <AvatarFallback>
                  <Activity className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-10 w-10 md:h-12 md:w-12 bg-primary rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
            )}
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-primary">Monitor Terapêutico</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Acompanhe a evolução - {selectedPatient?.name}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-center space-y-2 md:flex-row md:space-y-0 md:space-x-4">
            {/* Dados do Terapeuta */}
            {therapistProfile && (
              <div className="flex items-center space-x-3 bg-muted/50 rounded-lg px-4 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={therapistProfile.avatar_url} alt={therapistProfile.full_name} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left">
                  <div className="text-sm font-medium">{therapistProfile.full_name}</div>
                  <div className="text-xs text-muted-foreground">{therapistProfile.job_title || 'Terapeuta'}</div>
                </div>
              </div>
            )}
            
            {/* Progresso Geral */}
            <div className="text-center bg-muted/50 rounded-lg px-4 py-2 min-w-[120px]">
              <div className="text-xl md:text-2xl font-bold text-primary">{Math.round(getTotalProgress())}%</div>
              <div className="text-xs md:text-sm text-muted-foreground">Progresso Geral</div>
            </div>
            
            {/* Botão de Logout */}
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sair</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 md:p-6">
        <Tabs defaultValue="actions" className="w-full" onValueChange={(value) => {
          if (value === "actions" && newActionsCount > 0) {
            markActionsAsNotified();
          }
        }}>
          {/* Tabs Navigation - Responsivo */}
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1">
            <TabsTrigger value="treatment" className="text-xs md:text-sm py-2 px-2">
              <Target className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Tratamento</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs md:text-sm py-2 px-2 relative">
              <Activity className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Ações</span>
              {newActionsCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {newActionsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="appointments" className="text-xs md:text-sm py-2 px-2">
              <Calendar className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Agendamentos</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs md:text-sm py-2 px-2">
              <DollarSign className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Financeiro</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="treatment" className="space-y-6">
          <div className="grid gap-6">
            {treatmentPlans.map((plan) => {
              const planProgress = getTreatmentPlanProgress(plan.id);
              const planActions = actions.filter(action => action.treatment_plan_id === plan.id);
              const completedActions = planActions.filter(action => {
                return executions.some(exec => 
                  exec.action_id === action.id && 
                  exec.completed === true
                );
              });

              return (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Target className="w-5 h-5" />
                        <span>{plan.title}</span>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{Math.round(planProgress)}%</div>
                        <div className="text-xs text-muted-foreground">Progresso</div>
                      </div>
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Progresso do Plano</span>
                          <span>{completedActions.length} de {planActions.length} ações concluídas</span>
                        </div>
                        <Progress value={planProgress} className="w-full" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Data de Início</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(plan.start_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        {plan.end_date && (
                          <div>
                            <p className="text-sm font-medium">Data de Término</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(plan.end_date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {plan.goals && plan.goals.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Objetivos</p>
                          <div className="space-y-1">
                            {plan.goals.map((goal, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm">{goal}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          {/* Seção de Feedbacks */}
          {feedbacks.length > 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-800">Feedbacks do Terapeuta</span>
                  </div>
                  {unreadFeedbacksCount > 0 && (
                    <Badge className="bg-red-500 text-white">
                      {unreadFeedbacksCount} novos
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Veja os comentários do seu terapeuta sobre suas ações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {feedbacks
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((feedback) => {
                      const execution = executions.find(e => e.id === feedback.execution_id);
                      const action = actions.find(a => a.id === execution?.action_id);
                      
                      return (
                        <div 
                          key={feedback.id} 
                          className={`p-4 rounded-lg border ${
                            feedback.is_read 
                              ? 'bg-white border-gray-200' 
                              : 'bg-yellow-50 border-yellow-300 shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm text-gray-900">
                                {action?.name || 'Ação não encontrada'}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {new Date(feedback.created_at).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(feedback.created_at).toLocaleTimeString('pt-BR')}
                              </p>
                            </div>
                            {!feedback.is_read && (
                              <Badge className="bg-red-100 text-red-700 text-xs">
                                Novo
                              </Badge>
                            )}
                          </div>
                          
                          {feedback.quick_reaction && (
                            <div className="mb-2 p-2 bg-blue-100 rounded text-sm">
                              <span className="font-medium text-blue-800">Reação: </span>
                              <span className="text-blue-700">{feedback.quick_reaction}</span>
                            </div>
                          )}
                          
                          {feedback.feedback_text && (
                            <div className="mb-3 text-sm text-gray-700 leading-relaxed">
                              {feedback.feedback_text}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              Execução de {execution && new Date(execution.execution_date).toLocaleDateString('pt-BR')}
                            </div>
                            {!feedback.is_read && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markFeedbackAsRead(feedback.id)}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Marcar como lido
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seção de Ações */}
          <div className="grid gap-6">
            {actions.map((action) => {
              const isSelected = selectedAction === action.id;
              const hasExecution = executions.some(exec => 
                exec.action_id === action.id && 
                exec.execution_date === new Date().toISOString().split('T')[0]
              );

              return (
                <Card key={action.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-5 h-5" />
                        <span>{action.name}</span>
                        {hasExecution && (
                          <Badge variant="default" className="bg-green-500">
                            Executada Hoje
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="secondary" 
                          className={`${getPriorityColor(action.priority)} text-white`}
                        >
                          {action.priority}
                        </Badge>
                        <Badge variant="outline">{action.frequency}</Badge>
                      </div>
                    </CardTitle>
                    <CardDescription>{action.objective}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {!hasExecution && (
                        <div className="space-y-4">
                          {!isSelected ? (
                            <Button 
                              onClick={() => {
                                // Limpar campos antes de selecionar nova ação
                                setExecutionReport('');
                                setEmotionalState(null);
                                setDifficultyLevel('');
                                setSelectedAction(action.id);
                              }}
                              className="w-full"
                            >
                              Marcar como Concluído Hoje
                            </Button>
                          ) : (
                            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                              <div>
                                <label className="text-sm font-medium">Como você realizou esta ação?</label>
                                <Textarea
                                  placeholder="Descreva como você completou esta ação..."
                                  value={executionReport}
                                  onChange={(e) => setExecutionReport(e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Estado Emocional (1-5)</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={emotionalState || ''}
                                    onChange={(e) => setEmotionalState(Number(e.target.value))}
                                    className="mt-1 w-full px-3 py-2 border rounded-md"
                                    placeholder="1-5"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Dificuldade</label>
                                  <select
                                    value={difficultyLevel}
                                    onChange={(e) => setDifficultyLevel(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md"
                                  >
                                    <option value="">Selecione...</option>
                                    <option value="low">Fácil</option>
                                    <option value="medium">Médio</option>
                                    <option value="high">Difícil</option>
                                  </select>
                                </div>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button 
                                  onClick={() => markActionAsCompleted(action.id)}
                                  className="flex-1"
                                >
                                  Confirmar Conclusão
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setSelectedAction(null);
                                    setExecutionReport('');
                                    setEmotionalState(null);
                                    setDifficultyLevel('');
                                  }}
                                  className="flex-1"
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Seção de Execuções Passadas */}
                      {(() => {
                        const actionExecutions = executions.filter(exec => exec.action_id === action.id);
                        return actionExecutions.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Execuções Anteriores</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {actionExecutions
                                .sort((a, b) => new Date(b.execution_date).getTime() - new Date(a.execution_date).getTime())
                                .map((execution) => (
                                  <div key={execution.id} className="p-3 border rounded-lg bg-muted/30">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">
                                        {new Date(execution.execution_date).toLocaleDateString('pt-BR')}
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        {execution.completed && (
                                          <Badge variant="default" className="bg-green-500 text-xs">
                                            Concluída
                                          </Badge>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => startEditingExecution(execution)}
                                          className="h-7 px-2 text-xs"
                                        >
                                          Editar
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {execution.patient_report && (
                                      <p className="text-sm text-muted-foreground mb-2">
                                        {execution.patient_report}
                                      </p>
                                    )}
                                    
                                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                      {execution.emotional_state && (
                                        <span>Estado emocional: {execution.emotional_state}/5</span>
                                      )}
                                      {execution.difficulty_level && (
                                        <span>Dificuldade: {execution.difficulty_level}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        );
                      })()}

                      {hasExecution && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Ação já concluída hoje!
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Próximos Agendamentos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{session.session_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.scheduled_at).toLocaleString('pt-BR')}
                      </p>
                      {session.duration_minutes && (
                        <p className="text-sm text-muted-foreground">
                          Duração: {session.duration_minutes} minutos
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="secondary"
                        className={`${getStatusColor(session.status || '')} text-white`}
                      >
                        {session.status}
                      </Badge>
                      {session.price && (
                        <p className="text-sm font-medium mt-1">
                          R$ {session.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Extrato Financeiro</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
                      </p>
                      {transaction.due_date && (
                        <p className="text-sm text-muted-foreground">
                          Vencimento: {new Date(transaction.due_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-lg">
                        R$ {transaction.amount.toFixed(2)}
                      </p>
                      <Badge 
                        variant="secondary"
                        className={`${getStatusColor(transaction.status)} text-white`}
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Edição de Execução */}
      {editingExecution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Editar Execução</h3>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>×</Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Data da Execução</label>
                <p className="text-sm text-muted-foreground">
                  {new Date(editingExecution.execution_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Como você realizou esta ação?</label>
                <Textarea
                  placeholder="Descreva como você completou esta ação..."
                  value={executionReport}
                  onChange={(e) => setExecutionReport(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Estado Emocional (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={emotionalState || ''}
                    onChange={(e) => setEmotionalState(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="1-5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Dificuldade</label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Selecione...</option>
                    <option value="low">Fácil</option>
                    <option value="medium">Médio</option>
                    <option value="high">Difícil</option>
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button onClick={saveExecutionEdit} className="flex-1">
                  Salvar Alterações
                </Button>
                <Button variant="outline" onClick={cancelEdit} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};