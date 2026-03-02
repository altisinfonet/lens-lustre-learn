import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, MessageCircle, Eye, EyeOff, Save, TestTube, Send, CheckCircle, XCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
}

interface SmtpSettings {
  host: string;
  port: string;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  encryption: "tls" | "ssl" | "none";
}

interface WhatsAppSettings {
  provider: "twilio" | "meta" | "other";
  api_key: string;
  api_secret: string;
  phone_number: string;
  account_sid: string;
  webhook_url: string;
}

const defaultSmtp: SmtpSettings = {
  host: "",
  port: "587",
  username: "",
  password: "",
  from_email: "",
  from_name: "",
  encryption: "tls",
};

const defaultWhatsApp: WhatsAppSettings = {
  provider: "twilio",
  api_key: "",
  api_secret: "",
  phone_number: "",
  account_sid: "",
  webhook_url: "",
};

export default function AdminSettings({ user }: Props) {
  const [smtp, setSmtp] = useState<SmtpSettings>(defaultSmtp);
  const [whatsapp, setWhatsapp] = useState<WhatsAppSettings>(defaultWhatsApp);
  const [loading, setLoading] = useState(true);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingWa, setSavingWa] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showWaSecret, setShowWaSecret] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["smtp_settings", "whatsapp_settings"]);

      if (data) {
        for (const row of data) {
          if (row.key === "smtp_settings") {
            setSmtp({ ...defaultSmtp, ...(row.value as any) });
          }
          if (row.key === "whatsapp_settings") {
            setWhatsapp({ ...defaultWhatsApp, ...(row.value as any) });
          }
        }
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const saveSmtp = async () => {
    if (!user) return;
    setSavingSmtp(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({
        key: "smtp_settings",
        value: smtp as any,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    setSavingSmtp(false);
    if (error) {
      toast({ title: "Failed to save SMTP settings", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "SMTP settings saved" });
    }
  };

  const testSmtp = async () => {
    if (!testEmail.trim()) {
      toast({ title: "Enter a test email address", variant: "destructive" });
      return;
    }
    if (!smtp.host || !smtp.username || !smtp.password) {
      toast({ title: "Please fill in SMTP host, username, and password first", variant: "destructive" });
      return;
    }
    setTestingSmtp(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("test-smtp", {
        body: {
          to_email: testEmail.trim(),
          smtp_config: smtp,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTestResult({ success: true, message: data?.message || `Test email sent to ${testEmail}` });
      toast({ title: "Test email sent successfully!" });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Failed to send test email" });
      toast({ title: "SMTP test failed", description: err.message, variant: "destructive" });
    }
    setTestingSmtp(false);
  };

  const saveWhatsApp = async () => {
    if (!user) return;
    setSavingWa(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({
        key: "whatsapp_settings",
        value: whatsapp as any,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    setSavingWa(false);
    if (error) {
      toast({ title: "Failed to save WhatsApp settings", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "WhatsApp settings saved" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>Loading settings...</span>
      </div>
    );
  }

  const inputClass = "w-full bg-background border border-border px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:border-primary transition-colors";
  const labelClass = "text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-1.5";

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-px bg-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Configuration</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Integration <em className="italic text-primary">Settings</em>
        </h2>
        <p className="text-xs text-muted-foreground mt-2 max-w-md" style={{ fontFamily: "var(--font-body)" }}>
          Configure SMTP email and WhatsApp API credentials for notifications and messaging.
        </p>
      </div>

      {/* SMTP Settings */}
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card/50">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium tracking-wide uppercase" style={{ fontFamily: "var(--font-heading)" }}>SMTP Email Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>SMTP Host</label>
              <input className={inputClass} placeholder="smtp.gmail.com" value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Port</label>
              <input className={inputClass} placeholder="587" value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Username / Email</label>
              <input className={inputClass} placeholder="noreply@example.com" value={smtp.username} onChange={(e) => setSmtp({ ...smtp, username: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Password</label>
              <div className="relative">
                <input className={inputClass + " pr-10"} type={showSmtpPass ? "text" : "password"} placeholder="••••••••" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} />
                <button onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showSmtpPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>From Email</label>
              <input className={inputClass} placeholder="noreply@50mmretina.com" value={smtp.from_email} onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>From Name</label>
              <input className={inputClass} placeholder="50mm Retina" value={smtp.from_name} onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Encryption</label>
              <select className={inputClass} value={smtp.encryption} onChange={(e) => setSmtp({ ...smtp, encryption: e.target.value as any })}>
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={saveSmtp}
              disabled={savingSmtp}
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {savingSmtp ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save SMTP Settings
            </button>
          </div>

          {/* Test SMTP Section */}
          <div className="border-t border-border pt-5 mt-5">
            <div className="flex items-center gap-2 mb-3">
              <TestTube className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                Test SMTP Connection
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>
              Send a test email to verify your SMTP configuration is working correctly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => { setTestEmail(e.target.value); setTestResult(null); }}
                placeholder="Enter test email address"
                className={inputClass + " sm:max-w-xs"}
                style={{ fontFamily: "var(--font-body)" }}
              />
              <button
                onClick={testSmtp}
                disabled={testingSmtp || !testEmail.trim()}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {testingSmtp ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Send Test Email
              </button>
            </div>
            {testResult && (
              <div className={`mt-3 flex items-start gap-2 px-4 py-3 border rounded-sm text-xs ${
                testResult.success
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`} style={{ fontFamily: "var(--font-body)" }}>
                {testResult.success ? <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp API Settings */}
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card/50">
          <MessageCircle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium tracking-wide uppercase" style={{ fontFamily: "var(--font-heading)" }}>WhatsApp API Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Provider</label>
              <select className={inputClass} value={whatsapp.provider} onChange={(e) => setWhatsapp({ ...whatsapp, provider: e.target.value as any })}>
                <option value="twilio">Twilio</option>
                <option value="meta">Meta (WhatsApp Business API)</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Phone Number</label>
              <input className={inputClass} placeholder="+1234567890" value={whatsapp.phone_number} onChange={(e) => setWhatsapp({ ...whatsapp, phone_number: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>
                {whatsapp.provider === "twilio" ? "Account SID" : "App ID"}
              </label>
              <input className={inputClass} placeholder={whatsapp.provider === "twilio" ? "ACxxxxxxxx" : "App ID"} value={whatsapp.account_sid} onChange={(e) => setWhatsapp({ ...whatsapp, account_sid: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>API Key / Token</label>
              <input className={inputClass} placeholder="API Key or Access Token" value={whatsapp.api_key} onChange={(e) => setWhatsapp({ ...whatsapp, api_key: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>API Secret / Auth Token</label>
              <div className="relative">
                <input className={inputClass + " pr-10"} type={showWaSecret ? "text" : "password"} placeholder="••••••••" value={whatsapp.api_secret} onChange={(e) => setWhatsapp({ ...whatsapp, api_secret: e.target.value })} />
                <button onClick={() => setShowWaSecret(!showWaSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showWaSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Webhook URL (optional)</label>
              <input className={inputClass} placeholder="https://..." value={whatsapp.webhook_url} onChange={(e) => setWhatsapp({ ...whatsapp, webhook_url: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={saveWhatsApp}
              disabled={savingWa}
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {savingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save WhatsApp Settings
            </button>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="border border-border/50 rounded-sm px-5 py-4 bg-muted/20">
        <p className="text-[11px] text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
          <strong className="text-foreground">Note:</strong> These credentials are stored securely and used by the platform for sending email notifications and WhatsApp messages. 
          Make sure to test your configurations after saving. Changes take effect immediately.
        </p>
      </div>
    </div>
  );
}
