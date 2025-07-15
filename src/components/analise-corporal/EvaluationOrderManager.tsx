import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowUp, ArrowDown, Save, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EvaluationOrder {
  id: string;
  original_id: string; // ID original da tabela evaluation_order
  body_part: string;
  evaluation_context: string;
  sort_order: number;
  is_active: boolean;
  evaluation_description?: string;
  trait_code?: string;
}

interface GroupedEvaluations {
  [bodyPart: string]: {
    [context: string]: EvaluationOrder[];
  };
}

export const EvaluationOrderManager: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<EvaluationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEvaluationOrders();
  }, []);

  const loadEvaluationOrders = async () => {
    try {
      setLoading(true);
      
      // Buscar diretamente as avaliações corporais ordenadas pelo weight
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('body_evaluations')
        .select(`
          id,
          body_part,
          evaluation_context,
          evaluation_description,
          trait_code,
          weight
        `)
        .eq('is_active', true)
        .order('weight', { ascending: true });

      if (evaluationsError) throw evaluationsError;

      // Processar avaliações mantendo a ordem definida pelo weight
      const processedData: EvaluationOrder[] = evaluationsData?.map((evaluation, index) => {        
        return {
          id: evaluation.id,
          original_id: evaluation.id,
          body_part: evaluation.body_part,
          evaluation_context: evaluation.evaluation_context || '',
          sort_order: index + 1, // Ordem sequencial baseada no weight
          is_active: true,
          evaluation_description: evaluation.evaluation_description,
          trait_code: evaluation.trait_code
        };
      }) || [];
      
      console.log('Dados processados:', processedData.length, 'avaliações únicas ordenadas por weight');
      console.log('Primeira avaliação:', processedData[0]);
      console.log('Última avaliação:', processedData[processedData.length - 1]);
      
      setOrders(processedData);
      setHasChanges(false);
    } catch (error) {
      console.error('Erro ao carregar ordem das avaliações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a ordem das avaliações.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrders = [...orders];
    const currentItem = newOrders[index];
    
    if (direction === 'up' && index > 0) {
      const previousItem = newOrders[index - 1];
      newOrders[index - 1] = { ...currentItem, sort_order: previousItem.sort_order };
      newOrders[index] = { ...previousItem, sort_order: currentItem.sort_order };
    } else if (direction === 'down' && index < newOrders.length - 1) {
      const nextItem = newOrders[index + 1];
      newOrders[index + 1] = { ...currentItem, sort_order: nextItem.sort_order };
      newOrders[index] = { ...nextItem, sort_order: currentItem.sort_order };
    }

    // Reordenar baseado no sort_order
    newOrders.sort((a, b) => a.sort_order - b.sort_order);
    setOrders(newOrders);
    setHasChanges(true);
  };

  const updateSortOrder = (id: string, newOrder: number) => {
    const newOrders = orders.map(order => 
      order.id === id ? { ...order, sort_order: newOrder } : order
    );
    
    // Reordenar baseado no sort_order
    newOrders.sort((a, b) => a.sort_order - b.sort_order);
    setOrders(newOrders);
    setHasChanges(true);
  };

  const saveOrder = async () => {
    try {
      console.log('Tentando salvar ordem...', orders.length, 'itens');
      
      // Como o campo weight tem limitação (precision 3, scale 2), 
      // vamos usar valores fracionários de 0.01 a 9.99
      const updatePromises = orders.map(async (order, index) => {
        // Calcular um peso entre 0.01 e 9.99 baseado na posição
        // Para 116 itens: 0.01, 0.02, 0.03, ..., até aproximadamente 1.16
        const weightValue = Math.round((index + 1) * 0.01 * 100) / 100;
        const clampedWeight = Math.min(9.99, Math.max(0.01, weightValue));
        
        console.log(`Atualizando avaliação ${order.id} para peso ${clampedWeight}`);
        
        const { error } = await supabase
          .from('body_evaluations')
          .update({ weight: clampedWeight })
          .eq('id', order.id);

        if (error) {
          console.error(`Erro ao atualizar avaliação ${order.id}:`, error);
          throw error;
        }
        
        return { id: order.id, weight: clampedWeight };
      });

      const results = await Promise.all(updatePromises);
      console.log('Resultados das atualizações:', results);

      toast({
        title: 'Sucesso',
        description: 'Ordem das avaliações salva com sucesso!',
      });

      setHasChanges(false);
      
      // Recarregar os dados para refletir as mudanças salvas
      await loadEvaluationOrders();
      
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a ordem das avaliações.',
        variant: 'destructive'
      });
    }
  };

  const resetOrder = () => {
    loadEvaluationOrders();
  };

  const groupEvaluationsByBodyPartAndContext = (evaluations: EvaluationOrder[]): GroupedEvaluations => {
    return evaluations.reduce((groups, evaluation) => {
      const { body_part, evaluation_context } = evaluation;
      const context = evaluation_context || 'Contexto padrão';
      
      if (!groups[body_part]) {
        groups[body_part] = {};
      }
      if (!groups[body_part][context]) {
        groups[body_part][context] = [];
      }
      groups[body_part][context].push(evaluation);
      return groups;
    }, {} as GroupedEvaluations);
  };

  const toggleGroup = (groupKey: string) => {
    const newOpenGroups = new Set(openGroups);
    if (newOpenGroups.has(groupKey)) {
      newOpenGroups.delete(groupKey);
    } else {
      newOpenGroups.add(groupKey);
    }
    setOpenGroups(newOpenGroups);
  };

  const moveItemWithinContext = (bodyPart: string, context: string, itemIndex: number, direction: 'up' | 'down') => {
    console.log('moveItemWithinContext chamada:', { bodyPart, context, itemIndex, direction });
    
    const groupedEvaluations = groupEvaluationsByBodyPartAndContext(orders);
    const contextItems = groupedEvaluations[bodyPart][context];
    
    console.log('Items do contexto antes da movimentação:', contextItems.map(item => ({
      id: item.id,
      sort_order: item.sort_order,
      description: item.evaluation_description
    })));
    
    if (direction === 'up' && itemIndex > 0) {
      // Trocar posições no array
      const targetIndex = itemIndex - 1;
      const currentItem = contextItems[itemIndex];
      const targetItem = contextItems[targetIndex];
      
      console.log('Movendo para cima:', {
        currentItem: { id: currentItem.id, sort_order: currentItem.sort_order },
        targetItem: { id: targetItem.id, sort_order: targetItem.sort_order }
      });
      
      // Criar nova array reorganizada
      const newContextItems = [...contextItems];
      newContextItems[itemIndex] = targetItem;
      newContextItems[targetIndex] = currentItem;
      
      // Recalcular sort_order para todos os itens deste contexto
      const baseOrder = Math.min(...contextItems.map(item => item.sort_order));
      console.log('Base order calculada:', baseOrder);
      
      const newOrders = orders.map(order => {
        const itemIndexInContext = newContextItems.findIndex(item => item.id === order.id);
        if (itemIndexInContext !== -1) {
          // Calcular novo sort_order baseado na posição
          const newSortOrder = baseOrder + itemIndexInContext;
          console.log(`Atualizando item ${order.id}: ${order.sort_order} -> ${newSortOrder}`);
          return { ...order, sort_order: newSortOrder };
        }
        return order;
      });
      
      newOrders.sort((a, b) => a.sort_order - b.sort_order);
      setOrders(newOrders);
      setHasChanges(true);
      
      console.log('Nova ordem após movimentação:', newOrders.filter(o => 
        contextItems.some(ci => ci.id === o.id)
      ).map(o => ({ id: o.id, sort_order: o.sort_order })));
      
    } else if (direction === 'down' && itemIndex < contextItems.length - 1) {
      // Trocar posições no array
      const targetIndex = itemIndex + 1;
      const currentItem = contextItems[itemIndex];
      const targetItem = contextItems[targetIndex];
      
      console.log('Movendo para baixo:', {
        currentItem: { id: currentItem.id, sort_order: currentItem.sort_order },
        targetItem: { id: targetItem.id, sort_order: targetItem.sort_order }
      });
      
      // Criar nova array reorganizada
      const newContextItems = [...contextItems];
      newContextItems[itemIndex] = targetItem;
      newContextItems[targetIndex] = currentItem;
      
      // Recalcular sort_order para todos os itens deste contexto
      const baseOrder = Math.min(...contextItems.map(item => item.sort_order));
      console.log('Base order calculada:', baseOrder);
      
      const newOrders = orders.map(order => {
        const itemIndexInContext = newContextItems.findIndex(item => item.id === order.id);
        if (itemIndexInContext !== -1) {
          // Calcular novo sort_order baseado na posição
          const newSortOrder = baseOrder + itemIndexInContext;
          console.log(`Atualizando item ${order.id}: ${order.sort_order} -> ${newSortOrder}`);
          return { ...order, sort_order: newSortOrder };
        }
        return order;
      });
      
      newOrders.sort((a, b) => a.sort_order - b.sort_order);
      setOrders(newOrders);
      setHasChanges(true);
      
      console.log('Nova ordem após movimentação:', newOrders.filter(o => 
        contextItems.some(ci => ci.id === o.id)
      ).map(o => ({ id: o.id, sort_order: o.sort_order })));
    }
  };

  const moveBodyPartGroup = (bodyParts: string[], fromIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (targetIndex < 0 || targetIndex >= bodyParts.length) return;

    const fromBodyPart = bodyParts[fromIndex];
    const toBodyPart = bodyParts[targetIndex];
    
    const groupedEvaluations = groupEvaluationsByBodyPartAndContext(orders);
    const fromItems = Object.values(groupedEvaluations[fromBodyPart]).flat();
    const toItems = Object.values(groupedEvaluations[toBodyPart]).flat();
    
    // Encontrar os ranges de sort_order para cada grupo
    const fromMinOrder = Math.min(...fromItems.map(item => item.sort_order));
    const fromMaxOrder = Math.max(...fromItems.map(item => item.sort_order));
    const toMinOrder = Math.min(...toItems.map(item => item.sort_order));
    const toMaxOrder = Math.max(...toItems.map(item => item.sort_order));
    
    const newOrders = orders.map(order => {
      if (fromItems.some(item => item.id === order.id)) {
        // Mover itens do grupo "from" para a posição do grupo "to"
        const relativePosition = order.sort_order - fromMinOrder;
        return { ...order, sort_order: toMinOrder + relativePosition };
      }
      if (toItems.some(item => item.id === order.id)) {
        // Mover itens do grupo "to" para a posição do grupo "from"
        const relativePosition = order.sort_order - toMinOrder;
        return { ...order, sort_order: fromMinOrder + relativePosition };
      }
      return order;
    });
    
    newOrders.sort((a, b) => a.sort_order - b.sort_order);
    setOrders(newOrders);
    setHasChanges(true);
  };

  const moveContextGroup = (bodyPart: string, contexts: string[], fromIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (targetIndex < 0 || targetIndex >= contexts.length) return;

    const fromContext = contexts[fromIndex];
    const toContext = contexts[targetIndex];
    
    const groupedEvaluations = groupEvaluationsByBodyPartAndContext(orders);
    const fromItems = groupedEvaluations[bodyPart][fromContext];
    const toItems = groupedEvaluations[bodyPart][toContext];
    
    // Encontrar os ranges de sort_order para cada contexto
    const fromMinOrder = Math.min(...fromItems.map(item => item.sort_order));
    const fromMaxOrder = Math.max(...fromItems.map(item => item.sort_order));
    const toMinOrder = Math.min(...toItems.map(item => item.sort_order));
    const toMaxOrder = Math.max(...toItems.map(item => item.sort_order));
    
    const newOrders = orders.map(order => {
      if (fromItems.some(item => item.id === order.id)) {
        // Mover itens do contexto "from" para a posição do contexto "to"
        const relativePosition = (order.sort_order - fromMinOrder) / (fromMaxOrder - fromMinOrder || 1);
        const newOrder = toMinOrder + relativePosition * (toMaxOrder - toMinOrder || 0.1);
        return { ...order, sort_order: newOrder };
      }
      if (toItems.some(item => item.id === order.id)) {
        // Mover itens do contexto "to" para a posição do contexto "from"
        const relativePosition = (order.sort_order - toMinOrder) / (toMaxOrder - toMinOrder || 1);
        const newOrder = fromMinOrder + relativePosition * (fromMaxOrder - fromMinOrder || 0.1);
        return { ...order, sort_order: newOrder };
      }
      return order;
    });
    
    newOrders.sort((a, b) => a.sort_order - b.sort_order);
    setOrders(newOrders);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Carregando ordem das avaliações...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ordem das Avaliações</CardTitle>
          <CardDescription>
            Defina a ordem em que as partes do corpo e contextos aparecerão durante as avaliações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <Badge variant="secondary">
              {orders.length} item{orders.length !== 1 ? 's' : ''} configurado{orders.length !== 1 ? 's' : ''}
            </Badge>
            <div className="space-x-2">
              {hasChanges && (
                <>
                  <Button variant="outline" onClick={resetOrder}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Descartar
                  </Button>
                  <Button onClick={saveOrder}>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Ordem
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(groupEvaluationsByBodyPartAndContext(orders)).map(([bodyPart, contexts], bodyPartIndex, bodyPartsArray) => {
              const totalItems = Object.values(contexts).flat().length;
              const bodyPartsList = Object.keys(groupEvaluationsByBodyPartAndContext(orders));
              return (
                <Card key={`body-part-${bodyPartIndex}-${bodyPart}`} className="border-l-4 border-l-primary/20">
                  <Collapsible
                    open={openGroups.has(bodyPart)}
                    onOpenChange={() => toggleGroup(bodyPart)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex flex-col space-y-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveBodyPartGroup(bodyPartsList, bodyPartIndex, 'up');
                                }}
                                disabled={bodyPartIndex === 0}
                                className="h-6 w-6 p-0"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveBodyPartGroup(bodyPartsList, bodyPartIndex, 'down');
                                }}
                                disabled={bodyPartIndex === bodyPartsList.length - 1}
                                className="h-6 w-6 p-0"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                            </div>
                            {openGroups.has(bodyPart) ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                            <CardTitle className="text-lg">{bodyPart}</CardTitle>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {Object.keys(contexts).length} contexto{Object.keys(contexts).length !== 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="secondary">
                              {totalItems} item{totalItems !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {Object.entries(contexts).map(([context, contextItems], contextIndex) => {
                            const contextKey = `${bodyPart}-${context}`;
                            const contextsList = Object.keys(contexts);
                            return (
                              <div key={contextKey} className="border-l-2 border-l-accent/30 pl-4">
                                <Collapsible
                                  open={openGroups.has(contextKey)}
                                  onOpenChange={() => toggleGroup(contextKey)}
                                >
                                  <CollapsibleTrigger asChild>
                                    <div className="cursor-pointer hover:bg-muted/30 transition-colors p-2 rounded-md mb-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <div className="flex flex-col space-y-1">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                moveContextGroup(bodyPart, contextsList, contextIndex, 'up');
                                              }}
                                              disabled={contextIndex === 0}
                                              className="h-4 w-4 p-0"
                                            >
                                              <ArrowUp className="w-2 h-2" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                moveContextGroup(bodyPart, contextsList, contextIndex, 'down');
                                              }}
                                              disabled={contextIndex === contextsList.length - 1}
                                              className="h-4 w-4 p-0"
                                            >
                                              <ArrowDown className="w-2 h-2" />
                                            </Button>
                                          </div>
                                          {openGroups.has(contextKey) ? (
                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                          )}
                                          <span className="font-medium text-sm">
                                            {context === 'Contexto padrão' ? (
                                              <span className="italic text-muted-foreground">{context}</span>
                                            ) : (
                                              context
                                            )}
                                          </span>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          {contextItems.length} item{contextItems.length !== 1 ? 's' : ''}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  
                                  <CollapsibleContent>
                                    <div className="space-y-2 ml-6">
                                      {contextItems.map((order, index) => {
                                        const globalIndex = orders.findIndex(o => o.id === order.id);
                                        return (
                                          <div key={order.id} className="flex items-center space-x-3 p-2 border rounded-md bg-background/30">
                                            <div className="flex flex-col space-y-1">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => moveItemWithinContext(bodyPart, context, index, 'up')}
                                                disabled={index === 0}
                                                className="h-6 w-6 p-0"
                                              >
                                                <ArrowUp className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => moveItemWithinContext(bodyPart, context, index, 'down')}
                                                disabled={index === contextItems.length - 1}
                                                className="h-6 w-6 p-0"
                                              >
                                                <ArrowDown className="w-3 h-3" />
                                              </Button>
                                            </div>

                                            <div className="w-16">
                                              <Input
                                                type="number"
                                                value={order.sort_order}
                                                onChange={(e) => updateSortOrder(order.id, parseInt(e.target.value) || 1)}
                                                min="1"
                                                className="text-center text-xs h-7"
                                              />
                                            </div>

                                            <div className="flex-1">
                                              <div className="text-sm font-medium">
                                                {order.evaluation_description || 'Descrição não encontrada'}
                                              </div>
                                              {order.trait_code && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                  Código: {order.trait_code}
                                                </div>
                                              )}
                                            </div>

                                            <Badge variant="outline" className="text-xs">
                                              #{globalIndex + 1}
                                            </Badge>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>

          {orders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma ordem de avaliação configurada.</p>
              <p className="text-sm mt-2">
                As ordens são criadas automaticamente baseadas nas avaliações cadastradas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};