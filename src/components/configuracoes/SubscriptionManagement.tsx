import React, { useState, useEffect } from 'react';
import { CreditCard, Crown, Check, Loader2, Star, Zap, Shield, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionPlan {
  id: string;
  name: string;
  plan_type: 'bronze' | 'silver' | 'gold';
  monthly_price: number;
  annual_price?: number;
  monthly_credits: number;
  annual_credits?: number;
  features: string[];
  credit_multiplier: number;
  is_active: boolean;
}

interface SubscriptionStatus {
  subscribed: boolean;
  plan_type?: string;
  subscription_end?: string;
}

export const SubscriptionManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    checkSubscriptionStatus();
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsPlansLoading(true);
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });

      if (error) throw error;
      
      // Processar os dados para garantir que features seja um array de strings
      const processedPlans: SubscriptionPlan[] = (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        plan_type: plan.plan_type,
        monthly_price: plan.monthly_price,
        annual_price: plan.annual_price || undefined,
        monthly_credits: plan.monthly_credits || 0,
        annual_credits: plan.annual_credits || undefined,
        features: Array.isArray(plan.features) ? 
                  plan.features.filter((f: any) => typeof f === 'string') : 
                  typeof plan.features === 'string' ? [plan.features] : 
                  [],
        credit_multiplier: plan.credit_multiplier,
        is_active: plan.is_active || false
      }));
      
      setPlans(processedPlans);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os planos disponíveis.',
        variant: 'destructive'
      });
    } finally {
      setIsPlansLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      
      // Verificar status da assinatura via edge function
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Erro ao verificar assinatura:', error);
        // Se não há função ou erro, assume sem assinatura
        setSubscriptionStatus({ subscribed: false });
      } else {
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      setSubscriptionStatus({ subscribed: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planType: string, billingType: 'monthly' | 'annual' = 'monthly') => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para assinar um plano.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsCheckoutLoading(`${planType}-${billingType}`);
      
      // Criar sessão de checkout via edge function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planId: planType,
          billingType: billingType
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        // Abrir checkout do Stripe em nova aba
        window.open(data.url, '_blank');
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (error: any) {
      console.error('Erro ao criar checkout:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao processar pagamento. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);
      
      // Acessar portal do cliente Stripe
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else if (data?.error && data?.dashboardUrl) {
        // Mostrar modal com instruções para configurar o portal
        toast({
          title: data.error,
          description: (
            <div className="space-y-2">
              <p>{data.message}</p>
              <div className="bg-muted p-3 rounded text-xs">
                {data.instructions.split('\n').map((line: string, i: number) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
              <button 
                onClick={() => window.open(data.dashboardUrl, '_blank')}
                className="text-primary underline text-sm"
              >
                Abrir Dashboard do Stripe
              </button>
            </div>
          ),
          duration: 10000,
        });
      } else {
        throw new Error('URL do portal não recebida');
      }
    } catch (error: any) {
      console.error('Erro ao acessar portal:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao acessar o portal de gerenciamento.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanIcon = (planType: string) => {
    const icons = {
      'bronze': '🥉',
      'silver': '🥈',
      'gold': '🥇'
    };
    return icons[planType as keyof typeof icons] || '📦';
  };

  const getPlanColor = (planType: string) => {
    const colors = {
      'bronze': 'from-amber-500 to-amber-600',
      'silver': 'from-gray-400 to-gray-500', 
      'gold': 'from-yellow-400 to-yellow-500'
    };
    return colors[planType as keyof typeof colors] || 'from-gray-400 to-gray-500';
  };

  const isPopularPlan = (planType: string) => {
    // Definir o plano Silver como popular por padrão
    return planType === 'silver';
  };

  if (isLoading && isPlansLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Gerenciamento de Assinatura</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Carregando informações da assinatura...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderPlanCard = (plan: SubscriptionPlan, billingType: 'monthly' | 'annual') => {
    const isPopular = isPopularPlan(plan.plan_type);
    const isCurrentPlan = subscriptionStatus?.subscribed && subscriptionStatus.plan_type === plan.plan_type;
    const price = billingType === 'annual' ? plan.annual_price : plan.monthly_price;
    const credits = billingType === 'annual' ? (plan.annual_credits || plan.monthly_credits) : plan.monthly_credits;
    const checkoutKey = `${plan.plan_type}-${billingType}`;

    if (billingType === 'annual' && !plan.annual_price) {
      return null;
    }

    return (
      <Card 
        key={`${plan.id}-${billingType}`}
        className="relative overflow-hidden"
      >
        <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${getPlanColor(plan.plan_type)}`} />
        
        {isPopular && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
            <Badge className="bg-primary text-primary-foreground">
              <Star className="w-3 h-3 mr-1" />
              Mais Popular
            </Badge>
          </div>
        )}

        {isCurrentPlan && (
          <div className="absolute -top-3 right-4 z-10">
            <Badge className="bg-green-500 text-white">
              <Check className="w-3 h-3 mr-1" />
              Atual
            </Badge>
          </div>
        )}
        
        <CardHeader className="text-center pt-6">
          <div className="text-4xl mb-2">{getPlanIcon(plan.plan_type)}</div>
          <CardTitle className="text-2xl">
            {plan.name}{billingType === 'annual' ? ' - Anual' : ''}
          </CardTitle>
          <CardDescription className="text-lg">
            <div>
              <span className="text-3xl font-bold text-primary">
                R$ {price?.toFixed(2)}
              </span>
              <span className="text-muted-foreground">
                /{billingType === 'annual' ? 'ano' : 'mês'}
              </span>
            </div>
            {billingType === 'annual' && plan.monthly_price && (
              <div className="text-sm mt-1">
                <Badge variant="outline" className="text-xs">
                  {Math.round((1 - plan.annual_price! / (plan.monthly_price * 12)) * 100)}% economia vs mensal
                </Badge>
              </div>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <Badge variant="secondary" className="mb-2">
              {credits} créditos {billingType === 'annual' ? 'mensais' : 'inclusos'}
            </Badge>
            {billingType === 'annual' && (
              <div className="text-sm text-muted-foreground">
                Total anual: {credits * 12} créditos
              </div>
            )}
            {plan.credit_multiplier !== 1 && (
              <Badge variant="outline" className="ml-2">
                {plan.credit_multiplier > 1 ? '+' : ''}{((plan.credit_multiplier - 1) * 100).toFixed(0)}% bônus em compras
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Recursos:</h4>
            <ul className="text-sm space-y-1">
              {plan.features?.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={() => handleSubscribe(plan.plan_type, billingType)}
              disabled={isCheckoutLoading === checkoutKey || isCurrentPlan}
              className={`w-full ${isPopular ? 'bg-primary' : ''}`}
              variant={isPopular ? 'default' : 'outline'}
            >
              {isCheckoutLoading === checkoutKey ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : isCurrentPlan ? (
                'Plano Atual'
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Assinar {plan.name}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Assinatura</h1>
          <p className="text-muted-foreground">
            Gerencie sua assinatura e escolha o plano ideal para suas necessidades
          </p>
        </div>
      </div>

      {/* Status da Assinatura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Status da Assinatura</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionStatus?.subscribed ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">
                      Plano {subscriptionStatus.plan_type?.toUpperCase() || 'Ativo'}
                    </h3>
                    <p className="text-sm text-green-600">
                      {subscriptionStatus.subscription_end ? 
                        `Próxima cobrança: ${new Date(subscriptionStatus.subscription_end).toLocaleDateString('pt-BR')}` :
                        'Assinatura ativa'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={checkSubscriptionStatus}
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  <Button 
                    onClick={handleManageSubscription}
                    variant="outline"
                    disabled={isLoading}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Gerenciar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <CreditCard className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Nenhuma assinatura ativa</h3>
                <p className="text-sm text-gray-600">
                  Escolha um plano abaixo para começar a usar todas as funcionalidades
                </p>
              </div>
              <Button 
                onClick={checkSubscriptionStatus}
                variant="ghost"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Verificar Status
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Planos com Tabs */}
      <Tabs defaultValue="monthly" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly">Planos Mensais</TabsTrigger>
          <TabsTrigger value="annual">Planos Anuais</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-6">
          {isPlansLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando planos...</span>
              </div>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum plano disponível no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => renderPlanCard(plan, 'monthly'))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="annual" className="space-y-6">
          {isPlansLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando planos...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.filter(plan => plan.annual_price).map((plan) => renderPlanCard(plan, 'annual'))}
              
              {plans.filter(plan => plan.annual_price).length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Crown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                    Nenhum plano anual disponível
                  </h3>
                  <p className="text-muted-foreground">
                    Os planos anuais não estão configurados no momento.
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};