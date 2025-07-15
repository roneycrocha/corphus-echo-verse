import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Usar service role key para operações administrativas
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log("Iniciando correção do último usuário...");

    // Buscar o último usuário criado
    const { data: lastUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select(`
        user_id, 
        full_name, 
        email, 
        account_id,
        created_by,
        role,
        user_type,
        is_active,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (userError || !lastUser) {
      throw new Error(`Erro ao buscar último usuário: ${userError?.message}`);
    }

    console.log("Último usuário encontrado:", lastUser.email);

    // Verificar se o usuário tem account_id correto
    if (!lastUser.account_id) {
      console.log("Corrigindo account_id do usuário...");
      
      // Buscar a conta do criador
      let targetAccountId = '00000000-0000-0000-0000-000000000000';
      
      if (lastUser.created_by) {
        const { data: creatorProfile } = await supabaseAdmin
          .from('profiles')
          .select('account_id')
          .eq('user_id', lastUser.created_by)
          .eq('is_active', true)
          .single();
          
        if (creatorProfile?.account_id) {
          targetAccountId = creatorProfile.account_id;
        }
      }

      // Atualizar o account_id
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          account_id: targetAccountId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', lastUser.user_id);

      if (updateError) {
        throw new Error(`Erro ao atualizar account_id: ${updateError.message}`);
      }

      console.log(`Account_id atualizado para: ${targetAccountId}`);
    }

    // Verificar se a conta tem assinatura ativa
    const { data: accountData, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('subscription_status, subscription_plan, name')
      .eq('id', lastUser.account_id || '00000000-0000-0000-0000-000000000000')
      .single();

    if (accountError) {
      console.warn("Erro ao verificar conta:", accountError.message);
    }

    // Garantir que a conta padrão existe e tem assinatura ativa
    if (!accountData || accountData.subscription_status !== 'active') {
      console.log("Corrigindo status da conta...");
      
      const { error: accountUpdateError } = await supabaseAdmin
        .from('accounts')
        .upsert({
          id: '00000000-0000-0000-0000-000000000000',
          name: 'Conta Padrão',
          subscription_status: 'active',
          subscription_plan: 'silver',
          is_active: true,
          updated_at: new Date().toISOString()
        });

      if (accountUpdateError) {
        console.warn("Erro ao atualizar conta:", accountUpdateError.message);
      }
    }

    // Deslogar o usuário para forçar nova verificação de assinatura
    console.log("Encerrando sessões do usuário para forçar nova verificação...");
    
    try {
      await supabaseAdmin.auth.admin.signOut(lastUser.user_id, 'global');
      console.log("Sessões encerradas com sucesso");
    } catch (signOutError) {
      console.warn("Aviso ao encerrar sessões:", signOutError);
    }

    // Retornar status
    const finalStatus = {
      user_email: lastUser.email,
      user_id: lastUser.user_id,
      account_id: lastUser.account_id || '00000000-0000-0000-0000-000000000000',
      subscription_status: accountData?.subscription_status || 'active',
      subscription_plan: accountData?.subscription_plan || 'silver',
      fixed: true,
      message: "Usuário corrigido com sucesso!"
    };

    console.log("Correção concluída:", finalStatus);

    return new Response(
      JSON.stringify(finalStatus),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro na correção do usuário:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro interno do servidor",
        fixed: false
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});