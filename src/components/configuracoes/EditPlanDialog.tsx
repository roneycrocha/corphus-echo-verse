import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface EditPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  onSuccess: () => void;
}

export const EditPlanDialog: React.FC<EditPlanDialogProps> = ({
  open,
  onOpenChange,
  plan,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({});
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    if (plan) {
      setFormData({
        ...plan,
        features: plan.features || []
      });
    } else {
      setFormData({
        features: []
      });
    }
  }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.monthly_price) {
      toast({
        title: 'Erro',
        description: 'Nome e preço mensal são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      console.log('=== DEBUGANDO EDIÇÃO DE PLANO ===');
      console.log('Plan ID:', plan?.id);
      console.log('Form data:', formData);
      
      const updateData = {
        name: formData.name,
        monthly_price: Number(formData.monthly_price),
        annual_price: formData.annual_price ? Number(formData.annual_price) : null,
        monthly_credits: Number(formData.monthly_credits || 0),
        annual_credits: formData.annual_credits ? Number(formData.annual_credits) : null,
        credit_multiplier: Number(formData.credit_multiplier || 1),
        features: formData.features || [],
        is_active: formData.is_active ?? true
      };
      
      console.log('Update data:', updateData);

      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updateData)
        .eq('id', plan?.id)
        .select();

      console.log('Update result:', { data, error });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Plano atualizado com sucesso!'
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      toast({
        title: 'Erro',
        description: `Não foi possível atualizar o plano: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...(prev.features || []), newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Plano</DialogTitle>
          <DialogDescription>
            Configure os valores mensais, anuais e recursos do plano.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Plano</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do plano"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="credit_multiplier">Multiplicador de Crédito</Label>
              <Input
                id="credit_multiplier"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={formData.credit_multiplier || 1}
                onChange={(e) => setFormData(prev => ({ ...prev, credit_multiplier: Number(e.target.value) }))}
                placeholder="1.0"
              />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-lg">Configuração Mensal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_price">Preço Mensal (R$)</Label>
                <Input
                  id="monthly_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_price: Number(e.target.value) }))}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="monthly_credits">Créditos Mensais</Label>
                <Input
                  id="monthly_credits"
                  type="number"
                  min="0"
                  value={formData.monthly_credits || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_credits: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-lg">Configuração Anual (Opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="annual_price">Preço Anual (R$)</Label>
                <Input
                  id="annual_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.annual_price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, annual_price: Number(e.target.value) }))}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="annual_credits">Créditos Mensais (Plano Anual)</Label>
                <Input
                  id="annual_credits"
                  type="number"
                  min="0"
                  value={formData.annual_credits || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, annual_credits: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Recursos do Plano</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Adicionar novo recurso"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                />
                <Button type="button" onClick={addFeature} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {formData.features?.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {feature}
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};