import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAccountId } from './useAccountId';
import { toast } from 'sonner';

interface ResourceCost {
  id: string;
  resource_name: string;
  resource_description: string;
  cost_per_usage: number;
  is_active: boolean;
}

export const useResourceCosts = () => {
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const [resourceCosts, setResourceCosts] = useState<ResourceCost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResourceCosts();
  }, []);

  const loadResourceCosts = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_costs')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setResourceCosts(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar custos dos recursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResourceCost = (resourceName: string): number => {
    const resource = resourceCosts.find(r => r.resource_name === resourceName);
    return resource?.cost_per_usage || 0;
  };

  const consumeCreditsForResource = async (
    resourceName: string,
    customDescription?: string
  ): Promise<boolean> => {
    if (!user || !accountId) {
      toast.error('Usuário não autenticado ou conta não encontrada');
      return false;
    }

    const cost = getResourceCost(resourceName);
    
    if (cost === 0) {
      // Se o recurso não tem custo ou não existe, não consome créditos
      return true;
    }

    try {
      // Buscar a descrição do recurso
      const resource = resourceCosts.find(r => r.resource_name === resourceName);
      const description = customDescription || resource?.resource_description || `Uso do recurso: ${resourceName}`;

      // Consumir créditos usando a função do banco baseada em conta
      const { data, error } = await supabase.rpc('consume_account_credits', {
        p_account_id: accountId,
        p_user_id: user.id,
        p_amount: cost,
        p_description: description,
        p_action: resourceName
      });

      if (error) throw error;

      if (!data) {
        toast.error('A conta não possui créditos suficientes para realizar esta ação');
        return false;
      }

      // Success - créditos consumidos
      return true;
    } catch (error: any) {
      console.error('Erro ao consumir créditos:', error);
      toast.error('Erro ao processar consumo de créditos: ' + error.message);
      return false;
    }
  };

  const getResourceInfo = (resourceName: string) => {
    return resourceCosts.find(r => r.resource_name === resourceName);
  };

  const getAllActiveResources = () => {
    return resourceCosts.filter(r => r.is_active);
  };

  return {
    resourceCosts,
    loading,
    getResourceCost,
    consumeCreditsForResource,
    getResourceInfo,
    getAllActiveResources,
    reload: loadResourceCosts
  };
};