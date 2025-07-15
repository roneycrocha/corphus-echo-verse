import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Check } from 'lucide-react';
import { useAIAgents } from '@/hooks/useAIAgents';
import { useUserAIAgent } from '@/hooks/useUserAIAgent';
import { Badge } from '@/components/ui/badge';

const AIAgentSelector: React.FC = () => {
  const { agents, loading: agentsLoading } = useAIAgents();
  const { selectedAgent, updateUserSelectedAgent, loading: updateLoading } = useUserAIAgent();

  const handleAgentChange = async (agentId: string) => {
    await updateUserSelectedAgent(agentId);
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      'desenvolvimento_humano': 'Desenvolvimento Humano',
      'rh': 'Recursos Humanos',
      'vendas': 'Vendas',
      'suporte': 'Suporte',
      'general': 'Geral'
    };
    return categories[category] || category;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agente de IA Preferido
        </CardTitle>
        <CardDescription>
          Escolha qual agente de IA será usado nas suas interações na plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedAgent && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Agente Atual
              </h4>
              <Badge variant="secondary">
                {getCategoryLabel(selectedAgent.category)}
              </Badge>
            </div>
            <p className="text-sm font-medium">{selectedAgent.name}</p>
            {selectedAgent.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedAgent.description}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Selecionar Agente</label>
          <Select
            value={selectedAgent?.id || ''}
            onValueChange={handleAgentChange}
            disabled={agentsLoading || updateLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um agente de IA" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <span className="font-medium">{agent.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {getCategoryLabel(agent.category)}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {agents.length === 0 && !agentsLoading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum agente de IA disponível no momento.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAgentSelector;