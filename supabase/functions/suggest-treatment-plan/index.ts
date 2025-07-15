import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TreatmentPlanRequest {
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  transcription?: string;
  currentSymptoms?: string;
  medicalHistory?: string;
  currentMedications?: string;
  treatmentGoals?: string;
  sessionNotes?: string;
  urgencyLevel?: 'low' | 'medium' | 'high';
  assistantId?: string; // Para usar agente personalizado
}

interface SuggestedAction {
  name: string;
  objective: string;
  frequency: string;
  priority: 'low' | 'medium' | 'high';
  estimated_duration: string;
  instructions: string;
  expected_outcomes: string[];
}

interface TreatmentArea {
  title: string;
  description: string;
  objectives: string[];
}

interface TreatmentPlanSuggestion {
  title: string;
  description: string;
  duration_weeks: number;
  treatment_areas: TreatmentArea[];
  treatment_approach: string;
  key_interventions: string[];
  expected_outcomes: string[];
  monitoring_indicators: string[];
  risk_factors: string[];
  contraindications: string[];
  suggested_actions: SuggestedAction[];
  follow_up_schedule: string;
  additional_recommendations: string[];
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
      patientAge,
      patientGender,
      transcription,
      currentSymptoms,
      medicalHistory,
      currentMedications,
      treatmentGoals,
      sessionNotes,
      urgencyLevel = 'medium',
      assistantId
    }: TreatmentPlanRequest = await req.json();

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar o prompt de plano terapêutico das configurações
    console.log('Buscando prompt de plano terapêutico das configurações...');
    const { data: systemSettings } = await supabase
      .from('system_settings')
      .select('therapeutic_plan_prompt')
      .single();

    const customPrompt = systemSettings?.therapeutic_plan_prompt || `Elabore um plano terapêutico personalizado com base na análise corporal e histórico do paciente. Inclua objetivos específicos, metodologias de tratamento, cronograma de sessões e marcos de progresso esperados.`;

    // 2. Buscar traços do paciente
    console.log('Buscando traços do paciente...');
    const { data: patientTraits } = await supabase
      .from('body_analyses')
      .select('trait_scores, observations')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 3. Buscar planos de tratamento existentes
    console.log('Buscando planos de tratamento existentes...');
    const { data: existingPlans } = await supabase
      .from('treatment_plans')
      .select(`
        id,
        title,
        description,
        goals,
        status,
        start_date,
        end_date,
        observations
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(3);

    // 4. Buscar informações básicas do paciente
    console.log('Buscando informações do paciente...');
    const { data: patientData } = await supabase
      .from('patients')
      .select('birth_date, gender, occupation')
      .eq('id', patientId)
      .single();

    // 5. Preparar contexto dos traços
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

    // 6. Preparar contexto dos planos existentes
    let existingPlansContext = '';
    if (existingPlans && existingPlans.length > 0) {
      existingPlansContext = `**PLANOS DE TRATAMENTO ANTERIORES:**
${existingPlans.map(plan => 
  `- ${plan.title} (${plan.status}): ${plan.description}
    Objetivos: ${Array.isArray(plan.goals) ? plan.goals.join(', ') : 'Não especificado'}
    ${plan.observations ? `Observações: ${plan.observations}` : ''}`
).join('\n')}`;
    }

    // 7. Calcular idade se data de nascimento disponível
    let ageText = '';
    if (patientData?.birth_date) {
      const birthDate = new Date(patientData.birth_date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      ageText = `${age} anos`;
    }

    const systemPrompt = `${customPrompt}

DIRETRIZES IMPORTANTES:
1. Base suas recomendações nos traços de caráter do paciente para personalizar o tratamento
2. Considere planos anteriores para evitar repetições e construir continuidade
3. Use evidências científicas e melhores práticas clínicas
4. Priorize intervenções adequadas aos recursos do paciente baseado em seus traços
5. Inclua estratégias de monitoramento alinhadas com o perfil do paciente
6. Sugira ações específicas que aproveitem os pontos fortes dos traços dominantes

FORMATO DE RESPOSTA:
Retorne APENAS um JSON válido seguindo exatamente esta estrutura:

{
  "title": "string - Título geral do plano de tratamento",
  "description": "string - Descrição geral do plano considerando traços do paciente",
  "duration_weeks": number,
  "treatment_areas": [
    {
      "title": "string - Título específico da área (ex: 'Fortalecimento de Autonomia')",
      "description": "string - Descrição detalhada desta área específica",
      "objectives": ["string - objetivos específicos desta área"]
    }
  ],
  "treatment_approach": "string - abordagem personalizada aos traços do paciente",
  "key_interventions": ["string - intervenções alinhadas aos recursos do paciente"],
  "expected_outcomes": ["string - resultados esperados"],
  "monitoring_indicators": ["string - indicadores compatíveis com o perfil"],
  "risk_factors": ["string - fatores de risco considerando traços"],
  "contraindications": ["string - contraindicações"],
  "suggested_actions": [
    {
      "name": "string - nome da ação",
      "objective": "string - objetivo específico alinhado aos traços",
      "frequency": "string - frequência adaptada ao perfil do paciente",
      "priority": "low|medium|high",
      "estimated_duration": "string - duração estimada",
      "instructions": "string - instruções considerando recursos do paciente",
      "expected_outcomes": ["string - resultados esperados desta ação"]
    }
  ],
  "follow_up_schedule": "string - cronograma adaptado ao paciente",
  "additional_recommendations": ["string - recomendações baseadas nos traços"]
}

IMPORTANTE: 
- Todas as strings devem estar em português brasileiro
- Crie 2-4 áreas de tratamento distintas com seus próprios títulos, descrições e objetivos
- Cada área deve focar em aspectos específicos do tratamento
- Inclua 4-6 ações terapêuticas específicas alinhadas aos traços do paciente
- Personalize as recomendações baseado nos recursos identificados nos traços
- Considere a urgência: ${urgencyLevel}`;

    const userPrompt = `Analise as informações e crie um plano de tratamento personalizado para ${patientName}:

**INFORMAÇÕES DO PACIENTE:**
Nome: ${patientName}
${ageText ? `Idade: ${ageText}` : ''}
${patientData?.gender ? `Gênero: ${patientData.gender}` : ''}
${patientData?.occupation ? `Ocupação: ${patientData.occupation}` : ''}

${traitsContext}

${existingPlansContext}

${treatmentGoals ? `**OBJETIVOS DO TRATAMENTO:**
${treatmentGoals}` : ''}

**TRANSCRIÇÃO DA SESSÃO:**
${transcription ? `"${transcription}"` : 'Não disponível'}

**NOTAS DA SESSÃO:**
${sessionNotes ? sessionNotes : 'Não disponível'}

**NÍVEL DE URGÊNCIA:** ${urgencyLevel}

Com base nessas informações, especialmente considerando os traços de caráter do paciente e planos anteriores, crie um plano de tratamento que:
1. Seja dividido em 2-4 áreas distintas de tratamento (ex: "Fortalecimento de Autonomia", "Resiliência Financeira", etc.)
2. Cada área deve ter título próprio, descrição específica e objetivos focados
3. Utilize os recursos naturais dos traços dominantes do paciente
4. Evite repetir abordagens de planos anteriores (se existirem)
5. Seja específico e personalizado ao perfil único do paciente
6. Inclua ações terapêuticas que se alinhem com as características do paciente
7. Considere as limitações e potencialidades baseadas nos traços identificados`;

    console.log('Chamando OpenAI para sugestão de plano de tratamento...');
    console.log('Assistant ID:', assistantId);

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
        max_tokens: 4000,
      }),
    });

    console.log('Response status:', response.status);

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
    let treatmentPlan: TreatmentPlanSuggestion;
    try {
      treatmentPlan = JSON.parse(content);
    } catch (parseError) {
      console.error('Erro ao parsear resposta JSON:', parseError);
      console.error('Conteúdo recebido:', content);
      throw new Error('Resposta da IA não está em formato JSON válido');
    }

    // Validate required fields and provide defaults
    const validatedPlan: TreatmentPlanSuggestion = {
      title: treatmentPlan.title || `Plano de Tratamento para ${patientName}`,
      description: treatmentPlan.description || 'Plano personalizado baseado na análise da sessão e traços do paciente.',
      duration_weeks: treatmentPlan.duration_weeks || 8,
      treatment_areas: Array.isArray(treatmentPlan.treatment_areas) ? treatmentPlan.treatment_areas.map(area => ({
        title: area.title || 'Área de Tratamento',
        description: area.description || 'Descrição da área de tratamento',
        objectives: Array.isArray(area.objectives) ? area.objectives : ['Objetivo a ser definido']
      })) : [
        {
          title: 'Área Principal de Tratamento',
          description: 'Área focada no desenvolvimento pessoal do paciente',
          objectives: ['Desenvolver habilidades terapêuticas específicas']
        }
      ],
      treatment_approach: treatmentPlan.treatment_approach || 'Abordagem integrada personalizada aos traços do paciente',
      key_interventions: Array.isArray(treatmentPlan.key_interventions) ? treatmentPlan.key_interventions : [],
      expected_outcomes: Array.isArray(treatmentPlan.expected_outcomes) ? treatmentPlan.expected_outcomes : [],
      monitoring_indicators: Array.isArray(treatmentPlan.monitoring_indicators) ? treatmentPlan.monitoring_indicators : [],
      risk_factors: Array.isArray(treatmentPlan.risk_factors) ? treatmentPlan.risk_factors : [],
      contraindications: Array.isArray(treatmentPlan.contraindications) ? treatmentPlan.contraindications : [],
      suggested_actions: Array.isArray(treatmentPlan.suggested_actions) ? treatmentPlan.suggested_actions.map(action => ({
        name: action.name || 'Ação terapêutica',
        objective: action.objective || 'Objetivo a ser definido',
        frequency: action.frequency || 'Semanal',
        priority: ['low', 'medium', 'high'].includes(action.priority) ? action.priority : 'medium',
        estimated_duration: action.estimated_duration || '30 minutos',
        instructions: action.instructions || 'Instruções a serem fornecidas',
        expected_outcomes: Array.isArray(action.expected_outcomes) ? action.expected_outcomes : []
      })) : [],
      follow_up_schedule: treatmentPlan.follow_up_schedule || 'Acompanhamento semanal recomendado',
      additional_recommendations: Array.isArray(treatmentPlan.additional_recommendations) ? treatmentPlan.additional_recommendations : []
    };

    console.log('Plano de tratamento gerado com sucesso');

    return new Response(JSON.stringify(validatedPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na função suggest-treatment-plan:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro ao gerar sugestão de plano de tratamento',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});