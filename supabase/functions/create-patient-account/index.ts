import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreatePatientAccountRequest {
  patientData: {
    name: string;
    email: string;
    phone?: string;
    whatsapp?: string;
    birth_date?: string;
    gender?: string;
    occupation?: string;
    document?: string;
    document_type?: string;
    avatar_url?: string;
    address?: any;
    emergency_contact?: any;
  };
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientData, password }: CreatePatientAccountRequest = await req.json();

    if (!patientData?.email || !password || !patientData?.name) {
      return new Response(
        JSON.stringify({ error: "Email, senha e nome são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Criar cliente Supabase com service role key para poder criar usuários confirmados
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Obter a conta do usuário atual (terapeuta que está criando o paciente)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Criar cliente regular para obter dados do usuário atual
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Obter dados do usuário atual
    const { data: { user: currentUser }, error: userAuthError } = await supabaseUser.auth.getUser();
    if (userAuthError || !currentUser) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Obter account_id do usuário atual
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('account_id')
      .eq('user_id', currentUser.id)
      .single();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: "Erro ao obter dados do usuário" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Criar usuário usando admin API (automaticamente confirmado)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: patientData.email,
      password,
      email_confirm: true, // Confirma o email automaticamente
      user_metadata: {
        full_name: patientData.name,
        user_type: 'patient'
      }
    });

    if (userError) {
      console.error("Erro ao criar usuário:", userError);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao criar conta", 
          details: userError.message 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: "Falha ao criar usuário" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verificar se já existe perfil para este usuário e deletar antes de recriar
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userData.user.id);

    if (deleteProfileError) {
      console.log("Nenhum perfil existente encontrado para deletar ou erro ao deletar:", deleteProfileError);
    }

    // Criar perfil do paciente
    const { error: profileCreateError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userData.user.id,
        full_name: patientData.name,
        email: patientData.email,
        role: 'assistant',
        user_type: 'patient',
        account_id: userProfile.account_id
      });

    if (profileCreateError) {
      console.error("Erro ao criar perfil:", profileCreateError);
      // Se falhar ao criar perfil, deletar o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      
      return new Response(
        JSON.stringify({ 
          error: "Erro ao criar perfil do paciente", 
          details: profileCreateError.message 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Criar registro do paciente
    const { data: patientRecord, error: patientCreateError } = await supabaseAdmin
      .from('patients')
      .insert({
        name: patientData.name,
        email: patientData.email,
        phone: patientData.phone || null,
        whatsapp: patientData.whatsapp || null,
        birth_date: patientData.birth_date || null,
        gender: patientData.gender || null,
        occupation: patientData.occupation || null,
        document: patientData.document || null,
        document_type: patientData.document_type || 'cpf',
        avatar_url: patientData.avatar_url || null,
        address: patientData.address || null,
        emergency_contact: patientData.emergency_contact || null,
        user_id: userData.user.id,
        created_by: currentUser.id,
        account_id: userProfile.account_id
      })
      .select()
      .single();

    if (patientCreateError) {
      console.error("Erro ao criar paciente:", patientCreateError);
      // Limpar usuário e perfil criados
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      
      return new Response(
        JSON.stringify({ 
          error: "Erro ao criar registro do paciente", 
          details: patientCreateError.message 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Conta criada com sucesso",
      user_id: userData.user.id,
      patient_id: patientRecord.id,
      tempPassword: password
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Erro na função create-patient-account:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);