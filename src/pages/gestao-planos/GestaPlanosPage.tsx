import React, { useState, useEffect } from 'react';
import { Crown, Package, Settings, Plus, Edit, Star, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { EditPlanDialog } from '@/components/configuracoes/EditPlanDialog';
import { ResourceCostManagement } from '@/components/configuracoes/ResourceCostManagement';

interface SubscriptionPlan {
  id: string;
  name: string;
  plan_type: 'bronze' | 'silver' | 'gold';
  monthly_price: number;
  annual_price?: number;
  monthly_credits: number;
  annual_credits?: number;
  credit_multiplier: number;
  features: string[];
  is_active: boolean;
}

interface PlanPackage {
  id: string;
  plan_type: 'bronze' | 'silver' | 'gold';
  package_id: string;
  bonus_multiplier: number;
  is_featured: boolean;
  package: {
    id: string;
    name: string;
    credits: number;
    price: number;
    bonus_credits: number;
  };
}

export const GestaPlanosPage: React.FC = () => {
  const { isAdmin } = usePermissions();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planPackages, setPlanPackages] = useState<PlanPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  console.log('=== DEBUG PERMISSÕES ===');
  console.log('IsAdmin:', isAdmin);

  // Verificar se o usuário é administrador
  if (!isAdmin) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <Crown className="w-16 h-16 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Acesso Restrito</h2>
              <p className="text-muted-foreground max-w-md">
                Esta página é exclusiva para administradores da plataforma. 
                Entre em contato com um administrador se você precisa acessar esta funcionalidade.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar planos
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('monthly_price', { ascending: true });

      if (plansError) throw plansError;
      
      // Transformar os dados para garantir que features seja array de strings
      const transformedPlans = (plansData || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? 
          plan.features.map(f => typeof f === 'string' ? f : String(f)) : 
          [],
        monthly_credits: plan.monthly_credits || 0,
        annual_credits: plan.annual_credits || undefined,
        annual_price: plan.annual_price || undefined,
        is_active: plan.is_active ?? true
      })) as SubscriptionPlan[];
      
      setPlans(transformedPlans);

      // Carregar relação planos-pacotes
      const { data: planPackagesData, error: planPackagesError } = await supabase
        .from('plan_packages')
        .select(`
          *,
          package:credit_packages(*)
        `)
        .order('plan_type', { ascending: true });

      if (planPackagesError) throw planPackagesError;
      setPlanPackages(planPackagesData || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (planType: string) => {
    const colors = {
      'bronze': 'from-amber-500 to-amber-600',
      'silver': 'from-gray-400 to-gray-500', 
      'gold': 'from-yellow-400 to-yellow-500'
    };
    return colors[planType as keyof typeof colors] || 'from-gray-400 to-gray-500';
  };

  const getPlanIcon = (planType: string) => {
    const icons = {
      'bronze': '🥉',
      'silver': '🥈',
      'gold': '🥇'
    };
    return icons[planType as keyof typeof icons] || '📦';
  };

  const getPlanPackages = (planType: string) => {
    return planPackages.filter(pp => pp.plan_type === planType);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    loadData(); // Recarregar dados após edição
  };

  const calculateTotalBonus = (baseBonus: number, multiplier: number) => {
    return Math.round(baseBonus * multiplier);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Planos</h1>
          <p className="text-muted-foreground">
            Configure os planos de assinatura e seus pacotes de crédito
          </p>
        </div>
      </div>

      <Tabs defaultValue="monthly" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monthly">Planos Mensais</TabsTrigger>
          <TabsTrigger value="annual">Planos Anuais</TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span>Custos por Recurso</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${getPlanColor(plan.plan_type)}`} />
                
                <CardHeader className="text-center pt-6">
                  <div className="text-4xl mb-2">{getPlanIcon(plan.plan_type)}</div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-lg">
                    <div>
                      <span className="text-3xl font-bold text-primary">
                        R$ {plan.monthly_price.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-center">
                    <Badge variant="secondary" className="mb-2">
                      {plan.monthly_credits} créditos mensais
                    </Badge>
                    {plan.credit_multiplier < 1 && (
                      <Badge variant="outline" className="ml-2">
                        {Math.round((1 - plan.credit_multiplier) * 100)}% desconto
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
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleEditPlan(plan)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Plano
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="annual" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.filter(plan => plan.annual_price).map((plan) => (
              <Card key={`annual-${plan.id}`} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${getPlanColor(plan.plan_type)}`} />
                
                <CardHeader className="text-center pt-6">
                  <div className="text-4xl mb-2">{getPlanIcon(plan.plan_type)}</div>
                  <CardTitle className="text-2xl">{plan.name} - Anual</CardTitle>
                  <CardDescription className="text-lg space-y-2">
                    <div>
                      <span className="text-3xl font-bold text-primary">
                        R$ {plan.annual_price!.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">/ano</span>
                    </div>
                    <div className="text-sm">
                      <Badge variant="outline" className="text-xs">
                        {Math.round((1 - plan.annual_price! / (plan.monthly_price * 12)) * 100)}% economia vs mensal
                      </Badge>
                    </div>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-center space-y-2">
                    <Badge variant="secondary" className="mb-2">
                      {plan.annual_credits || plan.monthly_credits} créditos mensais
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Total anual: {(plan.annual_credits || plan.monthly_credits) * 12} créditos
                    </div>
                    {plan.credit_multiplier < 1 && (
                      <Badge variant="outline" className="ml-2">
                        {Math.round((1 - plan.credit_multiplier) * 100)}% desconto
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
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleEditPlan(plan)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Plano
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {plans.filter(plan => plan.annual_price).length === 0 && (
              <div className="col-span-full text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                  Nenhum plano anual configurado
                </h3>
                <p className="text-muted-foreground">
                  Configure os preços anuais nos planos para exibi-los aqui.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <ResourceCostManagement />
        </TabsContent>
      </Tabs>

      <EditPlanDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        plan={editingPlan}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};