import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Save, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomAIAgent } from '@/hooks/useCustomAIAgent';

interface CustomAIAgentSettingsProps {
  onAgentConfigured?: (agentId: string) => void;
}

export const CustomAIAgentSettings: React.FC<CustomAIAgentSettingsProps> = ({
  onAgentConfigured
}) => {
  const [agentId, setAgentId] = useState('asst_Urx3NlHxECrQRS889BwZv0JA');
  const [testMessage, setTestMessage] = useState('Olá, você pode me explicar como funciona a análise corporal?');
  const [savedAgentId, setSavedAgentId] = useState(() => {
    const saved = localStorage.getItem('customAIAgentId');
    if (!saved) {
      // Configurar agente padrão se não há nenhum salvo
      localStorage.setItem('customAIAgentId', 'asst_Urx3NlHxECrQRS889BwZv0JA');
      return 'asst_Urx3NlHxECrQRS889BwZv0JA';
    }
    return saved;
  });
  
  const { loading, analyzeWithCustomAgent } = useCustomAIAgent();

  const handleSaveAgent = () => {
    if (!agentId.trim()) {
      toast.error('Por favor, insira o ID do agente');
      return;
    }

    if (!agentId.startsWith('asst_')) {
      toast.error('ID do agente deve começar com "asst_"');
      return;
    }

    localStorage.setItem('customAIAgentId', agentId);
    setSavedAgentId(agentId);
    onAgentConfigured?.(agentId);
    toast.success('Agente personalizado configurado com sucesso!');
  };

  const handleTestAgent = async () => {
    const agentToTest = savedAgentId || agentId;
    
    if (!agentToTest) {
      toast.error('Configure um agente primeiro');
      return;
    }

    if (!testMessage.trim()) {
      toast.error('Digite uma mensagem de teste');
      return;
    }

    try {
      const result = await analyzeWithCustomAgent({
        message: testMessage,
        assistantId: agentToTest,
        analysisType: 'general'
      });

      if (result) {
        toast.success('Teste realizado com sucesso! Verifique o console para ver a resposta.');
        console.log('Resposta do agente:', result.response);
      }
    } catch (error) {
      console.error('Erro no teste:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Configuração do Agente Personalizado OpenAI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-id">ID do Agente OpenAI</Label>
          <div className="flex gap-2">
            <Input
              id="agent-id"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="asst_abc123..."
              className="flex-1"
            />
            <Button onClick={handleSaveAgent} size="sm">
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Insira o ID do agente que você criou na OpenAI (começa com "asst_")
          </p>
        </div>

        {savedAgentId && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>Agente configurado:</strong> {savedAgentId}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="test-message">Testar Agente</Label>
          <Textarea
            id="test-message"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Digite uma mensagem para testar o agente..."
            rows={3}
          />
          <Button 
            onClick={handleTestAgent} 
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <Play className="h-4 w-4 mr-1" />
            {loading ? 'Testando...' : 'Testar Agente'}
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h4 className="font-medium text-blue-900 mb-2">Como usar:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>1. Crie um agente personalizado na OpenAI com conhecimento sobre análise corporal</li>
            <li>2. Copie o ID do agente (ex: asst_abc123...)</li>
            <li>3. Cole o ID no campo acima e clique em "Salvar"</li>
            <li>4. Teste o agente com uma mensagem</li>
            <li>5. Agora o agente será usado nas análises corporais da plataforma</li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
          <h4 className="font-medium text-amber-900 mb-2">Funcionalidades do Agente:</h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Análise detalhada de composição corporal</li>
            <li>• Interpretação de traços dominantes</li>
            <li>• Sugestões de tratamento personalizadas</li>
            <li>• Análise de conversas terapêuticas</li>
            <li>• Recomendações baseadas no perfil do paciente</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};