import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RegistrationLinkRequest {
  patientEmail: string;
  patientName?: string;
  registrationLink: string;
  therapistName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientEmail, patientName, registrationLink, therapistName }: RegistrationLinkRequest = await req.json();

    if (!patientEmail || !registrationLink) {
      return new Response(
        JSON.stringify({ error: "Email do paciente e link de cadastro são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailResponse = await resend.emails.send({
      from: "Monitor Terapêutico <contato@corphus.ai>",
      to: [patientEmail],
      subject: "Complete seu cadastro - Monitor Terapêutico",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Monitor Terapêutico</h1>
            <p style="color: #64748b; margin: 5px 0;">Plataforma de Gestão Terapêutica</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1e293b; margin-top: 0;">Olá${patientName ? `, ${patientName}` : ''}!</h2>
            
            <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
              ${therapistName ? `Seu terapeuta ${therapistName}` : 'Seu terapeuta'} convidou você para se cadastrar no Monitor Terapêutico, nossa plataforma de acompanhamento terapêutico.
            </p>
            
            <p style="color: #475569; line-height: 1.6; margin-bottom: 25px;">
              Para completar seu cadastro, clique no botão abaixo e preencha seus dados:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${registrationLink}" 
                 style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Completar Cadastro
              </a>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠️ Importante:</strong> Este link é válido por 7 dias e pode ser usado apenas uma vez.
              </p>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <h3 style="color: #1e293b; font-size: 16px;">O que você pode fazer na plataforma:</h3>
            <ul style="color: #475569; line-height: 1.6;">
              <li>Acompanhar seu progresso terapêutico</li>
              <li>Visualizar atividades e exercícios prescritos</li>
              <li>Registrar sua evolução e feedback</li>
              <li>Manter contato direto com seu terapeuta</li>
            </ul>
          </div>
          
          <div style="background: #f1f5f9; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="color: #64748b; margin: 0; font-size: 14px; text-align: center;">
              Se você não solicitou este cadastro ou tem dúvidas, entre em contato com seu terapeuta.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Monitor Terapêutico. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Email enviado com sucesso",
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
    console.error("Erro ao enviar email:", error);
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