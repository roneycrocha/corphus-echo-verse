import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetPatientPasswordRequest {
  patientId: string;
  password: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId, password, email }: SetPatientPasswordRequest = await req.json();

    if (!patientId || !password || !email) {
      return new Response(
        JSON.stringify({ error: "Patient ID, email e senha são obrigatórios" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('Setting password for patient:', patientId, 'email:', email);

    // Get patient data first
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('user_id, email, name')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      console.error('Patient not found:', patientError);
      return new Response(
        JSON.stringify({ error: "Paciente não encontrado" }),
        { 
          status: 404, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    let result;

    if (patient.user_id) {
      // User already exists, update password
      console.log('Updating password for existing user:', patient.user_id);
      result = await supabaseAdmin.auth.admin.updateUserById(
        patient.user_id,
        { password: password }
      );
    } else {
      // Create new user
      console.log('Creating new user for patient');
      result = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: patient.name,
          user_type: 'patient'
        }
      });

      if (result.data.user && !result.error) {
        // Link the user to the patient record
        const { error: updateError } = await supabaseAdmin
          .from('patients')
          .update({ user_id: result.data.user.id })
          .eq('id', patientId);

        if (updateError) {
          console.error('Error linking user to patient:', updateError);
          return new Response(
            JSON.stringify({ error: "Erro ao vincular usuário ao paciente" }),
            { 
              status: 500, 
              headers: { "Content-Type": "application/json", ...corsHeaders } 
            }
          );
        }
      }
    }

    if (result.error) {
      console.error('Error setting password:', result.error);
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: patient.user_id ? "Senha atualizada com sucesso" : "Usuário criado e senha definida com sucesso",
        userId: result.data.user?.id || patient.user_id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro na função set-patient-password:', error);
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