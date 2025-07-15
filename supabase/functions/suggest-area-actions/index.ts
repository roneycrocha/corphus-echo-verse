import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TreatmentArea {
  title: string;
  description: string;
  objectives: string[];
}

interface SuggestAreaActionsRequest {
  patientId: string;
  patientName: string;
  treatmentArea: TreatmentArea;
  transcription?: string;
  assistantId?: string;
}

interface SuggestedAction {
  name: string;
  objective: string;
  frequency: string;
  priority: 'low' | 'medium' | 'high';
  start_date: string;
  end_date?: string;
  instructions: string;
  expected_outcomes: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      patientId,
      patientName,
      treatmentArea,
      transcription,
      assistantId
    }: SuggestAreaActionsRequest = await req.json();

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar o prompt de plano de ação das configurações
    console.log('Buscando prompt de ações terapêuticas das configurações...');
    const { data: systemSettings } = await supabase
      .from('system_settings')
      .select('action_plan_prompt')
      .single();

    const customPrompt = systemSettings?.action_plan_prompt || 
      'Crie um plano de ação detalhado com exercícios e atividades específicas para o paciente. Inclua instruções claras, frequência recomendada, progressão gradual e critérios de avaliação de desempenho.';

    // Buscar traços do paciente para personalizar as ações
    console.log('Buscando traços do paciente...');
    const { data: patientTraits } = await supabase
      .from('body_analyses')
      .select('trait_scores, observations')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Preparar contexto dos traços
    let traitsContext = '';
    if (patientTraits?.trait_scores) {
      try {
        const traits = JSON.parse(patientTraits.trait_scores);
        const topTraits = Object.entries(traits)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 3)
          .map(([trait, score]) => `${trait}: ${score}%`);
        
        traitsContext = `**TRAÇOS DOMINANTES DO PACIENTE:**
${topTraits.join(', ')}
${patientTraits.observations ? `Observações da análise: ${patientTraits.observations}` : ''}`;
      } catch (e) {
        console.warn('Erro ao processar trait_scores:', e);
      }
    }

    const systemPrompt = `${customPrompt}

DIRETRIZES IMPORTANTES:
1. Crie 3-5 ações terapêuticas específicas para a área: "${treatmentArea.title}"
2. Base as ações nos traços de caráter do paciente para maximizar efetividade
3. Considere a transcrição da sessão para criar ações relevantes às necessidades identificadas
4. Cada ação deve ser prática, mensurável e adequada aos recursos do paciente
5. Varie as prioridades (alta, média, baixa) conforme a importância das ações
6. Inclua instruções claras que considerem as características do paciente
7. Defina frequências realistas baseadas no perfil do paciente
8. As ações devem ser extraídas das necessidades identificadas na transcrição

FORMATO DE RESPOSTA:
Retorne APENAS um JSON válido seguindo exatamente esta estrutura:

{
  "suggested_actions": [
    {
      "name": "string - Nome específico da ação terapêutica",
      "objective": "string - Objetivo específico alinhado aos traços do paciente",
      "frequency": "string - Frequência realista (ex: 'Diária', '3x por semana', 'Semanal')",
      "priority": "high|medium|low - Prioridade baseada na urgência e importância",
      "start_date": "string - Data de início sugerida (YYYY-MM-DD)",
      "end_date": "string - Data de fim sugerida ou null se contínua",
      "instructions": "string - Instruções detalhadas considerando o perfil do paciente",
      "expected_outcomes": ["string - Resultados esperados específicos"]
    }
  ]
}

IMPORTANTE:
- Todas as strings devem estar em português brasileiro
- Crie ações que aproveitem os pontos fortes dos traços dominantes
- As instruções devem ser claras e adaptadas ao perfil do paciente
- Varie as frequências conforme a complexidade de cada ação
- Priorize ações que tenham maior impacto na área específica
- Base as ações nas necessidades do paciente extraídas da conversa`;

    const userPrompt = `Crie ações terapêuticas específicas para a seguinte área de tratamento de ${patientName}:

**ÁREA DE TRATAMENTO:**
Título: ${treatmentArea.title}
Descrição: ${treatmentArea.description}
Objetivos da área: ${treatmentArea.objectives.join(', ')}

${traitsContext}

**TRANSCRIÇÃO DA CONVERSA ENTRE TERAPEUTA E PACIENTE:**
${transcription ? `"${transcription}"` : 'Não disponível'}

Com base nessas informações, especialmente considerando a transcrição da conversa, crie 3-5 ações terapêuticas específicas que:
1. Sejam diretamente relacionadas aos objetivos da área "${treatmentArea.title}"
2. Abordem necessidades específicas identificadas na transcrição da conversa
3. Aproveitem os recursos naturais dos traços dominantes do paciente
4. Sejam práticas e executáveis considerando o perfil do paciente
5. Tenham diferentes níveis de prioridade e frequência
6. Incluam instruções claras e personalizadas
7. Foquem nas questões mais relevantes extraídas da conversa entre terapeuta e paciente`;

    console.log('Chamando OpenAI para sugestão de ações terapêuticas...');

    if (!openAIApiKey) {
      console.error('OpenAI API key não configurada');
      throw new Error('OpenAI API key não configurada');
    }

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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Nenhuma resposta gerada pela IA');
    }

    // Parse and validate the JSON response
    let actionsResponse;
    try {
      actionsResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Erro ao parsear resposta JSON:', parseError);
      console.error('Conteúdo recebido:', content);
      throw new Error('Resposta da IA não está em formato JSON válido');
    }

    // Validate and sanitize the suggested actions
    const validatedActions: SuggestedAction[] = Array.isArray(actionsResponse.suggested_actions) 
      ? actionsResponse.suggested_actions.map((action: any) => ({
          name: action.name || 'Ação terapêutica',
          objective: action.objective || 'Objetivo a ser definido',
          frequency: action.frequency || 'Semanal',
          priority: ['low', 'medium', 'high'].includes(action.priority) ? action.priority : 'medium',
          start_date: action.start_date || new Date().toISOString().split('T')[0],
          end_date: action.end_date || null,
          instructions: action.instructions || 'Instruções a serem fornecidas',
          expected_outcomes: Array.isArray(action.expected_outcomes) ? action.expected_outcomes : []
        }))
      : [];

    console.log(`${validatedActions.length} ações terapêuticas geradas com sucesso para a área: ${treatmentArea.title}`);

    return new Response(JSON.stringify({ suggested_actions: validatedActions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na função suggest-area-actions:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro ao gerar sugestões de ações',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});