import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, MessageCircle, Eye, EyeOff, Save, TestTube, Send, CheckCircle, XCircle, ChevronDown, ChevronUp, AlertTriangle, Info, ShieldCheck, ShieldX, ShieldQuestion, Cloud, ArrowRightLeft, FolderSync, Facebook, Instagram, Twitter, Youtube, Globe, Linkedin, Github, Music2, MapPin, Phone as PhoneIcon, Share2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { clearS3Cache } from "@/lib/s3Upload";
import { Progress } from "@/components/ui/progress";
import StorageMigrationPanel from "@/components/admin/StorageMigrationPanel";

interface Props {
  user: User | null;
}

type EmailProvider = "brevo" | "resend" | "sendgrid" | "smtp";

interface SmtpSettings {
  provider: EmailProvider;
  api_key: string;
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

interface SocialMediaLinks {
  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;
  linkedin: string;
  github: string;
  tiktok: string;
  pinterest: string;
  whatsapp_link: string;
  telegram: string;
  website: string;
}

const defaultSocial: SocialMediaLinks = {
  facebook: "",
  instagram: "",
  twitter: "",
  youtube: "",
  linkedin: "",
  github: "",
  tiktok: "",
  pinterest: "",
  whatsapp_link: "",
  telegram: "",
  website: "",
};

const SOCIAL_FIELDS: { key: keyof SocialMediaLinks; label: string; icon: any; placeholder: string; hoverColor: string }[] = [
  { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/yourpage", hoverColor: "hover:text-[#1877F2]" },
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/yourhandle", hoverColor: "hover:text-[#E4405F]" },
  { key: "twitter", label: "X (Twitter)", icon: Twitter, placeholder: "https://x.com/yourhandle", hoverColor: "hover:text-foreground" },
  { key: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@yourchannel", hoverColor: "hover:text-[#FF0000]" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/company/yourco", hoverColor: "hover:text-[#0A66C2]" },
  { key: "github", label: "GitHub", icon: Github, placeholder: "https://github.com/yourorg", hoverColor: "hover:text-foreground" },
  { key: "tiktok", label: "TikTok", icon: Music2, placeholder: "https://tiktok.com/@yourhandle", hoverColor: "hover:text-foreground" },
  { key: "pinterest", label: "Pinterest", icon: MapPin, placeholder: "https://pinterest.com/yourprofile", hoverColor: "hover:text-[#E60023]" },
  { key: "whatsapp_link", label: "WhatsApp", icon: PhoneIcon, placeholder: "https://wa.me/1234567890", hoverColor: "hover:text-[#25D366]" },
  { key: "telegram", label: "Telegram", icon: Send, placeholder: "https://t.me/yourchannel", hoverColor: "hover:text-[#0088CC]" },
  { key: "website", label: "Website", icon: Globe, placeholder: "https://yourwebsite.com", hoverColor: "hover:text-primary" },
];
interface S3StorageSettings {
  enabled: boolean;
  provider: string;
  bucket_name: string;
  region: string;
  access_key_id: string;
  secret_access_key: string;
  endpoint: string;
  path_prefix: string;
  public_url: string;
}

interface LogEntry {
  timestamp: string;
  step: string;
  status: "ok" | "error" | "info" | "warn";
  detail: string;
}

const defaultS3: S3StorageSettings = {
  enabled: false,
  provider: "aws",
  bucket_name: "",
  region: "us-east-1",
  access_key_id: "",
  secret_access_key: "",
  endpoint: "",
  path_prefix: "",
  public_url: "",
};

const defaultSmtp: SmtpSettings = {
  provider: "brevo",
  api_key: "",
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

function LogIcon({ status }: { status: LogEntry["status"] }) {
  switch (status) {
    case "ok": return <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />;
    case "error": return <XCircle className="h-3 w-3 text-destructive shrink-0" />;
    case "warn": return <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />;
    default: return <Info className="h-3 w-3 text-muted-foreground shrink-0" />;
  }
}

export default function AdminSettings({ user }: Props) {
  const [smtp, setSmtp] = useState<SmtpSettings>(defaultSmtp);
  const [whatsapp, setWhatsapp] = useState<WhatsAppSettings>(defaultWhatsApp);
  const [s3, setS3] = useState<S3StorageSettings>(defaultS3);
  const [savingS3, setSavingS3] = useState(false);
  const [showS3Secret, setShowS3Secret] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingWa, setSavingWa] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showWaSecret, setShowWaSecret] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testLogs, setTestLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<{ valid: boolean; message: string } | null>(null);
  const [verifyingKey, setVerifyingKey] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["smtp_settings", "whatsapp_settings", "s3_storage_settings"]);

      if (data) {
        for (const row of data) {
          if (row.key === "smtp_settings") {
            setSmtp({ ...defaultSmtp, ...(row.value as any) });
          }
          if (row.key === "whatsapp_settings") {
            setWhatsapp({ ...defaultWhatsApp, ...(row.value as any) });
          }
          if (row.key === "s3_storage_settings") {
            setS3({ ...defaultS3, ...(row.value as any) });
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
    setTestLogs([]);
    setShowLogs(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-smtp", {
        body: {
          to_email: testEmail.trim(),
          smtp_config: smtp,
        },
      });
      if (error) throw error;
      
      // Capture logs from response
      if (data?.logs) {
        setTestLogs(data.logs);
      }

      if (data?.error) {
        setTestResult({ success: false, message: data.error });
        toast({ title: "SMTP test failed", description: data.error, variant: "destructive" });
      } else {
        setTestResult({ success: data?.success ?? false, message: data?.message || "Test completed" });
        if (data?.success) {
          toast({ title: "SMTP test completed" });
        } else {
          toast({ title: "SMTP test completed with warnings", variant: "destructive" });
        }
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Failed to reach test endpoint" });
      toast({ title: "SMTP test failed", description: err.message, variant: "destructive" });
    }
    setTestingSmtp(false);
  };

  const verifyApiKey = async () => {
    if (!smtp.api_key || smtp.provider === "smtp") return;
    setVerifyingKey(true);
    setApiKeyStatus(null);
    try {
      const { data, error } = await supabase.functions.invoke("verify-email-provider", {
        body: { provider: smtp.provider, api_key: smtp.api_key },
      });
      if (error) throw error;
      setApiKeyStatus({ valid: data?.valid ?? false, message: data?.message || "Unknown" });
    } catch (err: any) {
      setApiKeyStatus({ valid: false, message: err.message || "Verification failed" });
    }
    setVerifyingKey(false);
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

  const saveS3 = async () => {
    if (!user) return;
    setSavingS3(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({
        key: "s3_storage_settings",
        value: s3 as any,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    setSavingS3(false);
    clearS3Cache();
    if (error) {
      toast({ title: "Failed to save S3 settings", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "S3 storage settings saved" });
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


      {/* Email Provider Settings */}
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card/50">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium tracking-wide uppercase" style={{ fontFamily: "var(--font-heading)" }}>Email Provider Settings</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Email Provider</label>
              <select className={inputClass} value={smtp.provider} onChange={(e) => setSmtp({ ...smtp, provider: e.target.value as EmailProvider })}>
                <option value="brevo">Brevo (Sendinblue)</option>
                <option value="resend">Resend</option>
                <option value="sendgrid">SendGrid</option>
                <option value="smtp">Custom SMTP</option>
              </select>
            </div>
            {smtp.provider !== "smtp" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelClass + " mb-0"} style={{ fontFamily: "var(--font-heading)" }}>
                    {smtp.provider === "brevo" ? "Brevo" : smtp.provider === "resend" ? "Resend" : "SendGrid"} API Key
                  </label>
                  {apiKeyStatus && (
                    <span className={`inline-flex items-center gap-1 text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-sm ${
                      apiKeyStatus.valid
                        ? "bg-green-500/10 text-green-600"
                        : "bg-destructive/10 text-destructive"
                    }`} style={{ fontFamily: "var(--font-heading)" }}>
                      {apiKeyStatus.valid ? <ShieldCheck className="h-2.5 w-2.5" /> : <ShieldX className="h-2.5 w-2.5" />}
                      {apiKeyStatus.valid ? "Verified" : "Invalid"}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input className={inputClass + " pr-10"} type={showSmtpPass ? "text" : "password"} placeholder="Enter API key" value={smtp.api_key} onChange={(e) => { setSmtp({ ...smtp, api_key: e.target.value }); setApiKeyStatus(null); }} />
                    <button onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showSmtpPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={verifyApiKey}
                    disabled={verifyingKey || !smtp.api_key}
                    className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase px-3 py-2.5 border border-border bg-muted/30 text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 shrink-0 rounded-sm"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {verifyingKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldQuestion className="h-3 w-3" />}
                    Verify
                  </button>
                </div>
                {apiKeyStatus && (
                  <p className={`text-[10px] mt-1.5 ${apiKeyStatus.valid ? "text-green-600" : "text-destructive"}`} style={{ fontFamily: "var(--font-body)" }}>
                    {apiKeyStatus.message}
                  </p>
                )}
              </div>
            )}
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>From Email</label>
              <input className={inputClass} placeholder="noreply@50mmretina.com" value={smtp.from_email} onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>From Name</label>
              <input className={inputClass} placeholder="50mm Retina" value={smtp.from_name} onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })} />
            </div>
            {smtp.provider === "smtp" && (
              <>
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
                  <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Encryption</label>
                  <select className={inputClass} value={smtp.encryption} onChange={(e) => setSmtp({ ...smtp, encryption: e.target.value as any })}>
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </>
            )}
          </div>
          {smtp.provider !== "smtp" && (
            <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              {smtp.provider === "brevo" && "Get your API key from Brevo Dashboard → SMTP & API → API Keys"}
              {smtp.provider === "resend" && "Get your API key from resend.com/api-keys"}
              {smtp.provider === "sendgrid" && "Get your API key from SendGrid → Settings → API Keys"}
            </p>
          )}
          {smtp.provider === "smtp" && (
            <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              ⚠️ Custom SMTP uses configuration validation only. For actual email delivery, use Brevo, Resend, or SendGrid.
            </p>
          )}
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
              Run a diagnostic test on your SMTP configuration. Full log report will be generated.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => { setTestEmail(e.target.value); setTestResult(null); setTestLogs([]); setShowLogs(false); }}
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

            {/* Test Result */}
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

            {/* Show Log Report Button */}
            {testLogs.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase px-4 py-2 border border-border bg-muted/30 text-foreground hover:bg-muted/60 transition-colors"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {showLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showLogs ? "Hide" : "Show"} Log Report ({testLogs.length} entries)
                </button>

                {showLogs && (
                  <div className="mt-2 border border-border rounded-sm overflow-hidden bg-card">
                    <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                        SMTP Test Log Report
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {testLogs.filter(l => l.status === "ok").length} ok · {testLogs.filter(l => l.status === "warn").length} warn · {testLogs.filter(l => l.status === "error").length} error
                      </span>
                    </div>
                    <ScrollArea className="max-h-72">
                      <div className="divide-y divide-border/50">
                        {testLogs.map((entry, i) => (
                          <div key={i} className="px-4 py-2 flex items-start gap-3 text-xs hover:bg-muted/20 transition-colors">
                            <LogIcon status={entry.status} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-medium text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                                  {entry.step}
                                </span>
                                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                                  entry.status === "ok" ? "bg-green-500/10 text-green-600" :
                                  entry.status === "error" ? "bg-destructive/10 text-destructive" :
                                  entry.status === "warn" ? "bg-yellow-500/10 text-yellow-600" :
                                  "bg-muted text-muted-foreground"
                                }`} style={{ fontFamily: "var(--font-heading)" }}>
                                  {entry.status}
                                </span>
                              </div>
                              <p className="text-muted-foreground break-all leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                                {entry.detail}
                              </p>
                            </div>
                            <span className="text-[9px] text-muted-foreground/60 font-mono shrink-0 hidden sm:block">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
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

      {/* Cloud Storage Settings */}
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card/50">
          <Cloud className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium tracking-wide uppercase" style={{ fontFamily: "var(--font-heading)" }}>Cloud Storage (S3-Compatible)</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <label className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>Enable External Storage</label>
            <Switch
              checked={s3.enabled}
              onCheckedChange={(checked) => setS3({ ...s3, enabled: checked })}
            />
            <span className={`text-[9px] tracking-wider uppercase ${s3.enabled ? "text-primary" : "text-muted-foreground"}`} style={{ fontFamily: "var(--font-heading)" }}>
              {s3.enabled ? "Active" : "Disabled"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>
            When enabled, all user-uploaded files (images, documents) will be stored in your chosen cloud storage provider instead of the default storage.
          </p>

          {/* Provider Preset Selector */}
          <div>
            <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Storage Provider</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
              {[
                { id: "aws", label: "Amazon S3", endpoint: "", regionLabel: "AWS Region" },
                { id: "gcs", label: "Google Cloud Storage", endpoint: "https://storage.googleapis.com", regionLabel: "GCS Region" },
                { id: "azure", label: "Azure Blob Storage", endpoint: "", regionLabel: "Region" },
                { id: "digitalocean", label: "DigitalOcean Spaces", endpoint: "", regionLabel: "DO Region" },
                { id: "wasabi", label: "Wasabi", endpoint: "", regionLabel: "Wasabi Region" },
                { id: "backblaze", label: "Backblaze B2", endpoint: "", regionLabel: "B2 Region" },
                { id: "cloudflare", label: "Cloudflare R2", endpoint: "", regionLabel: "Auto" },
                { id: "minio", label: "MinIO (Self-hosted)", endpoint: "", regionLabel: "Region" },
              ].map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => {
                    const presets: Record<string, Partial<S3StorageSettings>> = {
                      aws: { endpoint: "", region: s3.region || "us-east-1" },
                      gcs: { endpoint: "https://storage.googleapis.com", region: "auto" },
                      azure: { endpoint: `https://${s3.bucket_name || "ACCOUNT"}.blob.core.windows.net`, region: "auto" },
                      digitalocean: { endpoint: `https://${s3.region || "nyc3"}.digitaloceanspaces.com`, region: s3.region || "nyc3" },
                      wasabi: { endpoint: `https://s3.${s3.region || "us-east-1"}.wasabisys.com`, region: s3.region || "us-east-1" },
                      backblaze: { endpoint: `https://s3.${s3.region || "us-west-004"}.backblazeb2.com`, region: s3.region || "us-west-004" },
                      cloudflare: { endpoint: "", region: "auto" },
                      minio: { endpoint: s3.endpoint || "http://localhost:9000", region: "us-east-1" },
                    };
                    setS3({ ...s3, ...presets[provider.id], provider: provider.id as any });
                  }}
                  className={`text-[9px] tracking-[0.1em] uppercase px-3 py-2.5 border rounded-sm transition-colors text-center ${
                    (s3 as any).provider === provider.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {provider.label}
                </button>
              ))}
            </div>
          </div>

          {/* Provider-specific help text */}
          {(s3 as any).provider && (
            <div className="border border-border/50 rounded-sm px-4 py-3 bg-muted/20 mb-2">
              <p className="text-[10px] text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                {(s3 as any).provider === "aws" && "Use your IAM Access Key and Secret. Ensure your S3 bucket has the appropriate CORS and public access policies configured."}
                {(s3 as any).provider === "gcs" && "Create an HMAC key in Google Cloud Console → Cloud Storage → Settings → Interoperability. Use the Access Key and Secret as credentials."}
                {(s3 as any).provider === "azure" && "Use Azure Storage Account name as bucket, and a Shared Access Signature (SAS) or Storage Account Key. Set the endpoint to https://ACCOUNT.blob.core.windows.net."}
                {(s3 as any).provider === "digitalocean" && "Create a Spaces access key in DigitalOcean → API → Spaces Keys. Set the endpoint to https://REGION.digitaloceanspaces.com."}
                {(s3 as any).provider === "wasabi" && "Use Wasabi access keys from the Wasabi Console. Set the endpoint to https://s3.REGION.wasabisys.com."}
                {(s3 as any).provider === "backblaze" && "Create an Application Key in Backblaze B2. Use the keyID as Access Key and the applicationKey as Secret. Set the endpoint to https://s3.REGION.backblazeb2.com."}
                {(s3 as any).provider === "cloudflare" && "Get your R2 API token from Cloudflare Dashboard → R2 → Manage R2 API Tokens. Set endpoint to https://ACCOUNT_ID.r2.cloudflarestorage.com."}
                {(s3 as any).provider === "minio" && "Use your MinIO server's access key and secret key. Set the endpoint to your MinIO server URL (e.g. http://localhost:9000)."}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Bucket Name</label>
              <input className={inputClass} placeholder="my-50mm-retina-bucket" value={s3.bucket_name} onChange={(e) => setS3({ ...s3, bucket_name: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Region</label>
              {(s3 as any).provider === "digitalocean" ? (
                <select className={inputClass} value={s3.region} onChange={(e) => setS3({ ...s3, region: e.target.value, endpoint: `https://${e.target.value}.digitaloceanspaces.com` })}>
                  <option value="nyc3">NYC3 (New York)</option>
                  <option value="sfo3">SFO3 (San Francisco)</option>
                  <option value="ams3">AMS3 (Amsterdam)</option>
                  <option value="sgp1">SGP1 (Singapore)</option>
                  <option value="fra1">FRA1 (Frankfurt)</option>
                  <option value="blr1">BLR1 (Bangalore)</option>
                  <option value="syd1">SYD1 (Sydney)</option>
                </select>
              ) : (s3 as any).provider === "backblaze" ? (
                <select className={inputClass} value={s3.region} onChange={(e) => setS3({ ...s3, region: e.target.value, endpoint: `https://s3.${e.target.value}.backblazeb2.com` })}>
                  <option value="us-west-004">US West 004</option>
                  <option value="us-west-002">US West 002</option>
                  <option value="eu-central-003">EU Central 003</option>
                </select>
              ) : (s3 as any).provider === "wasabi" ? (
                <select className={inputClass} value={s3.region} onChange={(e) => setS3({ ...s3, region: e.target.value, endpoint: `https://s3.${e.target.value}.wasabisys.com` })}>
                  <option value="us-east-1">US East 1 (Virginia)</option>
                  <option value="us-east-2">US East 2 (Virginia)</option>
                  <option value="us-west-1">US West 1 (Oregon)</option>
                  <option value="us-central-1">US Central 1 (Texas)</option>
                  <option value="eu-central-1">EU Central 1 (Amsterdam)</option>
                  <option value="eu-central-2">EU Central 2 (Frankfurt)</option>
                  <option value="eu-west-1">EU West 1 (London)</option>
                  <option value="eu-west-2">EU West 2 (Paris)</option>
                  <option value="ap-northeast-1">AP Northeast 1 (Tokyo)</option>
                  <option value="ap-southeast-1">AP Southeast 1 (Singapore)</option>
                  <option value="ap-southeast-2">AP Southeast 2 (Sydney)</option>
                </select>
              ) : (
                <select className={inputClass} value={s3.region} onChange={(e) => setS3({ ...s3, region: e.target.value })}>
                  <option value="auto">Auto</option>
                  <option value="us-east-1">US East (N. Virginia) — us-east-1</option>
                  <option value="us-east-2">US East (Ohio) — us-east-2</option>
                  <option value="us-west-1">US West (N. California) — us-west-1</option>
                  <option value="us-west-2">US West (Oregon) — us-west-2</option>
                  <option value="eu-west-1">EU (Ireland) — eu-west-1</option>
                  <option value="eu-west-2">EU (London) — eu-west-2</option>
                  <option value="eu-central-1">EU (Frankfurt) — eu-central-1</option>
                  <option value="ap-south-1">Asia Pacific (Mumbai) — ap-south-1</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore) — ap-southeast-1</option>
                  <option value="ap-southeast-2">Asia Pacific (Sydney) — ap-southeast-2</option>
                  <option value="ap-northeast-1">Asia Pacific (Tokyo) — ap-northeast-1</option>
                  <option value="sa-east-1">South America (São Paulo) — sa-east-1</option>
                  <option value="me-south-1">Middle East (Bahrain) — me-south-1</option>
                  <option value="af-south-1">Africa (Cape Town) — af-south-1</option>
                </select>
              )}
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Access Key ID</label>
              <input className={inputClass} placeholder="AKIA..." value={s3.access_key_id} onChange={(e) => setS3({ ...s3, access_key_id: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Secret Access Key</label>
              <div className="relative">
                <input className={inputClass + " pr-10"} type={showS3Secret ? "text" : "password"} placeholder="••••••••" value={s3.secret_access_key} onChange={(e) => setS3({ ...s3, secret_access_key: e.target.value })} />
                <button onClick={() => setShowS3Secret(!showS3Secret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showS3Secret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Endpoint URL</label>
              <input className={inputClass} placeholder="https://s3.provider.com" value={s3.endpoint} onChange={(e) => setS3({ ...s3, endpoint: e.target.value })} />
              <p className="text-[9px] text-muted-foreground mt-1">Leave empty for standard AWS S3. Auto-filled for other providers.</p>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Public / CDN URL</label>
              <input className={inputClass} placeholder="https://cdn.example.com" value={s3.public_url || ""} onChange={(e) => setS3({ ...s3, public_url: e.target.value })} />
              <p className="text-[9px] text-muted-foreground mt-1">Public URL where uploaded files are served. Required for Cloudflare R2 and providers where the API endpoint differs from the public URL. Leave empty for AWS S3. <strong>Only applies to public buckets.</strong></p>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Path Prefix (Optional)</label>
              <input className={inputClass} placeholder="uploads/50mm-retina" value={s3.path_prefix} onChange={(e) => setS3({ ...s3, path_prefix: e.target.value })} />
              <p className="text-[9px] text-muted-foreground mt-1">Files will be stored under this prefix in the bucket</p>
            </div>

            {/* Bucket Privacy Info */}
            <div className="col-span-full border border-border/50 rounded-sm p-4 bg-muted/10 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] tracking-[0.15em] uppercase text-foreground font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                  Bucket Access Levels
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] tracking-[0.1em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                    Public Buckets (CDN URL)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {["avatars", "post-images", "competition-photos", "journal-images", "course-images", "portfolio-images"].map((b) => (
                      <span key={b} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{b}</span>
                    ))}
                  </div>
                  <p className="text-[8px] text-muted-foreground mt-1.5">Files served via the Public / CDN URL above. Accessible to anyone.</p>
                </div>
                <div>
                  <p className="text-[9px] tracking-[0.1em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                    Private Buckets (Signed URLs)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {["national-ids", "support-attachments"].map((b) => (
                      <span key={b} className="text-[9px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">{b}</span>
                    ))}
                  </div>
                  <p className="text-[8px] text-muted-foreground mt-1.5">Files require authentication. Accessed via time-limited signed URLs (15 min). Only the file owner or admins can view.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={saveS3}
              disabled={savingS3}
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {savingS3 ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save Storage Settings
            </button>
          </div>

          {/* Bulk Migration Tool */}
          {s3.enabled && s3.bucket_name && s3.access_key_id && (
            <StorageMigrationPanel />
          )}
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
