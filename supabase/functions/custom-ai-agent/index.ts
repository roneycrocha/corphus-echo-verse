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
    const { message, patientId, analysisType = 'body_analysis', assistantId } = await req.json();

    if (!message) {
      throw new Error('Mensagem é obrigatória');
    }

    if (!assistantId) {
      throw new Error('ID do assistente é obrigatório');
    }

    if (!openAIApiKey) {
      throw new Error('Chave da API OpenAI não configurada');
    }

    console.log('Iniciando análise com agente personalizado:', assistantId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get additional context if patientId is provided
    let patientContext = '';
    if (patientId) {
      // Get patient data
      const { data: patient } = await supabase
        .from('patients')
        .select('name, birth_date, gender')
        .eq('id', patientId)
        .single();

      // Get latest body analysis
      const { data: analysis } = await supabase
        .from('body_analyses')
        .select('trait_scores, analysis_date, observations')
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('analysis_date', { ascending: false })
        .limit(1)
        .single();

      if (patient) {
        patientContext += `\nDados do Paciente:\n- Nome: ${patient.name}`;
        if (patient.birth_date) {
          const age = new Date().getFullYear() - new Date(patient.birth_date).getFullYear();
          patientContext += `\n- Idade: ${age} anos`;
        }
        if (patient.gender) {
          patientContext += `\n- Gênero: ${patient.gender}`;
        }
      }

      if (analysis) {
        patientContext += `\n\nAnálise Corporal Mais Recente (${analysis.analysis_date}):\n`;
        if (analysis.trait_scores) {
          const traits = analysis.trait_scores as any[];
          const topTraits = traits
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 3);
          patientContext += `Traços dominantes:\n${topTraits.map(t => `- ${t.name}: ${t.percentage.toFixed(1)}%`).join('\n')}`;
        }
        if (analysis.observations) {
          patientContext += `\nObservações: ${analysis.observations}`;
        }
      }
    }

    // Create a thread
    console.log('Criando thread...');
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
      const error = await threadResponse.text();
      throw new Error(`Erro ao criar thread: ${error}`);
    }

    const thread = await threadResponse.json();
    console.log('Thread criada:', thread.id);

    // Add message to thread
    const fullMessage = patientContext ? `${message}\n\nContexto do paciente:${patientContext}` : message;
    
    console.log('Adicionando mensagem à thread...');
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
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
      const error = await messageResponse.text();
      throw new Error(`Erro ao adicionar mensagem: ${error}`);
    }

    // Run the assistant
    console.log('Executando assistente...');
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
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
      const error = await runResponse.text();
      throw new Error(`Erro ao executar assistente: ${error}`);
    }

    const run = await runResponse.json();
    console.log('Execução iniciada:', run.id);

    // Poll for completion
    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (runStatus === 'in_progress' || runStatus === 'queued') {
      if (attempts >= maxAttempts) {
        throw new Error('Timeout: Assistente demorou muito para responder');
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!statusResponse.ok) {
        throw new Error('Erro ao verificar status da execução');
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
      
      console.log(`Status da execução (tentativa ${attempts}):`, runStatus);
    }

    if (runStatus === 'failed') {
      throw new Error('Assistente falhou ao processar a solicitação');
    }

    if (runStatus !== 'completed') {
      throw new Error(`Status inesperado: ${runStatus}`);
    }

    // Get the response
    console.log('Obtendo resposta...');
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      const error = await messagesResponse.text();
      throw new Error(`Erro ao obter mensagens: ${error}`);
    }

    const messages = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
    
    if (!assistantMessage) {
      throw new Error('Nenhuma resposta do assistente encontrada');
    }

    const response = assistantMessage.content[0]?.text?.value || 'Resposta vazia do assistente';
    
    console.log('Resposta do agente personalizado recebida');

    // Save the analysis if it's related to a patient
    if (patientId && analysisType === 'body_analysis') {
      console.log('Salvando análise no banco de dados...');
      
      // Use background task to save without blocking response
      EdgeRuntime.waitUntil(
        supabase
          .from('conversation_analyses')
          .insert({
            patient_id: patientId,
            created_by: patientId, // This should be the therapist ID in real usage
            session_type: 'custom_ai_agent',
            conversation_summary: response.substring(0, 1000), // Truncate if too long
            raw_response: response,
            questions: []
          })
          .then(({ error }) => {
            if (error) {
              console.error('Erro ao salvar análise:', error);
            } else {
              console.log('Análise salva com sucesso');
            }
          })
      );
    }

    return new Response(
      JSON.stringify({ 
        response,
        threadId: thread.id,
        runId: run.id,
        analysisType 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na função custom-ai-agent:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});