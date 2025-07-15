import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
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
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get user's account_id
    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("account_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profileData?.account_id) {
      throw new Error("User account not found");
    }

    const accountId = profileData.account_id;
    logStep("Account ID found", { accountId });

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Session ID is required");

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Retrieved Stripe session", { sessionId: session_id, status: session.payment_status });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({
        success: false,
        message: "Payment not completed yet"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if credits have already been added for this session
    const { data: existingTransaction } = await supabaseClient
      .from("account_credit_transactions")
      .select("id")
      .eq("vindi_charge_id", session_id) // Reusing this field for Stripe session ID
      .eq("account_id", accountId)
      .single();

    if (existingTransaction) {
      logStep("Credits already added for this session");
      return new Response(JSON.stringify({
        success: true,
        message: "Credits already added",
        already_processed: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get package details from session metadata
    const packageId = session.metadata?.package_id;
    const credits = parseInt(session.metadata?.credits || "0");
    const bonusCredits = parseInt(session.metadata?.bonus_credits || "0");

    if (!packageId || !credits) {
      throw new Error("Invalid session metadata");
    }

    // Get package details for description
    const { data: packageData } = await supabaseClient
      .from("credit_packages")
      .select("name")
      .eq("id", packageId)
      .single();

    const totalCredits = credits + bonusCredits;
    const packageName = packageData?.name || "Credit Package";

    // Add credits to account
    const { data: result, error: rpcError } = await supabaseClient.rpc("add_account_credits", {
      p_account_id: accountId,
      p_user_id: user.id,
      p_amount: totalCredits,
      p_description: `Purchased ${packageName} via Stripe`,
      p_transaction_type: "purchase",
      p_vindi_charge_id: session_id // Reusing this field for Stripe session ID
    });

    if (rpcError) {
      throw new Error(`Failed to add credits: ${rpcError.message}`);
    }

    logStep("Credits added successfully", { 
      totalCredits, 
      packageName, 
      sessionId: session_id 
    });

    // Send welcome email
    try {
      const { error: emailError } = await supabaseClient.functions.invoke('send-welcome-email', {
        body: {
          package_name: packageName,
          credits_added: totalCredits,
          plan_type: session.metadata?.plan_type,
          billing_cycle: session.metadata?.billing_cycle,
          amount_paid: session.amount_total
        }
      });

      if (emailError) {
        logStep("Failed to send welcome email", { error: emailError });
        // Don't throw error - payment was successful, email is secondary
      } else {
        logStep("Welcome email sent successfully");
      }
    } catch (emailError) {
      logStep("Error sending welcome email", { error: emailError });
      // Don't throw error - payment was successful, email is secondary
    }

    return new Response(JSON.stringify({
      success: true,
      credits_added: totalCredits,
      package_name: packageName,
      session_id: session_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});