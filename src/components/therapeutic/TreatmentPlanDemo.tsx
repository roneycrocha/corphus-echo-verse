import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TreatmentPlanActions } from './TreatmentPlanActions';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Target } from 'lucide-react';

// Exemplo de dados de um plano terapêutico gerado pela IA
const sampleTreatmentPlan = {
  title: "Programa de Reabilitação Postural e Fortalecimento",
  description: "Plano terapêutico focado na correção de desequilíbrios posturais e fortalecimento muscular, baseado na avaliação de dor lombar crônica e compensações posturais identificadas.",
  duration_weeks: 12,
  primary_goals: [
    "Reduzir dor lombar em 70%",
    "Melhorar alinhamento postural",
    "Aumentar força do core em 40%",
    "Restaurar amplitude de movimento completa"
  ],
  secondary_goals: [
    "Melhorar qualidade do sono",
    "Reduzir uso de analgésicos",
    "Aumentar capacidade funcional"
  ],
  treatment_approach: "Abordagem multimodal combinando técnicas de terapia manual, exercícios de estabilização do core, correção postural e educação em saúde. O tratamento será progressivo, iniciando com alívio da dor e evoluindo para fortalecimento e prevenção de recidivas.",
  key_interventions: [
    "Terapia manual para mobilização vertebral",
    "Exercícios de estabilização lombo-pélvica",
    "Correção de padrões de movimento",
    "Fortalecimento muscular progressivo"
  ],
  expected_outcomes: [
    "Redução significativa da dor lombar",
    "Melhora da postura dinâmica e estática",
    "Aumento da resistência muscular",
    "Maior consciência corporal",
    "Prevenção de recidivas"
  ],
  monitoring_indicators: [
    "Escala Visual Analógica da Dor (EVA)",
    "Teste de flexibilidade lombar",
    "Avaliação postural fotográfica",
    "Teste de resistência do core"
  ],
  risk_factors: [
    "Histórico de dor crônica",
    "Sedentarismo prolongado",
    "Sobrepeso",
    "Stress ocupacional"
  ],
  contraindications: [
    "Hérnia discal aguda",
    "Instabilidade vertebral",
    "Fraturas não consolidadas",
    "Infecções ativas"
  ],
  suggested_actions: [
    {
      name: "Exercícios de Mobilização Lombar",
      objective: "Restaurar mobilidade articular e reduzir rigidez",
      frequency: "2x por dia, 15 minutos",
      priority: "high" as const,
      estimated_duration: "4 semanas",
      instructions: "Realizar movimentos suaves de flexão, extensão e rotação lombar em decúbito dorsal. Evitar movimentos bruscos e respeitar limites de dor.",
      expected_outcomes: [
        "Aumento da amplitude de movimento",
        "Redução da rigidez matinal",
        "Melhora da circulação local"
      ]
    },
    {
      name: "Fortalecimento do Core",
      objective: "Desenvolver estabilidade lombo-pélvica e suporte muscular",
      frequency: "3x por semana, 30 minutos",
      priority: "high" as const,
      estimated_duration: "8 semanas",
      instructions: "Progressão de exercícios: prancha isométrica (30s-2min), dead bug, bird dog, ponte glútea. Foco na ativação do transverso abdominal.",
      expected_outcomes: [
        "Aumento da força do core",
        "Melhora da estabilidade postural",
        "Redução de compensações"
      ]
    },
    {
      name: "Correção Postural",
      objective: "Reeducar padrões posturais e movimentais",
      frequency: "Diário, durante AVD",
      priority: "medium" as const,
      estimated_duration: "12 semanas",
      instructions: "Exercícios de consciência corporal, uso de espelho para feedback visual, correção de postura sentada e em pé. Pausas a cada hora de trabalho.",
      expected_outcomes: [
        "Melhora do alinhamento postural",
        "Maior consciência corporal",
        "Redução de tensões musculares"
      ]
    },
    {
      name: "Educação em Saúde",
      objective: "Capacitar o paciente para autogestão da condição",
      frequency: "1x por semana, 20 minutos",
      priority: "medium" as const,
      estimated_duration: "6 semanas",
      instructions: "Sessões educativas sobre anatomia da coluna, fatores de risco, ergonomia, técnicas de relaxamento e estratégias de prevenção.",
      expected_outcomes: [
        "Maior compreensão da condição",
        "Adesão ao tratamento",
        "Prevenção de recidivas"
      ]
    }
  ],
  follow_up_schedule: "Reavaliações semanais nas primeiras 4 semanas, quinzenais até 8ª semana, mensal até completar 12 semanas",
  additional_recommendations: [
    "Manter atividade física regular após alta",
    "Ergonomia no ambiente de trabalho",
    "Controle de peso corporal",
    "Técnicas de manejo de stress",
    "Retorno gradual às atividades esportivas"
  ]
};

interface TreatmentPlanDemoProps {
  patientId?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
}

export const TreatmentPlanDemo: React.FC<TreatmentPlanDemoProps> = ({
  patientId = "demo-patient-id",
  patientName = "Maria Silva",
  patientEmail = "maria.silva@email.com",
  patientPhone = "11987654321"
}) => {
  const [showActions, setShowActions] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Média';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Demonstração - Plano Terapêutico Gerado pela IA</h1>
        <p className="text-muted-foreground">
          Exemplo de plano terapêutico com opções de salvar, gerar PDF e enviar
        </p>
      </div>

      {/* Informações do Paciente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Paciente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <strong>Nome:</strong> {patientName}
          </div>
          <div>
            <strong>Email:</strong> {patientEmail}
          </div>
          <div>
            <strong>WhatsApp:</strong> {patientPhone}
          </div>
          <div>
            <strong>ID:</strong> {patientId}
          </div>
        </CardContent>
      </Card>

      {/* Plano Terapêutico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>{sampleTreatmentPlan.title}</span>
          </CardTitle>
          <p className="text-muted-foreground">{sampleTreatmentPlan.description}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Duração: {sampleTreatmentPlan.duration_weeks} semanas</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{sampleTreatmentPlan.follow_up_schedule}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Objetivos Principais */}
            <div>
              <h4 className="font-medium mb-2">Objetivos Principais</h4>
              <div className="flex flex-wrap gap-1">
                {sampleTreatmentPlan.primary_goals.map((goal, index) => (
                  <Badge key={index} variant="default" className="text-xs">
                    {goal}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Ações Terapêuticas */}
            <div>
              <h4 className="font-medium mb-2">Ações Terapêuticas Sugeridas</h4>
              <div className="space-y-3">
                {sampleTreatmentPlan.suggested_actions.slice(0, 2).map((action, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <h5 className="font-medium">{action.name}</h5>
                      <Badge className={getPriorityColor(action.priority)}>
                        {getPriorityLabel(action.priority)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{action.objective}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Frequência: {action.frequency}</span>
                      <span>Duração: {action.estimated_duration}</span>
                    </div>
                  </div>
                ))}
                {sampleTreatmentPlan.suggested_actions.length > 2 && (
                  <p className="text-sm text-muted-foreground">
                    +{sampleTreatmentPlan.suggested_actions.length - 2} ações adicionais...
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão para mostrar ações */}
      <div className="text-center">
        <Button 
          onClick={() => setShowActions(!showActions)}
          size="lg"
          className="w-full max-w-md"
        >
          {showActions ? 'Ocultar' : 'Mostrar'} Opções de Ação
        </Button>
      </div>

      {/* Componente de Ações */}
      {showActions && (
        <TreatmentPlanActions
          treatmentPlan={sampleTreatmentPlan}
          patientId={patientId}
          patientName={patientName}
          patientEmail={patientEmail}
          patientPhone={patientPhone}
          onPlanSaved={(planId) => {
            console.log('Plano salvo com ID:', planId);
          }}
        />
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Esta é uma demonstração das funcionalidades de ação do plano terapêutico.
          <br />
          Em produção, os dados seriam carregados automaticamente após a geração pela IA.
        </p>
      </div>
    </div>
  );
};