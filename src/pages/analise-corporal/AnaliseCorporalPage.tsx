import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Search, FileText, Weight, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TracoForm } from '@/components/analise-corporal/TracoForm';
import { TracoDetails } from '@/components/analise-corporal/TracoDetails';
import { EvaluationForm } from '@/components/analise-corporal/EvaluationForm';
import { EvaluationDetails } from '@/components/analise-corporal/EvaluationDetails';
import { EvaluationOrderManager } from '@/components/analise-corporal/EvaluationOrderManager';

interface BodyTrait {
  id: string;
  codigo: string;
  nome_tecnico: string;
  nome_simbolico: string;
  descricao: string;
  atributos_principais: string[];
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BodyEvaluation {
  id: string;
  body_part: string;
  evaluation_context: string;
  evaluation_description: string;
  trait_code: string;
  weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  body_traits?: {
    nome_simbolico: string;
  };
}

export const AnaliseCorporalPage: React.FC = () => {
  const { toast } = useToast();
  const [traits, setTraits] = useState<BodyTrait[]>([]);
  const [filteredTraits, setFilteredTraits] = useState<BodyTrait[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrait, setSelectedTrait] = useState<BodyTrait | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Estados para avaliações corporais
  const [evaluations, setEvaluations] = useState<BodyEvaluation[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<BodyEvaluation[]>([]);
  const [evaluationSearchTerm, setEvaluationSearchTerm] = useState('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<BodyEvaluation | null>(null);
  const [isCreateEvaluationDialogOpen, setIsCreateEvaluationDialogOpen] = useState(false);
  const [isEditEvaluationDialogOpen, setIsEditEvaluationDialogOpen] = useState(false);
  const [isViewEvaluationDialogOpen, setIsViewEvaluationDialogOpen] = useState(false);
  const [isDeleteEvaluationDialogOpen, setIsDeleteEvaluationDialogOpen] = useState(false);

  useEffect(() => {
    loadTraits();
    loadEvaluations();
  }, []);

  useEffect(() => {
    filterTraits();
  }, [traits, searchTerm]);

  useEffect(() => {
    filterEvaluations();
  }, [evaluations, evaluationSearchTerm]);

  const loadTraits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('body_traits')
        .select('*')
        .eq('is_active', true)
        .order('nome_simbolico');

      if (error) throw error;
      setTraits(data || []);
    } catch (error) {
      console.error('Erro ao carregar traços:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os traços corporais.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluations = async () => {
    try {
      const { data, error } = await supabase
        .from('body_evaluations')
        .select(`
          *,
          body_traits:trait_code (
            nome_simbolico
          )
        `)
        .eq('is_active', true)
        .order('body_part', { ascending: true })
        .order('evaluation_context', { ascending: true });

      if (error) throw error;
      setEvaluations(data || []);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as avaliações corporais.',
        variant: 'destructive'
      });
    }
  };

  const filterTraits = () => {
    if (!searchTerm.trim()) {
      setFilteredTraits(traits);
      return;
    }

    const filtered = traits.filter(trait =>
      trait.nome_simbolico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trait.nome_tecnico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trait.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trait.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTraits(filtered);
  };

  const filterEvaluations = () => {
    if (!evaluationSearchTerm.trim()) {
      setFilteredEvaluations(evaluations);
      return;
    }

    const filtered = evaluations.filter(evaluation =>
      evaluation.body_part.toLowerCase().includes(evaluationSearchTerm.toLowerCase()) ||
      evaluation.evaluation_context.toLowerCase().includes(evaluationSearchTerm.toLowerCase()) ||
      evaluation.evaluation_description.toLowerCase().includes(evaluationSearchTerm.toLowerCase()) ||
      evaluation.trait_code.toLowerCase().includes(evaluationSearchTerm.toLowerCase())
    );
    setFilteredEvaluations(filtered);
  };

  // Funções para as avaliações corporais
  const handleCreateEvaluation = async (evaluationData: Omit<BodyEvaluation, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => {
    try {
      const { error } = await supabase
        .from('body_evaluations')
        .insert([{ ...evaluationData, is_active: true }]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Avaliação criada com sucesso!',
      });

      setIsCreateEvaluationDialogOpen(false);
      loadEvaluations();
    } catch (error) {
      console.error('Erro ao criar avaliação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a avaliação.',
        variant: 'destructive'
      });
    }
  };

  const handleEditEvaluation = async (evaluationData: Omit<BodyEvaluation, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => {
    if (!selectedEvaluation) return;

    try {
      const { error } = await supabase
        .from('body_evaluations')
        .update(evaluationData)
        .eq('id', selectedEvaluation.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Avaliação atualizada com sucesso!',
      });

      setIsEditEvaluationDialogOpen(false);
      setSelectedEvaluation(null);
      loadEvaluations();
    } catch (error) {
      console.error('Erro ao atualizar avaliação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a avaliação.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteEvaluation = async () => {
    if (!selectedEvaluation) return;

    try {
      const { error } = await supabase
        .from('body_evaluations')
        .update({ is_active: false })
        .eq('id', selectedEvaluation.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Avaliação excluída com sucesso!',
      });

      setIsDeleteEvaluationDialogOpen(false);
      setSelectedEvaluation(null);
      loadEvaluations();
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a avaliação.',
        variant: 'destructive'
      });
    }
  };

  const openEditEvaluationDialog = (evaluation: BodyEvaluation) => {
    setSelectedEvaluation(evaluation);
    setIsEditEvaluationDialogOpen(true);
  };

  const openViewEvaluationDialog = (evaluation: BodyEvaluation) => {
    setSelectedEvaluation(evaluation);
    setIsViewEvaluationDialogOpen(true);
  };

  const openDeleteEvaluationDialog = (evaluation: BodyEvaluation) => {
    setSelectedEvaluation(evaluation);
    setIsDeleteEvaluationDialogOpen(true);
  };

  const handleCreate = async (traitData: Omit<BodyTrait, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('body_traits')
        .insert([traitData]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Traço criado com sucesso!',
      });

      setIsCreateDialogOpen(false);
      loadTraits();
    } catch (error) {
      console.error('Erro ao criar traço:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o traço.',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = async (traitData: Omit<BodyTrait, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedTrait) return;

    try {
      const { error } = await supabase
        .from('body_traits')
        .update(traitData)
        .eq('id', selectedTrait.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Traço atualizado com sucesso!',
      });

      setIsEditDialogOpen(false);
      setSelectedTrait(null);
      loadTraits();
    } catch (error) {
      console.error('Erro ao atualizar traço:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o traço.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedTrait) return;

    try {
      const { error } = await supabase
        .from('body_traits')
        .update({ is_active: false })
        .eq('id', selectedTrait.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Traço excluído com sucesso!',
      });

      setIsDeleteDialogOpen(false);
      setSelectedTrait(null);
      loadTraits();
    } catch (error) {
      console.error('Erro ao excluir traço:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o traço.',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (trait: BodyTrait) => {
    setSelectedTrait(trait);
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (trait: BodyTrait) => {
    setSelectedTrait(trait);
    setIsViewDialogOpen(true);
  };

  const openDeleteDialog = (trait: BodyTrait) => {
    setSelectedTrait(trait);
    setIsDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Carregando traços corporais...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Análise Corporal</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os traços corporais para análise bioenergética
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Traço
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[90vw]">
            <DialogHeader>
              <DialogTitle>Criar Novo Traço</DialogTitle>
              <DialogDescription>
                Adicione um novo traço corporal ao sistema de análise
              </DialogDescription>
            </DialogHeader>
            <TracoForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="lista" className="w-full">
        <TabsList>
          <TabsTrigger value="lista">Lista de Traços</TabsTrigger>
          <TabsTrigger value="avaliacoes">Avaliações Corporais</TabsTrigger>
          <TabsTrigger value="ordem">Ordem de Avaliação</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar traços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {filteredTraits.length} traço{filteredTraits.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTraits.map((trait) => (
              <Card key={trait.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-md border-2 border-muted-foreground"
                        style={{ backgroundColor: trait.color }}
                        title={`Cor: ${trait.color}`}
                      />
                      <Badge variant="outline" className="font-mono text-sm">
                        {trait.codigo}
                      </Badge>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openViewDialog(trait)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(trait)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(trait)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{trait.nome_simbolico}</CardTitle>
                  <CardDescription className="text-sm">
                    {trait.nome_tecnico}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {trait.descricao}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {trait.atributos_principais.slice(0, 3).map((atributo, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {atributo}
                      </Badge>
                    ))}
                    {trait.atributos_principais.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{trait.atributos_principais.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTraits.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum traço encontrado para sua busca.' : 'Nenhum traço cadastrado.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="avaliacoes" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar avaliações..."
                  value={evaluationSearchTerm}
                  onChange={(e) => setEvaluationSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary">
                {filteredEvaluations.length} avaliação{filteredEvaluations.length !== 1 ? 'ões' : ''}
              </Badge>
            </div>
            <Dialog open={isCreateEvaluationDialogOpen} onOpenChange={setIsCreateEvaluationDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Weight className="w-4 h-4 mr-2" />
                  Nova Avaliação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Nova Avaliação</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova avaliação corporal relacionada a um traço
                  </DialogDescription>
                </DialogHeader>
                <EvaluationForm
                  onSubmit={handleCreateEvaluation}
                  onCancel={() => setIsCreateEvaluationDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvaluations.map((evaluation) => (
              <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-sm">
                      {evaluation.trait_code}
                    </Badge>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openViewEvaluationDialog(evaluation)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditEvaluationDialog(evaluation)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteEvaluationDialog(evaluation)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{evaluation.body_part}</CardTitle>
                  {evaluation.evaluation_context && (
                    <CardDescription className="text-sm">
                      {evaluation.evaluation_context}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {evaluation.evaluation_description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      Peso: {evaluation.weight.toFixed(2)}
                    </Badge>
                    {evaluation.body_traits && (
                      <Badge variant="outline" className="text-xs">
                        {evaluation.body_traits.nome_simbolico}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredEvaluations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {evaluationSearchTerm ? 'Nenhuma avaliação encontrada para sua busca.' : 'Nenhuma avaliação cadastrada.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ordem" className="space-y-6">
          <EvaluationOrderManager />
        </TabsContent>

      </Tabs>

      {/* Diálogos para Avaliações Corporais */}
      {/* Dialog de Visualização de Avaliação */}
      <Dialog open={isViewEvaluationDialogOpen} onOpenChange={setIsViewEvaluationDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação</DialogTitle>
          </DialogHeader>
          {selectedEvaluation && (
            <EvaluationDetails evaluation={selectedEvaluation} />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Avaliação */}
      <Dialog open={isEditEvaluationDialogOpen} onOpenChange={setIsEditEvaluationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Avaliação</DialogTitle>
            <DialogDescription>
              Modifique as informações da avaliação corporal
            </DialogDescription>
          </DialogHeader>
          {selectedEvaluation && (
            <EvaluationForm
              initialData={selectedEvaluation}
              onSubmit={handleEditEvaluation}
              onCancel={() => {
                setIsEditEvaluationDialogOpen(false);
                setSelectedEvaluation(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão de Avaliação */}
      <AlertDialog open={isDeleteEvaluationDialogOpen} onOpenChange={setIsDeleteEvaluationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.
              {selectedEvaluation && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <strong>{selectedEvaluation.body_part}</strong> - {selectedEvaluation.trait_code}
                  <br />
                  <span className="text-sm">{selectedEvaluation.evaluation_description.substring(0, 100)}...</span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedEvaluation(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvaluation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Traço</DialogTitle>
          </DialogHeader>
          {selectedTrait && (
            <TracoDetails trait={selectedTrait} />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[90vw]">
          <DialogHeader>
            <DialogTitle>Editar Traço</DialogTitle>
            <DialogDescription>
              Modifique as informações do traço corporal
            </DialogDescription>
          </DialogHeader>
          {selectedTrait && (
            <TracoForm
              initialData={selectedTrait}
              onSubmit={handleEdit}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedTrait(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Traço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este traço? Esta ação não pode ser desfeita.
              {selectedTrait && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <strong>{selectedTrait.nome_simbolico}</strong> ({selectedTrait.codigo})
                  <br />
                  <span className="text-sm">{selectedTrait.nome_tecnico}</span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTrait(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};