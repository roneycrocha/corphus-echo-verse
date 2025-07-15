import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search,
  Calendar,
  User,
  Activity,
  Target,
  Clock,
  ChevronRight,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Camera,
  BarChart3,
  Mic
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { TherapeuticActionManager } from '@/components/therapeutic/TherapeuticActionManager';
import { TherapeuticDashboard } from '@/components/therapeutic/TherapeuticDashboard';
import { TreatmentPlanManager } from '@/components/therapeutic/TreatmentPlanManager';
import { AnalysisViewer } from '@/components/analise-corporal/AnalysisViewer';
import { AnalysisTypeSelector } from '@/components/analise-corporal/AnalysisTypeSelector';
import { TranscriptionHistory } from '@/components/communication/TranscriptionHistory';
import { usePermissions } from '@/hooks/usePermissions';

interface Patient {
  id: string;
  name: string;
  birth_date: string;
  gender: string;
  occupation: string;
  phone?: string;
  email?: string;
}

interface Session {
  id: string;
  patient_id: string;
  scheduled_at: string;
  session_type: string;
  status: string;
  duration_minutes: number;
  price?: number;
  notes?: string;
  patient?: Patient;
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  session_id?: string;
  record_date: string;
  chief_complaint: string;
  physical_exam?: any;
  assessment: string;
  treatment_performed: string;
  patient_response: string;
  homework: string;
  next_steps: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

interface TreatmentPlan {
  id: string;
  patient_id: string;
  title: string;
  description: string;
  goals: string[];
  start_date: string;
  end_date?: string;
  status: string;
  observations?: string;
  patient?: Patient;
}

interface BodyAnalysis {
  id: string;
  patient_id: string;
  analysis_name: string;
  analysis_date: string;
  evaluation_data: Record<string, number>;
  trait_scores: Array<{
    code: string;
    name: string;
    color: string;
    total: number;
    percentage: number;
  }>;
  photos: string[];
  observations: string;
  status: string;
  created_at: string;
}

/**
 * Página de Prontuário Reformulada do corphus.ai
 * Sistema completo para visualização integrada do histórico do paciente
 */
export const ProntuarioPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const { toast } = useToast();
  const { userProfile, isSpecialist } = usePermissions();
  const navigate = useNavigate();

  // Form para criar plano terapêutico
  const [treatmentPlanForm, setTreatmentPlanForm] = useState({
    title: '',
    description: '',
    goals: [''],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    observations: ''
  });

  // Estados para os dados do paciente selecionado
  const [patientData, setPatientData] = useState<{
    sessions: Session[];
    medicalRecords: MedicalRecord[];
    treatmentPlans: TreatmentPlan[];
    bodyAnalyses: BodyAnalysis[];
  }>({
    sessions: [],
    medicalRecords: [],
    treatmentPlans: [],
    bodyAnalyses: []
  });

  // Estados para controlar a interface de análise corporal
  const [showAnalysisTypeSelector, setShowAnalysisTypeSelector] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<BodyAnalysis | null>(null);
  const [analysisViewMode, setAnalysisViewMode] = useState<'view' | 'edit'>('view');

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientData(selectedPatient);
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    try {
      setIsLoading(true);
      
      // Buscar o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Agora filtrado automaticamente via RLS por account_id
      const { data: patientsData, error } = await supabase
        .from('patients')
        .select('*')
        .eq('is_active', true)      // Apenas pacientes ativos
        .order('name', { ascending: true });

      if (error) throw error;
      setPatients(patientsData || []);

    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pacientes.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatientData = async (patientId: string) => {
    try {
      setIsLoading(true);

      // Carregar sessões/agendamentos
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientId)
        .order('scheduled_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Carregar prontuários médicos
      const { data: recordsData, error: recordsError } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false });

      if (recordsError) throw recordsError;

      // Carregar planos de tratamento
      const { data: plansData, error: plansError } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', patientId)
        .order('start_date', { ascending: false });

      if (plansError) throw plansError;

      // Carregar análises corporais
      const { data: analysesData, error: analysesError } = await supabase
        .from('body_analyses')
        .select('*')
        .eq('patient_id', patientId)
        .order('analysis_date', { ascending: false });

      if (analysesError) throw analysesError;

      setPatientData({
        sessions: sessionsData || [],
        medicalRecords: recordsData || [],
        treatmentPlans: plansData || [],
        bodyAnalyses: (analysesData || []).map(analysis => ({
          ...analysis,
          evaluation_data: analysis.evaluation_data as Record<string, number>,
          trait_scores: analysis.trait_scores as Array<{
            code: string;
            name: string;
            color: string;
            total: number;
            percentage: number;
          }>
        }))
      });

    } catch (error) {
      console.error('Erro ao carregar dados do paciente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do paciente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'agendada':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'realizada':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelada':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const createTreatmentPlan = async () => {
    try {
      if (!treatmentPlanForm.title || !treatmentPlanForm.description || !selectedPatient) {
        toast({
          title: 'Erro',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('treatment_plans')
        .insert([{
          patient_id: selectedPatient,
          title: treatmentPlanForm.title,
          description: treatmentPlanForm.description,
          goals: treatmentPlanForm.goals.filter(goal => goal.trim() !== ''),
          start_date: treatmentPlanForm.start_date,
          end_date: treatmentPlanForm.end_date || null,
          observations: treatmentPlanForm.observations,
          status: 'ativo'
        }]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Plano terapêutico criado com sucesso!',
      });

      setIsCreatePlanDialogOpen(false);
      resetTreatmentPlanForm();
      loadPatientData(selectedPatient);

    } catch (error) {
      console.error('Erro ao criar plano terapêutico:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o plano terapêutico.',
        variant: 'destructive'
      });
    }
  };

  const resetTreatmentPlanForm = () => {
    setTreatmentPlanForm({
      title: '',
      description: '',
      goals: [''],
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      observations: ''
    });
  };

  const addGoal = () => {
    setTreatmentPlanForm({
      ...treatmentPlanForm,
      goals: [...treatmentPlanForm.goals, '']
    });
  };

  const updateGoal = (index: number, value: string) => {
    const newGoals = [...treatmentPlanForm.goals];
    newGoals[index] = value;
    setTreatmentPlanForm({
      ...treatmentPlanForm,
      goals: newGoals
    });
  };

  const removeGoal = (index: number) => {
    const newGoals = treatmentPlanForm.goals.filter((_, i) => i !== index);
    setTreatmentPlanForm({
      ...treatmentPlanForm,
      goals: newGoals.length > 0 ? newGoals : ['']
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'realizada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ativo':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'concluido':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  const upcomingSessions = patientData.sessions.filter(session => 
    new Date(session.scheduled_at) > new Date() && session.status === 'agendada'
  );

  const completedSessions = patientData.sessions.filter(session => 
    session.status === 'realizada'
  );

  const activeTreatmentPlans = patientData.treatmentPlans.filter(plan => 
    plan.status === 'ativo'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando prontuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prontuário Eletrônico</h1>
          <p className="text-muted-foreground">
            Visualização integrada do histórico completo do paciente
          </p>
        </div>
      </div>

      {/* Seleção de Paciente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Selecionar Paciente</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-80">
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPatients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{patient.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo do Prontuário */}
      {selectedPatientData && (
        <div className="space-y-6">
          {/* Informações do Paciente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-primary" />
                <span>{selectedPatientData.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Idade</p>
                  <p className="font-medium">{calculateAge(selectedPatientData.birth_date)} anos</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gênero</p>
                  <p className="font-medium capitalize">{selectedPatientData.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profissão</p>
                  <p className="font-medium">{selectedPatientData.occupation}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Atendimentos</p>
                  <p className="font-medium">{completedSessions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{upcomingSessions.length}</p>
                    <p className="text-sm text-muted-foreground">Próximas Consultas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{completedSessions.length}</p>
                    <p className="text-sm text-muted-foreground">Consultas Realizadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{patientData.medicalRecords.length}</p>
                    <p className="text-sm text-muted-foreground">Registros Médicos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Target className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{activeTreatmentPlans.length}</p>
                    <p className="text-sm text-muted-foreground">Planos Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conteúdo Principal com Abas */}
          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
              <TabsTrigger value="records">Prontuários</TabsTrigger>
              <TabsTrigger value="transcriptions">Transcrições</TabsTrigger>
              <TabsTrigger value="plans">Planos de Ação</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="analysis">Análise Corporal</TabsTrigger>
            </TabsList>

            {/* Timeline Integrada */}
            <TabsContent value="timeline" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span>Linha do Tempo do Paciente</span>
                  </CardTitle>
                  <CardDescription>
                    Histórico cronológico completo de todos os eventos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Aqui seria a timeline integrada com todos os eventos */}
                    {patientData.medicalRecords.length === 0 && patientData.sessions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum registro encontrado para este paciente</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Criar timeline combinando sessões e registros médicos */}
                        {[
                          ...patientData.sessions.map(s => ({ ...s, type: 'session', date: s.scheduled_at })),
                          ...patientData.medicalRecords.map(r => ({ ...r, type: 'record', date: r.record_date, status: 'realizada' }))
                        ]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 10)
                          .map((item, index) => (
                            <div key={`${item.type}-${item.id}-${index}`} className="flex items-start space-x-4 p-4 border border-border rounded-lg">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                {item.type === 'session' ? (
                                  <Calendar className="w-5 h-5 text-primary" />
                                ) : (
                                  <FileText className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-medium">
                                    {item.type === 'session' 
                                      ? (item as Session).session_type 
                                      : 'Registro Médico'
                                    }
                                  </h4>
                                  <Badge className={getStatusColor(item.status)}>
                                    {item.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {format(
                                    new Date(item.date),
                                    "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
                                    { locale: ptBR }
                                  )}
                                </p>
                                {item.type === 'record' && (item as MedicalRecord).chief_complaint && (
                                  <p className="text-sm mt-2">{(item as MedicalRecord).chief_complaint}</p>
                                )}
                                {item.type === 'session' && (item as Session).notes && (
                                  <p className="text-sm mt-2">{(item as Session).notes}</p>
                                )}
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Histórico de Agendamentos */}
            <TabsContent value="appointments" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span>Histórico de Agendamentos</span>
                      </CardTitle>
                      <CardDescription>
                        Todas as consultas agendadas, realizadas e canceladas
                      </CardDescription>
                    </div>
                    <Button className="flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>Nova Consulta</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {patientData.sessions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum agendamento encontrado</p>
                      </div>
                    ) : (
                      patientData.sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(session.status)}
                            </div>
                            <div>
                              <h4 className="font-medium">{session.session_type}</h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(session.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}
                              </p>
                              {session.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{session.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                            <span className="text-sm font-medium">
                              {session.duration_minutes}min
                            </span>
                            {session.price && (
                              <span className="text-sm font-medium text-green-600">
                                R$ {session.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Lista de Atendimentos (Prontuários) */}
            <TabsContent value="records" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <span>Registros de Atendimento</span>
                      </CardTitle>
                      <CardDescription>
                        Evolução clínica e registros médicos detalhados
                      </CardDescription>
                    </div>
                    <Button className="flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>Novo Registro</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {patientData.medicalRecords.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum registro médico encontrado</p>
                      </div>
                    ) : (
                      patientData.medicalRecords.map((record) => (
                        <div key={record.id} className="p-4 border border-border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-5 h-5 text-primary" />
                              <span className="font-medium">
                                {format(new Date(record.record_date), "dd/MM/yyyy")}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <h5 className="text-sm font-medium text-muted-foreground">Queixa Principal:</h5>
                              <p className="text-sm">{record.chief_complaint}</p>
                            </div>
                            
                            {record.assessment && (
                              <div>
                                <h5 className="text-sm font-medium text-muted-foreground">Avaliação:</h5>
                                <p className="text-sm">{record.assessment}</p>
                              </div>
                            )}
                            
                            {record.treatment_performed && (
                              <div>
                                <h5 className="text-sm font-medium text-muted-foreground">Tratamento Realizado:</h5>
                                <p className="text-sm">{record.treatment_performed}</p>
                              </div>
                            )}
                            
                            {record.next_steps && (
                              <div>
                                <h5 className="text-sm font-medium text-muted-foreground">Próximos Passos:</h5>
                                <p className="text-sm">{record.next_steps}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Histórico de Transcrições */}
            <TabsContent value="transcriptions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Mic className="w-5 h-5 text-primary" />
                    <span>Histórico de Transcrições</span>
                  </CardTitle>
                  <CardDescription>
                    Gravações de áudio e transcrições dos atendimentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TranscriptionHistory patientId={selectedPatient} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Planos de Ação Terapêuticos */}
            <TabsContent value="plans" className="space-y-6">
              <TreatmentPlanManager 
                patientId={selectedPatient}
                onPlanSelect={(planId) => {
                  // Quando um plano for selecionado, podemos adicionar ações específicas
                  console.log('Plano selecionado:', planId);
                }}
              />
            </TabsContent>

            {/* Dashboard de Evolução */}
            <TabsContent value="dashboard" className="space-y-6">
              {patientData.treatmentPlans.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Dashboard indisponível</h3>
                    <p className="text-muted-foreground">
                      É necessário ter um plano terapêutico ativo para visualizar o dashboard de evolução
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <TherapeuticDashboard
                  patientId={selectedPatient}
                  treatmentPlanId={activeTreatmentPlans[0]?.id || patientData.treatmentPlans[0]?.id}
                />
              )}
            </TabsContent>

            {/* Análise Corporal */}
            <TabsContent value="analysis" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Camera className="w-5 h-5 text-primary" />
                        <span>Análise Corporal</span>
                      </CardTitle>
                      <CardDescription>
                        Sistema de análise visual de traços corporais com base em fotos
                      </CardDescription>
                    </div>
                    <Button 
                      className="flex items-center space-x-2"
                      onClick={() => setShowAnalysisTypeSelector(true)}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nova Análise</span>
                    </Button>
                  </div>
                </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Análises Anteriores */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Análises Anteriores</h3>
                        <div className="space-y-3">
                          {patientData.bodyAnalyses.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p>Nenhuma análise encontrada</p>
                              <p className="text-sm mt-2">Clique em "Nova Análise" para começar</p>
                            </div>
                          ) : (
                            patientData.bodyAnalyses.map((analysis) => {
                              const dominantTrait = analysis.trait_scores.length > 0 
                                ? analysis.trait_scores[0] 
                                : null;
                              
                              return (
                                <div key={analysis.id} className="p-4 border rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{analysis.analysis_name}</span>
                                    <Badge variant="outline">
                                      {format(new Date(analysis.analysis_date), "dd/MM/yyyy")}
                                    </Badge>
                                  </div>
                                  {dominantTrait && (
                                    <div className="text-sm text-muted-foreground mb-2">
                                      Traço dominante: <strong>{dominantTrait.name} ({dominantTrait.percentage.toFixed(1)}%)</strong>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">
                                      {analysis.photos.length} foto(s) analisadas
                                    </span>
                                    <div className="flex gap-1">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                          setSelectedAnalysis(analysis);
                                          setAnalysisViewMode('view');
                                        }}
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                          setSelectedAnalysis(analysis);
                                          setAnalysisViewMode('edit');
                                        }}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Instruções e Recursos */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Como Funciona</h3>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                            <div>
                              <p className="font-medium">Upload de Fotos</p>
                              <p className="text-sm text-muted-foreground">Adicione fotos do paciente para análise</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                            <div>
                              <p className="font-medium">Avaliação Guiada</p>
                              <p className="text-sm text-muted-foreground">Percorra as avaliações por partes do corpo</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                            <div>
                              <p className="font-medium">Pontuação por Traços</p>
                              <p className="text-sm text-muted-foreground">V, C, D, E, R - Sistema de análise por caracteres</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                            <div>
                              <p className="font-medium">Resultado Final</p>
                              <p className="text-sm text-muted-foreground">Ranking de traços e relatório completo</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Traços de Caracteres</h4>
                          <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                            <div><strong>V - Visionário:</strong> Criatividade e inovação</div>
                            <div><strong>C - Comunicador:</strong> Expressão e relacionamento</div>
                            <div><strong>D - Dominador:</strong> Liderança e controle</div>
                            <div><strong>E - Executor:</strong> Ação e resultado</div>
                            <div><strong>R - Resolutivo:</strong> Análise e solução</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Mensagem quando nenhum paciente está selecionado */}
      {!selectedPatient && (
        <Card className="text-center py-12">
          <CardContent>
            <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Selecione um Paciente</h3>
            <p className="text-muted-foreground mb-6">
              Escolha um paciente para visualizar seu prontuário completo
            </p>
          </CardContent>
        </Card>
      )}

      {/* Seletor de Tipo de Análise */}
      <AnalysisTypeSelector
        isOpen={showAnalysisTypeSelector}
        onClose={() => setShowAnalysisTypeSelector(false)}
        patientName={selectedPatientData?.name || ''}
        onSelectDetailed={() => {
          setShowAnalysisTypeSelector(false);
          navigate(`/analise-detalhada/${selectedPatient}/${encodeURIComponent(selectedPatientData?.name || '')}`);
        }}
        onSelectSimplified={() => {
          setShowAnalysisTypeSelector(false);
          navigate(`/analise-resumida/${selectedPatient}/${encodeURIComponent(selectedPatientData?.name || '')}`);
        }}
      />

      {/* Modal para visualizar/editar análise corporal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 z-50 bg-background">
          <AnalysisViewer
            analysis={selectedAnalysis}
            patientName={selectedPatientData?.name || ''}
            mode={analysisViewMode}
            onClose={() => {
              setSelectedAnalysis(null);
              loadPatientData(selectedPatient); // Recarregar dados para mostrar alterações
            }}
            onEdit={() => setAnalysisViewMode('edit')}
          />
        </div>
      )}
    </div>
  );
};