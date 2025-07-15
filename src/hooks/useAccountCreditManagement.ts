import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useAccountId } from "./useAccountId";
import { toast } from "./use-toast";

interface UserWithCredits {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  account_id: string;
  credits: {
    balance: number;
    total_purchased: number;
    total_consumed: number;
    plan_type: "bronze" | "silver" | "gold";
    credit_multiplier: number;
  };
}

export const useAccountCreditManagement = () => {
  const { user } = useAuth();
  const { accountId } = useAccountId();
  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!accountId) return;

    setLoading(true);
    try {
      // Buscar todos os usuários da conta
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Buscar informações de crédito da conta
      const { data: accountCreditInfo } = await supabase.rpc('get_account_credit_info', {
        p_account_id: accountId
      });

      const creditInfo = accountCreditInfo?.[0] || {
        balance: 0,
        total_purchased: 0,
        total_consumed: 0,
        plan_type: 'bronze',
        credit_multiplier: 1.0
      };

      // Todos os usuários da conta compartilham os mesmos créditos
      const usersWithCredits: UserWithCredits[] = (profiles || []).map((profile) => ({
        ...profile,
        credits: {
          balance: creditInfo.balance,
          total_purchased: creditInfo.total_purchased,
          total_consumed: creditInfo.total_consumed,
          plan_type: creditInfo.plan_type as 'bronze' | 'silver' | 'gold',
          credit_multiplier: creditInfo.credit_multiplier
        }
      }));

      setUsers(usersWithCredits);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários da conta',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const loadAccountTransactions = useCallback(async () => {
    if (!accountId) return [];

    try {
      const { data, error } = await supabase
        .from('account_credit_transactions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      return [];
    }
  }, [accountId]);

  const addCredits = useCallback(async (amount: number, description: string) => {
    if (!user || !accountId) return false;

    try {
      const { data, error } = await supabase.rpc('add_account_credits', {
        p_account_id: accountId,
        p_user_id: user.id,
        p_amount: amount,
        p_description: `[ADMIN] ${description}`,
        p_transaction_type: 'admin_adjustment'
      });

      if (error) throw error;

      if (data) {
        toast({
          title: 'Sucesso',
          description: `${amount} créditos adicionados à conta!`,
        });
        await loadUsers(); // Recarregar dados
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao adicionar créditos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar créditos',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, accountId, loadUsers]);

  const consumeCredits = useCallback(async (amount: number, description: string) => {
    if (!user || !accountId) return false;

    try {
      const { data, error } = await supabase.rpc('consume_account_credits', {
        p_account_id: accountId,
        p_user_id: user.id,
        p_amount: amount,
        p_description: `[ADMIN] ${description}`
      });

      if (error) throw error;

      if (data) {
        toast({
          title: 'Sucesso',
          description: `${amount} créditos removidos da conta!`,
        });
        await loadUsers(); // Recarregar dados
        return true;
      } else {
        toast({
          title: 'Erro',
          description: 'Créditos insuficientes na conta',
          variant: 'destructive'
        });
        return false;
      }
    } catch (error) {
      console.error('Erro ao consumir créditos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover créditos',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, accountId, loadUsers]);

  useEffect(() => {
    if (accountId) {
      loadUsers();
    }
  }, [accountId, loadUsers]);

  return {
    users,
    loading,
    loadUsers,
    loadAccountTransactions,
    addCredits,
    consumeCredits
  };
};