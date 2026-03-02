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
    // Auth check
    log(logs, "Auth", "info", "Checking authorization...");
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      log(logs, "Auth", "error", "No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized", logs }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      log(logs, "Auth", "error", `User verification failed: ${authErr?.message || "No user"}`);
      return new Response(JSON.stringify({ error: "Unauthorized", logs }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log(logs, "Auth", "ok", `User verified: ${user.email}`);

    // Admin check
    const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!roleData) {
      log(logs, "Auth", "error", "User does not have admin role");
      return new Response(JSON.stringify({ error: "Admin access required", logs }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log(logs, "Auth", "ok", "Admin role confirmed");

    const { to_email, smtp_config } = await req.json();

    // Validate inputs
    if (!to_email) {
      log(logs, "Validation", "error", "No recipient email provided");
      return new Response(JSON.stringify({ error: "Missing recipient email", logs }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = smtp_config?.from_email || smtp_config?.username || "noreply@example.com";
    const fromName = smtp_config?.from_name || "50mm Retina";

    log(logs, "Config", "info", `From: ${fromName} <${fromEmail}>`);
    log(logs, "Config", "info", `To: ${to_email}`);
    log(logs, "Config", "info", `SMTP Host (saved): ${smtp_config?.host || "N/A"}`);
    log(logs, "Config", "info", `Using Brevo HTTP API for delivery`);

    // Check Brevo API key
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      log(logs, "Brevo API", "error", "BREVO_API_KEY secret is not configured");
      return new Response(JSON.stringify({
        success: false,
        message: "Brevo API key is not configured. Please add BREVO_API_KEY in your secrets.",
        logs,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    log(logs, "Brevo API", "ok", "API key found");

    // Send email via Brevo HTTP API
    log(logs, "Send Email", "info", "Sending test email via Brevo API...");

    const emailPayload = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to_email }],
      subject: `Test Email from ${fromName}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">✅ SMTP Test Successful</h2>
          <p style="color: #666; line-height: 1.6;">
            This is a test email sent from <strong>${fromName}</strong> admin panel.
          </p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; font-size: 14px;"><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>To:</strong> ${to_email}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Provider:</strong> Brevo (HTTP API)</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          </div>
          <p style="color: #999; font-size: 12px;">
            If you received this email, your email configuration is working correctly.
          </p>
        </div>
      `,
    };

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const brevoResult = await brevoResponse.text();

    if (brevoResponse.ok) {
      let messageId = "";
      try {
        const parsed = JSON.parse(brevoResult);
        messageId = parsed.messageId || "";
      } catch {}
      log(logs, "Send Email", "ok", `Email sent successfully! ${messageId ? `Message ID: ${messageId}` : ""}`);
      log(logs, "Summary", "ok", `Test email delivered to ${to_email} via Brevo API`);

      return new Response(JSON.stringify({
        success: true,
        message: `Test email sent successfully to ${to_email}`,
        logs,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      let errorDetail = brevoResult;
      try {
        const parsed = JSON.parse(brevoResult);
        errorDetail = parsed.message || parsed.code || brevoResult;
      } catch {}
      log(logs, "Send Email", "error", `Brevo API error (${brevoResponse.status}): ${errorDetail}`);
      log(logs, "Summary", "error", `Failed to send test email. Check your Brevo account and sender configuration.`);

      return new Response(JSON.stringify({
        success: false,
        message: `Brevo API error: ${errorDetail}`,
        logs,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err: any) {
    console.error("Test SMTP error:", err);
    log(logs, "Error", "error", err.message || "Unknown error");
    return new Response(
      JSON.stringify({ error: err.message || "Failed to test email", logs }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
