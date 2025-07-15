import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

interface PatientData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  occupation?: string;
  whatsapp?: string;
}

interface GenerateLinkRequest {
  patientData: PatientData;
  isEdit?: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar autenticação
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header obrigatório" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verificar o usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token de autorização inválido" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { patientData, isEdit = false }: GenerateLinkRequest = await req.json();

    if (!patientData || !patientData.name || !patientData.email) {
      return new Response(
        JSON.stringify({ error: "Dados do paciente são obrigatórios (nome e email)" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Gerar token único
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    // Dados do paciente para pré-preenchimento ou edição
    const tokenData = {
      name: patientData.name,
      email: patientData.email,
      phone: patientData.phone || '',
      birth_date: patientData.birth_date || '',
      gender: patientData.gender || '',
      occupation: patientData.occupation || '',
      whatsapp: patientData.whatsapp || '',
      existingPatientId: patientData.id || null,
      isEdit: isEdit || !!patientData.id // Flag para indicar que é edição
    };

    // Inserir token na tabela
    const { error: insertError } = await supabase
      .from('patient_registration_tokens')
      .insert({
        token,
        patient_data: tokenData,
        expires_at: expiresAt.toISOString(),
        created_by: user.id
      });

    if (insertError) {
      console.error('Erro ao inserir token:', insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar token de registro" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Construir URL de registro
    const baseUrl = req.headers.get("origin") || "https://dcc20789-4808-4fc7-897c-31beb5c26170.lovableproject.com";
    const registrationUrl = `${baseUrl}/patient-registration/${token}`;

    return new Response(JSON.stringify({
      success: true,
      registrationUrl,
      token,
      expiresAt: expiresAt.toISOString()
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar link de registro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);