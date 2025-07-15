import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuthContext } from './AuthProvider';

interface SubscriptionProtectionProps {
  children: React.ReactNode;
}

export const SubscriptionProtection: React.FC<SubscriptionProtectionProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuthContext();
  const { subscribed, loading: subscriptionLoading } = useSubscription();

  // Debug para verificar o status da assinatura
  console.log('SubscriptionProtection Debug:', { 
    user: user?.email, 
    subscribed, 
    authLoading, 
    subscriptionLoading,
    path: window.location.pathname 
  });

  // Se ainda está carregando, mostra loading
  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando assinatura...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se está autenticado mas não tem assinatura ativa, redireciona para planos
  if (!subscribed) {
    console.log('Redirecionando para subscription-plans porque subscribed =', subscribed);
    return <Navigate to="/subscription-plans" replace />;
  }

  // Se tem assinatura ativa, renderiza o conteúdo
  return <>{children}</>;
};