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
  Sparkles, 
  Target, 
  Brain,
  Loader2,
  Plus,
  Trash2,
  FileText,
  Download,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useResourceCosts } from '@/hooks/useResourceCosts';
import { useAIAgentConfig } from '@/hooks/useAIAgentConfig';
import { useAuth } from '@/hooks/useAuth';
import { TreatmentPlanActions } from './TreatmentPlanActions';
import jsPDF from 'jspdf';

interface TreatmentPlanAISuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  transcription?: string;
  sessionNotes?: string;
  sessionId?: string; // Adicionar sessionId para atualizar status da agenda
  onPlanCreated?: (planId: string) => void;
}

interface SuggestedAction {
  name: string;
  objective: string;
  frequency: string;
  priority: 'low' | 'medium' | 'high';
  start_date: string;
  end_date?: string;
  instructions: string;
  expected_outcomes: string[];
  generated_by_ai?: boolean; // Flag para identificar se foi gerado pela IA
}

interface TreatmentArea {
  title: string;
  description: string;
  objectives: string[];
}

interface TreatmentPlanSuggestion {
  title: string;
  description: string;
  duration_weeks: number;
  treatment_areas: TreatmentArea[];
  treatment_approach: string;
  key_interventions: string[];
  expected_outcomes: string[];
  monitoring_indicators: string[];
  risk_factors: string[];
  contraindications: string[];
  suggested_actions: SuggestedAction[];
  follow_up_schedule: string;
  additional_recommendations: string[];
}

export const TreatmentPlanAISuggestionModal: React.FC<TreatmentPlanAISuggestionModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  patientEmail,
  patientPhone,
  transcription,
  sessionNotes,
  sessionId,
  onPlanCreated
}) => {
  const { toast } = useToast();
  const { consumeCreditsForResource } = useResourceCosts();
  const { agentId } = useAIAgentConfig();
  const { user } = useAuth();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [suggestion, setSuggestion] = useState<TreatmentPlanSuggestion | null>(null);
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  
  // State for multiple treatment areas approval
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [approvedAreas, setApprovedAreas] = useState<TreatmentArea[]>([]);
  const [editableAreas, setEditableAreas] = useState<TreatmentArea[]>([]);
  
  // General plan info
  const [editableStartDate, setEditableStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [editableEndDate, setEditableEndDate] = useState('');
  const [editableStatus, setEditableStatus] = useState<'ativo' | 'inativo' | 'concluido' | 'pausado'>('ativo');
  const [editableObservations, setEditableObservations] = useState('');
  
  // Actions generation state
  const [isGeneratingActions, setIsGeneratingActions] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [currentAreaForActions, setCurrentAreaForActions] = useState(0);
  const [areaActions, setAreaActions] = useState<{ [areaIndex: number]: SuggestedAction[] }>({});
  const [showActionsStep, setShowActionsStep] = useState(false);
  
  // Report generation state
  const [showReportStep, setShowReportStep] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string>('');

  // Pricing and cache state
  const [aiGeneratedContent, setAiGeneratedContent] = useState({
    areas: [] as TreatmentArea[],
    actions: {} as { [areaIndex: number]: SuggestedAction[] },
    reportGenerated: false
  });
  const [totalCost, setTotalCost] = useState(0);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);

  // Função para calcular custo estimado baseado no conteúdo atual
  const calculateEstimatedCost = () => {
    let cost = 5; // Plano inicial sempre custa 5 créditos
    
    // Custo por áreas aprovadas
    cost += approvedAreas.length * 5; // 5 créditos por título de área
    cost += approvedAreas.reduce((sum, area) => sum + (area.objectives.length * 5), 0); // 5 créditos por objetivo
    
    // Custo por ações geradas
    const totalActions = Object.values(areaActions).flat().length;
    cost += totalActions * 3; // 3 créditos por ação
    
    // Custo do relatório se ainda não foi gerado
    if (showReportStep && !generatedReport) {
      cost += 10; // 10 créditos para relatório
    }
    
    return cost;
  };

  // Função para verificar se já existe sugestão para esta sessão
  const checkExistingSuggestion = async () => {
    if (!patientId) return null;
    
    try {
      // Gerar um identificador único para esta sessão baseado no paciente e transcrição
      const sessionHash = btoa(`${patientId}-${transcription?.slice(0, 100) || ''}-${sessionNotes?.slice(0, 100) || ''}`);
      
      const { data, error } = await supabase
        .from('ai_suggestion_cache')
        .select('*')
        .eq('patient_id', patientId)
        .eq('session_hash', sessionHash)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.log('Erro ao verificar cache de sugestão:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.log('Erro ao verificar cache:', error);
      return null;
    }
  };

  // Função para salvar sugestão no cache
  const saveSuggestionToCache = async (suggestion: TreatmentPlanSuggestion) => {
    if (!patientId) return;
    
    try {
      const sessionHash = btoa(`${patientId}-${transcription?.slice(0, 100) || ''}-${sessionNotes?.slice(0, 100) || ''}`);
      const currentUser = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('ai_suggestion_cache')
        .insert([{
          patient_id: patientId,
          session_hash: sessionHash,
          suggestion_data: suggestion as any,
          ai_generated_content: aiGeneratedContent as any,
          created_by: currentUser.data.user?.id
        }])
        .select()
        .single();

      if (!error && data) {
        setSuggestionId(data.id);
      }
    } catch (error) {
      console.log('Erro ao salvar cache:', error);
    }
  };

  // Função para atualizar o cache com novas ações geradas
  const updateCacheWithActions = async () => {
    if (!suggestionId) return;
    
    try {
      const { error } = await supabase
        .from('ai_suggestion_cache')
        .update({ 
          ai_generated_content: aiGeneratedContent as any 
        })
        .eq('id', suggestionId);
        
      if (error) {
        console.log('Erro ao atualizar cache:', error);
      } else {
        console.log('Cache atualizado com ações geradas');
      }
    } catch (error) {
      console.log('Erro ao atualizar cache:', error);
    }
  };

  // Função para calcular custo baseado no conteúdo gerado pela IA
  const calculateAICost = async () => {
    let cost = 0;
    
    try {
      // Custo por área gerada pela IA (título + objetivos)
      for (const area of aiGeneratedContent.areas) {
        // Custo do título da área
        const titleCost = await getResourceCost('ai_area_title_generation');
        cost += titleCost;
        
        // Custo por objetivo da área
        const objectiveCost = await getResourceCost('ai_area_objective_generation');
        cost += objectiveCost * area.objectives.length;
      }
      
      // Custo por ação gerada pela IA
      const actionCost = await getResourceCost('ai_action_generation');
      const totalAIActions = Object.values(aiGeneratedContent.actions)
        .flat()
        .filter(action => action.generated_by_ai !== false).length;
      cost += actionCost * totalAIActions;
      
      // Custo do relatório se foi gerado
      if (aiGeneratedContent.reportGenerated) {
        const reportCost = await getResourceCost('ai_report_generation');
        cost += reportCost;
      }
      
      setTotalCost(cost);
      return cost;
    } catch (error) {
      console.error('Erro ao calcular custo:', error);
      return 0;
    }
  };

  // Função auxiliar para obter custo de recurso
  const getResourceCost = async (resourceName: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('resource_costs')
        .select('cost_per_usage')
        .eq('resource_name', resourceName)
        .eq('is_active', true)
        .single();
      
      return data?.cost_per_usage || 0;
    } catch {
      return 0;
    }
  };

  const generateSuggestion = async () => {
    // Primeiro verificar se já existe sugestão no cache
    const cachedSuggestion = await checkExistingSuggestion();
    
    if (cachedSuggestion) {
      console.log('Sugestão encontrada no cache, carregando...');
      const suggestionData = cachedSuggestion.suggestion_data as unknown as TreatmentPlanSuggestion;
      setSuggestion(suggestionData);
      setSuggestionId(cachedSuggestion.id);
      
      // Carregar conteúdo gerado pela IA do cache
      if (cachedSuggestion.ai_generated_content) {
        const aiContent = cachedSuggestion.ai_generated_content as any;
        setAiGeneratedContent(aiContent);
        
        // Restaurar as ações que já foram geradas e salvas no cache
        if (aiContent.actions && Object.keys(aiContent.actions).length > 0) {
          setAreaActions(aiContent.actions);
          console.log('Ações restauradas do cache:', aiContent.actions);
        }
      }
      
      // Configurar áreas editáveis
      const treatmentAreas = suggestionData.treatment_areas || [];
      setEditableAreas(treatmentAreas);
      setCurrentAreaIndex(0);
      setApprovedAreas(treatmentAreas); // Definir como aprovadas já que vem do cache
      setEditableEndDate(new Date(Date.now() + (suggestionData.duration_weeks || 8) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setEditableObservations(`Plano recuperado do cache:\n- Abordagem: ${suggestionData.treatment_approach || 'Não especificada'}\n- Acompanhamento: ${suggestionData.follow_up_schedule || 'Não especificado'}`);
      
      // Se há ações no cache, já pular para a etapa de ações
      const aiContentActions = (cachedSuggestion.ai_generated_content as any)?.actions;
      if (aiContentActions && Object.keys(aiContentActions).length > 0) {
        // Verificar se já existe um plano criado para este cache
        const { data: existingPlan } = await supabase
          .from('treatment_plans')
          .select('id')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (existingPlan) {
          setPlanId(existingPlan.id);
          setShowActionsStep(true);
          setCurrentAreaForActions(0);
          console.log('Plano existente encontrado, mostrando etapa de ações');
        }
      }
      
      toast({
        title: "Sugestão recuperada",
        description: `Plano já existente carregado com ${treatmentAreas.length} áreas de tratamento.`,
      });
      return;
    }

    // Verificar créditos antes de gerar sugestão
    const canProceed = await consumeCreditsForResource(
      'ai_treatment_plan_generation',
      `Geração de plano terapêutico com IA para ${patientName}`
    );
    
    if (!canProceed) {
      toast({
        title: "Créditos insuficientes",
        description: "Não foi possível gerar sugestão devido a créditos insuficientes",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-treatment-plan', {
        body: {
          patientId,
          patientName,
          patientAge: undefined,
          patientGender: undefined,
          transcription,
          currentSymptoms: undefined,
          medicalHistory: undefined,
          currentMedications: undefined,
          treatmentGoals: '',
          sessionNotes,
          urgencyLevel: 'medium',
          assistantId: agentId // Usar agente personalizado se disponível
        }
      });

      if (error) {
        throw error;
      }

      console.log('Dados recebidos da IA:', data);

      // Compatibilidade: converter formato antigo para novo se necessário
      let treatmentAreas = data.treatment_areas;
      
      if (!treatmentAreas || !Array.isArray(treatmentAreas) || treatmentAreas.length === 0) {
        console.log('Convertendo formato antigo para novo...');
        
        // Criar áreas a partir dos objetivos primários e secundários (formato antigo)
        treatmentAreas = [];
        
        if (data.primary_goals && Array.isArray(data.primary_goals) && data.primary_goals.length > 0) {
          treatmentAreas.push({
            title: "Objetivos Principais",
            description: "Foco principal do plano terapêutico baseado na análise do paciente",
            objectives: data.primary_goals
          });
        }
        
        if (data.secondary_goals && Array.isArray(data.secondary_goals) && data.secondary_goals.length > 0) {
          treatmentAreas.push({
            title: "Objetivos Complementares", 
            description: "Objetivos complementares para o desenvolvimento integral",
            objectives: data.secondary_goals
          });
        }
        
        // Se ainda não temos áreas, criar uma padrão
        if (treatmentAreas.length === 0) {
          treatmentAreas = [{
            title: "Área Principal de Tratamento",
            description: "Área focada no desenvolvimento pessoal do paciente",
            objectives: ["Desenvolver habilidades terapêuticas específicas"]
          }];
        }
        
        // Atualizar o objeto data com as áreas convertidas
        data.treatment_areas = treatmentAreas;
      }

      // Validar se agora temos treatment_areas válidas
      if (!treatmentAreas || treatmentAreas.length === 0) {
        console.error('Não foi possível criar áreas de tratamento válidas:', data);
        throw new Error('Não foi possível processar o plano de tratamento retornado pela IA');
      }

      setSuggestion(data);
      
      // Marcar áreas como geradas pela IA para precificação
      const aiGeneratedAreas = treatmentAreas.map(area => ({ ...area, generated_by_ai: true }));
      setAiGeneratedContent(prev => ({
        ...prev,
        areas: aiGeneratedAreas
      }));
      
      // Inicializar campos editáveis com os dados da sugestão
      setEditableAreas(treatmentAreas);
      setCurrentAreaIndex(0);
      setApprovedAreas([]);
      setEditableEndDate(new Date(Date.now() + (data.duration_weeks || 8) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setEditableObservations(`Plano gerado pela IA com base em:\n- Abordagem: ${data.treatment_approach || 'Não especificada'}\n- Acompanhamento: ${data.follow_up_schedule || 'Não especificado'}`);
      
      // Salvar no cache após geração
      await saveSuggestionToCache(data);
      
      toast({
        title: "Sugestão gerada com sucesso",
        description: `${treatmentAreas.length} áreas de tratamento foram criadas. Revise cada uma delas.`,
      });

    } catch (error) {
      console.error('Erro ao gerar sugestão:', error);
      
      // Mostrar erro mais específico
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao gerar plano",
        description: `Detalhes: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Gerar automaticamente ao abrir o modal
  React.useEffect(() => {
    if (isOpen && !suggestion && !isGenerating) {
      generateSuggestion();
    }
  }, [isOpen]);


  // Função para rejeitar apenas a área atual
  const rejectCurrentArea = () => {
    const currentArea = editableAreas[currentAreaIndex];
    
    // Se há mais áreas, vai para a próxima
    if (currentAreaIndex < editableAreas.length - 1) {
      setCurrentAreaIndex(currentAreaIndex + 1);
      toast({
        title: "Área rejeitada",
        description: `"${currentArea?.title || 'Área'}" foi rejeitada. Revise a próxima área.`,
      });
    } else {
      // Se é a última área e não há nenhuma aprovada, finalizar com áreas aprovadas
      if (approvedAreas.length === 0) {
        toast({
          title: "Nenhuma área aprovada",
          description: "Você rejeitou todas as áreas. Gere uma nova sugestão ou feche o modal.",
          variant: "destructive",
        });
        return;
      }
      
      // Criar plano apenas com as áreas aprovadas
      createFinalPlan(approvedAreas);
    }
  };

  // Função para rejeitar toda a sugestão
  const rejectSuggestion = async () => {
    try {
      // Marcar sugestão como inativa no cache se existir
      if (suggestionId) {
        await supabase
          .from('ai_suggestion_cache')
          .update({ is_active: false })
          .eq('id', suggestionId);
      }
      
      toast({
        title: "Sugestão rejeitada",
        description: "A sugestão foi descartada e não será cobrada.",
      });
      
      // Limpar estados
      setSuggestion(null);
      setSuggestionId(null);
      setEditableAreas([]);
      setApprovedAreas([]);
      setAiGeneratedContent({ areas: [], actions: {}, reportGenerated: false });
      
      onClose();
    } catch (error) {
      console.error('Erro ao rejeitar sugestão:', error);
      toast({
        title: "Erro ao rejeitar",
        description: "Não foi possível rejeitar a sugestão",
        variant: "destructive",
      });
    }
  };

  const approveCurrentArea = () => {
    const currentArea = editableAreas[currentAreaIndex];
    if (!currentArea || !currentArea.title.trim() || currentArea.objectives.filter(obj => obj.trim()).length === 0) {
      toast({
        title: "Área incompleta",
        description: "Preencha o título e pelo menos um objetivo para esta área",
        variant: "destructive",
      });
      return;
    }

    const newApprovedAreas = [...approvedAreas, currentArea];
    setApprovedAreas(newApprovedAreas);

    // Se há mais áreas, vai para a próxima
    if (currentAreaIndex < editableAreas.length - 1) {
      setCurrentAreaIndex(currentAreaIndex + 1);
      toast({
        title: "Área aprovada",
        description: `"${currentArea.title}" foi aprovada. Revise a próxima área.`,
      });
    } else {
      // Todas as áreas foram aprovadas, criar o plano
      createFinalPlan(newApprovedAreas);
    }
  };

  const createFinalPlan = async (allApprovedAreas: TreatmentArea[]) => {
    if (!patientId) {
      toast({
        title: "Erro",
        description: "Dados insuficientes para criar o plano",
        variant: "destructive",
      });
      return;
    }

    // Cobrar por cada área de tratamento aprovada
    for (const area of allApprovedAreas) {
      // Cobrar por título da área
      const canProceedTitle = await consumeCreditsForResource(
        'ai_area_title_generation',
        `Título da área "${area.title}" para ${patientName}`
      );
      
      if (!canProceedTitle) {
        toast({
          title: "Créditos insuficientes",
          description: `Não foi possível processar a área "${area.title}" devido a créditos insuficientes`,
          variant: "destructive",
        });
        return;
      }
      
      // Cobrar por cada objetivo da área
      for (let i = 0; i < area.objectives.length; i++) {
        const canProceedObjective = await consumeCreditsForResource(
          'ai_area_objective_generation',
          `Objetivo ${i + 1} da área "${area.title}" para ${patientName}`
        );
        
        if (!canProceedObjective) {
          toast({
            title: "Créditos insuficientes",
            description: `Não foi possível processar todos os objetivos da área "${area.title}" devido a créditos insuficientes`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setIsCreatingPlan(true);
    try {
      // Combinar todas as áreas em um plano final
      const combinedTitle = allApprovedAreas.map(area => area.title).join('; ');
      const combinedDescription = allApprovedAreas.map(area => 
        `**${area.title}**: ${area.description}`
      ).join('\n\n');
      const allObjectives = allApprovedAreas.flatMap(area => area.objectives);

      const { data: planData, error: planError } = await supabase
        .from('treatment_plans')
        .insert({
          patient_id: patientId,
          title: combinedTitle,
          description: combinedDescription,
          start_date: editableStartDate,
          end_date: editableEndDate || null,
          goals: allObjectives.filter(goal => goal.trim() !== ''),
          status: editableStatus,
          observations: editableObservations
        })
        .select()
        .single();

      if (planError) {
        throw planError;
      }

      toast({
        title: "Plano criado com sucesso",
        description: `Plano terapêutico com ${allApprovedAreas.length} áreas foi criado. Agora vamos gerar as ações para cada área.`,
      });

      setPlanId(planData.id);
      setShowActionsStep(true);
      setCurrentAreaForActions(0);

    } catch (error) {
      console.error('Erro ao criar plano:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o plano terapêutico",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const goBackToArea = (index: number) => {
    if (index < approvedAreas.length) {
      // Remover áreas aprovadas após este índice
      setApprovedAreas(approvedAreas.slice(0, index));
      setCurrentAreaIndex(index);
    }
  };

  const updateCurrentAreaTitle = (title: string) => {
    const newAreas = [...editableAreas];
    newAreas[currentAreaIndex] = { ...newAreas[currentAreaIndex], title };
    setEditableAreas(newAreas);
  };

  const updateCurrentAreaDescription = (description: string) => {
    const newAreas = [...editableAreas];
    newAreas[currentAreaIndex] = { ...newAreas[currentAreaIndex], description };
    setEditableAreas(newAreas);
  };

  const addObjectiveToCurrentArea = () => {
    const newAreas = [...editableAreas];
    newAreas[currentAreaIndex] = {
      ...newAreas[currentAreaIndex],
      objectives: [...newAreas[currentAreaIndex].objectives, '']
    };
    setEditableAreas(newAreas);
  };

  const updateObjectiveInCurrentArea = (index: number, value: string) => {
    const newAreas = [...editableAreas];
    newAreas[currentAreaIndex].objectives[index] = value;
    setEditableAreas(newAreas);
  };

  const removeObjectiveFromCurrentArea = (index: number) => {
    const newAreas = [...editableAreas];
    const currentArea = newAreas[currentAreaIndex];
    if (currentArea.objectives.length > 1) {
      currentArea.objectives = currentArea.objectives.filter((_, i) => i !== index);
      setEditableAreas(newAreas);
    }
  };

  // Functions for actions generation
  const generateActionsForArea = async (areaIndex: number) => {
    const area = approvedAreas[areaIndex];
    if (!area || !patientId) return;

    setIsGeneratingActions(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-area-actions', {
        body: {
          patientId,
          patientName,
          treatmentArea: area,
          transcription,
          assistantId: agentId
        }
      });

      if (error) {
        throw error;
      }

      console.log('Ações geradas para área:', area.title, data);
      
      const generatedActions = data.suggested_actions || [];
      
      // Cobrar por cada ação gerada (não por área)
      if (generatedActions.length > 0) {
        const totalCost = generatedActions.length; // 1 crédito por ação
        const canProceed = await consumeCreditsForResource(
          'ai_action_generation',
          `Geração de ${generatedActions.length} ações terapêuticas para área "${area.title}" do paciente ${patientName}`
        );
        
        if (!canProceed) {
          toast({
            title: "Créditos insuficientes",
            description: `Não foi possível processar as ${generatedActions.length} ações geradas devido a créditos insuficientes`,
            variant: "destructive",
          });
          return;
        }
      }
      
      // Marcar ações como geradas pela IA para controle de custos
      const aiGeneratedActions = generatedActions.map(action => ({
        ...action,
        generated_by_ai: true
      }));
      
      setAreaActions(prev => ({
        ...prev,
        [areaIndex]: aiGeneratedActions
      }));

      // Atualizar o conteúdo gerado pela IA para cálculo de custos
      setAiGeneratedContent(prev => ({
        ...prev,
        actions: {
          ...prev.actions,
          [areaIndex]: aiGeneratedActions
        }
      }));

      // Atualizar cache com as novas ações
      setTimeout(() => updateCacheWithActions(), 100); // Pequeno delay para garantir que o estado foi atualizado

      toast({
        title: "Ações geradas",
        description: `${aiGeneratedActions.length} ações foram geradas para "${area.title}".`,
      });

    } catch (error) {
      console.error('Erro ao gerar ações:', error);
      toast({
        title: "Erro ao gerar ações",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setIsGeneratingActions(false);
    }
  };

  const proceedToNextAreaActions = () => {
    if (currentAreaForActions < approvedAreas.length - 1) {
      setCurrentAreaForActions(currentAreaForActions + 1);
    } else {
      // Finalizar processo
      finalizeWithActions();
    }
  };

  const goBackToPreviousAreaActions = () => {
    if (currentAreaForActions > 0) {
      setCurrentAreaForActions(currentAreaForActions - 1);
    }
  };

  const skipActionsForArea = () => {
    proceedToNextAreaActions();
  };

  const finalizeWithActions = async () => {
    // Salvar todas as ações aprovadas no banco
    const allActions = Object.values(areaActions).flat();
    
    if (allActions.length > 0 && planId) {
      try {
        // Função para mapear frequência para valores aceitos pela constraint
        const mapFrequency = (frequency: string): string => {
          const freq = frequency.toLowerCase();
          if (freq.includes('diár') || freq.includes('daily')) return 'daily';
          if (freq.includes('seman') || freq.includes('weekly')) return 'weekly';
          return 'unique'; // valor padrão para outras frequências
        };

        // Função para mapear prioridade para valores aceitos pela constraint
        const mapPriority = (priority: string): 'low' | 'medium' | 'high' => {
          const prio = priority.toLowerCase();
          if (prio === 'high' || prio === 'alta') return 'high';
          if (prio === 'low' || prio === 'baixa') return 'low';
          return 'medium'; // valor padrão
        };

        const actionsToInsert = allActions.map((action, index) => ({
          treatment_plan_id: planId,
          name: action.name,
          objective: action.objective,
          frequency: mapFrequency(action.frequency),
          priority: mapPriority(action.priority),
          start_date: action.start_date,
          end_date: action.end_date || null,
          observations: action.instructions
        }));

        const { error } = await supabase
          .from('therapeutic_actions')
          .insert(actionsToInsert);

        if (error) {
          throw error;
        }

        toast({
          title: "Ações salvas com sucesso",
          description: `${allActions.length} ações terapêuticas foram salvas. Gerando relatório completo...`,
        });
      } catch (error) {
        console.error('Erro ao salvar ações:', error);
        toast({
          title: "Erro ao salvar ações",
          description: "As ações não puderam ser salvas, mas o plano foi criado.",
          variant: "destructive",
        });
      }
    }

    // Mostrar etapa do relatório
    setShowActionsStep(false);
    setShowReportStep(true);
    generateComprehensiveReport();
  };

  const generateComprehensiveReport = async () => {
    if (!patientName || !approvedAreas || !planId) return;

    // Verificar créditos antes de gerar relatório
    const canProceed = await consumeCreditsForResource(
      'ai_report_generation',
      `Geração de relatório completo do atendimento para ${patientName}`
    );
    
    if (!canProceed) {
      toast({
        title: "Créditos insuficientes",
        description: "Não foi possível gerar relatório devido a créditos insuficientes. O plano foi criado com sucesso.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingReport(true);
    try {
      // Criar um resumo completo do plano de tratamento
      const allActions = Object.values(areaActions).flat();
      const totalActions = allActions.length;
      
      const reportPrompt = `Gere um relatório completo e profissional do atendimento e plano de tratamento criado para o paciente ${patientName}.

DADOS DO PLANO DE TRATAMENTO:

**Áreas de Tratamento (${approvedAreas.length} áreas):**
${approvedAreas.map((area, index) => `
${index + 1}. **${area.title}**
   - Descrição: ${area.description}
   - Objetivos: ${area.objectives.join('; ')}
`).join('\n')}

**Ações Terapêuticas (${totalActions} ações):**
${allActions.map((action, index) => `
${index + 1}. **${action.name}**
   - Objetivo: ${action.objective}
   - Frequência: ${action.frequency}
   - Prioridade: ${action.priority}
   - Instruções: ${action.instructions}
`).join('\n')}

**Informações da Sessão:**
${transcription ? `- Transcrição da conversa foi utilizada para personalizar o plano` : ''}
${sessionNotes ? `- Observações da sessão: ${sessionNotes}` : ''}

**Configurações do Plano:**
- Data de início: ${editableStartDate}
- Data de término: ${editableEndDate || 'Não definida'}
- Status: ${editableStatus}
- Observações: ${editableObservations}

Por favor, crie um relatório estruturado, profissional e detalhado incluindo:
1. Resumo executivo do atendimento
2. Análise das áreas de tratamento identificadas
3. Plano de ações terapêuticas detalhado
4. Cronograma e próximos passos
5. Recomendações e considerações importantes
6. Conclusão e expectativas de resultados

Use linguagem técnica apropriada e formato que possa ser usado como documento oficial de consulta.`;

      // Usar o agente personalizado se disponível, senão usar generate-report padrão
      let data, error;
      
      if (agentId) {
        // Usar agente personalizado via custom-ai-agent
        const customResponse = await supabase.functions.invoke('custom-ai-agent', {
          body: {
            message: reportPrompt,
            patientId,
            analysisType: 'general',
            assistantId: agentId
          }
        });
        data = { generatedText: customResponse.data?.response };
        error = customResponse.error;
      } else {
        // Usar edge function padrão
        const standardResponse = await supabase.functions.invoke('generate-report', {
          body: { prompt: reportPrompt }
        });
        data = standardResponse.data;
        error = standardResponse.error;
      }

      if (error) {
        throw error;
      }

      setGeneratedReport(data.generatedText || '');
      
      // Marcar que o relatório foi gerado pela IA para controle de custos
      setAiGeneratedContent(prev => ({
        ...prev,
        reportGenerated: true
      }));
      
      toast({
        title: "Relatório gerado com sucesso",
        description: "O relatório completo do atendimento foi criado.",
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório, mas o plano foi criado com sucesso.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadReport = async () => {
    if (!generatedReport) return;

    try {
      // Buscar dados do perfil da conta
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, phone, logo_url, job_title, address')
        .eq('user_id', user?.id)
        .single();

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      let yPos = margin;

      // HEADER COM DADOS DO PERFIL
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Logo (se disponível)
      if (profileData?.logo_url) {
        try {
          // Carregar logo (simplificado - adicionar tratamento de erro se necessário)
          yPos += 5;
        } catch (e) {
          console.log('Logo não carregou, continuando sem logo');
        }
      }

      // Dados do terapeuta
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(profileData?.full_name || 'Profissional', margin, yPos + 15);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(profileData?.job_title || 'Terapeuta', margin, yPos + 22);
      
      if (profileData?.email) {
        doc.text(`Email: ${profileData.email}`, margin, yPos + 28);
      }
      if (profileData?.phone) {
        doc.text(`Telefone: ${profileData.phone}`, margin, yPos + 34);
      }

      // Data e hora no canto direito
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const now = new Date();
      doc.text(`Data: ${now.toLocaleDateString('pt-BR')}`, pageWidth - margin, yPos + 15, { align: 'right' });
      doc.text(`Hora: ${now.toLocaleTimeString('pt-BR')}`, pageWidth - margin, yPos + 22, { align: 'right' });

      yPos = 60;

      // TÍTULO DO RELATÓRIO
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('RELATÓRIO DE ATENDIMENTO', pageWidth / 2, yPos, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(59, 130, 246);
      yPos += 10;
      doc.text(`Paciente: ${patientName}`, pageWidth / 2, yPos, { align: 'center' });

      yPos += 20;

      // LINHA SEPARADORA
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;

      // RESUMO DO PLANO
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('RESUMO DO PLANO DE TRATAMENTO', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      
      // Informações básicas
      const allActions = Object.values(areaActions).flat();
      doc.text(`• Áreas de tratamento: ${approvedAreas.length}`, margin, yPos);
      yPos += 6;
      doc.text(`• Ações terapêuticas: ${allActions.length}`, margin, yPos);
      yPos += 6;
      doc.text(`• Data de início: ${editableStartDate}`, margin, yPos);
      yPos += 6;
      if (editableEndDate) {
        doc.text(`• Data prevista de término: ${editableEndDate}`, margin, yPos);
        yPos += 6;
      }

      yPos += 10;

      // ÁREAS DE TRATAMENTO
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('ÁREAS DE TRATAMENTO', margin, yPos);
      yPos += 10;

      approvedAreas.forEach((area, index) => {
        // Verificar se há espaço suficiente na página
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text(`${index + 1}. ${area.title}`, margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        
        // Descrição
        const descLines = doc.splitTextToSize(area.description, pageWidth - (margin * 2));
        doc.text(descLines, margin + 5, yPos);
        yPos += descLines.length * 5;

        // Objetivos
        doc.setFont('helvetica', 'bold');
        doc.text('Objetivos:', margin + 5, yPos);
        yPos += 5;
        
        doc.setFont('helvetica', 'normal');
        area.objectives.forEach(objective => {
          const objLines = doc.splitTextToSize(`• ${objective}`, pageWidth - (margin * 2) - 10);
          doc.text(objLines, margin + 10, yPos);
          yPos += objLines.length * 5;
        });

        yPos += 5;
      });

      // AÇÕES TERAPÊUTICAS
      if (allActions.length > 0) {
        if (yPos > pageHeight - 100) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text('AÇÕES TERAPÊUTICAS', margin, yPos);
        yPos += 10;

        allActions.forEach((action, index) => {
          if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = margin;
          }

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(59, 130, 246);
          doc.text(`${index + 1}. ${action.name}`, margin, yPos);
          yPos += 8;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(75, 85, 99);
          
          doc.text(`Objetivo: ${action.objective}`, margin + 5, yPos);
          yPos += 6;
          doc.text(`Frequência: ${action.frequency}`, margin + 5, yPos);
          yPos += 6;
          doc.text(`Prioridade: ${action.priority === 'high' ? 'Alta' : action.priority === 'medium' ? 'Média' : 'Baixa'}`, margin + 5, yPos);
          yPos += 6;

          if (action.instructions) {
            const instrLines = doc.splitTextToSize(`Instruções: ${action.instructions}`, pageWidth - (margin * 2) - 10);
            doc.text(instrLines, margin + 5, yPos);
            yPos += instrLines.length * 5;
          }

          yPos += 5;
        });
      }

      // CONTEÚDO DO RELATÓRIO IA
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('ANÁLISE DETALHADA', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);

      // Processar o relatório gerado pela IA
      const reportLines = generatedReport.split('\n');
      reportLines.forEach(line => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }

        if (line.trim()) {
          const lines = doc.splitTextToSize(line, pageWidth - (margin * 2));
          doc.text(lines, margin, yPos);
          yPos += lines.length * 5;
        } else {
          yPos += 3;
        }
      });

      // FOOTER
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer background
        doc.setFillColor(248, 250, 252);
        doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        
        // Footer content
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Relatório gerado automaticamente em ${now.toLocaleString('pt-BR')}`, margin, pageHeight - 10);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      // Salvar o PDF
      const fileName = `relatorio-atendimento-${patientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF gerado com sucesso",
        description: `O relatório foi baixado como ${fileName}`,
      });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o PDF. Tentando download em texto...",
        variant: "destructive",
      });
      
      // Fallback para download em texto
      const reportContent = `RELATÓRIO DE ATENDIMENTO - ${patientName.toUpperCase()}
Data: ${new Date().toLocaleDateString('pt-BR')}
======================================================

${generatedReport}

======================================================
Relatório gerado automaticamente pelo sistema
${new Date().toLocaleString('pt-BR')}`;

      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-atendimento-${patientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Função para buscar e atualizar sessão ativa do paciente
  const updateActiveSessionToCompleted = async () => {
    if (!patientId) return;

    try {
      // Buscar sessão ativa do paciente (confirmada ou em andamento) de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, status')
        .eq('patient_id', patientId)
        .in('status', ['confirmada', 'em_andamento'])
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString())
        .limit(1);

      if (error) {
        console.error('Erro ao buscar sessão ativa:', error);
        return;
      }

      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        const { error: updateError } = await supabase
          .from('sessions')
          .update({ status: 'concluida' })
          .eq('id', session.id);

        if (updateError) {
          console.error('Erro ao atualizar status da sessão:', updateError);
        } else {
          console.log('Status da sessão atualizado para "concluida"');
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar status da sessão:', error);
    }
  };

  const finalizePlan = async () => {
    // Atualizar status da sessão ativa do paciente para "concluida" quando o plano for finalizado
    if (sessionId) {
      // Se temos sessionId específico, usar ele
      try {
        const { error } = await supabase
          .from('sessions')
          .update({ status: 'concluida' })
          .eq('id', sessionId);

        if (error) {
          console.error('Erro ao atualizar status da sessão:', error);
        } else {
          console.log('Status da sessão atualizado para "concluida"');
        }
      } catch (error) {
        console.error('Erro ao atualizar status da sessão:', error);
      }
    } else {
      // Se não temos sessionId, buscar e atualizar sessão ativa
      await updateActiveSessionToCompleted();
    }

    onPlanCreated?.(planId!);
    onClose();
  };

  const addCustomAction = () => {
    const newAction: SuggestedAction = {
      name: 'Nova ação personalizada',
      objective: 'Objetivo a ser definido',
      frequency: 'Semanal',
      priority: 'medium',
      start_date: new Date().toISOString().split('T')[0],
      instructions: 'Instruções a serem definidas',
      expected_outcomes: []
    };

    setAreaActions(prev => ({
      ...prev,
      [currentAreaForActions]: [...(prev[currentAreaForActions] || []), newAction]
    }));
  };

  const updateActionInArea = (actionIndex: number, updatedAction: SuggestedAction) => {
    setAreaActions(prev => {
      const areaActionsArray = [...(prev[currentAreaForActions] || [])];
      areaActionsArray[actionIndex] = updatedAction;
      return {
        ...prev,
        [currentAreaForActions]: areaActionsArray
      };
    });
  };

  const removeActionFromArea = (actionIndex: number) => {
    setAreaActions(prev => ({
      ...prev,
      [currentAreaForActions]: (prev[currentAreaForActions] || []).filter((_, i) => i !== actionIndex)
    }));
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

  const formatReportAsHTML = (report: string): string => {
    return report
      // Títulos principais (linhas que começam com ##)
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-slate-800 mt-6 mb-4 border-b border-slate-200 pb-2">$1</h2>')
      // Títulos secundários (linhas que começam com ###)
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-700 mt-4 mb-3">$1</h3>')
      // Títulos terciários (linhas que começam com ####)
      .replace(/^#### (.+)$/gm, '<h4 class="text-base font-medium text-slate-600 mt-3 mb-2">$1</h4>')
      // Texto em negrito (** ou __)
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>')
      .replace(/__(.+?)__/g, '<strong class="font-semibold text-slate-800">$1</strong>')
      // Texto em itálico (* ou _)
      .replace(/\*(.+?)\*/g, '<em class="italic text-slate-700">$1</em>')
      .replace(/_(.+?)_/g, '<em class="italic text-slate-700">$1</em>')
      // Listas numeradas
      .replace(/^\d+\.\s+(.+)$/gm, '<li class="mb-2 text-slate-700">$1</li>')
      // Listas com marcadores
      .replace(/^[-*]\s+(.+)$/gm, '<li class="mb-1 text-slate-600 pl-2">$1</li>')
      // Parágrafos (linhas não vazias que não são títulos ou listas)
      .replace(/^(?!<[h|l])(.+)$/gm, '<p class="mb-3 text-slate-700 leading-relaxed">$1</p>')
      // Quebras de linha duplas
      .replace(/\n\n/g, '</div><div class="mb-4">')
      // Envolver tudo em divs
      .replace(/^/, '<div class="mb-4">')
      .replace(/$/, '</div>')
      // Limpar tags vazias
      .replace(/<p class="mb-3 text-slate-700 leading-relaxed"><\/p>/g, '')
      .replace(/<div class="mb-4"><\/div>/g, '');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>Plano Terapêutico com IA</span>
          </DialogTitle>
          <DialogDescription>
            {isGenerating 
              ? `Gerando plano terapêutico personalizado para ${patientName}...`
              : `Revise e aprove os objetivos do plano terapêutico para ${patientName}`
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] px-1">
          <div className="space-y-6">
            {isGenerating ? (
              // Loading state
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
                <div className="text-center">
                  <h3 className="text-lg font-medium">Gerando plano terapêutico...</h3>
                  <p className="text-muted-foreground">Analisando traços do paciente e histórico de transcrições</p>
                </div>
              </div>
            ) : showReportStep ? (
              // Report Generation Step
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        <span>Relatório do Atendimento</span>
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        Plano finalizado para {patientName}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {isGeneratingReport ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-green-600" />
                    <div className="text-center">
                      <h3 className="text-lg font-medium">Gerando relatório completo...</h3>
                      <p className="text-muted-foreground">Compilando todas as informações do atendimento</p>
                    </div>
                  </div>
                ) : generatedReport ? (
                  <div className="space-y-6">
                    {/* Header do relatório */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold text-blue-900">Relatório de Atendimento</h2>
                            <p className="text-blue-700">Plano Terapêutico Completo</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={downloadReport}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar PDF
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-medium text-blue-900">Paciente</div>
                          <div className="text-blue-700">{patientName}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-medium text-blue-900">Data</div>
                          <div className="text-blue-700">{new Date().toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-medium text-blue-900">Áreas de Tratamento</div>
                          <div className="text-blue-700">{approvedAreas.length} áreas</div>
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo do relatório com formatação moderna */}
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-0">
                        <div className="bg-white rounded-lg">
                          <div 
                            className="prose prose-slate max-w-none p-6"
                            dangerouslySetInnerHTML={{
                              __html: formatReportAsHTML(generatedReport)
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Resumo visual das ações */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-green-200 bg-green-50">
                        <CardContent className="pt-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Target className="w-5 h-5 text-green-600" />
                            <h3 className="font-medium text-green-900">Ações Criadas</h3>
                          </div>
                          <div className="text-2xl font-bold text-green-700">
                            {Object.values(areaActions).flat().length}
                          </div>
                          <p className="text-green-600 text-sm">ações terapêuticas</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-purple-200 bg-purple-50">
                        <CardContent className="pt-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Brain className="w-5 h-5 text-purple-600" />
                            <h3 className="font-medium text-purple-900">Áreas Trabalhadas</h3>
                          </div>
                          <div className="text-2xl font-bold text-purple-700">
                            {approvedAreas.length}
                          </div>
                          <p className="text-purple-600 text-sm">áreas de tratamento</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Erro ao gerar o relatório</p>
                    <p className="text-sm">O plano foi criado com sucesso, mas houve um problema na geração do relatório</p>
                  </div>
                )}

                {/* Report navigation */}
                <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowReportStep(false);
                        setShowActionsStep(true);
                      }}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar às Ações
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={generateComprehensiveReport} 
                      disabled={isGeneratingReport}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Novamente
                    </Button>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline"
                      onClick={finalizePlan}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Finalizar sem Relatório
                    </Button>
                    
                    <Button 
                      onClick={finalizePlan}
                      disabled={!generatedReport}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Concluir Atendimento
                    </Button>
                  </div>
                </div>
              </div>
            ) : showActionsStep ? (
              // Actions Generation Step
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Ações Terapêuticas</h3>
                      <span className="text-sm text-muted-foreground">
                        Área {currentAreaForActions + 1} de {approvedAreas.length}: {approvedAreas[currentAreaForActions]?.title}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {approvedAreas.map((area, index) => (
                        <Button
                          key={index}
                          variant={
                            index < currentAreaForActions ? "default" :
                            index === currentAreaForActions ? "secondary" : "outline"
                          }
                          size="sm"
                          disabled={index !== currentAreaForActions}
                        >
                          {index < currentAreaForActions ? "✓" : index + 1} {area.title.split(' ').slice(0, 3).join(' ')}...
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Current area actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Ações para: {approvedAreas[currentAreaForActions]?.title}
                    </CardTitle>
                    <CardDescription>
                      {approvedAreas[currentAreaForActions]?.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        Ações baseadas na transcrição da conversa e necessidades do paciente
                      </p>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => generateActionsForArea(currentAreaForActions)}
                          disabled={isGeneratingActions}
                        >
                          {isGeneratingActions ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          {areaActions[currentAreaForActions]?.length > 0 ? 'Gerar Novamente' : 'Gerar Ações'}
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={addCustomAction}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Ação
                        </Button>
                      </div>
                    </div>

                    {areaActions[currentAreaForActions]?.length > 0 ? (
                      <div className="space-y-3">
                        {areaActions[currentAreaForActions].map((action, index) => (
                          <Card key={index} className="border-l-4 border-l-blue-500">
                            <CardContent className="pt-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      value={action.name}
                                      onChange={(e) => updateActionInArea(index, { ...action, name: e.target.value })}
                                      className="font-medium"
                                      placeholder="Nome da ação"
                                    />
                                    <Textarea
                                      value={action.objective}
                                      onChange={(e) => updateActionInArea(index, { ...action, objective: e.target.value })}
                                      placeholder="Objetivo da ação"
                                      rows={2}
                                    />
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeActionFromArea(index)}
                                    className="ml-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                    <Label>Frequência</Label>
                                    <Input
                                      value={action.frequency}
                                      onChange={(e) => updateActionInArea(index, { ...action, frequency: e.target.value })}
                                      placeholder="Ex: Diária, Semanal"
                                    />
                                  </div>
                                  <div>
                                    <Label>Prioridade</Label>
                                    <Select 
                                      value={action.priority} 
                                      onValueChange={(value: 'low' | 'medium' | 'high') => updateActionInArea(index, { ...action, priority: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="medium">Média</SelectItem>
                                        <SelectItem value="low">Baixa</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Data de Início</Label>
                                    <Input
                                      type="date"
                                      value={action.start_date}
                                      onChange={(e) => updateActionInArea(index, { ...action, start_date: e.target.value })}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label>Instruções</Label>
                                  <Textarea
                                    value={action.instructions}
                                    onChange={(e) => updateActionInArea(index, { ...action, instructions: e.target.value })}
                                    placeholder="Instruções detalhadas para a ação"
                                    rows={3}
                                  />
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Badge className={getPriorityColor(action.priority)}>
                                    {getPriorityLabel(action.priority)}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {action.frequency}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma ação gerada ainda</p>
                        <p className="text-sm">Clique em "Gerar Ações" para criar ações baseadas na transcrição</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions navigation */}
                <div className="flex justify-between items-center pt-4">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  
                  <div className="flex space-x-3">
                    {currentAreaForActions > 0 && (
                      <Button 
                        variant="outline"
                        onClick={goBackToPreviousAreaActions}
                      >
                        Área Anterior
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline"
                      onClick={skipActionsForArea}
                    >
                      Pular Área
                    </Button>
                    
                    <Button 
                      onClick={proceedToNextAreaActions}
                      disabled={areaActions[currentAreaForActions]?.length === 0}
                    >
                      {currentAreaForActions < approvedAreas.length - 1 ? (
                        <>
                          <Target className="w-4 h-4 mr-2" />
                          Próxima Área
                        </>
                      ) : (
                        <>
                          <Target className="w-4 h-4 mr-2" />
                          Finalizar Plano
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : suggestion && editableAreas.length > 0 ? (
              // Review and Edit Interface for Multiple Areas
              <div className="space-y-6">
                {/* Progress indicator */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Progresso das Áreas</h3>
                      <span className="text-sm text-muted-foreground">
                        {approvedAreas.length} de {editableAreas.length} aprovadas
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editableAreas.map((area, index) => (
                        <Button
                          key={index}
                          variant={
                            index < approvedAreas.length ? "default" :
                            index === currentAreaIndex ? "secondary" : "outline"
                          }
                          size="sm"
                          onClick={() => index < approvedAreas.length ? goBackToArea(index) : undefined}
                          disabled={index > currentAreaIndex}
                        >
                          {index < approvedAreas.length ? "✓" : index + 1} {area.title.split(' ').slice(0, 3).join(' ')}...
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Current area editing */}
                {currentAreaIndex < editableAreas.length && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Área {currentAreaIndex + 1} de {editableAreas.length}
                      </CardTitle>
                      <CardDescription>
                        Revise e aprove esta área do plano terapêutico
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="areaTitle">Título da Área *</Label>
                        <Input
                          id="areaTitle"
                          value={editableAreas[currentAreaIndex]?.title || ''}
                          onChange={(e) => updateCurrentAreaTitle(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="areaDescription">Descrição da Área *</Label>
                        <Textarea
                          id="areaDescription"
                          value={editableAreas[currentAreaIndex]?.description || ''}
                          onChange={(e) => updateCurrentAreaDescription(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label>Objetivos desta Área</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          Defina os objetivos específicos para esta área do tratamento
                        </p>
                        <div className="space-y-2">
                          {editableAreas[currentAreaIndex]?.objectives.map((objective, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <div className="flex-1 flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                                <Target className="w-4 h-4 text-blue-600" />
                                <Input
                                  placeholder={`Objetivo ${index + 1}`}
                                  value={objective}
                                  onChange={(e) => updateObjectiveInCurrentArea(index, e.target.value)}
                                  className="border-0 bg-transparent"
                                />
                              </div>
                              {editableAreas[currentAreaIndex]?.objectives.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeObjectiveFromCurrentArea(index)}
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
                            onClick={addObjectiveToCurrentArea}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Objetivo
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Configuration card (show only when reviewing first area) */}
                {currentAreaIndex === 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Configurações Gerais do Plano</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="editStartDate">Data de Início *</Label>
                          <Input
                            id="editStartDate"
                            type="date"
                            value={editableStartDate}
                            onChange={(e) => setEditableStartDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="editEndDate">Data de Término</Label>
                          <Input
                            id="editEndDate"
                            type="date"
                            value={editableEndDate}
                            onChange={(e) => setEditableEndDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="editStatus">Status</Label>
                          <Select value={editableStatus} onValueChange={(value: 'ativo' | 'inativo' | 'concluido' | 'pausado') => setEditableStatus(value)}>
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

                      <div className="mt-4">
                        <Label htmlFor="editObservations">Observações</Label>
                        <Textarea
                          id="editObservations"
                          value={editableObservations}
                          onChange={(e) => setEditableObservations(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Information about next steps */}
                <Card className="border-dashed border-blue-200 bg-blue-50/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-3">
                      <Brain className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <h4 className="font-medium text-blue-900">
                          {currentAreaIndex < editableAreas.length - 1 
                            ? `Próxima Área: ${editableAreas[currentAreaIndex + 1]?.title}`
                            : "Próxima Etapa: Ações Terapêuticas"
                          }
                        </h4>
                        <p className="text-sm text-blue-700 mt-1">
                          {currentAreaIndex < editableAreas.length - 1 
                            ? "Após aprovar esta área, prossiga para a próxima área do plano."
                            : "Após aprovar todas as áreas, a IA gerará ações específicas para cada uma delas."
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action buttons */}
                <div className="flex justify-between items-center pt-4">
                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={onClose}>
                      Cancelar
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={rejectCurrentArea}
                      className="text-red-700 border-red-300 hover:bg-red-50"
                    >
                      Rejeitar Área
                    </Button>
                  </div>
                  
                  <div className="flex space-x-3">
                  {currentAreaIndex > 0 && (
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentAreaIndex(currentAreaIndex - 1)}
                    >
                      Área Anterior
                    </Button>
                  )}
                  <Button 
                    onClick={approveCurrentArea}
                    disabled={
                      isCreatingPlan || 
                      !editableAreas[currentAreaIndex]?.title?.trim() || 
                      editableAreas[currentAreaIndex]?.objectives.filter(obj => obj.trim()).length === 0
                    }
                    className="min-w-[120px]"
                  >
                    {isCreatingPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando Plano...
                      </>
                    ) : currentAreaIndex < editableAreas.length - 1 ? (
                      <>
                        <Target className="w-4 h-4 mr-2" />
                        Aprovar e Continuar
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4 mr-2" />
                        Finalizar Plano
                      </>
                    )}
                  </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Error/Empty state
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-muted-foreground">Nenhum plano foi gerado</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Houve um problema ao gerar o plano terapêutico. Tente novamente.
                  </p>
                  <Button 
                    onClick={generateSuggestion}
                    className="mt-4"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Tentar Novamente
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};