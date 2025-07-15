import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Plus, 
  Search,
  Filter,
  Clock,
  Calendar,
  Activity,
  FileText,
  Stethoscope,
  Target,
  TrendingUp,
  ChevronRight,
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Eye,
  EyeOff,
  Users,
  Sparkles,
  Brain
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TreatmentPlanManager } from '@/components/therapeutic/TreatmentPlanManager';
import { TherapeuticActionManager } from '@/components/therapeutic/TherapeuticActionManager';
import { TherapeuticDashboard } from '@/components/therapeutic/TherapeuticDashboard';
import { useUserAIAgent } from '@/hooks/useUserAIAgent';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  birth_date: string;
  gender: string;
  occupation: string;
  created_at: string;
}

interface TreatmentPlan {
  id: string;
  patient_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  goals: string[];
  patient?: Patient;
}

interface Session {
  id: string;
  patient_id: string;
  scheduled_at: string;
  session_type: string;
  status: string;
  duration_minutes: number;
  price: number;
  patient?: Patient;
}

interface ActionExecution {
  id: string;
  action_id: string;
  patient_id: string;
  completed: boolean;
  execution_date: string;
  patient_report: string;
  emotional_state: number;
  difficulty_level: string;
  created_at: string;
  therapeutic_actions?: {
    id: string;
    name: string;
    objective: string;
    treatment_plan_id: string;
  };
  patients?: Patient;
  therapist_feedback?: Array<{
    id: string;
    therapist_id: string;
    feedback_text: string;
    quick_reaction: string;
    action_completed: boolean;
    created_at: string;
  }>;
}

/**
 * Monitor Terapêutico - Sistema de acompanhamento de pacientes e feedback de ações
 * Sistema completo para monitorar execuções de ações terapêuticas e fornecer feedback
 */
export const GestaoTerapeuticaPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [pendingActions, setPendingActions] = useState<ActionExecution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  // Estados para o modal de feedback
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionExecution | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [quickReaction, setQuickReaction] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showNewActionForm, setShowNewActionForm] = useState(false);
  const [newActionName, setNewActionName] = useState('');
  const [newActionObjective, setNewActionObjective] = useState('');
  
  // Estados para sugestões de ações por IA
  const [suggestedActions, setSuggestedActions] = useState<Array<{
    name: string;
    objective: string;
    frequency: string;
    priority: string;
    rationale: string;
  }>>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { toast } = useToast();
  const { getSelectedAgentId } = useUserAIAgent();

  // Carregar dados do Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar pacientes
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // Carregar planos de tratamento com dados do paciente
      const { data: plansData, error: plansError } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          patient:patients(*)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (plansError) throw plansError;
      setTreatmentPlans(plansData || []);

      // Carregar sessões recentes
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          patient:patients(*)
        `)
        .order('scheduled_at', { ascending: false })
        .limit(8);

      if (sessionsError) throw sessionsError;
      setRecentSessions(sessionsData || []);

      // Carregar ações executadas pendentes de feedback
      const { data: actionsData, error: actionsError } = await supabase
        .from('action_executions')
        .select(`
          *,
          therapeutic_actions:therapeutic_actions(*),
          patients:patients(*)
        `)
        .eq('completed', true)
        .order('execution_date', { ascending: false });

      if (actionsError) throw actionsError;

      // Buscar todos os feedbacks existentes
      const { data: feedbacksData } = await supabase
        .from('therapist_feedback')
        .select('execution_id');

      const executionIdsWithFeedback = new Set(
        feedbacksData?.map(feedback => feedback.execution_id) || []
      );
      
      // Filtrar apenas ações sem feedback do terapeuta
      const pendingFeedback = (actionsData || []).filter(action => 
        !executionIdsWithFeedback.has(action.id)
      );
      
      setPendingActions(pendingFeedback);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-success/10 text-success border-success/20';
      case 'concluido': return 'bg-primary/10 text-primary border-primary/20';
      case 'pausado': return 'bg-warning/10 text-warning border-warning/20';
      case 'cancelado': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'agendada': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'confirmada': return 'bg-success/10 text-success border-success/20';
      case 'concluida': return 'bg-primary/10 text-primary border-primary/20';
      case 'cancelada': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'ativo': 'Ativo',
      'concluido': 'Concluído',
      'pausado': 'Pausado',
      'cancelado': 'Cancelado',
      'agendada': 'Agendada',
      'confirmada': 'Confirmada',
      'concluida': 'Concluída',
      'cancelada': 'Cancelada',
      'faltou': 'Faltou'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Função para abrir o modal de feedback
  const handleOpenFeedbackModal = (action: ActionExecution) => {
    setSelectedAction(action);
    setFeedbackText('');
    setQuickReaction('');
    setIsModalOpen(true);
  };

  // Função para fechar o modal
  const handleCloseFeedbackModal = () => {
    setIsModalOpen(false);
    setSelectedAction(null);
    setFeedbackText('');
    setQuickReaction('');
  };

  // Função para submeter o feedback
  const handleSubmitFeedback = async () => {
    if (!selectedAction) return;

    setIsSubmittingFeedback(true);
    try {
      // Buscar o ID do terapeuta atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para dar feedback.",
          variant: "destructive",
        });
        return;
      }

      // Criar o feedback na tabela therapist_feedback
      const { error } = await supabase
        .from('therapist_feedback')
        .insert({
          execution_id: selectedAction.id,
          therapist_id: user.id,
          feedback_text: feedbackText,
          quick_reaction: quickReaction,
          action_completed: true
        });

      if (error) throw error;

      toast({
        title: "Feedback enviado!",
        description: "Seu feedback foi registrado com sucesso.",
      });

      // Recarregar os dados para atualizar a lista
      loadData();
      handleCloseFeedbackModal();

    } catch (error: any) {
      console.error('Erro ao enviar feedback:', error);
      toast({
        title: "Erro ao enviar feedback",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Função para gerar feedback com IA
  const handleGenerateAIFeedback = async () => {
    if (!selectedAction) return;

    setIsGeneratingAI(true);
    try {
      // Buscar informações do plano terapêutico
      const { data: treatmentPlan } = await supabase
        .from('treatment_plans')
        .select('title, description')
        .eq('id', selectedAction.therapeutic_actions?.treatment_plan_id)
        .single();

      const { data, error } = await supabase.functions.invoke('generate-feedback', {
        body: {
          actionName: selectedAction.therapeutic_actions?.name,
          actionObjective: selectedAction.therapeutic_actions?.objective,
          patientName: selectedAction.patients?.name,
          patientReport: selectedAction.patient_report || 'Nenhum relatório fornecido',
          emotionalState: selectedAction.emotional_state || 5,
          difficultyLevel: selectedAction.difficulty_level || 'Não informado',
          executionDate: selectedAction.execution_date,
          treatmentPlanTitle: treatmentPlan?.title,
          treatmentPlanDescription: treatmentPlan?.description,
          assistantId: getSelectedAgentId()
        }
      });

      if (error) throw error;

      if (data?.feedback) {
        setFeedbackText(data.feedback);
        toast({
          title: "Feedback gerado!",
          description: "O feedback foi gerado com IA. Você pode editá-lo antes de enviar.",
        });
      }

    } catch (error: any) {
      console.error('Erro ao gerar feedback com IA:', error);
      toast({
        title: "Erro ao gerar feedback",
        description: "Não foi possível gerar o feedback com IA. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Função para criar nova ação
  const handleCreateNewAction = async () => {
    if (!selectedAction || !newActionName || !newActionObjective) return;

    try {
      const { error } = await supabase
        .from('therapeutic_actions')
        .insert({
          treatment_plan_id: selectedAction.therapeutic_actions?.treatment_plan_id,
          name: newActionName,
          objective: newActionObjective,
          frequency: 'daily',
          priority: 'medium',
          start_date: new Date().toISOString().split('T')[0],
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Nova ação criada!",
        description: "A nova ação terapêutica foi adicionada ao plano terapêutico.",
      });

      // Limpar formulário
      setNewActionName('');
      setNewActionObjective('');
      setShowNewActionForm(false);

    } catch (error: any) {
      console.error('Erro ao criar nova ação:', error);
      toast({
        title: "Erro ao criar ação",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para sugerir ações com IA
  const handleSuggestActions = async () => {
    if (!selectedAction) return;

    setIsGeneratingSuggestions(true);
    try {
      // Buscar informações do plano terapêutico
      const { data: treatmentPlan } = await supabase
        .from('treatment_plans')
        .select('title, description')
        .eq('id', selectedAction.therapeutic_actions?.treatment_plan_id)
        .single();

      const { data, error } = await supabase.functions.invoke('suggest-actions', {
        body: {
          actionName: selectedAction.therapeutic_actions?.name,
          actionObjective: selectedAction.therapeutic_actions?.objective,
          patientName: selectedAction.patients?.name,
          patientReport: selectedAction.patient_report || 'Nenhum relatório fornecido',
          emotionalState: selectedAction.emotional_state || 5,
          difficultyLevel: selectedAction.difficulty_level || 'Não informado',
          treatmentPlanTitle: treatmentPlan?.title,
          treatmentPlanDescription: treatmentPlan?.description,
          existingFeedback: feedbackText
        }
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestedActions(data.suggestions);
        setShowSuggestions(true);
        toast({
          title: "Ações sugeridas!",
          description: `${data.suggestions.length} ações foram sugeridas pela IA com base no contexto do paciente.`,
        });
      }

    } catch (error: any) {
      console.error('Erro ao sugerir ações:', error);
      toast({
        title: "Erro ao sugerir ações",
        description: "Não foi possível gerar sugestões. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Função para criar ação a partir de sugestão
  const handleCreateSuggestedAction = async (suggestion: any) => {
    if (!selectedAction) return;

    try {
      // Garantir que a frequency está em um formato válido
      const validFrequency = suggestion.frequency === 'daily' ? 'daily' :
                            suggestion.frequency === 'weekly' ? 'weekly' :
                            suggestion.frequency === 'unique' ? 'unique' :
                            'daily'; // default para daily

      // Garantir que a priority está em um formato válido  
      const validPriority = suggestion.priority === 'high' ? 'high' :
                            suggestion.priority === 'medium' ? 'medium' :
                            suggestion.priority === 'low' ? 'low' :
                            'medium'; // default para medium

      const { error } = await supabase
        .from('therapeutic_actions')
        .insert({
          treatment_plan_id: selectedAction.therapeutic_actions?.treatment_plan_id,
          name: suggestion.name,
          objective: suggestion.objective,
          frequency: validFrequency,
          priority: validPriority,
          start_date: new Date().toISOString().split('T')[0],
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Ação criada!",
        description: "A ação sugerida foi adicionada ao plano terapêutico.",
      });

      // Remover a sugestão da lista
      setSuggestedActions(prev => prev.filter(action => action.name !== suggestion.name));

    } catch (error: any) {
      console.error('Erro ao criar ação sugerida:', error);
      toast({
        title: "Erro ao criar ação",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Monitor className="w-8 h-8 text-primary" />
            Monitor Terapêutico
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o progresso dos pacientes e forneça feedback para as ações realizadas
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Relatório Geral</span>
          </Button>
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Novo Paciente</span>
          </Button>
        </div>
      </div>

      {/* Cards de métricas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="metric-card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              Pendentes de Feedback
            </CardTitle>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="metric-value text-orange-900">{pendingActions.length}</div>
            <p className="text-xs text-orange-600 mt-1">
              Ações aguardando feedback
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pacientes Ativos
            </CardTitle>
            <Users className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="metric-value">{patients.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de pacientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tratamentos Ativos
            </CardTitle>
            <Activity className="w-5 h-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="metric-value">
              {treatmentPlans.filter(plan => plan.status === 'ativo').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Planos em andamento
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessões Hoje
            </CardTitle>
            <Calendar className="w-5 h-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="metric-value">
              {recentSessions.filter(session => 
                new Date(session.scheduled_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Agendamentos para hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principais */}
      <Tabs defaultValue="monitor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="patients">Pacientes</TabsTrigger>
          <TabsTrigger value="treatments">Planos</TabsTrigger>
          <TabsTrigger value="actions">Ações</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ações Pendentes de Feedback - Coluna Principal */}
            <div className="lg:col-span-2">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <span>Ações Pendentes de Feedback</span>
                    <Badge variant="destructive" className="ml-2">
                      {pendingActions.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Ações concluídas pelos pacientes que aguardam seu feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingActions.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                      <h3 className="text-lg font-medium mb-2 text-green-700">Tudo em dia!</h3>
                      <p className="text-muted-foreground">
                        Não há ações pendentes de feedback no momento.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingActions.slice(0, 10).map((action) => (
                        <div key={action.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50/50 hover:bg-orange-100/50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="space-y-1 flex-1">
                              <h4 className="font-medium text-foreground">
                                {action.therapeutic_actions?.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Paciente: <span className="font-medium">{action.patients?.name}</span>
                              </p>
                            </div>
                            <Badge variant="outline" className="border-orange-300 text-orange-700">
                              {formatDate(action.execution_date)}
                            </Badge>
                          </div>
                          
                          {action.patient_report && (
                            <div className="mb-3 p-3 bg-white rounded border border-orange-200">
                              <p className="text-sm text-muted-foreground mb-1">Relatório do paciente:</p>
                              <p className="text-sm">{action.patient_report}</p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              {action.emotional_state && (
                                <span>Estado emocional: {action.emotional_state}/10</span>
                              )}
                              {action.difficulty_level && (
                                <>
                                  <span>•</span>
                                  <span>Dificuldade: {action.difficulty_level}</span>
                                </>
                              )}
                            </div>
                            <Button 
                              size="sm" 
                              className="bg-orange-600 hover:bg-orange-700"
                              onClick={() => handleOpenFeedbackModal(action)}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Dar Feedback
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Coluna Lateral - Estatísticas e Resumos */}
            <div className="space-y-6">
              {/* Estatísticas de Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Estatísticas de Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pendentes</span>
                      <span className="font-medium text-orange-600">{pendingActions.length}</span>
                    </div>
                    <Progress 
                      value={pendingActions.length > 0 ? (pendingActions.length / (pendingActions.length + 50)) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Taxa de resposta: {pendingActions.length > 0 ? 
                      `${Math.round((50 / (pendingActions.length + 50)) * 100)}%` : '100%'
                    }
                  </div>
                </CardContent>
              </Card>

              {/* Próximas Sessões */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Clock className="w-4 h-4 text-secondary" />
                    <span>Próximas Sessões</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentSessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="p-3 border border-border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium text-sm text-foreground">
                            {session.patient?.name}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{formatDateTime(session.scheduled_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          {/* Busca e filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar pacientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="pausado">Pausados</SelectItem>
                <SelectItem value="concluido">Concluídos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de pacientes */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Pacientes</CardTitle>
              <CardDescription>
                Gerencie todos os pacientes cadastrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patients.map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{patient.name}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{patient.email}</span>
                          <span>•</span>
                          <span>{patient.phone}</span>
                          <span>•</span>
                          <span>{calculateAge(patient.birth_date)} anos</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {patient.occupation}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treatments" className="space-y-6">
          <TreatmentPlanManager 
            onPlanSelect={(planId) => {
              setSelectedPlanId(planId);
              // Encontrar o paciente do plano selecionado
              const selectedPlan = treatmentPlans.find(plan => plan.id === planId);
              if (selectedPlan) {
                setSelectedPatientId(selectedPlan.patient_id);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          {selectedPlanId && selectedPatientId ? (
            <TherapeuticActionManager 
              treatmentPlanId={selectedPlanId}
              patientId={selectedPatientId}
              userRole="therapist"
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Selecione um Plano</h3>
                <p className="text-muted-foreground">
                  Vá para a aba "Planos" e selecione um plano terapêutico para gerenciar suas ações terapêuticas
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          {selectedPlanId && selectedPatientId ? (
            <TherapeuticDashboard 
              treatmentPlanId={selectedPlanId}
              patientId={selectedPatientId}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Selecione um Plano</h3>
                <p className="text-muted-foreground">
                  Vá para a aba "Planos" e selecione um plano terapêutico para visualizar o dashboard de evolução
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-secondary" />
                <span>Histórico de Sessões</span>
              </CardTitle>
              <CardDescription>
                Consultas e sessões realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSessions.map((session) => (
                  <div key={session.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="space-y-1">
                        <h4 className="font-medium text-foreground">
                          {session.patient?.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {session.session_type}
                        </p>
                      </div>
                      <Badge className={getStatusColor(session.status)}>
                        {getStatusLabel(session.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <span>{formatDateTime(session.scheduled_at)}</span>
                        <span>•</span>
                        <span>{session.duration_minutes} minutos</span>
                      </div>
                      {session.price && (
                        <span className="font-medium text-success">
                          R$ {session.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Feedback */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span>Feedback para Ação Terapêutica</span>
            </DialogTitle>
            <DialogDescription>
              {selectedAction && (
                <div className="space-y-2 mt-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">{selectedAction.therapeutic_actions?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Paciente: {selectedAction.patients?.name} • Executado em: {formatDate(selectedAction.execution_date)}
                    </p>
                  </div>
                  
                  {selectedAction.patient_report && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 font-medium mb-1">Relatório do paciente:</p>
                      <p className="text-sm text-blue-700">{selectedAction.patient_report}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    {selectedAction.emotional_state && (
                      <span>Estado emocional: {selectedAction.emotional_state}/10</span>
                    )}
                    {selectedAction.difficulty_level && (
                      <>
                        <span>•</span>
                        <span>Dificuldade: {selectedAction.difficulty_level}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Reação Rápida */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reação Rápida</label>
              <Select value={quickReaction} onValueChange={setQuickReaction}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma reação..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excelente">😊 Excelente execução!</SelectItem>
                  <SelectItem value="muito-bom">👍 Muito bem!</SelectItem>
                  <SelectItem value="bom">✅ Bom trabalho!</SelectItem>
                  <SelectItem value="pode-melhorar">💪 Pode melhorar</SelectItem>
                  <SelectItem value="precisa-ajuda">🤝 Precisa de mais orientação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Feedback Detalhado */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Feedback Detalhado</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAIFeedback}
                  disabled={isGeneratingAI || !selectedAction}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:from-purple-100 hover:to-blue-100"
                >
                  {isGeneratingAI ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-purple-500 border-t-transparent rounded-full" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                      Gerar com IA
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                placeholder="Escreva aqui seu feedback detalhado sobre a execução da ação..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Formulário de Nova Ação */}
            {showNewActionForm && (
              <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-green-800">Nova Ação Terapêutica</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewActionForm(false)}
                    className="text-green-600 hover:text-green-700"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-green-700">Nome da Ação</label>
                    <Input
                      placeholder="Ex: Exercício de respiração diafragmática"
                      value={newActionName}
                      onChange={(e) => setNewActionName(e.target.value)}
                      className="mt-1 border-green-300 focus:border-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-green-700">Objetivo</label>
                    <Textarea
                      placeholder="Descreva o objetivo desta nova ação..."
                      value={newActionObjective}
                      onChange={(e) => setNewActionObjective(e.target.value)}
                      rows={2}
                      className="mt-1 border-green-300 focus:border-green-500 resize-none"
                    />
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={handleCreateNewAction}
                    disabled={!newActionName || !newActionObjective}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Ação
                  </Button>
                </div>
              </div>
            )}

            {/* Sugestões de Ações por IA */}
            {showSuggestions && suggestedActions.length > 0 && (
              <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-purple-800 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Ações Sugeridas pela IA
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSuggestions(false)}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {suggestedActions.map((suggestion, index) => (
                    <div key={index} className="p-3 bg-white border border-purple-200 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-purple-900">{suggestion.name}</h4>
                            <p className="text-xs text-purple-700 mt-1">{suggestion.objective}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <Badge 
                              variant="outline" 
                              className="text-xs border-purple-300 text-purple-700"
                            >
                              {suggestion.frequency === 'daily' ? 'Diária' : 
                               suggestion.frequency === 'weekly' ? 'Semanal' : 
                               suggestion.frequency === 'unique' ? 'Única' : suggestion.frequency}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                suggestion.priority === 'high' ? 'border-red-300 text-red-700' :
                                suggestion.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                'border-green-300 text-green-700'
                              }`}
                            >
                              {suggestion.priority === 'high' ? 'Alta' :
                               suggestion.priority === 'medium' ? 'Média' : 'Baixa'}
                            </Badge>
                          </div>
                        </div>
                        
                        {suggestion.rationale && (
                          <p className="text-xs text-purple-600 italic">
                            💡 {suggestion.rationale}
                          </p>
                        )}
                        
                        <Button
                          size="sm"
                          onClick={() => handleCreateSuggestedAction(suggestion)}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              <Button
                variant="outline"
                onClick={handleCloseFeedbackModal}
                disabled={isSubmittingFeedback}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowNewActionForm(!showNewActionForm)}
                className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100"
              >
                <Plus className="w-4 h-4 mr-2 text-green-600" />
                <span className="text-green-700">Nova Ação</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleSuggestActions}
                disabled={isGeneratingSuggestions || !selectedAction}
                className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:from-purple-100 hover:to-indigo-100"
              >
                {isGeneratingSuggestions ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-purple-500 border-t-transparent rounded-full" />
                    Sugerindo...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2 text-purple-600" />
                    <span className="text-purple-700">Sugerir Ações IA</span>
                  </>
                )}
              </Button>
            </div>
            <Button
              onClick={handleSubmitFeedback}
              disabled={isSubmittingFeedback || (!feedbackText && !quickReaction)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmittingFeedback ? 'Enviando...' : 'Enviar Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};