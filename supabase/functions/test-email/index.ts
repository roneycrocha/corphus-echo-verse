import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
    const { email }: { email: string } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verificar se a API key existe
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    console.log("RESEND_API_KEY configurado:", !!resendApiKey);
    
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ 
          error: "RESEND_API_KEY não configurado",
          configured: false 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resend = new Resend(resendApiKey);

    console.log("Tentando enviar email de teste para:", email);

    const emailResponse = await resend.emails.send({
      from: "Monitor Terapêutico <contato@corphus.ai>",
      to: [email],
      subject: "Email de Teste - Monitor Terapêutico",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">✅ Email Funcionando!</h1>
          <p>Este é um email de teste para verificar se a configuração do Resend está funcionando corretamente.</p>
          <p><strong>Enviado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          <p><strong>Para:</strong> ${email}</p>
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
            <p style="margin: 0;">Se você recebeu este email, significa que a configuração está funcionando perfeitamente!</p>
          </div>
        </div>
      `,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Email de teste enviado com sucesso",
      emailId: emailResponse.data?.id,
      resendResponse: emailResponse,
      configured: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email de teste:", error);
    
    // Capturar erros específicos do Resend
    let errorMessage = error.message;
    let errorType = "unknown";
    
    if (error.message?.includes("API key")) {
      errorType = "api_key";
      errorMessage = "Problema com a chave API do Resend";
    } else if (error.message?.includes("domain")) {
      errorType = "domain";
      errorMessage = "Problema com o domínio de envio";
    } else if (error.message?.includes("rate limit")) {
      errorType = "rate_limit";
      errorMessage = "Limite de envio excedido";
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        errorType,
        details: error.message,
        configured: !!Deno.env.get("RESEND_API_KEY")
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);