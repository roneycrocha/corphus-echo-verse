import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIAgent } from './useAIAgents';

export const useUserAIAgent = () => {
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserSelectedAgent = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          selected_ai_agent_id,
          ai_agents:selected_ai_agent_id (
            id,
            name,
            description,
            assistant_id,
            category,
            is_active,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.ai_agents) {
        setSelectedAgent(profile.ai_agents as AIAgent);
      } else {
        // Se não há agente selecionado, buscar o agente padrão
        const { data: defaultAgent, error: defaultError } = await supabase
          .from('ai_agents')
          .select('*')
          .eq('category', 'desenvolvimento_humano')
          .eq('is_active', true)
          .single();

        if (!defaultError && defaultAgent) {
          setSelectedAgent(defaultAgent);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar agente selecionado:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserSelectedAgent = async (agentId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('profiles')
        .update({ selected_ai_agent_id: agentId })
        .eq('user_id', user.user.id);

      if (error) throw error;
      
      toast.success('Agente selecionado com sucesso!');
      await fetchUserSelectedAgent();
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar agente selecionado:', err);
      setError(err.message);
      toast.error('Erro ao selecionar agente de IA');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getSelectedAgentId = (): string => {
    return selectedAgent?.assistant_id || 'asst_Urx3NlHxECrQRS889BwZv0JA'; // fallback para agente padrão
  };

  useEffect(() => {
    fetchUserSelectedAgent();
  }, []);

  return {
    selectedAgent,
    loading,
    error,
    fetchUserSelectedAgent,
    updateUserSelectedAgent,
    getSelectedAgentId
  };
};