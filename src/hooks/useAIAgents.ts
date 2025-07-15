import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIAgent {
  id: string;
  name: string;
  description?: string;
  assistant_id: string;
  category: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAIAgentData {
  name: string;
  description?: string;
  assistant_id: string;
  category: string;
}

export const useAIAgents = () => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar agentes:', err);
      setError(err.message);
      toast.error('Erro ao carregar agentes de IA');
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async (agentData: CreateAIAgentData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('ai_agents')
        .insert([{
          ...agentData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;
      
      toast.success('Agente criado com sucesso!');
      await fetchAgents();
      return true;
    } catch (err: any) {
      console.error('Erro ao criar agente:', err);
      setError(err.message);
      toast.error('Erro ao criar agente de IA');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateAgent = async (id: string, agentData: Partial<CreateAIAgentData>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('ai_agents')
        .update(agentData)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Agente atualizado com sucesso!');
      await fetchAgents();
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar agente:', err);
      setError(err.message);
      toast.error('Erro ao atualizar agente de IA');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Agente desativado com sucesso!');
      await fetchAgents();
      return true;
    } catch (err: any) {
      console.error('Erro ao desativar agente:', err);
      setError(err.message);
      toast.error('Erro ao desativar agente de IA');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent
  };
};