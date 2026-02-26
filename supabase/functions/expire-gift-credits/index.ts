import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find all gift announcements that have expired but haven't been deducted yet
    const { data: expiredGifts, error: fetchError } = await supabase
      .from("gift_announcements")
      .select("id, user_id, amount, reason, expires_at")
      .eq("is_expired", false)
      .not("expires_at", "is", null)
      .lt("expires_at", new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expiredGifts || expiredGifts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, expired: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let expiredCount = 0;

    for (const gift of expiredGifts) {
      try {
        // Check current wallet balance before deducting
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", gift.user_id)
          .maybeSingle();

        const currentBalance = wallet?.balance ?? 0;
        // Only deduct up to the current balance to avoid negative balance
        const deductAmount = Math.min(gift.amount, currentBalance);

        if (deductAmount > 0) {
          // Deduct expired gift amount from wallet
          const { error: txnError } = await supabase.rpc("wallet_transaction", {
            _user_id: gift.user_id,
            _type: "gift_expiry",
            _amount: -deductAmount,
            _description: `Gift credit expired: "${gift.reason}"`,
            _metadata: { expired_gift_id: gift.id, original_amount: gift.amount },
          });

          if (txnError) {
            console.error(`Failed to deduct for gift ${gift.id}:`, txnError.message);
            continue;
          }
        }

        // Mark as expired regardless of deduction amount
        await supabase
          .from("gift_announcements")
          .update({ is_expired: true })
          .eq("id", gift.id);

        expiredCount++;
      } catch (err: any) {
        console.error(`Error processing gift ${gift.id}:`, err.message);
      }
    }

    console.log(`Expired ${expiredCount} gift credits`);

    return new Response(
      JSON.stringify({ success: true, expired: expiredCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Gift expiry error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
