import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LogEntry {
  timestamp: string;
  step: string;
  status: "ok" | "error" | "info" | "warn";
  detail: string;
}

function log(logs: LogEntry[], step: string, status: LogEntry["status"], detail: string) {
  logs.push({ timestamp: new Date().toISOString(), step, status, detail });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const logs: LogEntry[] = [];

  try {
    log(logs, "Auth", "info", "Checking authorization header...");
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      log(logs, "Auth", "error", "No authorization header found");
      return new Response(JSON.stringify({ error: "Unauthorized", logs }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log(logs, "Auth", "ok", "Authorization header present");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    log(logs, "Auth", "info", "Verifying user identity...");
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      log(logs, "Auth", "error", `User verification failed: ${authErr?.message || "No user"}`);
      return new Response(JSON.stringify({ error: "Unauthorized", logs }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log(logs, "Auth", "ok", `User verified: ${user.email}`);

    log(logs, "Auth", "info", "Checking admin role...");
    const { data: roleData } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!roleData) {
      log(logs, "Auth", "error", "User does not have admin role");
      return new Response(JSON.stringify({ error: "Admin access required", logs }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log(logs, "Auth", "ok", "Admin role confirmed");

    const { to_email, smtp_config } = await req.json();
    log(logs, "Config", "info", `Host: ${smtp_config?.host || "NOT SET"}`);
    log(logs, "Config", "info", `Port: ${smtp_config?.port || "NOT SET"}`);
    log(logs, "Config", "info", `Username: ${smtp_config?.username ? smtp_config.username.replace(/(.{3}).*(@.*)/, "$1***$2") : "NOT SET"}`);
    log(logs, "Config", "info", `Password: ${smtp_config?.password ? "••••••••" : "NOT SET"}`);
    log(logs, "Config", "info", `From Email: ${smtp_config?.from_email || smtp_config?.username || "NOT SET"}`);
    log(logs, "Config", "info", `From Name: ${smtp_config?.from_name || "NOT SET"}`);
    log(logs, "Config", "info", `Encryption: ${smtp_config?.encryption || "tls"}`);
    log(logs, "Config", "info", `Recipient: ${to_email || "NOT SET"}`);

    if (!to_email || !smtp_config?.host || !smtp_config?.username || !smtp_config?.password) {
      log(logs, "Validation", "error", "Missing required fields: to_email, host, username, or password");
      return new Response(
        JSON.stringify({ error: "Missing required fields", logs }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    log(logs, "Validation", "ok", "All required fields present");

    // Step 1: DNS resolution check
    log(logs, "DNS", "info", `Resolving hostname: ${smtp_config.host}...`);
    try {
      const dnsCheck = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(smtp_config.host)}&type=A`);
      const dnsData = await dnsCheck.json();
      if (dnsData.Answer && dnsData.Answer.length > 0) {
        const ips = dnsData.Answer.filter((a: any) => a.type === 1).map((a: any) => a.data);
        log(logs, "DNS", "ok", `Resolved to: ${ips.join(", ") || "found records"}`);
      } else {
        log(logs, "DNS", "warn", `No A records found for ${smtp_config.host}. MX or CNAME may still work.`);
      }
    } catch (dnsErr: any) {
      log(logs, "DNS", "warn", `DNS lookup via Google DNS API failed: ${dnsErr.message}`);
    }

    // Step 2: MX record check for recipient domain
    const recipientDomain = to_email.split("@")[1];
    log(logs, "MX Check", "info", `Checking MX records for recipient domain: ${recipientDomain}...`);
    try {
      const mxCheck = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(recipientDomain)}&type=MX`);
      const mxData = await mxCheck.json();
      if (mxData.Answer && mxData.Answer.length > 0) {
        const mxRecords = mxData.Answer.filter((a: any) => a.type === 15).map((a: any) => a.data);
        log(logs, "MX Check", "ok", `Recipient MX: ${mxRecords.join(", ") || "found"}`);
      } else {
        log(logs, "MX Check", "warn", `No MX records found for ${recipientDomain}`);
      }
    } catch (mxErr: any) {
      log(logs, "MX Check", "warn", `MX lookup failed: ${mxErr.message}`);
    }

    // Step 3: HTTPS connectivity test to SMTP host
    log(logs, "Connectivity", "info", `Testing HTTPS connection to ${smtp_config.host}...`);
    try {
      const connTest = await fetch(`https://${smtp_config.host}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      log(logs, "Connectivity", "ok", `HTTPS response: ${connTest.status} ${connTest.statusText}`);
    } catch (connErr: any) {
      log(logs, "Connectivity", "warn", `HTTPS probe failed (expected for most SMTP servers): ${connErr.message}`);
    }

    // Step 4: Explain limitation
    log(logs, "SMTP Send", "warn", "Edge Functions do not support raw TCP/SMTP connections (Deno Deploy limitation)");
    log(logs, "SMTP Send", "info", "To send actual emails, configure an SMTP relay service (e.g., Resend, SendGrid, Mailgun) or use an HTTP-based email API");
    
    // Step 5: Summary
    const port = parseInt(smtp_config.port || "587");
    const fromAddr = smtp_config.from_email || smtp_config.username;
    log(logs, "Summary", "warn", `Configuration appears valid but NO email was actually sent to ${to_email}`);
    log(logs, "Summary", "info", `SMTP: ${smtp_config.host}:${port} | From: ${fromAddr} | Encryption: ${smtp_config.encryption || "tls"}`);
    log(logs, "Summary", "info", "Recommendation: Use an HTTP email API (Resend, SendGrid) for actual email delivery from edge functions");

    return new Response(
      JSON.stringify({
        success: false,
        message: `SMTP configuration validated but email was NOT sent. Edge Functions cannot make raw SMTP connections. See log report for details.`,
        logs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("SMTP test error:", err);
    log(logs, "Error", "error", err.message || "Unknown error");
    return new Response(
      JSON.stringify({ error: err.message || "Failed to test SMTP", logs }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
