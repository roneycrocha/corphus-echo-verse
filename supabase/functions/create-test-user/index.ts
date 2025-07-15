import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Criar usuário usando admin API
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'teste@teste.com',
      password: 'senha123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Usuario Teste'
      }
    });

    if (userError) {
      console.error('Erro ao criar usuário:', userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Garantir que a conta padrão existe
    await supabaseAdmin.from('accounts').upsert({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Conta Padrão',
      is_active: true
    });

    // Criar perfil
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      user_id: user.user.id,
      full_name: 'Usuario Teste',
      email: 'teste@teste.com',
      role: 'assistant',
      user_type: 'therapist',
      created_by: user.user.id,
      account_id: '00000000-0000-0000-0000-000000000000',
      is_active: true
    });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
    }

    // Criar créditos iniciais
    const { error: creditsError } = await supabaseAdmin.from('user_credits').insert({
      user_id: user.user.id,
      balance: 0,
      total_purchased: 0,
      total_consumed: 0
    });

    if (creditsError) {
      console.error('Erro ao criar créditos:', creditsError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: user.user.id,
        email: user.user.email
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);