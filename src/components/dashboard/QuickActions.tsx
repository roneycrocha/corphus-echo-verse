import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Calendar, 
  FileText, 
  Video, 
  MessageSquare,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Componente de ações rápidas para o dashboard
 */
export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { canManagePatients, canViewReports } = usePermissions();

  const actions = [
    {
      title: 'Novo Paciente',
      description: 'Cadastrar novo paciente com opção de criar credenciais',
      icon: UserPlus,
      onClick: () => navigate('/pacientes/cadastrar'),
      show: canManagePatients(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Agendar Consulta',
      description: 'Nova consulta na agenda',
      icon: Calendar,
      onClick: () => navigate('/agenda'),
      show: true, // Todos podem acessar a agenda
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Análise Corporal',
      description: 'Nova análise corporal',
      icon: FileText,
      onClick: () => navigate('/analise-corporal'),
      show: true,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Videochamada',
      description: 'Iniciar atendimento online',
      icon: Video,
      onClick: () => navigate('/video-call'),
      show: true,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Gestão Terapêutica',
      description: 'Planos de tratamento',
      icon: MessageSquare,
      onClick: () => navigate('/gestao-terapeutica'),
      show: true,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    }
  ];

  const visibleActions = actions.filter(action => action.show);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
          <span>Ações Rápidas</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Acesso rápido às principais funcionalidades
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
          {visibleActions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className="h-auto p-3 justify-start hover:bg-muted/50 transition-colors"
              onClick={action.onClick}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${action.bgColor}`}>
                <action.icon className={`w-4 h-4 ${action.color}`} />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};