import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedbackRequest {
  actionName: string;
  actionObjective: string;
  patientName: string;
  patientReport: string;
  emotionalState: number;
  difficultyLevel: string;
  executionDate: string;
  treatmentPlanTitle?: string;
  treatmentPlanDescription?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      actionName, 
      actionObjective, 
      patientName, 
      patientReport, 
      emotionalState, 
      difficultyLevel, 
      executionDate,
      treatmentPlanTitle,
      treatmentPlanDescription 
    }: FeedbackRequest = await req.json();

    const systemPrompt = `Você é um terapeuta experiente especializado em fornecer feedback construtivo e personalizado para pacientes em tratamento. 

Sua tarefa é analisar a execução de uma ação terapêutica pelo paciente e gerar um feedback profissional, empático e direcionado.

Diretrizes para o feedback:
1. Seja sempre positivo e encorajador, mesmo quando há pontos de melhoria
2. Reconheça o esforço e progresso do paciente
3. Forneça orientações específicas e práticas
4. Use linguagem acessível e empática
5. Considere o estado emocional relatado pelo paciente
6. Sugira próximos passos quando apropriado
7. Mantenha um tom profissional mas caloroso
8. O feedback deve ter entre 100-200 palavras

Estrutura sugerida:
- Reconhecimento do esforço
- Análise da execução
- Pontos positivos específicos
- Orientações para melhoria (se necessário)
- Encorajamento para continuidade`;

    const userPrompt = `Por favor, gere um feedback para a seguinte situação:

**Ação Terapêutica:** ${actionName}
**Objetivo da Ação:** ${actionObjective}
**Paciente:** ${patientName}
**Data de Execução:** ${executionDate}

**Plano de Tratamento:**
${treatmentPlanTitle ? `- Título: ${treatmentPlanTitle}` : ''}
${treatmentPlanDescription ? `- Descrição: ${treatmentPlanDescription}` : ''}

**Relatório do Paciente:**
"${patientReport}"

**Dados Adicionais:**
- Estado emocional relatado: ${emotionalState}/10
- Nível de dificuldade percebida: ${difficultyLevel}

Gere um feedback personalizado, construtivo e encorajador baseado nessas informações.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedFeedback = data.choices[0].message.content;

    return new Response(JSON.stringify({ feedback: generatedFeedback }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-feedback function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});