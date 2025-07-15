import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create a Supabase client using the anon key for user authentication
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get plan from request body
    const { planId, billingType = 'monthly' } = await req.json();
    if (!planId) {
      throw new Error("Plan ID is required");
    }
    
    logStep("Request parameters", { planId, billingType });
    
    // Buscar dados do plano no banco de dados
    const { data: planData, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('plan_type', planId)
      .eq('is_active', true)
      .single();
    
    if (planError || !planData) {
      throw new Error(`Plan not found: ${planId}`);
    }
    
    logStep("Plan found in database", { planId, planData });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("Creating new customer");
    }

    // Determinar preço e intervalo baseado no tipo de cobrança
    const isAnnual = billingType === 'annual';
    const price = isAnnual ? planData.annual_price : planData.monthly_price;
    const credits = isAnnual ? (planData.annual_credits || planData.monthly_credits) : planData.monthly_credits;
    const interval = isAnnual ? 'year' : 'month';
    
    if (isAnnual && !planData.annual_price) {
      throw new Error(`Annual pricing not available for plan: ${planId}`);
    }
    
    logStep("Pricing determined", { price, credits, interval, isAnnual });

    // Create checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: { 
              name: `${planData.name}${isAnnual ? ' - Anual' : ''}`,
              description: `${credits || 0} créditos ${isAnnual ? 'mensais' : 'inclusos'}${isAnnual ? ` (${credits * 12} anuais)` : ''}`
            },
            unit_amount: Math.round(price * 100), // Converter para centavos
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription-plans`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        plan_type: planData.plan_type,
        billing_type: billingType,
        billing_cycle: billingType,
        credits: (credits || 0).toString(),
        plan_name: planData.name
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});