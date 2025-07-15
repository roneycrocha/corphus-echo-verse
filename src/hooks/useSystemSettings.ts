import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemSettings {
  working_hours_start: string;
  working_hours_end: string;
  appointment_duration: number;
  appointment_interval: number;
  lunch_break_start: string;
  lunch_break_end: string;
  working_days: string[];
  buffer_time: number;
  body_analysis_prompt: string;
  follow_up_prompt: string;
  therapy_conclusion_prompt: string;
  conversation_analysis_prompt: string;
  therapeutic_plan_prompt: string;
  action_plan_prompt: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  working_hours_start: '08:00',
  working_hours_end: '18:00',
  appointment_duration: 60,
  appointment_interval: 15,
  lunch_break_start: '12:00',
  lunch_break_end: '13:00',
  working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  buffer_time: 15,
  body_analysis_prompt: 'Gere um relatório detalhado de análise corporal com base nos dados fornecidos pelo paciente. Inclua avaliação postural, mobilidade, força muscular e recomendações específicas.',
  follow_up_prompt: 'Crie um relatório de acompanhamento baseado na evolução do paciente. Analise o progresso, identifique melhorias e áreas que precisam de atenção, e sugira ajustes no tratamento.',
  therapy_conclusion_prompt: 'Elabore um relatório de conclusão de terapia resumindo todo o processo terapêutico. Inclua objetivos alcançados, evolução do paciente, recomendações para manutenção dos resultados e orientações futuras.',
  conversation_analysis_prompt: 'Com base na transcrição da conversa e nos traços dominantes do paciente (quando disponíveis), gere uma lista de 5-8 perguntas estratégicas para aprofundar o acompanhamento terapêutico. Para cada pergunta, inclua o motivo/objetivo da pergunta. Considere os traços de personalidade do paciente ao formular as perguntas. As perguntas devem explorar: progresso desde a última sessão, dificuldades enfrentadas, aplicação das orientações dadas, estado emocional atual, aspectos específicos relacionados aos traços dominantes, e necessidades de ajuste no tratamento.',
  therapeutic_plan_prompt: 'Elabore um plano terapêutico personalizado com base na análise corporal e histórico do paciente. Inclua objetivos específicos, metodologias de tratamento, cronograma de sessões e marcos de progresso esperados.',
  action_plan_prompt: 'Crie um plano de ação detalhado com exercícios e atividades específicas para o paciente. Inclua instruções claras, frequência recomendada, progressão gradual e critérios de avaliação de desempenho.'
};

export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('system_settings')
        .upsert(updatedSettings, { onConflict: 'id' });

      if (error) throw error;
      
      setSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      return false;
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    loadSettings
  };
};