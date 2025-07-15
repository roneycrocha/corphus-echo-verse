import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-VINDI-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const vindiApiKey = Deno.env.get("VINDI_API_KEY");
    if (!vindiApiKey) {
      throw new Error("VINDI_API_KEY is not configured");
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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { planType, paymentMethodId } = await req.json();
    if (!planType) throw new Error("Plan type is required");

    logStep("Creating Vindi subscription", { planType, paymentMethodId });

    // Get subscription plan details
    const { data: planData, error: planError } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .eq("plan_type", planType)
      .single();

    if (planError || !planData) {
      throw new Error("Invalid subscription plan");
    }

    // Check if customer exists in Vindi, if not create one
    let vindiCustomerId;
    const customerResponse = await fetch(`https://app.vindi.com.br/api/v1/customers?query=${encodeURIComponent(user.email)}`, {
      headers: {
        "Authorization": `Basic ${btoa(vindiApiKey + ":")}`,
        "Content-Type": "application/json",
      },
    });

    const customerData = await customerResponse.json();
    
    if (customerData.customers && customerData.customers.length > 0) {
      vindiCustomerId = customerData.customers[0].id;
      logStep("Existing Vindi customer found", { vindiCustomerId });
    } else {
      // Create new customer in Vindi
      const createCustomerResponse = await fetch("https://app.vindi.com.br/api/v1/customers", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(vindiApiKey + ":")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.user_metadata?.full_name || user.email,
          email: user.email,
          metadata: {
            supabase_user_id: user.id
          }
        }),
      });

      const newCustomerData = await createCustomerResponse.json();
      if (!createCustomerResponse.ok) {
        logStep("Error creating Vindi customer", newCustomerData);
        throw new Error("Failed to create customer in Vindi");
      }

      vindiCustomerId = newCustomerData.customer.id;
      logStep("New Vindi customer created", { vindiCustomerId });
    }

    // Create subscription in Vindi
    const subscriptionPayload = {
      plan_id: getVindiPlanId(planType), // You'll need to configure these in Vindi
      customer_id: vindiCustomerId,
      payment_method_code: paymentMethodId || "credit_card",
      metadata: {
        supabase_user_id: user.id,
        plan_type: planType
      }
    };

    const subscriptionResponse = await fetch("https://app.vindi.com.br/api/v1/subscriptions", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(vindiApiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionPayload),
    });

    const subscriptionData = await subscriptionResponse.json();
    
    if (!subscriptionResponse.ok) {
      logStep("Error creating Vindi subscription", subscriptionData);
      throw new Error("Failed to create subscription in Vindi");
    }

    const vindiSubscriptionId = subscriptionData.subscription.id;
    logStep("Vindi subscription created", { vindiSubscriptionId });

    // Create or update subscription in Supabase
    const { error: subscriptionError } = await supabaseClient
      .from("user_subscriptions")
      .upsert({
        user_id: user.id,
        plan_type: planType,
        vindi_subscription_id: vindiSubscriptionId,
        status: "active",
        started_at: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      }, { onConflict: 'user_id' });

    if (subscriptionError) {
      logStep("Error saving subscription to Supabase", subscriptionError);
      throw new Error("Failed to save subscription");
    }

    // Add monthly credits if plan includes them
    if (planData.monthly_credits > 0) {
      await supabaseClient.rpc("add_credits", {
        p_user_id: user.id,
        p_amount: planData.monthly_credits,
        p_description: `Monthly credits for ${planData.name} plan`,
        p_transaction_type: "plan_bonus"
      });
    }

    logStep("Subscription created successfully");

    return new Response(JSON.stringify({
      success: true,
      subscription_id: vindiSubscriptionId,
      plan: planData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-vindi-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper function to map plan types to Vindi plan IDs
function getVindiPlanId(planType: string): string {
  const vindiPlanIds = {
    "bronze": Deno.env.get("VINDI_BRONZE_PLAN_ID") || "bronze_plan_id",
    "silver": Deno.env.get("VINDI_SILVER_PLAN_ID") || "silver_plan_id", 
    "gold": Deno.env.get("VINDI_GOLD_PLAN_ID") || "gold_plan_id"
  };
  
  return vindiPlanIds[planType as keyof typeof vindiPlanIds] || "bronze_plan_id";
}