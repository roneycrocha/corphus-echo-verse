import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

interface ResolveEmailConflictRequest {
  email: string;
  action: 'analyze' | 'resolve';
  newEmail?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, action, newEmail }: ResolveEmailConflictRequest = await req.json();

    console.log("=== INÍCIO resolve-email-conflict ===");
    console.log("Dados recebidos:", { email, action, newEmail });

    if (!email) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Analisar conflitos
    const analysis = await analyzeEmailConflicts(supabase, email);

    if (action === 'analyze') {
      return new Response(JSON.stringify({
        success: true,
        analysis
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === 'resolve') {
      const result = await resolveEmailConflict(supabase, email, analysis, newEmail);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Erro na função resolve-email-conflict:", error);
    return new Response(JSON.stringify({ 
      error: "Erro interno",
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function analyzeEmailConflicts(supabase: any, email: string) {
  console.log("Analisando conflitos para email:", email);

  // 1. Verificar se há usuário no auth
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users?.find((u: any) => u.email === email);

  // 2. Verificar perfis
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email);

  // 3. Verificar pacientes
  const { data: patients } = await supabase
    .from('patients')
    .select('*')
    .eq('email', email);

  console.log("Análise completa:", {
    authUser: !!authUser,
    profiles: profiles?.length || 0,
    patients: patients?.length || 0
  });

  return {
    email,
    authUser: authUser ? {
      id: authUser.id,
      email: authUser.email,
      created_at: authUser.created_at,
      email_confirmed_at: authUser.email_confirmed_at
    } : null,
    profiles: profiles || [],
    patients: patients || [],
    conflicts: {
      hasAuthUser: !!authUser,
      hasProfiles: (profiles?.length || 0) > 0,
      hasPatients: (patients?.length || 0) > 0,
      multipleProfiles: (profiles?.length || 0) > 1,
      multiplePatients: (patients?.length || 0) > 1
    }
  };
}

async function resolveEmailConflict(supabase: any, email: string, analysis: any, newEmail?: string) {
  console.log("Resolvendo conflito para email:", email);

  const steps = [];

  try {
    // Se há usuário no auth, remover
    if (analysis.authUser) {
      console.log("Removendo usuário do auth:", analysis.authUser.email);
      const { error } = await supabase.auth.admin.deleteUser(analysis.authUser.id);
      if (error) {
        console.error("Erro ao deletar usuário do auth:", error);
        throw new Error(`Erro ao deletar usuário: ${error.message}`);
      }
      steps.push(`Usuário ${analysis.authUser.email} removido do sistema de autenticação`);
    }

    // Se há múltiplos perfis, remover duplicados
    if (analysis.conflicts.multipleProfiles) {
      console.log("Removendo perfis duplicados");
      // Manter apenas o primeiro perfil
      const profilesToDelete = analysis.profiles.slice(1);
      for (const profile of profilesToDelete) {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id);
        if (error) {
          console.error("Erro ao deletar perfil:", error);
        } else {
          steps.push(`Perfil duplicado removido: ${profile.full_name}`);
        }
      }
    }

    // Se há múltiplos pacientes, consolidar ou atualizar email
    if (analysis.conflicts.multiplePatients && newEmail) {
      console.log("Atualizando email de pacientes duplicados");
      // Atualizar todos exceto o primeiro
      const patientsToUpdate = analysis.patients.slice(1);
      for (const patient of patientsToUpdate) {
        const { error } = await supabase
          .from('patients')
          .update({ email: newEmail })
          .eq('id', patient.id);
        if (error) {
          console.error("Erro ao atualizar email do paciente:", error);
        } else {
          steps.push(`Email do paciente ${patient.name} atualizado para ${newEmail}`);
        }
      }
    }

    // Limpar vinculações órfãs
    if (analysis.authUser && analysis.patients.length > 0) {
      console.log("Limpando vinculações user_id órfãs");
      for (const patient of analysis.patients) {
        if (patient.user_id === analysis.authUser.id) {
          const { error } = await supabase
            .from('patients')
            .update({ user_id: null })
            .eq('id', patient.id);
          if (error) {
            console.error("Erro ao limpar user_id:", error);
          } else {
            steps.push(`Vinculação removida do paciente ${patient.name}`);
          }
        }
      }
    }

    return {
      success: true,
      message: "Conflito resolvido com sucesso",
      steps,
      resolved: true
    };

  } catch (error: any) {
    console.error("Erro ao resolver conflito:", error);
    return {
      success: false,
      error: error.message,
      steps
    };
  }
}

serve(handler);