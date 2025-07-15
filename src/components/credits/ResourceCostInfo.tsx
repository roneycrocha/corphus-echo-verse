import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video,
  FileText,
  Brain,
  Mic,
  BarChart3,
  Settings,
  DollarSign,
  Info
} from 'lucide-react';
import { useResourceCosts } from '@/hooks/useResourceCosts';

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

export const ResourceCostInfo: React.FC = () => {
  const { resourceCosts, loading } = useResourceCosts();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando informações de custos...</div>
        </CardContent>
      </Card>
    );
  }

  if (resourceCosts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Nenhum custo de recurso configurado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Info className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Custo dos Recursos</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Valores em créditos que serão consumidos ao usar cada funcionalidade
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resourceCosts.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  {getResourceIcon(resource.resource_name)}
                </div>
                <div>
                  <p className="font-medium text-sm">{resource.resource_description}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {resource.resource_name}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="flex items-center space-x-1">
                <DollarSign className="w-3 h-3" />
                <span>{resource.cost_per_usage}</span>
              </Badge>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Como funciona o consumo de créditos?
              </p>
              <p className="text-blue-700 dark:text-blue-200 text-xs">
                Cada vez que você usar uma funcionalidade da plataforma, o número de créditos 
                correspondente será automaticamente descontado do seu saldo. Certifique-se de 
                ter créditos suficientes antes de iniciar as atividades.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};