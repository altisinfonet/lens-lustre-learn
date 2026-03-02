import { corsHeaders } from "../_shared/secureHeaders.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify admin role
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to_email, smtp_config } = await req.json();

    if (!to_email || !smtp_config?.host || !smtp_config?.username || !smtp_config?.password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to_email, smtp host, username, password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new SmtpClient();

    const connectConfig: any = {
      hostname: smtp_config.host,
      port: parseInt(smtp_config.port || "587"),
      username: smtp_config.username,
      password: smtp_config.password,
    };

    if (smtp_config.encryption === "tls" || smtp_config.encryption === "ssl") {
      await client.connectTLS(connectConfig);
    } else {
      await client.connect(connectConfig);
    }

    await client.send({
      from: smtp_config.from_email || smtp_config.username,
      to: to_email,
      subject: `✅ SMTP Test — ${smtp_config.from_name || "Platform"}`,
      content: "This is a test email from your admin panel SMTP configuration.\n\nIf you received this email, your SMTP settings are working correctly!",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="font-size: 20px; font-weight: 400; margin: 0;">SMTP Test <em style="color: #666;">Successful</em></h1>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #444;">
            This is a test email sent from your admin panel SMTP configuration.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #444;">
            If you received this email, your SMTP settings are <strong>working correctly</strong>!
          </p>
          <div style="margin-top: 24px; padding: 16px; background: #f8f8f8; border: 1px solid #eee; font-size: 12px; color: #888;">
            <p style="margin: 0 0 4px;"><strong>Host:</strong> ${smtp_config.host}</p>
            <p style="margin: 0 0 4px;"><strong>Port:</strong> ${smtp_config.port || "587"}</p>
            <p style="margin: 0 0 4px;"><strong>From:</strong> ${smtp_config.from_email || smtp_config.username}</p>
            <p style="margin: 0;"><strong>Encryption:</strong> ${smtp_config.encryption || "tls"}</p>
          </div>
          <p style="font-size: 11px; color: #aaa; margin-top: 24px;">
            Sent at ${new Date().toISOString()}
          </p>
        </div>
      `,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: `Test email sent to ${to_email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("SMTP test error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to send test email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
