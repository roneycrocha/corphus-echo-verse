import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { WelcomeEmail } from "./_templates/welcome-email.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-WELCOME-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id || !user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { 
      user_name, 
      user_email, 
      created_by,
      package_name, 
      credits_added, 
      plan_type,
      billing_cycle,
      amount_paid 
    } = await req.json();

    // Get user profile for full name or use provided user data
    const userName = user_name || user.email?.split('@')[0] || 'Usuário';
    const userEmail = user_email || user.email;

    // Initialize Resend
    const resend = new Resend(resendKey);

    // Se for criação de usuário simples, usar template personalizado
    if (user_name && user_email && !package_name) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Corphus</h1>
              <p style="color: #64748b; margin: 5px 0; font-size: 16px;">Plataforma de Gestão Terapêutica</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="margin: 0 0 10px 0; font-size: 24px;">Bem-vindo, ${userName}!</h2>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">
                Sua conta foi criada com sucesso${created_by ? ` por ${created_by}` : ''}.
              </p>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">🔐 Próximos passos</h3>
              <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                Verifique seu email para confirmar sua conta e definir uma senha segura.
              </p>
              
              <div style="background: #e0f2fe; border: 1px solid #0277bd; border-radius: 6px; padding: 15px;">
                <p style="color: #01579b; margin: 0; font-size: 14px;">
                  <strong>📧 Seu email de acesso:</strong> ${userEmail}
                </p>
              </div>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
              <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 15px 0;">🚀 Recursos disponíveis:</h3>
              <ul style="color: #475569; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>Dashboard completo para gestão de pacientes</li>
                <li>Análise corporal com IA avançada</li>
                <li>Agendamento inteligente de consultas</li>
                <li>Relatórios detalhados e indicadores</li>
                <li>Comunicação em tempo real com pacientes</li>
                <li>Sistema financeiro integrado</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                Precisa de ajuda? Entre em contato conosco pelo email <a href="mailto:contato@corphus.ai" style="color: #2563eb;">contato@corphus.ai</a>
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
                © ${new Date().getFullYear()} Corphus. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      `;
      
      // Send the email
      const { error: emailError } = await resend.emails.send({
        from: "Corphus <contato@corphus.ai>",
        to: [userEmail],
        subject: "🎉 Bem-vindo ao Corphus - Sua conta foi criada!",
        html,
      });

      if (emailError) {
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      logStep("Welcome email sent successfully", { 
        to: userEmail,
        userName: userName
      });

      return new Response(JSON.stringify({
        success: true,
        message: "Welcome email sent successfully",
        email: userEmail
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Para emails de assinatura, usar template original
    const html = await renderAsync(
      WelcomeEmail({
        userName,
        packageName: package_name,
        creditsAdded: credits_added,
        planType: plan_type,
        billingCycle: billing_cycle,
        amountPaid: amount_paid,
        loginUrl: `${Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "")}/login`
      })
    );

    logStep("Email template rendered", { userName, packageName: package_name });

    // Send the email
    const { error: emailError } = await resend.emails.send({
      from: "corphus.ai <onboarding@resend.dev>",
      to: [user.email],
      subject: "🎉 Bem-vindo ao corphus.ai - Sua assinatura está ativa!",
      html,
    });

    if (emailError) {
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    logStep("Welcome email sent successfully", { 
      to: user.email,
      packageName: package_name,
      credits: credits_added
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Welcome email sent successfully",
      email: user.email
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-welcome-email", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});