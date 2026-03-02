import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider, api_key } = await req.json();

    if (!api_key || !provider) {
      return new Response(JSON.stringify({ valid: false, message: "Missing provider or API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let valid = false;
    let message = "";
    let account = "";

    if (provider === "brevo") {
      const res = await fetch("https://api.brevo.com/v3/account", {
        headers: { "accept": "application/json", "api-key": api_key },
      });
      const text = await res.text();
      if (res.ok) {
        valid = true;
        try {
          const data = JSON.parse(text);
          account = data.email || data.companyName || "";
          message = `Connected${account ? ` — ${account}` : ""}`;
        } catch {
          message = "API key is valid";
        }
      } else {
        message = `Invalid API key (${res.status})`;
        try { message = JSON.parse(text).message || message; } catch {}
      }
    } else if (provider === "resend") {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { "Authorization": `Bearer ${api_key}` },
      });
      const text = await res.text();
      if (res.ok) {
        valid = true;
        try {
          const data = JSON.parse(text);
          const domains = data.data?.map((d: any) => d.name).join(", ") || "";
          message = `Connected${domains ? ` — Domains: ${domains}` : ""}`;
        } catch {
          message = "API key is valid";
        }
      } else {
        message = `Invalid API key (${res.status})`;
        try { message = JSON.parse(text).message || message; } catch {}
      }
    } else if (provider === "sendgrid") {
      const res = await fetch("https://api.sendgrid.com/v3/user/profile", {
        headers: { "Authorization": `Bearer ${api_key}` },
      });
      const text = await res.text();
      if (res.ok) {
        valid = true;
        try {
          const data = JSON.parse(text);
          account = data.username || "";
          message = `Connected${account ? ` — ${account}` : ""}`;
        } catch {
          message = "API key is valid";
        }
      } else {
        message = `Invalid API key (${res.status})`;
        try {
          const parsed = JSON.parse(text);
          message = parsed.errors?.[0]?.message || message;
        } catch {}
      }
    } else {
      message = "Unsupported provider";
    }

    return new Response(JSON.stringify({ valid, message, account }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Verify API key error:", err);
    return new Response(JSON.stringify({ valid: false, message: err.message || "Verification failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
