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
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use the service role key to perform writes (upsert) in Supabase
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
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
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Buscar o perfil do usuário para obter o account_id
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (profileError || !profileData?.account_id) {
      logStep("Profile not found or no account_id", { profileError });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const accountId = profileData.account_id;
    logStep("Found user account", { accountId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, updating account unsubscribed state");
      await supabaseClient.from("accounts").update({
        subscription_status: 'inactive',
        subscription_plan: 'basic',
        updated_at: new Date().toISOString(),
      }).eq('id', accountId);
      
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = 'bronze';
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Determine subscription tier from price by comparing with database plans
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const amount = (price.unit_amount || 0) / 100; // Converter centavos para reais
      const interval = price.recurring?.interval || 'month';
      
      // Buscar planos do banco para determinar o tipo baseado no preço e intervalo
      const { data: plansData } = await supabaseClient
        .from('subscription_plans')
        .select('plan_type, monthly_price, annual_price')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });
      
      logStep("Price details", { priceId, amount, interval, plansData });
      
      // Encontrar o plano correspondente ao preço baseado no intervalo
      let matchedPlan = null;
      if (interval === 'year') {
        // Para planos anuais, comparar com annual_price
        matchedPlan = plansData?.find(plan => 
          plan.annual_price && Math.abs(plan.annual_price - amount) < 0.01
        );
      } else {
        // Para planos mensais, comparar com monthly_price
        matchedPlan = plansData?.find(plan => 
          Math.abs(plan.monthly_price - amount) < 0.01
        );
      }
      
      subscriptionTier = matchedPlan?.plan_type || 'bronze';
      
      logStep("Determined subscription tier", { 
        priceId, 
        amount, 
        interval,
        subscriptionTier, 
        matchedPlan,
        comparisonType: interval === 'year' ? 'annual_price' : 'monthly_price'
      });
    } else {
      logStep("No active subscription found");
    }

    // Atualizar os dados da conta com a informação da assinatura
    await supabaseClient.from("accounts").update({
      subscription_status: hasActiveSub ? 'active' : 'inactive',
      subscription_plan: subscriptionTier,
      updated_at: new Date().toISOString(),
    }).eq('id', accountId);

    logStep("Updated account with subscription info", { accountId, subscribed: hasActiveSub, subscriptionTier });
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_type: subscriptionTier,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});