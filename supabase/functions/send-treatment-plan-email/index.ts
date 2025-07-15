import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TreatmentPlanEmailRequest {
  to: string;
  patientName: string;
  planTitle: string;
  content: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, patientName, planTitle, content }: TreatmentPlanEmailRequest = await req.json();

    console.log('Enviando plano terapêutico por email para:', to);

    const emailResponse = await resend.emails.send({
      from: "Monitor Terapêutico <contato@corphus.ai>",
      to: [to],
      subject: `Plano Terapêutico: ${planTitle}`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Plano Terapêutico</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #3B82F6;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #3B82F6;
              margin-bottom: 10px;
            }
            h1 {
              color: #1F2937;
              margin-bottom: 10px;
            }
            h2 {
              color: #3B82F6;
              border-left: 4px solid #3B82F6;
              padding-left: 15px;
              margin-top: 30px;
            }
            h3 {
              color: #1F2937;
              margin-top: 25px;
              margin-bottom: 10px;
            }
            h4 {
              color: #374151;
              margin-bottom: 8px;
            }
            ul {
              padding-left: 20px;
            }
            li {
              margin-bottom: 5px;
            }
            .action-item {
              background-color: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 15px;
            }
            .priority {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .priority-high {
              background-color: #FEE2E2;
              color: #991B1B;
            }
            .priority-medium {
              background-color: #FEF3C7;
              color: #92400E;
            }
            .priority-low {
              background-color: #D1FAE5;
              color: #065F46;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #E5E7EB;
              color: #6B7280;
              font-size: 14px;
            }
            .patient-info {
              background-color: #F3F4F6;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🏥 Monitor Terapêutico</div>
            <h1>Plano Terapêutico</h1>
          </div>
          
          <div class="patient-info">
            <strong>Paciente:</strong> ${patientName}<br>
            <strong>Data de emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}
          </div>
          
          ${content}
          
          <div class="footer">
            <p>Este plano terapêutico foi gerado pelo Monitor Terapêutico.</p>
            <p>Em caso de dúvidas, entre em contato com seu terapeuta.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email do plano terapêutico:", error);
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