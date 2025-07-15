import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "./use-toast";

interface AccountWithCredits {
  id: string;
  name: string;
  email: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  is_active: boolean;
  created_at: string;
  credits: {
    balance: number;
    total_purchased: number;
    total_consumed: number;
    plan_type: "bronze" | "silver" | "gold";
    credit_multiplier: number;
  };
  user_count: number;
}

interface AccountTransaction {
  id: string;
  account_id: string;
  user_id: string | null;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  related_action: string | null;
  vindi_charge_id: string | null;
  account_name: string;
}

export const usePlatformCreditManagement = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountWithCredits[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAllAccounts = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Carregando todas as contas...');
      // Buscar todas as contas
      const { data: allAccounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('name');

      console.log('Contas encontradas:', allAccounts?.length, allAccounts);
      if (accountsError) {
        console.error('Erro ao buscar contas:', accountsError);
        throw accountsError;
      }

      // Para cada conta, buscar informações de crédito e contagem de usuários
      const accountsWithCredits: AccountWithCredits[] = await Promise.all(
        (allAccounts || []).map(async (account) => {
          console.log('Processando conta:', account.name);
          // Buscar informações de crédito da conta
          const { data: accountCreditInfo } = await supabase.rpc('get_account_credit_info', {
            p_account_id: account.id
          });
          console.log('Créditos da conta', account.name, ':', accountCreditInfo);

          const creditInfo = accountCreditInfo?.[0] || {
            balance: 0,
            total_purchased: 0,
            total_consumed: 0,
            plan_type: 'bronze',
            credit_multiplier: 1.0
          };

          // Contar usuários da conta
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', account.id)
            .eq('is_active', true);

          return {
            ...account,
            credits: {
              balance: creditInfo.balance,
              total_purchased: creditInfo.total_purchased,
              total_consumed: creditInfo.total_consumed,
              plan_type: creditInfo.plan_type as 'bronze' | 'silver' | 'gold',
              credit_multiplier: creditInfo.credit_multiplier
            },
            user_count: userCount || 0
          };
        })
      );

      console.log('Total de contas processadas:', accountsWithCredits.length);
      setAccounts(accountsWithCredits);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as contas da plataforma',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlatformTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('account_credit_transactions')
        .select(`
          *,
          accounts!account_credit_transactions_account_id_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Transformar dados para incluir nome da conta
      const transactions: AccountTransaction[] = (data || []).map(transaction => ({
        ...transaction,
        account_name: (transaction.accounts as any)?.name || 'Conta Desconhecida'
      }));

      return transactions;
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      return [];
    }
  }, []);

  const addCreditsToAccount = useCallback(async (accountId: string, amount: number, description: string) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('add_account_credits', {
        p_account_id: accountId,
        p_user_id: user.id,
        p_amount: amount,
        p_description: `[PLATAFORMA] ${description}`,
        p_transaction_type: 'admin_adjustment'
      });

      if (error) throw error;

      if (data) {
        toast({
          title: 'Sucesso',
          description: `${amount} créditos adicionados à conta!`,
        });
        await loadAllAccounts(); // Recarregar dados
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
  }, [user, loadAllAccounts]);

  const consumeCreditsFromAccount = useCallback(async (accountId: string, amount: number, description: string) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('consume_account_credits', {
        p_account_id: accountId,
        p_user_id: user.id,
        p_amount: amount,
        p_description: `[PLATAFORMA] ${description}`
      });

      if (error) throw error;

      if (data) {
        toast({
          title: 'Sucesso',
          description: `${amount} créditos removidos da conta!`,
        });
        await loadAllAccounts(); // Recarregar dados
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
  }, [user, loadAllAccounts]);

  useEffect(() => {
    loadAllAccounts();
  }, [loadAllAccounts]);

  return {
    accounts,
    loading,
    loadAllAccounts,
    loadPlatformTransactions,
    addCreditsToAccount,
    consumeCreditsFromAccount
  };
};