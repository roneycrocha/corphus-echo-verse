import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Save, 
  FileText, 
  Mail, 
  MessageCircle, 
  Loader2,
  Download,
  Send 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

interface TreatmentPlanActionsProps {
  treatmentPlan: {
    title: string;
    description: string;
    duration_weeks: number;
    primary_goals: string[];
    secondary_goals: string[];
    treatment_approach: string;
    key_interventions: string[];
    expected_outcomes: string[];
    monitoring_indicators: string[];
    risk_factors: string[];
    contraindications: string[];
    suggested_actions: Array<{
      name: string;
      objective: string;
      frequency: string;
      priority: 'low' | 'medium' | 'high';
      estimated_duration: string;
      instructions: string;
      expected_outcomes: string[];
    }>;
    follow_up_schedule: string;
    additional_recommendations: string[];
  };
  patientId?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  onPlanSaved?: (planId: string) => void;
}

export const TreatmentPlanActions: React.FC<TreatmentPlanActionsProps> = ({
  treatmentPlan,
  patientId,
  patientName,
  patientEmail,
  patientPhone,
  onPlanSaved
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const saveToProntuario = async () => {
    if (!patientId) {
      toast({
        title: "Erro",
        description: "ID do paciente não encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Criar plano terapêutico
      const { data: planData, error: planError } = await supabase
        .from('treatment_plans')
        .insert({
          patient_id: patientId,
          title: treatmentPlan.title,
          description: treatmentPlan.description,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + treatmentPlan.duration_weeks * 7 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0],
          goals: [...treatmentPlan.primary_goals, ...treatmentPlan.secondary_goals],
          status: 'ativo',
          observations: `Plano gerado pela IA com base em:\n- Abordagem: ${treatmentPlan.treatment_approach}\n- Acompanhamento: ${treatmentPlan.follow_up_schedule}`
        })
        .select()
        .single();

      if (planError) {
        throw planError;
      }

      // Criar ações terapêuticas sugeridas
      if (treatmentPlan.suggested_actions.length > 0) {
        const actionsToInsert = treatmentPlan.suggested_actions.map(action => ({
          treatment_plan_id: planData.id,
          name: action.name,
          objective: action.objective,
          frequency: action.frequency,
          priority: action.priority,
          start_date: new Date().toISOString().split('T')[0],
          observations: `${action.instructions}\n\nResultados esperados:\n${action.expected_outcomes.join('\n')}`
        }));

        const { error: actionsError } = await supabase
          .from('therapeutic_actions')
          .insert(actionsToInsert);

        if (actionsError) {
          console.error('Erro ao criar ações:', actionsError);
        }
      }

      toast({
        title: "Plano salvo com sucesso",
        description: `Plano terapêutico "${treatmentPlan.title}" foi salvo no prontuário`,
      });

      onPlanSaved?.(planData.id);

    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o plano no prontuário",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      let yPosition = 30;

      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('PLANO TERAPÊUTICO', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 20;
      
      // Informações do paciente
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Paciente: ${patientName}`, margin, yPosition);
      yPosition += 10;
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margin, yPosition);
      yPosition += 20;

      // Título do plano
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(treatmentPlan.title, margin, yPosition);
      yPosition += 15;

      // Descrição
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const descriptionLines = doc.splitTextToSize(treatmentPlan.description, pageWidth - 2 * margin);
      doc.text(descriptionLines, margin, yPosition);
      yPosition += descriptionLines.length * 5 + 10;

      // Duração
      doc.text(`Duração: ${treatmentPlan.duration_weeks} semanas`, margin, yPosition);
      yPosition += 15;

      // Objetivos Principais
      if (treatmentPlan.primary_goals.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('OBJETIVOS PRINCIPAIS:', margin, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        treatmentPlan.primary_goals.forEach(goal => {
          const goalLines = doc.splitTextToSize(`• ${goal}`, pageWidth - 2 * margin - 10);
          doc.text(goalLines, margin + 5, yPosition);
          yPosition += goalLines.length * 5;
        });
        yPosition += 5;
      }

      // Abordagem Terapêutica
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ABORDAGEM TERAPÊUTICA:', margin, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const approachLines = doc.splitTextToSize(treatmentPlan.treatment_approach, pageWidth - 2 * margin);
      doc.text(approachLines, margin, yPosition);
      yPosition += approachLines.length * 5 + 10;

      // Ações Terapêuticas
      if (treatmentPlan.suggested_actions.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('AÇÕES TERAPÊUTICAS:', margin, yPosition);
        yPosition += 10;

        treatmentPlan.suggested_actions.forEach((action, index) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 30;
          }

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}. ${action.name}`, margin, yPosition);
          yPosition += 8;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Objetivo: ${action.objective}`, margin + 5, yPosition);
          yPosition += 6;
          doc.text(`Frequência: ${action.frequency}`, margin + 5, yPosition);
          yPosition += 6;
          doc.text(`Prioridade: ${action.priority === 'high' ? 'Alta' : action.priority === 'medium' ? 'Média' : 'Baixa'}`, margin + 5, yPosition);
          yPosition += 8;

          const instructionLines = doc.splitTextToSize(action.instructions, pageWidth - 2 * margin - 10);
          doc.text(instructionLines, margin + 5, yPosition);
          yPosition += instructionLines.length * 5 + 10;
        });
      }

      // Resultados Esperados
      if (treatmentPlan.expected_outcomes.length > 0) {
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 30;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('RESULTADOS ESPERADOS:', margin, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        treatmentPlan.expected_outcomes.forEach(outcome => {
          const outcomeLines = doc.splitTextToSize(`• ${outcome}`, pageWidth - 2 * margin - 10);
          doc.text(outcomeLines, margin + 5, yPosition);
          yPosition += outcomeLines.length * 5;
        });
      }

      // Salvar PDF
      const fileName = `plano_terapeutico_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF gerado com sucesso",
        description: "O plano terapêutico foi exportado em PDF",
      });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const sendByEmail = async () => {
    if (!patientEmail) {
      toast({
        title: "Email não encontrado",
        description: "O paciente não possui email cadastrado",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      // Preparar conteúdo do email
      const emailContent = `
        <h2>Plano Terapêutico - ${treatmentPlan.title}</h2>
        <p><strong>Paciente:</strong> ${patientName}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        
        <h3>Descrição</h3>
        <p>${treatmentPlan.description}</p>
        
        <h3>Duração</h3>
        <p>${treatmentPlan.duration_weeks} semanas</p>
        
        <h3>Objetivos Principais</h3>
        <ul>
          ${treatmentPlan.primary_goals.map(goal => `<li>${goal}</li>`).join('')}
        </ul>
        
        <h3>Abordagem Terapêutica</h3>
        <p>${treatmentPlan.treatment_approach}</p>
        
        <h3>Ações Terapêuticas</h3>
        ${treatmentPlan.suggested_actions.map((action, index) => `
          <div style="margin-bottom: 15px;">
            <h4>${index + 1}. ${action.name}</h4>
            <p><strong>Objetivo:</strong> ${action.objective}</p>
            <p><strong>Frequência:</strong> ${action.frequency}</p>
            <p><strong>Instruções:</strong> ${action.instructions}</p>
          </div>
        `).join('')}
        
        <h3>Resultados Esperados</h3>
        <ul>
          ${treatmentPlan.expected_outcomes.map(outcome => `<li>${outcome}</li>`).join('')}
        </ul>
      `;

      const { error } = await supabase.functions.invoke('send-treatment-plan-email', {
        body: {
          to: patientEmail,
          patientName,
          planTitle: treatmentPlan.title,
          content: emailContent
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email enviado com sucesso",
        description: `Plano terapêutico enviado para ${patientEmail}`,
      });

    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const sendByWhatsApp = async () => {
    if (!patientPhone) {
      toast({
        title: "WhatsApp não encontrado",
        description: "O paciente não possui WhatsApp cadastrado",
        variant: "destructive",
      });
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      // Preparar mensagem do WhatsApp
      const message = `
🏥 *PLANO TERAPÊUTICO*

👤 *Paciente:* ${patientName}
📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}

📋 *${treatmentPlan.title}*

📝 *Descrição:*
${treatmentPlan.description}

⏱️ *Duração:* ${treatmentPlan.duration_weeks} semanas

🎯 *Objetivos Principais:*
${treatmentPlan.primary_goals.map(goal => `• ${goal}`).join('\n')}

🔧 *Abordagem Terapêutica:*
${treatmentPlan.treatment_approach}

📋 *Ações Terapêuticas:*
${treatmentPlan.suggested_actions.map((action, index) => `
${index + 1}. *${action.name}*
   Objetivo: ${action.objective}
   Frequência: ${action.frequency}
   Instruções: ${action.instructions}
`).join('\n')}

✅ *Resultados Esperados:*
${treatmentPlan.expected_outcomes.map(outcome => `• ${outcome}`).join('\n')}

---
Monitor Terapêutico
      `.trim();

      // Criar link do WhatsApp
      const phoneNumber = patientPhone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
      
      // Abrir WhatsApp
      window.open(whatsappUrl, '_blank');

      toast({
        title: "WhatsApp aberto",
        description: "O plano foi preparado para envio via WhatsApp",
      });

    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o WhatsApp",
        variant: "destructive",
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ações do Plano Terapêutico</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            onClick={saveToProntuario}
            disabled={isSaving || !patientId}
            className="flex flex-col h-auto py-4 space-y-2"
            variant="default"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span className="text-xs text-center">Salvar no Prontuário</span>
          </Button>

          <Button
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            className="flex flex-col h-auto py-4 space-y-2"
            variant="outline"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            <span className="text-xs text-center">Gerar PDF</span>
          </Button>

          <Button
            onClick={sendByEmail}
            disabled={isSendingEmail || !patientEmail}
            className="flex flex-col h-auto py-4 space-y-2"
            variant="outline"
          >
            {isSendingEmail ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mail className="w-5 h-5" />
            )}
            <span className="text-xs text-center">Enviar por Email</span>
          </Button>

          <Button
            onClick={sendByWhatsApp}
            disabled={isSendingWhatsApp || !patientPhone}
            className="flex flex-col h-auto py-4 space-y-2"
            variant="outline"
          >
            {isSendingWhatsApp ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <MessageCircle className="w-5 h-5" />
            )}
            <span className="text-xs text-center">Enviar WhatsApp</span>
          </Button>
        </div>

        <div className="mt-4 text-xs text-muted-foreground space-y-1">
          {!patientId && <p>• Salvar no prontuário: ID do paciente necessário</p>}
          {!patientEmail && <p>• Enviar por email: Email do paciente necessário</p>}
          {!patientPhone && <p>• Enviar WhatsApp: WhatsApp do paciente necessário</p>}
        </div>
      </CardContent>
    </Card>
  );
};