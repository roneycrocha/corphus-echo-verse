import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-CREDITS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not found");
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    
    // Check if it's the correct type of key
    if (!stripeKey.startsWith("sk_")) {
      logStep("ERROR: Invalid Stripe key type", { keyPrefix: stripeKey.substring(0, 3) });
      throw new Error("STRIPE_SECRET_KEY must be a secret key starting with sk_");
    }
    
    logStep("Stripe key found and validated");

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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { packageId } = await req.json();
    if (!packageId) throw new Error("Package ID is required");

    // Get credit package details
    const { data: packageData, error: packageError } = await supabaseClient
      .from("credit_packages")
      .select("*")
      .eq("id", packageId)
      .single();

    if (packageError || !packageData) {
      throw new Error("Invalid credit package");
    }

    logStep("Processing credit purchase", { packageData });

    // Get user's current subscription for pricing
    const { data: subscriptionData } = await supabaseClient
      .from("user_subscriptions")
      .select("plan_type")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    // Get subscription plan for discount calculation
    let creditMultiplier = 1.0;
    if (subscriptionData) {
      const { data: planData } = await supabaseClient
        .from("subscription_plans")
        .select("credit_multiplier")
        .eq("plan_type", subscriptionData.plan_type)
        .single();
      
      if (planData) {
        creditMultiplier = parseFloat(planData.credit_multiplier.toString());
      }
    }

    const finalPrice = packageData.price * creditMultiplier;
    logStep("Calculated final price", { originalPrice: packageData.price, creditMultiplier, finalPrice });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        metadata: {
          supabase_user_id: user.id
        }
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Create Stripe checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: packageData.name,
              description: `${packageData.credits + packageData.bonus_credits} créditos`,
            },
            unit_amount: Math.round(finalPrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/configuracoes?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/configuracoes?payment=canceled`,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        credits: packageData.credits.toString(),
        bonus_credits: packageData.bonus_credits.toString()
      }
    });

    logStep("Stripe checkout session created", { 
      sessionId: session.id, 
      url: session.url 
    });

    return new Response(JSON.stringify({
      success: true,
      payment_url: session.url,
      session_id: session.id,
      package: packageData,
      final_price: finalPrice
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in purchase-credits", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});