import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Target,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TreatmentPlan {
  id: string;
  patient_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
  status: string;
  goals: string[];
  observations?: string;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    name: string;
  };
}

interface TherapeuticAction {
  id: string;
  treatment_plan_id: string;
  name: string;
  objective: string;
  frequency: string;
  priority: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  observations?: string;
}

interface TreatmentPlanManagerProps {
  patientId?: string;
  onPlanSelect?: (planId: string) => void;
}

export const TreatmentPlanManager: React.FC<TreatmentPlanManagerProps> = ({
  patientId,
  onPlanSelect
}) => {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [planActions, setPlanActions] = useState<{ [planId: string]: TherapeuticAction[] }>({});
  const [planStats, setPlanStats] = useState<{ [planId: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form states
  const [planForm, setPlanForm] = useState({
    patient_id: patientId || '',
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'ativo',
    goals: [''],
    observations: ''
  });

  const [actionForm, setActionForm] = useState({
    name: '',
    objective: '',
    frequency: 'daily',
    priority: 'medium',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    observations: ''
  });

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar pacientes se não foi especificado um patientId
      if (!patientId) {
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('id, name')
          .order('name');

        if (patientsError) throw patientsError;
        setPatients(patientsData || []);
      }

      // Carregar planos de tratamento
      let plansQuery = supabase
        .from('treatment_plans')
        .select(`
          *,
          patient:patients(id, name)
        `)
        .order('created_at', { ascending: false });

      if (patientId) {
        plansQuery = plansQuery.eq('patient_id', patientId);
      }

      const { data: plansData, error: plansError } = await plansQuery;

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Carregar ações para cada plano
      if (plansData && plansData.length > 0) {
        await loadPlanActions(plansData);
        await loadPlanStats(plansData);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os planos de tratamento.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlanActions = async (plans: TreatmentPlan[]) => {
    try {
      const actionsPromises = plans.map(async (plan) => {
        const { data: actionsData, error } = await supabase
          .from('therapeutic_actions')
          .select('*')
          .eq('treatment_plan_id', plan.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return { planId: plan.id, actions: actionsData || [] };
      });

      const actionsResults = await Promise.all(actionsPromises);
      const actionsMap: { [planId: string]: TherapeuticAction[] } = {};
      
      actionsResults.forEach(({ planId, actions }) => {
        actionsMap[planId] = actions;
      });

      setPlanActions(actionsMap);
    } catch (error) {
      console.error('Erro ao carregar ações:', error);
    }
  };

  const loadPlanStats = async (plans: TreatmentPlan[]) => {
    try {
      const statsPromises = plans.map(async (plan) => {
        const { data, error } = await supabase
          .rpc('get_treatment_plan_stats', { plan_id: plan.id });

        if (error) throw error;
        return { planId: plan.id, stats: data?.[0] || { total_actions: 0, completed_actions: 0, progress_percentage: 0 } };
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap: { [planId: string]: any } = {};
      
      statsResults.forEach(({ planId, stats }) => {
        statsMap[planId] = stats;
      });

      setPlanStats(statsMap);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const createPlan = async () => {
    try {
      if (!planForm.patient_id || !planForm.title || !planForm.description) {
        toast({
          title: 'Erro',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive'
        });
        return;
      }

      const planData = {
        ...planForm,
        goals: planForm.goals.filter(goal => goal.trim() !== ''),
        end_date: planForm.end_date || null  // Converte string vazia para null
      };

      const { data, error } = await supabase
        .from('treatment_plans')
        .insert([planData])
        .select()
        .single();

      if (error) throw error;

      // Se há uma ação terapêutica definida, criá-la também
      if (actionForm.name && actionForm.objective && actionForm.frequency && actionForm.start_date && data) {
        const initialActionData = {
          treatment_plan_id: data.id,
          ...actionForm,
          end_date: actionForm.end_date || null  // Converte string vazia para null
        };

        console.log('Criando ação inicial com dados:', initialActionData);

        const { error: actionError } = await supabase
          .from('therapeutic_actions')
          .insert([initialActionData]);

        if (actionError) {
          console.error('Erro ao criar ação inicial:', actionError);
          toast({
            title: 'Erro',
            description: 'Plano criado, mas houve erro ao criar a ação terapêutica.',
            variant: 'destructive'
          });
        } else {
          console.log('Ação inicial criada com sucesso');
        }
      } else if (actionForm.name || actionForm.objective) {
        console.log('Campos de ação incompletos:', {
          name: actionForm.name,
          objective: actionForm.objective,
          frequency: actionForm.frequency,
          start_date: actionForm.start_date
        });
        toast({
          title: 'Aviso',
          description: 'Plano criado, mas a ação terapêutica não foi salva. Preencha todos os campos obrigatórios da ação.',
          variant: 'destructive'
        });
      }

      toast({
        title: 'Sucesso',
        description: 'Plano terapêutico criado com sucesso!',
      });

      setIsCreateDialogOpen(false);
      resetPlanForm();
      resetActionForm();
      loadData();

    } catch (error) {
      console.error('Erro ao criar plano:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o plano terapêutico.',
        variant: 'destructive'
      });
    }
  };

  const updatePlan = async () => {
    if (!selectedPlan) return;

    try {
      const updateData = {
        ...planForm,
        goals: planForm.goals.filter(goal => goal.trim() !== ''),
        end_date: planForm.end_date || null  // Converte string vazia para null
      };

      const { error } = await supabase
        .from('treatment_plans')
        .update(updateData)
        .eq('id', selectedPlan.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Plano terapêutico atualizado com sucesso!',
      });

      setIsEditDialogOpen(false);
      setSelectedPlan(null);
      resetPlanForm();
      loadData();

    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o plano terapêutico.',
        variant: 'destructive'
      });
    }
  };

  const deletePlan = async () => {
    if (!selectedPlan) return;

    try {
      // Primeiro, desativar todas as ações terapêuticas relacionadas
      await supabase
        .from('therapeutic_actions')
        .update({ is_active: false })
        .eq('treatment_plan_id', selectedPlan.id);

      // Depois, deletar o plano
      const { error } = await supabase
        .from('treatment_plans')
        .delete()
        .eq('id', selectedPlan.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Plano terapêutico excluído com sucesso!',
      });

      setIsDeleteDialogOpen(false);
      setSelectedPlan(null);
      loadData();

    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o plano terapêutico.',
        variant: 'destructive'
      });
    }
  };

  const addActionToPlan = async (planId: string) => {
    try {
      if (!actionForm.name || !actionForm.objective) {
        toast({
          title: 'Erro',
          description: 'Preencha todos os campos obrigatórios da ação.',
          variant: 'destructive'
        });
        return;
      }

      const actionData = {
        treatment_plan_id: planId,
        ...actionForm,
        end_date: actionForm.end_date || null  // Converte string vazia para null
      };

      const { error } = await supabase
        .from('therapeutic_actions')
        .insert([actionData]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Ação terapêutica adicionada com sucesso!',
      });

      resetActionForm();
      loadData();

    } catch (error) {
      console.error('Erro ao adicionar ação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a ação terapêutica.',
        variant: 'destructive'
      });
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      patient_id: patientId || '',
      title: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      status: 'ativo',
      goals: [''],
      observations: ''
    });
  };

  const resetActionForm = () => {
    setActionForm({
      name: '',
      objective: '',
      frequency: 'daily',
      priority: 'medium',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      observations: ''
    });
  };

  const handleEditPlan = (plan: TreatmentPlan) => {
    setSelectedPlan(plan);
    setPlanForm({
      patient_id: plan.patient_id,
      title: plan.title,
      description: plan.description,
      start_date: plan.start_date,
      end_date: plan.end_date || '',
      status: plan.status,
      goals: plan.goals.length > 0 ? plan.goals : [''],
      observations: plan.observations || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDeletePlan = (plan: TreatmentPlan) => {
    setSelectedPlan(plan);
    setIsDeleteDialogOpen(true);
  };

  const addGoalField = () => {
    setPlanForm({
      ...planForm,
      goals: [...planForm.goals, '']
    });
  };

  const updateGoal = (index: number, value: string) => {
    const newGoals = [...planForm.goals];
    newGoals[index] = value;
    setPlanForm({
      ...planForm,
      goals: newGoals
    });
  };

  const removeGoal = (index: number) => {
    if (planForm.goals.length > 1) {
      const newGoals = planForm.goals.filter((_, i) => i !== index);
      setPlanForm({
        ...planForm,
        goals: newGoals
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-success/10 text-success border-success/20';
      case 'concluido': return 'bg-primary/10 text-primary border-primary/20';
      case 'pausado': return 'bg-warning/10 text-warning border-warning/20';
      case 'cancelado': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground';
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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return priority;
    }
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
          <h2 className="text-2xl font-bold text-foreground">Planos de Tratamento</h2>
          <p className="text-muted-foreground">
            Gerencie os planos terapêuticos dos pacientes
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Novo Plano</span>
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Plano Terapêutico</DialogTitle>
                <DialogDescription>
                  Defina um plano terapêutico personalizado com objetivos e ações específicas para o paciente.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Informações Básicas do Plano */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Informações do Plano</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!patientId && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="patient">Paciente *</Label>
                        <Select value={planForm.patient_id} onValueChange={(value) => setPlanForm({...planForm, patient_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um paciente" />
                          </SelectTrigger>
                          <SelectContent>
                            {patients.map((patient) => (
                              <SelectItem key={patient.id} value={patient.id}>
                                {patient.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="title">Título do Plano *</Label>
                      <Input
                        id="title"
                        value={planForm.title}
                        onChange={(e) => setPlanForm({...planForm, title: e.target.value})}
                        placeholder="Ex: Plano de Reabilitação"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={planForm.status} onValueChange={(value) => setPlanForm({...planForm, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="pausado">Pausado</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Textarea
                      id="description"
                      value={planForm.description}
                      onChange={(e) => setPlanForm({...planForm, description: e.target.value})}
                      placeholder="Descreva o plano terapêutico..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Data de Início *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={planForm.start_date}
                        onChange={(e) => setPlanForm({...planForm, start_date: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="end_date">Data de Término</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={planForm.end_date}
                        onChange={(e) => setPlanForm({...planForm, end_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Objetivos do Tratamento</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addGoalField}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar Objetivo
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {planForm.goals.map((goal, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={goal}
                            onChange={(e) => updateGoal(index, e.target.value)}
                            placeholder={`Objetivo ${index + 1}...`}
                          />
                          {planForm.goals.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeGoal(index)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observations">Observações</Label>
                    <Textarea
                      id="observations"
                      value={planForm.observations}
                      onChange={(e) => setPlanForm({...planForm, observations: e.target.value})}
                      placeholder="Observações adicionais..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Ações Terapêuticas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Primeira Ação Terapêutica</h3>
                  <p className="text-sm text-muted-foreground">
                    Defina uma ação inicial. Mais ações podem ser adicionadas após criar o plano.
                  </p>
                  
                  <div className="p-4 border border-dashed border-muted-foreground/20 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="action_name">Nome da Ação</Label>
                        <Input
                          id="action_name"
                          value={actionForm.name}
                          onChange={(e) => setActionForm({...actionForm, name: e.target.value})}
                          placeholder="Ex: Exercícios de respiração"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="action_frequency">Frequência</Label>
                        <Select value={actionForm.frequency} onValueChange={(value) => setActionForm({...actionForm, frequency: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a frequência" />
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
                      <Label htmlFor="action_objective">Objetivo da Ação</Label>
                      <Textarea
                        id="action_objective"
                        value={actionForm.objective}
                        onChange={(e) => setActionForm({...actionForm, objective: e.target.value})}
                        placeholder="Descreva o objetivo desta ação..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="action_priority">Prioridade</Label>
                        <Select value={actionForm.priority} onValueChange={(value) => setActionForm({...actionForm, priority: value})}>
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
                      
                      <div className="space-y-2">
                        <Label htmlFor="action_start_date">Data de Início</Label>
                        <Input
                          id="action_start_date"
                          type="date"
                          value={actionForm.start_date}
                          onChange={(e) => setActionForm({...actionForm, start_date: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="action_end_date">Data de Término</Label>
                        <Input
                          id="action_end_date"
                          type="date"
                          value={actionForm.end_date}
                          onChange={(e) => setActionForm({...actionForm, end_date: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="action_observations">Instruções Específicas</Label>
                      <Textarea
                        id="action_observations"
                        value={actionForm.observations}
                        onChange={(e) => setActionForm({...actionForm, observations: e.target.value})}
                        placeholder="Instruções específicas para esta ação..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createPlan}>
                Criar Plano
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {plans.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhum plano criado</h3>
              <p className="text-muted-foreground">
                Comece criando um novo plano terapêutico
              </p>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="w-5 h-5 text-primary" />
                      <span>{plan.title}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-4">
                      {plan.patient && (
                        <>
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{plan.patient.name}</span>
                          </span>
                        </>
                      )}
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(plan.start_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </span>
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(plan.status)}>
                      {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onPlanSelect?.(plan.id)}>
                          <Target className="w-4 h-4 mr-2" />
                          Ver Ações
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditPlan(plan)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeletePlan(plan)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{plan.description}</p>
                
                {/* Progress */}
                {planStats[plan.id] && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progresso</span>
                      <span>{planStats[plan.id].progress_percentage}%</span>
                    </div>
                    <Progress value={planStats[plan.id].progress_percentage} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{planStats[plan.id].completed_actions} concluídas</span>
                      <span>{planStats[plan.id].total_actions} ações totais</span>
                    </div>
                  </div>
                )}

                {/* Goals */}
                {plan.goals && plan.goals.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Objetivos:</h4>
                    <ul className="space-y-1">
                      {plan.goals.map((goal, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-success" />
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions Preview and Add New */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Ações Terapêuticas:</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Toggle the add action form for this specific plan
                        const currentState = (window as any)[`showAddAction_${plan.id}`] || false;
                        (window as any)[`showAddAction_${plan.id}`] = !currentState;
                        // Force re-render by setting a state
                        setSelectedPlan({...plan});
                        setTimeout(() => setSelectedPlan(null), 1);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar Ação
                    </Button>
                  </div>
                  
                  {/* Quick Add Action Form */}
                  {(window as any)[`showAddAction_${plan.id}`] && (
                    <div className="p-3 border border-dashed border-muted-foreground/30 rounded-lg bg-muted/20 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome da Ação</Label>
                          <Input
                            value={actionForm.name}
                            onChange={(e) => setActionForm({...actionForm, name: e.target.value})}
                            placeholder="Ex: Exercício de respiração"
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Frequência</Label>
                          <Select value={actionForm.frequency} onValueChange={(value) => setActionForm({...actionForm, frequency: value})}>
                            <SelectTrigger className="h-8">
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
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Objetivo</Label>
                        <Textarea
                          value={actionForm.objective}
                          onChange={(e) => setActionForm({...actionForm, objective: e.target.value})}
                          placeholder="Objetivo desta ação..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Prioridade</Label>
                          <Select value={actionForm.priority} onValueChange={(value) => setActionForm({...actionForm, priority: value})}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baixa</SelectItem>
                              <SelectItem value="medium">Média</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Data Início</Label>
                           <Input
                             type="date"
                             className="h-8"
                             value={actionForm.start_date}
                             onChange={(e) => setActionForm({...actionForm, start_date: e.target.value})}
                           />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Data Fim</Label>
                           <Input
                             type="date"
                             className="h-8"
                             value={actionForm.end_date}
                             onChange={(e) => setActionForm({...actionForm, end_date: e.target.value})}
                           />
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            (window as any)[`showAddAction_${plan.id}`] = false;
                            resetActionForm();
                            setSelectedPlan({...plan});
                            setTimeout(() => setSelectedPlan(null), 1);
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          size="sm"
                          onClick={async () => {
                            await addActionToPlan(plan.id);
                            (window as any)[`showAddAction_${plan.id}`] = false;
                            setSelectedPlan({...plan});
                            setTimeout(() => setSelectedPlan(null), 1);
                          }}
                        >
                          Salvar Ação
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Existing Actions */}
                  {planActions[plan.id] && planActions[plan.id].length > 0 && (
                    <div className="space-y-2">
                      {planActions[plan.id].map((action) => (
                        <div key={action.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{action.name}</span>
                              <Badge className={getPriorityColor(action.priority)} variant="outline">
                                {getPriorityLabel(action.priority)}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {getFrequencyLabel(action.frequency)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{action.objective}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className={getPriorityColor(action.priority)}>
                              {getPriorityLabel(action.priority)}
                            </Badge>
                            <Badge variant="outline">
                              {getFrequencyLabel(action.frequency)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {planActions[plan.id].length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{planActions[plan.id].length - 3} mais ações
                         </p>
                       )}
                     </div>
                   )}
                 </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plano Terapêutico</DialogTitle>
            <DialogDescription>
              Modifique as informações do plano terapêutico conforme necessário.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_title">Título do Plano *</Label>
                <Input
                  id="edit_title"
                  value={planForm.title}
                  onChange={(e) => setPlanForm({...planForm, title: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_status">Status</Label>
                <Select value={planForm.status} onValueChange={(value) => setPlanForm({...planForm, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Descrição *</Label>
              <Textarea
                id="edit_description"
                value={planForm.description}
                onChange={(e) => setPlanForm({...planForm, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_start_date">Data de Início *</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={planForm.start_date}
                  onChange={(e) => setPlanForm({...planForm, start_date: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_end_date">Data de Término</Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={planForm.end_date}
                  onChange={(e) => setPlanForm({...planForm, end_date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Objetivos do Tratamento</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addGoalField}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {planForm.goals.map((goal, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={goal}
                      onChange={(e) => updateGoal(index, e.target.value)}
                      placeholder={`Objetivo ${index + 1}...`}
                    />
                    {planForm.goals.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeGoal(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_observations">Observações</Label>
              <Textarea
                id="edit_observations"
                value={planForm.observations}
                onChange={(e) => setPlanForm({...planForm, observations: e.target.value})}
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={updatePlan}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span>Confirmar Exclusão</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{selectedPlan?.title}"? 
              Esta ação não pode ser desfeita e todas as ações terapêuticas relacionadas serão desativadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deletePlan} className="bg-destructive hover:bg-destructive/90">
              Excluir Plano
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};