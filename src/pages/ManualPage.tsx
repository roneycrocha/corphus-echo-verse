import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, FileText, Search, BookOpen, Users, Calendar, Activity, Target, DollarSign, BarChart3, Settings, Monitor, Stethoscope, Video, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';

interface ManualSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  subsections?: { id: string; title: string; content: string }[];
}

/**
 * Página do Manual do Usuário
 * Manual completo da plataforma corphus.ai
 */
export const ManualPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState<string[]>(['visao-geral']);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const manualSections: ManualSection[] = [
    {
      id: 'visao-geral',
      title: 'Visão Geral',
      icon: BookOpen,
      description: 'Introdução à plataforma corphus.ai',
      subsections: [
        {
          id: 'o-que-e',
          title: 'O que é a plataforma corphus.ai',
          content: 'A plataforma corphus.ai é uma solução completa para análise corporal e gestão terapêutica, desenvolvida especificamente para profissionais da saúde. O sistema integra inteligência artificial para oferecer análises precisas e ferramentas avançadas de gestão clínica.'
        },
        {
          id: 'tipos-usuario',
          title: 'Tipos de Usuário',
          content: 'Terapeutas/Profissionais: Acesso completo ao sistema; Pacientes: Acesso limitado ao monitor pessoal; Administradores: Gestão completa do sistema'
        }
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard Principal',
      icon: BarChart3,
      description: 'Central de controle e métricas da clínica',
      subsections: [
        {
          id: 'metricas-principais',
          title: 'Métricas Principais',
          content: 'O Dashboard oferece uma visão centralizada de todas as atividades da clínica: Total de Pacientes cadastrados, Agendamentos do dia, Receita mensal, Transações pendentes, Feedback pendente de pacientes.'
        },
        {
          id: 'graficos-relatorios',
          title: 'Gráficos e Relatórios',
          content: 'Taxa de Ocupação: Visualização mensal da ocupação dos horários; Evolução de Pacientes: Crescimento da base de pacientes; Evolução de Sessões: Acompanhamento das sessões realizadas.'
        }
      ]
    },
    {
      id: 'pacientes',
      title: 'Gestão de Pacientes',
      icon: Users,
      description: 'Cadastro e gerenciamento de pacientes',
      subsections: [
        {
          id: 'cadastro-pacientes',
          title: 'Cadastro de Pacientes',
          content: 'Informações coletadas: Dados pessoais (nome, email, telefone), Data de nascimento e gênero, Documentos (CPF/RG), Endereço completo, Contato de emergência, Redes sociais (opcional), Profissão.'
        },
        {
          id: 'funcionalidades-pacientes',
          title: 'Funcionalidades Disponíveis',
          content: 'Visualização: Lista completa de pacientes; Edição: Atualização de dados cadastrais; Histórico: Acesso ao histórico completo do paciente; Análises: Visualização de análises corporais realizadas; Agendamentos: Histórico de consultas.'
        }
      ]
    },
    {
      id: 'agenda',
      title: 'Sistema de Agenda',
      icon: Calendar,
      description: 'Agendamento e controle de consultas',
      subsections: [
        {
          id: 'funcionalidades-agenda',
          title: 'Funcionalidades da Agenda',
          content: 'Visualização Mensal/Semanal: Calendário interativo; Agendamento: Criação de novos compromissos; Tipos de Sessão: Diferentes modalidades de atendimento; Status de Agendamentos: Agendada, Confirmada, Concluída, Cancelada.'
        },
        {
          id: 'configuracoes-agenda',
          title: 'Configurações',
          content: 'Horários de Funcionamento: Configuração personalizada; Intervalo de Consultas: Duração padrão das sessões; Tempo de Buffer: Intervalo entre consultas; Horário de Almoço: Bloqueio automático.'
        }
      ]
    },
    {
      id: 'analise-corporal',
      title: 'Análise Corporal',
      icon: Activity,
      description: 'Sistema de análise com IA',
      subsections: [
        {
          id: 'tipos-analise',
          title: 'Tipos de Análise',
          content: 'Análise Detalhada: Interface completa para análise corporal, Upload de fotos do paciente, Avaliação por regiões corporais. Análise Simplificada: Interface otimizada para análises rápidas, Foco nos traços principais.'
        },
        {
          id: 'tracos-corporais',
          title: 'Sistema de Traços Corporais',
          content: 'Identificação Automática: IA analisa características físicas; Pontuação: Sistema de scores por traço; Cores e Categorias: Organização visual dos resultados; Observações: Campo para anotações do profissional.'
        }
      ]
    },
    {
      id: 'gestao-terapeutica',
      title: 'Gestão Terapêutica',
      icon: Stethoscope,
      description: 'Planos e acompanhamento terapêutico',
      subsections: [
        {
          id: 'planos-tratamento',
          title: 'Planos de Tratamento',
          content: 'Criação de Planos: Definição de objetivos terapêuticos; Ações Terapêuticas: Lista de atividades para o paciente; Frequência: Configuração de periodicidade das ações; Prioridades: Organização por importância.'
        },
        {
          id: 'feedback-interacao',
          title: 'Feedback e Interação',
          content: 'Mensagens: Comunicação entre terapeuta e paciente; Evidências: Upload de fotos das atividades realizadas; Avaliação de Dificuldade: Feedback do paciente sobre as tarefas; Estado Emocional: Registro do humor durante as atividades.'
        }
      ]
    },
    {
      id: 'prontuario',
      title: 'Prontuário Eletrônico',
      icon: FileText,
      description: 'Registro médico digital',
      subsections: [
        {
          id: 'estrutura-prontuario',
          title: 'Estrutura do Prontuário',
          content: 'Queixa Principal: Motivo da consulta; Anamnese: Histórico do paciente; Exame Físico: Dados estruturados do exame; Avaliação: Impressão diagnóstica; Plano Terapêutico: Condutas e orientações; Próximos Passos: Agendamentos e seguimento.'
        },
        {
          id: 'anexos-documentos',
          title: 'Anexos e Documentos',
          content: 'Upload de Arquivos: Imagens, PDFs, documentos; Organização: Sistema de categorização; Histórico: Versionamento de documentos.'
        }
      ]
    },
    {
      id: 'financeiro',
      title: 'Sistema Financeiro',
      icon: DollarSign,
      description: 'Controle financeiro da clínica',
      subsections: [
        {
          id: 'gestao-financeira',
          title: 'Gestão Financeira',
          content: 'Receitas: Registro de pagamentos recebidos; Despesas: Controle de gastos da clínica; Transações: Histórico financeiro completo; Status de Pagamento: Pago, Pendente, Atrasado, Cancelado.'
        },
        {
          id: 'plano-contas',
          title: 'Plano de Contas',
          content: 'Contas de Receita: Categorização de entradas; Contas de Despesa: Organização de gastos; Hierarquia: Sistema de contas e subcontas; Relatórios: Análise por categoria.'
        }
      ]
    },
    {
      id: 'videochamadas',
      title: 'Videochamadas e Telemedicina',
      icon: Video,
      description: 'Atendimento remoto integrado',
      subsections: [
        {
          id: 'tipos-videochamada',
          title: 'Tipos de Videochamada',
          content: 'Para Terapeutas: Chamada padrão, Integração Daily.co, Chamada com IA. Para Pacientes: Interface paciente, Chamada pública.'
        },
        {
          id: 'recursos-disponiveis',
          title: 'Recursos Disponíveis',
          content: 'Qualidade de Vídeo: Configurável (baixa, média, alta); Gravação: Opcional para as sessões; Transcrição: Automática via IA; Compartilhamento de Tela: Para apresentações; Chat: Mensagens durante a chamada.'
        }
      ]
    },
    {
      id: 'monitor-paciente',
      title: 'Monitor do Paciente',
      icon: Monitor,
      description: 'Interface exclusiva para pacientes',
      subsections: [
        {
          id: 'interface-paciente',
          title: 'Interface do Paciente',
          content: 'Funcionalidades Exclusivas: Visualização de planos de tratamento, Execução de ações terapêuticas, Upload de evidências, Feedback para o terapeuta, Histórico de atividades.'
        },
        {
          id: 'dashboard-pessoal',
          title: 'Dashboard Pessoal',
          content: 'Progresso: Visualização do andamento; Conquistas: Badges e reconhecimentos; Calendário: Atividades programadas; Comunicação: Chat com terapeuta.'
        }
      ]
    },
    {
      id: 'configuracoes',
      title: 'Configurações do Sistema',
      icon: Settings,
      description: 'Configurações gerais e personalizações',
      subsections: [
        {
          id: 'configuracoes-gerais',
          title: 'Configurações Gerais',
          content: 'Perfil do Usuário: Dados pessoais e profissionais; Configurações de Agenda: Horários e disponibilidade; Preferências: Notificações e interface; Integração: APIs e serviços externos.'
        },
        {
          id: 'gestao-usuarios',
          title: 'Gestão de Usuários',
          content: 'Criação de Perfis: Novos usuários do sistema; Permissões: Controle de acesso por função; Status: Ativação/desativação de contas.'
        }
      ]
    }
  ];

  const filteredSections = manualSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.subsections?.some(sub => 
      sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center space-x-2">
                <BookOpen className="w-6 h-6 md:w-8 md:h-8" />
                <span>Manual do Usuário</span>
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Guia completo da plataforma corphus.ai
              </p>
            </div>
          </div>
          <Badge variant="outline" className="hidden md:flex">
            v2.0
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 md:p-6 border-b bg-muted/30">
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Buscar no manual..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="space-y-4">
          {filteredSections.map((section) => (
            <Card key={section.id} className="overflow-hidden">
              <Collapsible
                open={openSections.includes(section.id)}
                onOpenChange={() => toggleSection(section.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <section.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-lg md:text-xl">{section.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {section.description}
                          </CardDescription>
                        </div>
                      </div>
                      {openSections.includes(section.id) ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {section.subsections ? (
                      <div className="space-y-4">
                        {section.subsections.map((subsection) => (
                          <div key={subsection.id} className="border-l-2 border-primary/20 pl-4">
                            <h4 className="font-semibold text-foreground mb-2">
                              {subsection.title}
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {subsection.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        Conteúdo detalhado desta seção estará disponível em breve.
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {filteredSections.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Nenhum resultado encontrado
            </h3>
            <p className="text-sm text-muted-foreground">
              Tente buscar por outros termos ou explore as seções disponíveis.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 p-6 bg-muted/30 rounded-lg text-center">
          <h3 className="font-semibold text-foreground mb-2">Precisa de mais ajuda?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Entre em contato com nossa equipe de suporte para assistência adicional.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-4 text-sm text-muted-foreground">
            <span>📧 suporte@corphus.ai</span>
            <span className="hidden md:inline">•</span>
            <span>📱 WhatsApp: (11) 9999-9999</span>
            <span className="hidden md:inline">•</span>
            <span>🌐 Status do Sistema</span>
          </div>
        </div>
      </div>
    </div>
  );
};