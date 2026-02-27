import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get active boosts that haven't reached their total
  const { data: boosts } = await supabase
    .from("scheduled_boosts")
    .select("*")
    .eq("status", "active")
    .lt("applied_amount", supabase.rpc ? 999999 : 999999); // will filter in code

  if (!boosts || boosts.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let processed = 0;

  for (const boost of boosts) {
    // Skip if already completed
    if (boost.applied_amount >= boost.total_amount) {
      await supabase.from("scheduled_boosts").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", boost.id);
      continue;
    }

    // Skip if ended
    if (boost.ends_at && new Date(boost.ends_at) < new Date()) {
      await supabase.from("scheduled_boosts").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", boost.id);
      continue;
    }

    // Apply increment
    const toApply = Math.min(boost.increment_per_hour, boost.total_amount - boost.applied_amount);
    const promises = [];
    for (let i = 0; i < toApply; i++) {
      promises.push(
        supabase.from("image_reactions").insert({
          image_id: boost.image_id,
          image_type: boost.image_type,
          reaction_type: boost.reaction_type,
          user_id: crypto.randomUUID(),
        })
      );
    }
    await Promise.all(promises);

    // Update applied count
    await supabase.from("scheduled_boosts").update({
      applied_amount: boost.applied_amount + toApply,
      updated_at: new Date().toISOString(),
      status: (boost.applied_amount + toApply >= boost.total_amount) ? "completed" : "active",
    }).eq("id", boost.id);

    processed++;
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
