import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomAIAgentRequest {
  message: string;
  patientId?: string;
  analysisType?: 'body_analysis' | 'treatment_plan' | 'general';
  assistantId: string;
}

export interface CustomAIAgentResponse {
  response: string;
  threadId: string;
  runId: string;
  analysisType: string;
}

export const useCustomAIAgent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeWithCustomAgent = async (request: CustomAIAgentRequest): Promise<CustomAIAgentResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('Enviando solicitação para agente personalizado:', request);
      
      const { data, error: functionError } = await supabase.functions.invoke('custom-ai-agent', {
        body: request
      });

      if (functionError) {
        console.error('Erro na função:', functionError);
        throw new Error(functionError.message || 'Erro ao comunicar com o agente');
      }

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      console.log('Resposta do agente personalizado recebida');
      toast.success('Análise concluída com sucesso!');
      
      return data as CustomAIAgentResponse;

    } catch (err: any) {
      console.error('Erro ao usar agente personalizado:', err);
      const errorMessage = err.message || 'Erro desconhecido ao processar solicitação';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const analyzeBodyComposition = async (
    patientId: string, 
    analysisData: string, 
    assistantId: string
  ): Promise<string | null> => {
    const result = await analyzeWithCustomAgent({
      message: `Analise os seguintes dados de análise corporal: ${analysisData}. 
      Forneça insights detalhados sobre os traços identificados, suas implicações terapêuticas 
      e recomendações específicas para este paciente.`,
      patientId,
      analysisType: 'body_analysis',
      assistantId
    });

    return result?.response || null;
  };

  const generateTreatmentSuggestions = async (
    patientId: string,
    currentTreatment: string,
    assistantId: string
  ): Promise<string | null> => {
    const result = await analyzeWithCustomAgent({
      message: `Baseado no plano de tratamento atual: ${currentTreatment}. 
      Sugira melhorias, ajustes ou novas abordagens terapêuticas considerando 
      o perfil corporal e emocional do paciente.`,
      patientId,
      analysisType: 'treatment_plan',
      assistantId
    });

    return result?.response || null;
  };

  const analyzeConversation = async (
    transcription: string,
    patientId: string,
    assistantId: string
  ): Promise<string | null> => {
    const result = await analyzeWithCustomAgent({
      message: `Analise a seguinte transcrição de sessão terapêutica: ${transcription}. 
      Identifique padrões comportamentais, insights psicológicos e recomendações 
      para próximas sessões baseados na análise corporal do paciente.`,
      patientId,
      analysisType: 'general',
      assistantId
    });

    return result?.response || null;
  };

  return {
    loading,
    error,
    analyzeWithCustomAgent,
    analyzeBodyComposition,
    generateTreatmentSuggestions,
    analyzeConversation
  };
};