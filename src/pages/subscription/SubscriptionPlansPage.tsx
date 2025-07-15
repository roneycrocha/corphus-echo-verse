import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Crown, Star, Zap, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SubscriptionPlan {
  id: string;
  name: string;
  plan_type: 'bronze' | 'silver' | 'gold';
  monthly_price: number;
  annual_price?: number | null;
  features: any; // Json type from Supabase
  monthly_credits?: number | null;
  annual_credits?: number | null;
  is_active: boolean;
}

const planIcons = {
  bronze: <Star className="w-6 h-6 text-amber-600" />,
  silver: <Zap className="w-6 h-6 text-slate-500" />,
  gold: <Crown className="w-6 h-6 text-yellow-500" />
};

const planColors = {
  bronze: 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50',
  silver: 'border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50',
  gold: 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50'
};

export const SubscriptionPlansPage = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const navigate = useNavigate();
  
  // Verificar se o usuário está autenticado
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Erro ao carregar planos de assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, planType: string) => {
    setProcessingPlan(planId);
    
    try {
      console.log('Iniciando assinatura:', { planId, planType, billingCycle });
      
      // Verificar se o usuário está autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Usuário autenticado:', { user: user?.email, error: userError });
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Chama a função de criar checkout para iniciar o processo de assinatura
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planId: planType, // Usar planType que vem do parâmetro
          billingType: billingCycle // Usar billingType que a função espera
        }
      });

      console.log('Resposta da função create-checkout:', { data, error });

      if (error) {
        console.error('Erro detalhado:', error);
        
        // Verificar se é erro de autenticação
        if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          throw new Error('Erro de autenticação. Por favor, faça login novamente.');
        }
        
        throw error;
      }

      if (data?.error) {
        console.error('Erro na resposta:', data.error);
        throw new Error(data.error);
      }

      if (data?.url) {
        console.log('Redirecionando para:', data.url);
        // Abre o Stripe Checkout em uma nova aba
        window.open(data.url, '_blank');
      } else {
        throw new Error('URL de checkout não foi retornada');
      }
    } catch (error: any) {
      console.error('Erro ao iniciar assinatura:', error);
      toast.error(`Erro ao iniciar processo de assinatura: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setProcessingPlan(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getDisplayPrice = (plan: SubscriptionPlan) => {
    if (billingCycle === 'annual' && plan.annual_price) {
      return plan.annual_price / 12;
    }
    return plan.monthly_price;
  };

  const getDisplayCredits = (plan: SubscriptionPlan) => {
    if (billingCycle === 'annual' && plan.annual_credits) {
      return plan.annual_credits / 12;
    }
    return plan.monthly_credits;
  };

  const getSavings = (plan: SubscriptionPlan) => {
    if (plan.annual_price && plan.monthly_price) {
      return Math.round((1 - (plan.annual_price / 12) / plan.monthly_price) * 100);
    }
    return 0;
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Logout realizado com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };
  
  // Função para testar a sincronização da assinatura
  const testSubscriptionSync = async () => {
    try {
      console.log('🔄 Testando sincronização da assinatura...');
      toast.info('Verificando assinatura no Stripe...');
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      console.log('📊 Resposta da verificação:', { data, error });
      
      if (error) {
        console.error('❌ Erro ao verificar assinatura:', error);
        toast.error(`Erro: ${error.message}`);
        return;
      }
      
      console.log('✅ Verificação concluída:', data);
      
      if (data?.subscribed) {
        toast.success('Assinatura ativa encontrada! Redirecionando...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        toast.warning('Nenhuma assinatura ativa encontrada.');
      }
      
    } catch (error) {
      console.error('💥 Erro inesperado ao verificar assinatura:', error);
      toast.error('Erro inesperado ao verificar assinatura.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Escolha seu Plano
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Selecione o plano que melhor atende às suas necessidades profissionais. 
                Você pode alterar ou cancelar a qualquer momento.
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </Button>
                
                {/* Botão de debug para testar sincronização */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testSubscriptionSync}
                  className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  🔄 Verificar Assinatura
                </Button>
                
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center space-x-4">
          <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>
            Mensal
          </span>
          <Switch
            checked={billingCycle === 'annual'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
            className="data-[state=checked]:bg-primary"
          />
          <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-primary' : 'text-muted-foreground'}`}>
            Anual
          </span>
          {billingCycle === 'annual' && (
            <Badge variant="secondary" className="ml-2">
              Economize até 17%
            </Badge>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${planColors[plan.plan_type]} hover:shadow-lg transition-all duration-300 ${plan.plan_type === 'silver' ? 'scale-105 ring-2 ring-primary/20' : ''}`}
            >
              {plan.plan_type === 'silver' && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                  Mais Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2">
                  {planIcons[plan.plan_type]}
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-sm">
                  {plan.plan_type === 'bronze' && 'Ideal para começar'}
                  {plan.plan_type === 'silver' && 'Perfeito para profissionais'}
                  {plan.plan_type === 'gold' && 'Para máxima produtividade'}
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center pb-6">
                <div className="mb-6">
                  <div className="text-4xl font-bold text-primary mb-1">
                    {formatPrice(getDisplayPrice(plan))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {billingCycle === 'annual' ? '/mês (pago anualmente)' : '/mês'}
                  </div>
                  {billingCycle === 'annual' && getSavings(plan) > 0 && (
                    <div className="text-xs text-green-600 mt-1">
                      Economize {getSavings(plan)}% no plano anual
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-left">
                  {getDisplayCredits(plan) && (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{getDisplayCredits(plan)} créditos/mês</span>
                    </div>
                  )}
                  
                  {plan.features && Array.isArray(plan.features) && plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                {!user ? (
                  <Button
                    className="w-full"
                    size="lg"
                    variant={plan.plan_type === 'silver' ? 'default' : 'outline'}
                    onClick={() => navigate('/login')}
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Carregando...
                      </>
                    ) : (
                      'Fazer Login para Assinar'
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    variant={plan.plan_type === 'silver' ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan.id, plan.plan_type)}
                    disabled={processingPlan === plan.id}
                  >
                    {processingPlan === plan.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Processando...
                      </>
                    ) : (
                      'Assinar Agora'
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Perguntas Frequentes
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">Posso cancelar a qualquer momento?</h3>
              <p className="text-sm text-muted-foreground">
                Sim, você pode cancelar sua assinatura a qualquer momento através do painel de controle.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">Como funcionam os créditos?</h3>
              <p className="text-sm text-muted-foreground">
                Os créditos são usados para acessar recursos premium como análise de IA, transcrições e relatórios.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">Posso mudar de plano?</h3>
              <p className="text-sm text-muted-foreground">
                Sim, você pode fazer upgrade ou downgrade do seu plano a qualquer momento.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">Há desconto no plano anual?</h3>
              <p className="text-sm text-muted-foreground">
                Sim, oferecemos descontos significativos para assinaturas anuais em todos os planos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};