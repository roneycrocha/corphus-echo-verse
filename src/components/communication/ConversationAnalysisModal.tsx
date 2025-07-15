import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquareQuote,
  Brain,
  User,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserAIAgent } from '@/hooks/useUserAIAgent';

interface Question {
  question: string;
  reason: string;
  trait_relevance?: string;
}

interface AnalysisResult {
  questions: Question[];
  patient_traits_summary: string;
  conversation_summary: string;
  raw_response?: string;
}

interface ConversationAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  transcription: string;
}

export const ConversationAnalysisModal: React.FC<ConversationAnalysisModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  transcription
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const { toast } = useToast();
  const { getSelectedAgentId } = useUserAIAgent();

  // Carregar análise salva quando o modal abrir
  useEffect(() => {
    if (isOpen && patientId) {
      loadSavedAnalysis();
    }
  }, [isOpen, patientId]);

  const loadSavedAnalysis = async () => {
    setIsLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from('conversation_analyses')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const questions = Array.isArray(data.questions) 
          ? (data.questions as unknown as Question[]) 
          : [];
        
        setAnalysisResult({
          questions,
          patient_traits_summary: data.patient_traits_summary || '',
          conversation_summary: data.conversation_summary || '',
          raw_response: data.raw_response || ''
        });
        setSavedAnalysisId(data.id);
        setCurrentQuestionIndex(0);
        
        // Expandir todas as perguntas por padrão
        if (questions.length > 0) {
          const allIndexes = new Set<number>(questions.map((_, index) => index));
          setExpandedQuestions(allIndexes);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar análise salva:', error);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const saveAnalysis = async (analysisData: AnalysisResult) => {
    try {
      const { data, error } = await supabase.functions.invoke('save-conversation-analysis', {
        body: {
          patientId,
          analysisData,
          sessionType: 'ai_assistance'
        }
      });

      if (error) {
        throw error;
      }

      setSavedAnalysisId(data.analysisId);
      console.log('Análise salva com sucesso:', data.analysisId);
    } catch (error: any) {
      console.error('Erro ao salvar análise:', error);
      toast({
        title: "Aviso",
        description: "Análise gerada mas não foi possível salvar",
        variant: "destructive",
      });
    }
  };

  const openResultInNewTab = (analysisData: AnalysisResult) => {
    const resultHtml = generateResultHTML(analysisData);
    const newWindow = window.open('about:blank', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(resultHtml);
      newWindow.document.close();
      newWindow.focus();
    } else {
      console.warn('Popup bloqueado pelo navegador');
    }
  };

  const generateResultHTML = (data: AnalysisResult) => {
    const questionsHTML = data.questions?.map((question, index) => `
      <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: white;">
        <div style="margin-bottom: 8px;">
          <span style="background: #f3e8ff; color: #7c3aed; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
            Pergunta ${index + 1}
          </span>
        </div>
        <h4 style="font-weight: 600; color: #7c2d92; margin-bottom: 12px; font-size: 16px; line-height: 1.5;">
          "${question.question || 'Pergunta não disponível'}"
        </h4>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
          <div style="font-size: 14px; color: #374151;">
            <span style="font-weight: 500; color: #111827;">💡 Objetivo:</span> ${question.reason || 'Motivo não especificado'}
          </div>
        </div>
        ${question.trait_relevance ? `
          <div style="background: #eff6ff; padding: 12px; border-radius: 6px;">
            <div style="font-size: 14px; color: #1e40af;">
              <span style="font-weight: 500; color: #1e3a8a;">🎯 Relação com traços:</span> ${question.trait_relevance}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('') || '';

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Análise da Conversa - ${patientName}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 24px;
            background: #f8fafc;
            color: #334155;
            line-height: 1.6;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px;
            text-align: center;
          }
          .content {
            padding: 24px;
          }
          .section {
            margin-bottom: 32px;
          }
          .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1e293b;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .questions-section {
            background: #fdf4ff;
            border: 1px solid #e9d5ff;
            border-radius: 8px;
            padding: 20px;
          }
          .questions-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
          }
          .badge {
            background: #f3e8ff;
            color: #7c3aed;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
            border: 1px solid #e9d5ff;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">📋 Análise da Conversa</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Paciente: ${patientName}</p>
          </div>
          
          <div class="content">
            ${data.patient_traits_summary ? `
              <div class="section">
                <h2 class="section-title">👤 Traços do Paciente</h2>
                <div class="card">
                  <p style="margin: 0; white-space: pre-line;">${data.patient_traits_summary}</p>
                </div>
              </div>
            ` : ''}
            
            ${data.conversation_summary ? `
              <div class="section">
                <h2 class="section-title">💬 Resumo da Conversa</h2>
                <div class="card">
                  <p style="margin: 0;">${data.conversation_summary}</p>
                </div>
              </div>
            ` : ''}
            
            <div class="section">
              <div class="questions-section">
                <div class="questions-header">
                  <h2 style="margin: 0; font-size: 18px; color: #7c3aed;">💡 Perguntas Estratégicas para o Atendimento</h2>
                  <span class="badge">${data.questions?.length || 0} perguntas</span>
                </div>
                <p style="margin: 8px 0 20px 0; color: #6b7280; font-size: 14px;">
                  Use estas perguntas durante o atendimento para obter insights mais profundos
                </p>
                
                ${questionsHTML}
                
                <div style="margin-top: 20px; padding: 12px; background: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px;">
                  <p style="margin: 0; font-size: 14px; color: #92400e;">
                    <span style="font-weight: 500;">💬 Dica:</span> Estas perguntas foram personalizadas com base nos traços de personalidade e no contexto da conversa atual.
                  </p>
                </div>
              </div>
            </div>
            
            ${data.raw_response ? `
              <div class="section">
                <h2 class="section-title">📄 Análise Completa</h2>
                <div class="card">
                  <pre style="white-space: pre-line; margin: 0; font-family: inherit; background: #f1f5f9; padding: 12px; border-radius: 4px;">${data.raw_response}</pre>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const analyzeConversation = async () => {
    if (!transcription?.trim()) {
      toast({
        title: "Aviso",
        description: "Não há transcrição disponível para análise",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('conversation-analysis', {
        body: {
          transcription,
          patientId,
          assistantId: getSelectedAgentId()
        }
      });

      if (error) {
        throw error;
      }

      console.log('Resposta recebida da análise:', data);

      // Verificar se a resposta tem a estrutura esperada
      if (data && typeof data === 'object') {
        // Se tem questions, é uma resposta estruturada
        if (data.questions && Array.isArray(data.questions)) {
          // Expandir todas as perguntas por padrão (reação esperada)
          const allIndexes = new Set<number>(data.questions.map((_: any, index: number) => index));
          setExpandedQuestions(allIndexes);
          console.log('Expandindo perguntas:', allIndexes);
          
          setAnalysisResult(data);
          setCurrentQuestionIndex(0);
          toast({
            title: "Análise concluída",
            description: `${data.questions.length} perguntas estratégicas geradas`,
          });
          
          // Salvar análise automaticamente
          await saveAnalysis(data);
          
          // Abrir resultado em nova aba
          console.log('Tentando abrir nova aba...');
          setTimeout(() => {
            openResultInNewTab(data);
          }, 500);
        } else if (data.raw_response) {
          // Tentar extrair JSON do raw_response se disponível
          console.log('Tentando extrair JSON do raw_response...');
          try {
            let cleanContent = data.raw_response.trim();
            
            // Remove markdown json blocks if present
            if (cleanContent.startsWith('```json')) {
              cleanContent = cleanContent.replace(/^```json\s*\n?/, '').replace(/\n?\s*```$/, '');
            } else if (cleanContent.startsWith('```')) {
              cleanContent = cleanContent.replace(/^```\s*\n?/, '').replace(/\n?\s*```$/, '');
            }
            
            // Try to find JSON content if there's extra text
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              cleanContent = jsonMatch[0];
            }
            
            const parsedData = JSON.parse(cleanContent.trim());
            
            if (parsedData.questions && Array.isArray(parsedData.questions)) {
              setAnalysisResult(parsedData);
              // Expandir todas as perguntas por padrão (reação esperada)
              setExpandedQuestions(new Set(parsedData.questions.map((_, index) => index)));
              toast({
                title: "Análise concluída",
                description: `${parsedData.questions.length} perguntas estratégicas geradas`,
              });
              // Abrir resultado em nova aba
              openResultInNewTab(parsedData);
              return;
            }
          } catch (parseError) {
            console.warn('Erro ao extrair JSON do raw_response:', parseError);
          }
          
          // Se não conseguiu parsear, usa o fallback
          setAnalysisResult({
            questions: [
              {
                question: "Análise gerada em formato não estruturado",
                reason: "A IA retornou uma resposta em formato de texto livre",
                trait_relevance: ""
              }
            ],
            patient_traits_summary: data.patient_traits_summary || "Análise não estruturada",
            conversation_summary: data.conversation_summary || "Veja o conteúdo completo abaixo",
            raw_response: data.raw_response
          });
          toast({
            title: "Análise parcial",
            description: "Análise gerada mas em formato não estruturado",
            variant: "destructive",
          });
        } else {
          // Se não tem questions nem raw_response, pode ser uma resposta em texto
          console.warn('Resposta sem estrutura esperada:', data);
          setAnalysisResult({
            questions: [
              {
                question: "Análise gerada em formato não estruturado",
                reason: "A IA retornou uma resposta em formato de texto livre",
                trait_relevance: ""
              }
            ],
            patient_traits_summary: "Análise não estruturada",
            conversation_summary: "Veja o conteúdo completo abaixo",
            raw_response: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
          });
          toast({
            title: "Análise parcial",
            description: "Análise gerada mas em formato não estruturado",
            variant: "destructive",
          });
        }
      } else {
        throw new Error('Resposta inválida da análise');
      }

    } catch (error: any) {
      console.error('Erro na análise:', error);
      toast({
        title: "Erro na análise",
        description: error.message || "Não foi possível analisar a conversa",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleQuestionExpansion = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const handleClose = () => {
    setAnalysisResult(null);
    setExpandedQuestions(new Set());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquareQuote className="w-5 h-5 text-blue-600" />
            <span>Análise da Conversa - {patientName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!analysisResult ? (
            <div className="text-center py-8">
              {isLoadingSaved ? (
                <>
                  <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600/50 animate-spin" />
                  <h3 className="text-lg font-medium mb-2">Carregando Análises Salvas</h3>
                  <p className="text-muted-foreground">
                    Verificando se há análises anteriores...
                  </p>
                </>
              ) : (
                <>
                  <Brain className="w-16 h-16 mx-auto mb-4 text-blue-600/50" />
                  <h3 className="text-lg font-medium mb-2">Análise Inteligente da Conversa</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Gere perguntas estratégicas baseadas na transcrição do atendimento e nos traços de personalidade do paciente
                  </p>
                  
                  <Button 
                    onClick={analyzeConversation}
                    disabled={isAnalyzing || !transcription?.trim()}
                    size="lg"
                    className="w-auto px-8"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analisando conversa...
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5 mr-2" />
                        Analisar Conversa
                      </>
                    )}
                  </Button>
                  
                  {!transcription?.trim() && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Nenhuma transcrição disponível
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-6 pr-4">
                {/* Resumo dos Traços */}
                {analysisResult.patient_traits_summary && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <User className="w-4 h-4 text-purple-600" />
                        <span>Traços do Paciente</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {analysisResult.patient_traits_summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Resumo da Conversa */}
                {analysisResult.conversation_summary && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <MessageSquareQuote className="w-4 h-4 text-blue-600" />
                        <span>Resumo da Conversa</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {analysisResult.conversation_summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Perguntas Estratégicas - Carousel */}
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold">Perguntas Estratégicas</span>
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                          {analysisResult.questions?.length || 0} perguntas
                        </Badge>
                      </div>
                      
                      {/* Controles do Carousel + Botão Reanalise */}
                      <div className="flex items-center space-x-2">
                        {analysisResult.questions && analysisResult.questions.length > 1 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                              disabled={currentQuestionIndex === 0}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            
                            <span className="text-xs text-muted-foreground px-2">
                              {currentQuestionIndex + 1} de {analysisResult.questions.length}
                            </span>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentQuestionIndex(Math.min(analysisResult.questions.length - 1, currentQuestionIndex + 1))}
                              disabled={currentQuestionIndex === analysisResult.questions.length - 1}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        {/* Botão de Reanalise */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={analyzeConversation}
                          disabled={isAnalyzing || !transcription?.trim()}
                          className="h-8 px-3"
                          title="Gerar nova análise da conversa"
                        >
                          {isAnalyzing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use estas perguntas durante o atendimento para obter insights mais profundos
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysisResult.questions && analysisResult.questions.length > 0 ? (
                      <>
                        {/* Pergunta Atual */}
                        {(() => {
                          const question = analysisResult.questions[currentQuestionIndex];
                          if (!question) return null;
                          
                          return (
                            <div className="border border-purple-200 rounded-lg p-4 bg-white shadow-sm">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Badge variant="outline" className="bg-purple-100 text-purple-700 text-xs">
                                      Pergunta {currentQuestionIndex + 1}
                                    </Badge>
                                  </div>
                                  <h4 className="font-semibold text-base leading-relaxed text-purple-900 mb-3">
                                    "{question.question || 'Pergunta não disponível'}"
                                  </h4>
                                  <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-sm text-gray-700">
                                      <span className="font-medium text-gray-900">💡 Objetivo:</span> {question.reason || 'Motivo não especificado'}
                                    </div>
                                  </div>
                                </div>
                                {question.trait_relevance && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleQuestionExpansion(currentQuestionIndex)}
                                    className="ml-3 h-8 w-8 p-0 text-purple-600 hover:bg-purple-100"
                                  >
                                    {expandedQuestions.has(currentQuestionIndex) ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                              
                              {question.trait_relevance && expandedQuestions.has(currentQuestionIndex) && (
                                <>
                                  <Separator className="my-3" />
                                  <div className="bg-blue-50 p-3 rounded-lg">
                                    <div className="text-sm text-blue-700">
                                      <span className="font-medium text-blue-900">🎯 Relação com traços:</span> {question.trait_relevance}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                        
                        {/* Indicadores de navegação (dots) */}
                        {analysisResult.questions.length > 1 && (
                          <div className="flex justify-center space-x-2 mt-4">
                            {analysisResult.questions.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentQuestionIndex(index)}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                  index === currentQuestionIndex 
                                    ? 'bg-purple-600' 
                                    : 'bg-purple-300 hover:bg-purple-400'
                                }`}
                                title={`Ir para pergunta ${index + 1}`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma pergunta foi gerada</p>
                      </div>
                    )}
                    
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <span className="font-medium">💬 Dica:</span> Estas perguntas foram personalizadas com base nos traços de personalidade e no contexto da conversa atual.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Resposta bruta (caso haja erro no parsing) */}
                {analysisResult.raw_response && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Análise Completa</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 p-3 rounded-lg">
                        {analysisResult.raw_response}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            {analysisResult && (
              <>
                <Button 
                  onClick={() => openResultInNewTab(analysisResult)}
                  variant="secondary"
                >
                  Abrir em Nova Aba
                </Button>
                <Button 
                  onClick={analyzeConversation}
                  disabled={isAnalyzing || !transcription?.trim()}
                  variant="outline"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Nova Análise
                    </>
                  )}
                </Button>
              </>
            )}
            <Button onClick={handleClose} variant="outline">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};