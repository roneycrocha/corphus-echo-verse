import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VINDI-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { event, data } = body;

    logStep("Processing webhook event", { event, data: data ? { id: data.id, type: data.type } : null });

    switch (event) {
      case "charge_paid":
        await handleChargePaid(supabaseClient, data);
        break;
      case "charge_rejected":
        await handleChargeRejected(supabaseClient, data);
        break;
      case "subscription_created":
        await handleSubscriptionCreated(supabaseClient, data);
        break;
      case "subscription_canceled":
        await handleSubscriptionCanceled(supabaseClient, data);
        break;
      case "subscription_renewed":
        await handleSubscriptionRenewed(supabaseClient, data);
        break;
      default:
        logStep("Unhandled webhook event", { event });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in vindi-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleChargePaid(supabaseClient: any, data: any) {
  logStep("Processing charge paid", { chargeId: data.id });

  const metadata = data.metadata || {};
  const userId = metadata.supabase_user_id;

  if (!userId) {
    logStep("No user ID found in charge metadata");
    return;
  }

  // Check if this is a credit purchase
  const packageId = metadata.package_id;
  const credits = metadata.credits;
  const bonusCredits = metadata.bonus_credits;

  if (packageId && credits) {
    const totalCredits = parseInt(credits) + parseInt(bonusCredits || 0);
    
    // Add credits to user account
    await supabaseClient.rpc("add_credits", {
      p_user_id: userId,
      p_amount: totalCredits,
      p_description: `Credit purchase payment confirmed`,
      p_transaction_type: "purchase",
      p_vindi_charge_id: data.id
    });

    logStep("Credits added for paid charge", { userId, totalCredits, chargeId: data.id });
  }
}

async function handleChargeRejected(supabaseClient: any, data: any) {
  logStep("Processing charge rejected", { chargeId: data.id });
  
  // Log the rejection for potential retry or user notification
  const metadata = data.metadata || {};
  const userId = metadata.supabase_user_id;

  if (userId) {
    // You could implement notification logic here
    logStep("Charge rejected for user", { userId, chargeId: data.id });
  }
}

async function handleSubscriptionCreated(supabaseClient: any, data: any) {
  logStep("Processing subscription created", { subscriptionId: data.id });

  const metadata = data.metadata || {};
  const userId = metadata.supabase_user_id;
  const planType = metadata.plan_type;

  if (!userId || !planType) {
    logStep("Missing user ID or plan type in subscription metadata");
    return;
  }

  // Update subscription status in database
  await supabaseClient
    .from("user_subscriptions")
    .update({
      status: "active",
      vindi_subscription_id: data.id,
      started_at: new Date().toISOString(),
      next_billing_date: data.next_billing_at
    })
    .eq("user_id", userId);

  logStep("Subscription updated in database", { userId, subscriptionId: data.id });
}

async function handleSubscriptionCanceled(supabaseClient: any, data: any) {
  logStep("Processing subscription canceled", { subscriptionId: data.id });

  // Update subscription status
  await supabaseClient
    .from("user_subscriptions")
    .update({
      status: "canceled",
      expires_at: new Date().toISOString()
    })
    .eq("vindi_subscription_id", data.id);

  logStep("Subscription canceled in database", { subscriptionId: data.id });
}

async function handleSubscriptionRenewed(supabaseClient: any, data: any) {
  logStep("Processing subscription renewed", { subscriptionId: data.id });

  const metadata = data.metadata || {};
  const userId = metadata.supabase_user_id;
  const planType = metadata.plan_type;

  if (!userId || !planType) {
    logStep("Missing user ID or plan type in subscription metadata");
    return;
  }

  // Update next billing date
  await supabaseClient
    .from("user_subscriptions")
    .update({
      next_billing_date: data.next_billing_at,
      updated_at: new Date().toISOString()
    })
    .eq("vindi_subscription_id", data.id);

  // Add monthly credits if applicable
  const { data: planData } = await supabaseClient
    .from("subscription_plans")
    .select("monthly_credits, name")
    .eq("plan_type", planType)
    .single();

  if (planData && planData.monthly_credits > 0) {
    await supabaseClient.rpc("add_credits", {
      p_user_id: userId,
      p_amount: planData.monthly_credits,
      p_description: `Monthly credits for ${planData.name} plan renewal`,
      p_transaction_type: "plan_bonus"
    });

    logStep("Monthly credits added for renewal", { 
      userId, 
      credits: planData.monthly_credits,
      subscriptionId: data.id 
    });
  }
}