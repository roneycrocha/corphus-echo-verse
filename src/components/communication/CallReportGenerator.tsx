import React, { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useResourceCosts } from '@/hooks/useResourceCosts';

interface CallReportGeneratorProps {
  patientName: string;
  callDuration: number;
  transcription?: string;
  onReportGenerated: (report: string) => void;
}

export const CallReportGenerator: React.FC<CallReportGeneratorProps> = ({
  patientName,
  callDuration,
  transcription = '',
  onReportGenerated,
}) => {
  const { consumeCreditsForResource } = useResourceCosts();
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState('');

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}min ${remainingSeconds}s`;
  };

  const generateReport = async () => {
    // Verificar se há créditos suficientes antes de gerar o relatório
    const canProceed = await consumeCreditsForResource(
      'report_generation', 
      `Geração de relatório da videochamada com ${patientName}`
    );
    
    if (!canProceed) {
      toast.error('Não foi possível gerar o relatório devido a créditos insuficientes');
      return;
    }

    setIsGenerating(true);
    
    try {
      const prompt = `
        Gere um relatório de conclusão da consulta médica por videochamada com as seguintes informações:
        
        Paciente: ${patientName}
        Duração da chamada: ${formatDuration(callDuration)}
        Data: ${new Date().toLocaleDateString('pt-BR')}
        Horário: ${new Date().toLocaleTimeString('pt-BR')}
        
        Notas do médico: ${notes}
        
        ${transcription ? `Transcrição da consulta: ${transcription}` : ''}
        
        Por favor, estruture o relatório de forma profissional incluindo:
        - Resumo da consulta
        - Principais pontos discutidos
        - Recomendações
        - Próximos passos (se mencionados)
        
        Use um tom profissional e médico.
      `;

      const response = await fetch('https://jqystivdecrjuulxyxet.supabase.co/functions/v1/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxeXN0aXZkZWNyanV1bHh5eGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNzk0NDQsImV4cCI6MjA2NzY1NTQ0NH0.k5yyzWEhK17narXB6VSA6rTBMOP929lQcWqr21Z8C2g`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar relatório');
      }

      const { generatedText } = await response.json();
      setGeneratedReport(generatedText);
      onReportGenerated(generatedText);
      toast.success('Relatório gerado com sucesso');
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!generatedReport) {
      toast.error('Nenhum relatório disponível');
      return;
    }

    const blob = new Blob([generatedReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${patientName}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Download do relatório iniciado');
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Relatório da Consulta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Paciente:</strong> {patientName}
          </div>
          <div>
            <strong>Duração:</strong> {formatDuration(callDuration)}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas da Consulta</Label>
          <Textarea
            id="notes"
            placeholder="Adicione suas observações sobre a consulta..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex space-x-2">
          <Button 
            onClick={generateReport} 
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
          
          {generatedReport && (
            <Button 
              onClick={downloadReport} 
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>

        {generatedReport && (
          <div className="mt-4">
            <Label>Relatório Gerado</Label>
            <div className="mt-2 p-3 bg-muted rounded-md text-sm max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{generatedReport}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};