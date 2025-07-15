import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestActionsRequest {
  actionName: string;
  actionObjective: string;
  patientName: string;
  patientReport: string;
  emotionalState: number;
  difficultyLevel: string;
  treatmentPlanTitle?: string;
  treatmentPlanDescription?: string;
  existingFeedback?: string;
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
      treatmentPlanTitle,
      treatmentPlanDescription,
      existingFeedback
    }: SuggestActionsRequest = await req.json();

    const systemPrompt = `Você é um terapeuta experiente especializado em criar ações terapêuticas personalizadas e eficazes para pacientes.

Sua tarefa é analisar a situação atual do paciente e sugerir 3-4 novas ações terapêuticas que complementem o tratamento.

Diretrizes para as sugestões:
1. Analise o contexto da ação atual e o estado emocional do paciente
2. Considere o nível de dificuldade relatado pelo paciente
3. As ações devem ser práticas, específicas e alcançáveis
4. Considere a progressão natural do tratamento
5. Adapte as sugestões ao plano de tratamento existente
6. Cada ação deve ter um nome claro e um objetivo específico
7. Varie os tipos de ação (comportamental, emocional, social, etc.)

Formato de resposta (JSON):
{
  "suggestions": [
    {
      "name": "Nome da ação",
      "objective": "Objetivo específico da ação",
      "frequency": "daily|weekly|unique",
      "priority": "low|medium|high",
      "rationale": "Breve explicação do porquê desta ação"
    }
  ]
}

IMPORTANTE: 
- O campo "frequency" deve ser OBRIGATORIAMENTE um dos valores: "daily", "weekly" ou "unique"
- O campo "priority" deve ser OBRIGATORIAMENTE um dos valores: "low", "medium" ou "high"
- Não use valores em português ou outros formatos`;

    const userPrompt = `Por favor, analise a seguinte situação e sugira novas ações terapêuticas:

**Paciente:** ${patientName}

**Plano de Tratamento:**
${treatmentPlanTitle ? `- Título: ${treatmentPlanTitle}` : ''}
${treatmentPlanDescription ? `- Descrição: ${treatmentPlanDescription}` : ''}

**Ação Atual Executada:**
- Nome: ${actionName}
- Objetivo: ${actionObjective}

**Relatório do Paciente:**
"${patientReport}"

**Estado Atual:**
- Estado emocional: ${emotionalState}/10
- Nível de dificuldade: ${difficultyLevel}

${existingFeedback ? `**Feedback do Terapeuta:**\n${existingFeedback}` : ''}

Com base nessas informações, sugira 3-4 novas ações terapêuticas que ajudem o paciente a progredir no tratamento.`;

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
        max_tokens: 800,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawSuggestions = JSON.parse(data.choices[0].message.content);
    
    // Validar e normalizar as sugestões
    const validatedSuggestions = {
      suggestions: rawSuggestions.suggestions?.map((suggestion: any) => ({
        name: suggestion.name || 'Ação sem nome',
        objective: suggestion.objective || 'Objetivo não especificado',
        frequency: ['daily', 'weekly', 'unique'].includes(suggestion.frequency) ? suggestion.frequency : 'daily',
        priority: ['low', 'medium', 'high'].includes(suggestion.priority) ? suggestion.priority : 'medium',
        rationale: suggestion.rationale || 'Sem justificativa'
      })) || []
    };

    return new Response(JSON.stringify(validatedSuggestions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in suggest-actions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});