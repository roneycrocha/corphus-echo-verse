import React, { useState, useEffect } from 'react';
import { Brain, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export const AIPromptsSettings: React.FC = () => {
  const { settings, updateSettings, isLoading } = useSystemSettings();
  const [formData, setFormData] = useState({
    body_analysis_prompt: '',
    follow_up_prompt: '',
    therapy_conclusion_prompt: '',
    conversation_analysis_prompt: '',
    therapeutic_plan_prompt: '',
    action_plan_prompt: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (settings) {
      setFormData({
        body_analysis_prompt: settings.body_analysis_prompt || '',
        follow_up_prompt: settings.follow_up_prompt || '',
        therapy_conclusion_prompt: settings.therapy_conclusion_prompt || '',
        conversation_analysis_prompt: settings.conversation_analysis_prompt || '',
        therapeutic_plan_prompt: settings.therapeutic_plan_prompt || '',
        action_plan_prompt: settings.action_plan_prompt || ''
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const success = await updateSettings(formData);
      
      if (success) {
        toast({
          title: 'Sucesso',
          description: 'Prompts de IA atualizados com sucesso!',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar os prompts.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro interno do sistema.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando configurações...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-primary" />
          <span>Prompts de IA</span>
        </CardTitle>
        <CardDescription>
          Configure os prompts utilizados para geração de relatórios com Inteligência Artificial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="body_analysis_prompt">Prompt para Análise Corporal</Label>
            <Textarea
              id="body_analysis_prompt"
              value={formData.body_analysis_prompt}
              onChange={(e) => setFormData({
                ...formData,
                body_analysis_prompt: e.target.value
              })}
              placeholder="Digite o prompt para geração de relatórios de análise corporal..."
              rows={4}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Este prompt será usado para gerar relatórios de análise corporal dos pacientes
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="follow_up_prompt">Prompt para Relatório de Acompanhamento</Label>
            <Textarea
              id="follow_up_prompt"
              value={formData.follow_up_prompt}
              onChange={(e) => setFormData({
                ...formData,
                follow_up_prompt: e.target.value
              })}
              placeholder="Digite o prompt para geração de relatórios de acompanhamento..."
              rows={4}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Este prompt será usado para gerar relatórios de acompanhamento do progresso dos pacientes
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="therapy_conclusion_prompt">Prompt para Conclusão de Terapia</Label>
            <Textarea
              id="therapy_conclusion_prompt"
              value={formData.therapy_conclusion_prompt}
              onChange={(e) => setFormData({
                ...formData,
                therapy_conclusion_prompt: e.target.value
              })}
              placeholder="Digite o prompt para geração de relatórios de conclusão de terapia..."
              rows={4}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Este prompt será usado para gerar relatórios de conclusão ao final do tratamento
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="conversation_analysis_prompt">Prompt para Análise de Conversa</Label>
            <Textarea
              id="conversation_analysis_prompt"
              value={formData.conversation_analysis_prompt}
              onChange={(e) => setFormData({
                ...formData,
                conversation_analysis_prompt: e.target.value
              })}
              placeholder="Digite o prompt para geração de perguntas baseadas na análise de conversa..."
              rows={4}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Este prompt será usado para gerar perguntas estratégicas durante as sessões de atendimento com IA
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="therapeutic_plan_prompt">Prompt de Plano Terapêutico</Label>
            <Textarea
              id="therapeutic_plan_prompt"
              value={formData.therapeutic_plan_prompt}
              onChange={(e) => setFormData({
                ...formData,
                therapeutic_plan_prompt: e.target.value
              })}
              placeholder="Digite o prompt para geração de planos terapêuticos..."
              rows={4}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Este prompt será usado para gerar planos terapêuticos personalizados para pacientes
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="action_plan_prompt">Prompt de Plano de Ação</Label>
            <Textarea
              id="action_plan_prompt"
              value={formData.action_plan_prompt}
              onChange={(e) => setFormData({
                ...formData,
                action_plan_prompt: e.target.value
              })}
              placeholder="Digite o prompt para geração de planos de ação..."
              rows={4}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Este prompt será usado para gerar planos de ação detalhados com exercícios específicos
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Prompts'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};