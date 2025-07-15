import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription, patientId } = await req.json();

    if (!transcription || !patientId) {
      throw new Error('Transcrição e ID do paciente são obrigatórios');
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get system settings for conversation analysis prompt
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('conversation_analysis_prompt')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Erro ao buscar configurações:', settingsError);
    }

    const conversationAnalysisPrompt = settings?.conversation_analysis_prompt || 
      'Com base na transcrição da conversa e nos traços dominantes do paciente (quando disponíveis), gere uma lista de 5-8 perguntas estratégicas para aprofundar o acompanhamento terapêutico. Para cada pergunta, inclua o motivo/objetivo da pergunta. Considere os traços de personalidade do paciente ao formular as perguntas. As perguntas devem explorar: progresso desde a última sessão, dificuldades enfrentadas, aplicação das orientações dadas, estado emocional atual, aspectos específicos relacionados aos traços dominantes, e necessidades de ajuste no tratamento.';

    // Get custom AI agent ID - use default as fallback
    const defaultAgentId = 'asst_Urx3NlHxECrQRS889BwZv0JA';
    // In future, this could be made configurable per user
    const assistantId = defaultAgentId;

    // Get patient data for context
    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select('name, birth_date, gender')
      .eq('id', patientId)
      .single();

    if (patientError) {
      console.error('Erro ao buscar dados do paciente:', patientError);
    }

    // Get latest body analysis for patient context
    const { data: analysis, error: analysisError } = await supabase
      .from('body_analyses')
      .select('trait_scores, analysis_date, analysis_name')
      .eq('patient_id', patientId)
      .eq('status', 'completed')
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    let patientContext = '';
    if (patientData && !patientError) {
      patientContext += `DADOS DO PACIENTE:\n- Nome: ${patientData.name}\n`;
      if (patientData.birth_date) {
        patientContext += `- Data de nascimento: ${patientData.birth_date}\n`;
      }
      if (patientData.gender) {
        patientContext += `- Gênero: ${patientData.gender}\n`;
      }
    }

    if (analysis && !analysisError) {
      const traitScores = analysis.trait_scores as any[];
      if (Array.isArray(traitScores) && traitScores.length > 0) {
        const topTraits = traitScores
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 3);
        
        patientContext += `\nTRAÇOS DOMINANTES (análise corporal - ${analysis.analysis_date}):\n`;
        patientContext += topTraits.map(trait => `- ${trait.name} (${trait.code}): ${trait.percentage.toFixed(1)}% - ${trait.total} pontos`).join('\n');
        patientContext += `\n\nCARACTERÍSTICAS DOS TRAÇOS:\n`;
        patientContext += `- V (Visionário): Criatividade, inovação, pensamento abstrato, foco no futuro\n`;
        patientContext += `- C (Comunicador): Expressão, relacionamento interpessoal, sociabilidade, empatia\n`;
        patientContext += `- D (Dominador): Liderança, controle, determinação, assertividade\n`;
        patientContext += `- E (Executor): Ação, resultado, praticidade, objetividade\n`;
        patientContext += `- R (Resolutivo): Análise, solução de problemas, pensamento crítico, detalhamento\n`;
      }
    } else {
      patientContext += `\nINFORMAÇÃO: Não foi encontrada análise corporal prévia para este paciente.`;
    }

    // Prepare message with context and prompt
    const fullMessage = `${conversationAnalysisPrompt}

${patientContext}

TRANSCRIÇÃO DA CONVERSA:
${transcription}

FORMATO DE RESPOSTA - RETORNE APENAS UM JSON VÁLIDO:
{
  "questions": [
    {
      "question": "Pergunta específica aqui",
      "reason": "Motivo/objetivo desta pergunta",
      "trait_relevance": "Como esta pergunta se relaciona com os traços do paciente (opcional)"
    }
  ],
  "patient_traits_summary": "Resumo dos traços considerados na análise",
  "conversation_summary": "Breve resumo dos pontos principais da conversa"
}

IMPORTANTE: Responda APENAS com o JSON válido, sem texto adicional antes ou depois.`;

    console.log('Criando thread no OpenAI...');

    // Create thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({})
    });

    if (!threadResponse.ok) {
      const errorText = await threadResponse.text();
      throw new Error(`Erro ao criar thread: ${threadResponse.status} - ${errorText}`);
    }

    const threadData = await threadResponse.json();
    const threadId = threadData.id;

    console.log('Thread criada:', threadId);

    // Add message to thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: fullMessage
      })
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      throw new Error(`Erro ao adicionar mensagem: ${messageResponse.status} - ${errorText}`);
    }

    console.log('Mensagem adicionada ao thread');

    // Run assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      throw new Error(`Erro ao executar assistant: ${runResponse.status} - ${errorText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.id;

    console.log('Run iniciado:', runId);

    // Poll for completion
    let runStatus = 'in_progress';
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (runStatus === 'in_progress' || runStatus === 'queued') {
      if (attempts >= maxAttempts) {
        throw new Error('Timeout aguardando resposta do assistant');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!statusResponse.ok) {
        throw new Error(`Erro ao verificar status: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;

      console.log(`Status do run (tentativa ${attempts}):`, runStatus);

      if (runStatus === 'failed') {
        throw new Error(`Assistant falhou: ${statusData.last_error?.message || 'Erro desconhecido'}`);
      }
    }

    if (runStatus !== 'completed') {
      throw new Error(`Run não completou corretamente. Status: ${runStatus}`);
    }

    // Get messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      throw new Error(`Erro ao buscar mensagens: ${messagesResponse.status} - ${errorText}`);
    }

    const messagesData = await messagesResponse.json();
    const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');

    if (!assistantMessage || !assistantMessage.content || assistantMessage.content.length === 0) {
      throw new Error('Nenhuma resposta válida do assistant');
    }

    const responseText = assistantMessage.content[0].text.value;
    console.log('Resposta do assistant:', responseText);

    // Parse the JSON response
    let analysisResult;
    try {
      // Clean and parse the JSON response
      let cleanContent = responseText.trim();
      
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
      
      cleanContent = cleanContent.trim();
      console.log('Conteúdo limpo para parsing:', cleanContent);
      
      analysisResult = JSON.parse(cleanContent);
      
      // Validate the structure
      if (!analysisResult.questions || !Array.isArray(analysisResult.questions)) {
        throw new Error('Estrutura de resposta inválida - questions não encontrado ou não é array');
      }
      
      console.log('JSON parseado com sucesso:', analysisResult);
      
    } catch (parseError) {
      console.warn('Erro ao parsear JSON:', parseError);
      console.log('Conteúdo original:', responseText);
      
      // If JSON parsing fails, create a structured response
      analysisResult = {
        questions: [
          {
            question: "Análise gerada em formato de texto. Veja o campo 'raw_response' para o conteúdo completo.",
            reason: "Formato de resposta não estruturado",
            trait_relevance: ""
          }
        ],
        patient_traits_summary: patientContext || "Não disponível",
        conversation_summary: "Análise em texto livre",
        raw_response: responseText
      };
    }

    // Save to database in the background
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          const { error: saveError } = await supabase
            .from('conversation_analyses')
            .insert({
              patient_id: patientId,
              questions: analysisResult.questions,
              conversation_summary: analysisResult.conversation_summary,
              patient_traits_summary: analysisResult.patient_traits_summary,
              raw_response: responseText,
              created_by: 'system', // Since this is automated
              session_type: 'ai_assistance'
            });

          if (saveError) {
            console.error('Erro ao salvar análise:', saveError);
          } else {
            console.log('Análise salva com sucesso');
          }
        } catch (bgError) {
          console.error('Erro na tarefa em background:', bgError);
        }
      })()
    );

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na análise da conversa:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});