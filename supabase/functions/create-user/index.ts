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
    // Usar service role key para criar usuários sem login automático
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

    // Verificar se o usuário atual está autenticado
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: currentUserData } = await supabaseAdmin.auth.getUser(token);
    
    if (!currentUserData.user) {
      throw new Error("Usuário não autenticado");
    }

    const { email, password, full_name, phone, role } = await req.json();

    console.log("Criando usuário:", { email, full_name, role });

    // Criar usuário usando Admin API (não faz login automático)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        full_name,
        phone,
        role,
        user_type: 'therapist',
        created_by: currentUserData.user.id
      }
    });

    if (authError) {
      console.error("Erro ao criar usuário:", authError);
      throw authError;
    }

    console.log("Usuário criado com sucesso:", authData.user?.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Usuário criado com sucesso!",
        user_id: authData.user?.id 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro na criação do usuário:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro interno do servidor" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});