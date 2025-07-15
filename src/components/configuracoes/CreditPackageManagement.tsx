import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, DollarSign, Gift } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type CreditPackage = Tables<'credit_packages'>;
type SubscriptionPlan = Tables<'subscription_plans'>;

interface CreditPackageWithPlans extends CreditPackage {
  allowed_plans?: string[];
}

export const CreditPackageManagement: React.FC = () => {
  const [packages, setPackages] = useState<CreditPackageWithPlans[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackageWithPlans | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    credits: '',
    bonus_credits: '',
    price: '',
    is_active: true,
    allowed_plans: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [packagesResponse, plansResponse] = await Promise.all([
        supabase.from('credit_packages').select('*').order('created_at', { ascending: false }),
        supabase.from('subscription_plans').select('*').eq('is_active', true)
      ]);

      if (packagesResponse.error) throw packagesResponse.error;
      if (plansResponse.error) throw plansResponse.error;

      setPackages(packagesResponse.data || []);
      setPlans(plansResponse.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePackage = async () => {
    try {
      if (!formData.name || !formData.credits || !formData.price) {
        toast({
          title: 'Erro',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive'
        });
        return;
      }

      const packageData = {
        name: formData.name,
        credits: parseInt(formData.credits),
        bonus_credits: parseInt(formData.bonus_credits) || 0,
        price: parseFloat(formData.price),
        is_active: formData.is_active
      };

      if (editingPackage) {
        const { error } = await supabase
          .from('credit_packages')
          .update(packageData)
          .eq('id', editingPackage.id);

        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Pacote atualizado com sucesso!',
        });
      } else {
        const { error } = await supabase
          .from('credit_packages')
          .insert([packageData]);

        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Pacote criado com sucesso!',
        });
      }

      setIsDialogOpen(false);
      setEditingPackage(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erro ao salvar pacote:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o pacote.',
        variant: 'destructive'
      });
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    try {
      const { error } = await supabase
        .from('credit_packages')
        .delete()
        .eq('id', packageId);

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Pacote excluído com sucesso!',
      });
      
      loadData();
    } catch (error) {
      console.error('Erro ao excluir pacote:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o pacote.',
        variant: 'destructive'
      });
    }
  };

  const handleEditPackage = (pkg: CreditPackageWithPlans) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      credits: pkg.credits.toString(),
      bonus_credits: (pkg.bonus_credits || 0).toString(),
      price: pkg.price.toString(),
      is_active: pkg.is_active || true,
      allowed_plans: pkg.allowed_plans || []
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      credits: '',
      bonus_credits: '',
      price: '',
      is_active: true,
      allowed_plans: []
    });
  };

  const getPlanName = (planType: string) => {
    const plan = plans.find(p => p.plan_type === planType);
    return plan?.name || planType;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando pacotes...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-primary" />
              <span>Pacotes de Crédito</span>
            </CardTitle>
            <CardDescription>
              Gerencie os pacotes de crédito disponíveis para compra
            </CardDescription>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center space-x-2"
                onClick={() => {
                  setEditingPackage(null);
                  resetForm();
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Novo Pacote</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingPackage ? 'Editar Pacote' : 'Novo Pacote'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Pacote *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Pacote Básico"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="credits">Créditos *</Label>
                    <Input
                      id="credits"
                      type="number"
                      value={formData.credits}
                      onChange={(e) => setFormData({...formData, credits: e.target.value})}
                      placeholder="100"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonus_credits">Créditos Bônus</Label>
                    <Input
                      id="bonus_credits"
                      type="number"
                      value={formData.bonus_credits}
                      onChange={(e) => setFormData({...formData, bonus_credits: e.target.value})}
                      placeholder="10"
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="29.90"
                    min="0"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Pacote ativo</Label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePackage}>
                  {editingPackage ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {packages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum pacote de crédito cadastrado.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {packages.map((pkg) => (
              <div key={pkg.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="font-semibold">{pkg.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <Gift className="w-4 h-4" />
                          <span>{pkg.credits} + {pkg.bonus_credits || 0} bônus</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4" />
                          <span>R$ {Number(pkg.price).toFixed(2)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={pkg.is_active ? "default" : "secondary"}>
                      {pkg.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPackage(pkg)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePackage(pkg.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm">
                  <span className="font-medium">Total: </span>
                  <span className="text-primary font-semibold">
                    {pkg.credits + (pkg.bonus_credits || 0)} créditos
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};