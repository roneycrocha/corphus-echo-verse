import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PatientInviteRequest {
  patientName: string;
  patientEmail: string;
  clinicName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientName, patientEmail, clinicName = "Monitor Terapêutico" }: PatientInviteRequest = await req.json();

    if (!patientName || !patientEmail) {
      return new Response(
        JSON.stringify({ error: "Nome e email do paciente são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // URL para o paciente criar sua conta
    const signupUrl = `${Deno.env.get("SUPABASE_URL")}/auth/v1/signup?redirect_to=${encodeURIComponent(
      `${req.headers.get("origin") || "https://dcc20789-4808-4fc7-897c-31beb5c26170.lovableproject.com"}/patient-login`
    )}`;

    const emailResponse = await resend.emails.send({
      from: `${clinicName} <contato@corphus.ai>`,
      to: [patientEmail],
      subject: `Convite para acessar seu Monitor Terapêutico - ${clinicName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Convite - Monitor Terapêutico</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 40px; padding: 30px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white;">
            <div style="width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              ❤️
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Monitor Terapêutico</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Acesso ao seu acompanhamento</p>
          </div>

          <!-- Conteúdo Principal -->
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-top: 0;">Olá, ${patientName}! 👋</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Você foi convidado(a) para acessar seu <strong>Monitor Terapêutico</strong> personalizado. 
              Esta plataforma foi criada especialmente para acompanhar sua evolução no tratamento.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #667eea;">🔐 Como criar sua conta:</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Clique no botão abaixo</li>
                <li>Crie uma senha segura (mínimo 6 caracteres)</li>
                <li>Confirme seu email</li>
                <li>Pronto! Você terá acesso ao seu monitor</li>
              </ol>
            </div>

            <!-- Botão Principal -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://dcc20789-4808-4fc7-897c-31beb5c26170.lovableproject.com/patient-signup?email=${encodeURIComponent(patientEmail)}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                🚀 Criar Minha Conta
              </a>
            </div>

            <p style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">
              <strong>Email de acesso:</strong> ${patientEmail}
            </p>
          </div>

          <!-- O que você pode fazer -->
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 10px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #333; margin-top: 0;">📱 O que você poderá fazer:</h3>
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">📊</span>
                <span>Acompanhar seu progresso no tratamento</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">✅</span>
                <span>Registrar ações terapêuticas realizadas</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">📅</span>
                <span>Visualizar seus agendamentos</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">💳</span>
                <span>Acompanhar informações financeiras</span>
              </div>
            </div>
          </div>

          <!-- Segurança -->
          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; border: 1px solid #b3d9ff; margin-bottom: 30px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <span style="font-size: 20px;">🔒</span>
              <h4 style="margin: 0; color: #0066cc;">Seus dados estão seguros</h4>
            </div>
            <p style="margin: 0; font-size: 14px; color: #0066cc;">
              Utilizamos criptografia de ponta e seguimos todas as normas de proteção de dados de saúde. 
              Suas informações são privadas e seguras.
            </p>
          </div>

          <!-- Suporte -->
          <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>Precisa de ajuda?</strong><br>
              Entre em contato conosco através do telefone ou WhatsApp:<br>
              <a href="tel:+5511999999999" style="color: #667eea; text-decoration: none; font-weight: bold;">
                📞 (11) 99999-9999
              </a>
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; font-size: 12px; color: #999;">
              © 2024 ${clinicName} - Monitor Terapêutico<br>
              Este email foi enviado para ${patientEmail}
            </p>
          </div>

        </body>
        </html>
      `,
    });

    console.log("Convite enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Convite enviado com sucesso",
      emailId: emailResponse.data?.id,
      // Adicionar mais detalhes para debug
      resendResponse: emailResponse
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar convite:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro ao enviar convite",
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