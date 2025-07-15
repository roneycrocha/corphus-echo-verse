import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SubscriptionSuccessPage = () => {
  const navigate = useNavigate();
  const { refetch } = useSubscription();
  const { verifyPayment } = useCredits();

  useEffect(() => {
    // Verificar se há session_id na URL para confirmar que é um retorno do Stripe
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    console.log('🚀 Página de sucesso carregada', { 
      sessionId, 
      url: window.location.href,
      search: window.location.search 
    });
    
    // Verificar tanto assinatura quanto pagamentos de créditos
    const checkStripePayments = async () => {
      try {
        console.log('🔄 Verificando pagamentos no Stripe...');
        
        // Se há um session_id, verificar pagamento de créditos primeiro
        if (sessionId) {
          console.log('💳 Verificando pagamento de créditos para session:', sessionId);
          
          const paymentResult = await verifyPayment(sessionId);
          
          if (paymentResult.success) {
            console.log('✅ Créditos adicionados com sucesso!');
            toast.success('Créditos adicionados com sucesso!');
          }
        }
        
        // Verificar assinatura também
        console.log('📋 Verificando status da assinatura...');
        const { data, error } = await supabase.functions.invoke('check-subscription');
        
        console.log('📊 Resposta da verificação de assinatura:', { data, error });
        
        if (error) {
          console.error('❌ Erro ao verificar assinatura:', error);
          toast.error('Erro ao verificar assinatura. Tente recarregar a página.');
          return;
        }
        
        console.log('✅ Verificação de assinatura concluída:', data);
        
        if (data?.subscribed) {
          toast.success('Assinatura ativada com sucesso!');
          
          // Aguardar um pouco e recarregar o status local
          setTimeout(() => {
            console.log('🔄 Fazendo refetch do status local...');
            refetch();
          }, 1000);
          
          // Redirecionar para o dashboard
          setTimeout(() => {
            console.log('🏠 Redirecionando para o dashboard...');
            navigate('/dashboard');
          }, 1500);
        } else {
          console.log('⚠️ Assinatura não encontrada, aguardando mais um pouco...');
          // Tentar novamente após 5 segundos se não encontrou a assinatura
          setTimeout(() => {
            checkStripePayments();
          }, 5000);
        }
        
      } catch (error) {
        console.error('💥 Erro inesperado ao verificar pagamentos:', error);
        toast.error('Erro inesperado. Tente recarregar a página.');
      }
    };
    
    // Sempre verificar pagamentos, mesmo sem session_id (pode ser um refresh)
    // Aguardar 3 segundos para garantir que o Stripe processou o pagamento
    const timeout = setTimeout(() => {
      checkStripePayments();
    }, 3000);

    return () => clearTimeout(timeout);
  }, [refetch, navigate, verifyPayment]);

  const handleContinue = () => {
    toast.success('Bem-vindo à corphus.ai!');
    navigate('/dashboard');
  };

  const handleManualCheck = async () => {
    try {
      console.log('🔄 Verificação manual solicitada...');
      toast.info('Verificando pagamentos e assinatura...');
      
      // Verificar pagamento se há session_id
      const urlParams = new URLSearchParams(window.location.search);
      const currentSessionId = urlParams.get('session_id');
      
      if (currentSessionId) {
        console.log('💳 Verificando pagamento manualmente...');
        await verifyPayment(currentSessionId);
      }
      
      // Verificar assinatura
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('❌ Erro ao verificar assinatura:', error);
        toast.error(`Erro: ${error.message}`);
        return;
      }
      
      if (data?.subscribed) {
        toast.success('Assinatura ativa encontrada! Redirecionando...');
        refetch();
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        toast.warning('Nenhuma assinatura ativa encontrada.');
      }
    } catch (error) {
      console.error('💥 Erro inesperado:', error);
      toast.error('Erro inesperado ao verificar assinatura.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Assinatura Confirmada!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Parabéns! Sua assinatura foi processada com sucesso. 
            Agora você tem acesso completo a todos os recursos da plataforma.
          </p>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">O que você pode fazer agora:</h3>
            <ul className="text-sm text-green-700 space-y-1 text-left">
              <li>• Realizar análises corporais com IA</li>
              <li>• Gerenciar pacientes e prontuários</li>
              <li>• Usar transcrições em tempo real</li>
              <li>• Acessar relatórios avançados</li>
              <li>• Utilizar todos os créditos inclusos</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleContinue}
              className="w-full"
              size="lg"
            >
              Acessar Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button 
              onClick={handleManualCheck}
              variant="outline"
              className="w-full"
              size="sm"
            >
              🔄 Verificar Assinatura Manualmente
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Você pode gerenciar sua assinatura a qualquer momento nas configurações.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};