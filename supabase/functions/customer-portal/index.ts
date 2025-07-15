import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Initialize Supabase client with anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    logStep("Searching for Stripe customer", { email: user.email });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    logStep("Customer search result", { foundCustomers: customers.data.length });
    
    let customerId;
    if (customers.data.length === 0) {
      logStep("No customer found, creating new customer");
      const newCustomer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
      });
      customerId = newCustomer.id;
      logStep("Created new Stripe customer", { customerId, customerEmail: newCustomer.email });
    } else {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId, customerEmail: customers.data[0].email });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    try {
      // Tentar criar portal session com configuração padrão
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/configuracoes`,
      });
      logStep("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });

      return new Response(JSON.stringify({ url: portalSession.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (portalError: any) {
      logStep("Portal error", { error: portalError.message });
      
      // Se o portal falhar, retornar mensagem informativa com link para configurar
      const dashboardUrl = "https://dashboard.stripe.com/test/settings/billing/portal";
      return new Response(JSON.stringify({ 
        error: "Customer Portal não configurado",
        message: "Para usar o gerenciamento de assinatura, você precisa configurar o Customer Portal no Stripe.",
        dashboardUrl: dashboardUrl,
        instructions: "1. Acesse o dashboard do Stripe\n2. Vá em Settings > Billing > Customer Portal\n3. Ative as opções desejadas\n4. Salve as configurações"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Retornar 200 mas com informações para o usuário
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});