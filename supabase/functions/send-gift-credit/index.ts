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

    const body = await req.json();
    const { admin_id, target_type, target_email, user_ids, amount, reason, gift_credit_id } = body;

    // Verify admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: admin_id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resolvedUserIds: string[] = user_ids || [];

    // For email target, find user by email
    if (target_type === "email" && target_email) {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const matchedUser = authUsers?.users?.find(
        (u: any) => u.email?.toLowerCase() === target_email.toLowerCase()
      );

      if (!matchedUser) {
        return new Response(
          JSON.stringify({ error: "User with this email not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      resolvedUserIds = [matchedUser.id];

      // Create gift credit record
      const { data: gc } = await supabase
        .from("gift_credits")
        .insert({
          admin_id,
          amount,
          reason,
          target_type: "email",
          target_value: target_email,
          recipients_count: 1,
        })
        .select("id")
        .single();

      // Credit wallet
      await supabase.rpc("admin_wallet_credit", {
        _admin_id: admin_id,
        _target_user_id: matchedUser.id,
        _amount: amount,
        _type: "gift",
        _description: reason,
      });

      // Create announcement
      await supabase.from("gift_announcements").insert({
        user_id: matchedUser.id,
        gift_credit_id: gc?.id,
        amount,
        reason,
      });
    }

    // Send email notifications to all resolved users
    if (resolvedUserIds.length > 0) {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const emailMap = new Map(
        authUsers?.users?.map((u: any) => [u.id, u.email]) || []
      );

      // We log the emails that should be sent — actual email sending requires
      // an email service integration. For now, we record the intent.
      const emails = resolvedUserIds
        .map((uid) => emailMap.get(uid))
        .filter(Boolean);

      console.log(
        `Gift notification emails would be sent to: ${emails.join(", ")}`
      );
      console.log(`Amount: $${amount}, Reason: ${reason}`);

      // If the project has Lovable email configured, we could use it here
      // For now, the in-app celebration modal handles the notification
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipients: resolvedUserIds.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Gift credit error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
