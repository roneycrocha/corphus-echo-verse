import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/auth/AuthProvider';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier?: string | null;
  subscription_end?: string | null;
  loading: boolean;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    subscribed: false,
    loading: true
  });
  const { user } = useAuthContext();

  const checkSubscription = async () => {
    if (!user) {
      console.log('checkSubscription: Nenhum usuário logado');
      setSubscription({ subscribed: false, loading: false });
      return;
    }

    console.log('checkSubscription iniciado para usuário:', user.email, 'ID:', user.id);

    try {
      // Primeiro, verifica sempre pela conta (que é o comportamento correto)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('account_id, user_id, full_name, email')
        .eq('user_id', user.id)
        .maybeSingle();
        
      console.log('Dados do perfil:', { profileData, profileError });
        
      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        setSubscription({ subscribed: false, loading: false });
        return;
      }

      if (!profileData) {
        console.log('Perfil não encontrado para o usuário:', user.id);
        setSubscription({ subscribed: false, loading: false });
        return;
      }

      if (!profileData.account_id) {
        console.log('Nenhum account_id encontrado no perfil');
        setSubscription({ subscribed: false, loading: false });
        return;
      }

      console.log('Buscando dados da conta:', profileData.account_id);

      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('subscription_status, subscription_plan, name')
        .eq('id', profileData.account_id)
        .single();
      
      console.log('Dados da conta:', { accountData, accountError });
      
      if (accountError) {
        console.error('Erro ao buscar conta:', accountError);
        setSubscription({ subscribed: false, loading: false });
        return;
      }

      if (!accountData) {
        console.log('Conta não encontrada');
        setSubscription({ subscribed: false, loading: false });
        return;
      }

      if (accountData.subscription_status !== 'active') {
        console.log('Conta sem assinatura ativa. Status:', accountData.subscription_status);
        setSubscription({ subscribed: false, loading: false });
        return;
      }
      
      console.log('Assinatura ativa encontrada na conta:', accountData.name);
      setSubscription({
        subscribed: true,
        subscription_tier: accountData.subscription_plan,
        subscription_end: null,
        loading: false
      });
    } catch (error) {
      console.error('Erro inesperado ao verificar assinatura:', error);
      setSubscription({ subscribed: false, loading: false });
    }
  };

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setSubscription({ subscribed: false, loading: false });
    }
  }, [user]);

  return {
    ...subscription,
    refetch: checkSubscription
  };
};