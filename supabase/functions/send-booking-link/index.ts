import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendBookingLinkRequest {
  patientEmail: string;
  patientName: string;
  bookingLink: string;
  therapistName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientEmail, patientName, bookingLink, therapistName }: SendBookingLinkRequest = await req.json();

    if (!patientEmail || !patientName || !bookingLink) {
      return new Response(
        JSON.stringify({ error: "Email, nome do paciente e link são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Enviando link de agendamento por email para:", patientEmail);

    const emailResponse = await resend.emails.send({
      from: "Monitor Terapêutico <contato@corphus.ai>",
      to: [patientEmail],
      subject: "Link para Agendamento - Monitor Terapêutico",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Monitor Terapêutico</h1>
            <p style="color: #64748b; margin: 5px 0;">Plataforma de Gestão Terapêutica</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin: 20px 0;">
            <h2 style="color: #1e293b; margin: 0 0 15px 0;">Olá, ${patientName}!</h2>
            <p style="color: #475569; margin: 15px 0; line-height: 1.6;">
              ${therapistName ? `${therapistName} enviou` : 'Foi enviado'} um link para você agendar sua consulta de forma rápida e conveniente.
            </p>
            <p style="color: #475569; margin: 15px 0; line-height: 1.6;">
              Clique no botão abaixo para acessar o sistema de agendamento:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${bookingLink}" 
                 style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                📅 Agendar Consulta
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
              Este link é válido por 7 dias. Caso tenha dúvidas, entre em contato conosco.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px;">O que você pode fazer:</h3>
            <div style="color: #475569; font-size: 14px; line-height: 1.6;">
              <div style="display: flex; align-items: center; gap: 10px; margin: 8px 0;">
                <span style="font-size: 16px;">📅</span>
                <span>Escolher data e horário disponível</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; margin: 8px 0;">
                <span style="font-size: 16px;">⏰</span>
                <span>Confirmar agendamento instantaneamente</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; margin: 8px 0;">
                <span style="font-size: 16px;">📱</span>
                <span>Receber confirmação por email</span>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              Este email foi enviado automaticamente pelo Monitor Terapêutico.<br>
              Se você não solicitou este agendamento, pode ignorar este email.
            </p>
          </div>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error("Erro do Resend:", emailResponse.error);
      throw new Error(`Erro ao enviar email: ${emailResponse.error.message}`);
    }

    console.log("Link de agendamento enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Link de agendamento enviado com sucesso",
      emailId: emailResponse.data?.id,
      resendResponse: emailResponse
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar link de agendamento:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro interno do servidor",
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