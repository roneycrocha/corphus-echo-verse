import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Video,
  FileText,
  Brain,
  Mic,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ResourceCost {
  id: string;
  resource_name: string;
  resource_description: string;
  cost_per_usage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ResourceCostFormData {
  resource_name: string;
  resource_description: string;
  cost_per_usage: number;
  is_active: boolean;
}

const getResourceIcon = (resourceName: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    video_call: <Video className="w-4 h-4" />,
    transcription: <FileText className="w-4 h-4" />,
    ai_analysis: <Brain className="w-4 h-4" />,
    report_generation: <BarChart3 className="w-4 h-4" />,
    voice_to_text: <Mic className="w-4 h-4" />,
  };
  return iconMap[resourceName] || <Settings className="w-4 h-4" />;
};

export const ResourceCostManagement: React.FC = () => {
  const [resourceCosts, setResourceCosts] = useState<ResourceCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceCost | null>(null);
  const [formData, setFormData] = useState<ResourceCostFormData>({
    resource_name: '',
    resource_description: '',
    cost_per_usage: 1,
    is_active: true,
  });

  useEffect(() => {
    loadResourceCosts();
  }, []);

  const loadResourceCosts = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_costs')
        .select('*')
        .order('resource_name');

      if (error) throw error;
      setResourceCosts(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar custos dos recursos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.resource_name || !formData.resource_description) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingResource) {
        // Atualizar recurso existente
        const { error } = await supabase
          .from('resource_costs')
          .update({
            resource_description: formData.resource_description,
            cost_per_usage: formData.cost_per_usage,
            is_active: formData.is_active,
          })
          .eq('id', editingResource.id);

        if (error) throw error;
        toast.success('Recurso atualizado com sucesso!');
      } else {
        // Criar novo recurso
        const { error } = await supabase
          .from('resource_costs')
          .insert({
            resource_name: formData.resource_name,
            resource_description: formData.resource_description,
            cost_per_usage: formData.cost_per_usage,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Recurso criado com sucesso!');
      }

      setDialogOpen(false);
      setEditingResource(null);
      setFormData({
        resource_name: '',
        resource_description: '',
        cost_per_usage: 1,
        is_active: true,
      });
      loadResourceCosts();
    } catch (error: any) {
      toast.error('Erro ao salvar recurso: ' + error.message);
    }
  };

  const handleEdit = (resource: ResourceCost) => {
    setEditingResource(resource);
    setFormData({
      resource_name: resource.resource_name,
      resource_description: resource.resource_description,
      cost_per_usage: resource.cost_per_usage,
      is_active: resource.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este recurso?')) return;

    try {
      const { error } = await supabase
        .from('resource_costs')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;
      toast.success('Recurso excluído com sucesso!');
      loadResourceCosts();
    } catch (error: any) {
      toast.error('Erro ao excluir recurso: ' + error.message);
    }
  };

  const resetForm = () => {
    setEditingResource(null);
    setFormData({
      resource_name: '',
      resource_description: '',
      cost_per_usage: 1,
      is_active: true,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando custos dos recursos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <CardTitle>Gerenciamento de Custos por Recurso</CardTitle>
          </div>
          <Dialog 
            open={dialogOpen} 
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Recurso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingResource ? 'Editar Recurso' : 'Novo Recurso'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resource_name">Nome do Recurso *</Label>
                  <Input
                    id="resource_name"
                    value={formData.resource_name}
                    onChange={(e) => setFormData({...formData, resource_name: e.target.value})}
                    placeholder="ex: video_call, transcription"
                    disabled={!!editingResource} // Não permite editar o nome se estiver editando
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resource_description">Descrição *</Label>
                  <Textarea
                    id="resource_description"
                    value={formData.resource_description}
                    onChange={(e) => setFormData({...formData, resource_description: e.target.value})}
                    placeholder="Descrição do que é este recurso"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_per_usage">Custo por Uso (créditos) *</Label>
                  <Input
                    id="cost_per_usage"
                    type="number"
                    min="0"
                    value={formData.cost_per_usage}
                    onChange={(e) => setFormData({...formData, cost_per_usage: parseInt(e.target.value) || 1})}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label>Recurso ativo</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingResource ? 'Atualizar' : 'Criar'} Recurso
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recurso</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Custo (créditos)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resourceCosts.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getResourceIcon(resource.resource_name)}
                      <span className="font-mono text-sm">{resource.resource_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{resource.resource_description}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-3 h-3" />
                      <span className="font-bold">{resource.cost_per_usage}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={resource.is_active ? "default" : "secondary"}>
                      {resource.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(resource)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(resource.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {resourceCosts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum recurso cadastrado ainda
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};