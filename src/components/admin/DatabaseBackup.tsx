import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2, Database, Clock } from "lucide-react";

const EXPORTABLE_TABLES = [
  "profiles",
  "user_roles",
  "user_badges",
  "competitions",
  "competition_entries",
  "competition_votes",
  "competition_payment_details",
  "courses",
  "course_enrollments",
  "lessons",
  "lesson_progress",
  "journal_articles",
  "certificates",
  "certificate_testimonials",
  "portfolio_images",
  "posts",
  "post_comments",
  "post_reactions",
  "comments",
  "image_comments",
  "image_reactions",
  "friendships",
  "follows",
  "wallets",
  "wallet_transactions",
  "withdrawal_requests",
  "bank_details",
  "referral_codes",
  "referrals",
  "gift_credits",
  "gift_announcements",
  "hero_banners",
  "photo_of_the_day",
  "featured_artists",
  "support_tickets",
  "ticket_replies",
  "email_templates",
  "site_settings",
  "ad_impressions",
  "admin_notifications",
  "user_notifications",
  "activity_logs",
  "comment_reports",
  "scheduled_boosts",
] as const;

function escapeSQL(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return `ARRAY[${value.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(",")}]::text[]`;
  }
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function rowToInsert(table: string, row: Record<string, unknown>): string {
  const cols = Object.keys(row);
  const vals = cols.map((c) => escapeSQL(row[c]));
  return `INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${vals.join(", ")});`;
}

export default function DatabaseBackup() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "last_db_backup")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && typeof data.value === "object" && "timestamp" in (data.value as any)) {
          setLastBackup((data.value as any).timestamp);
        }
      });
  }, []);

  const exportDB = async () => {
    setExporting(true);
    setProgress(0);

    const lines: string[] = [
      `-- Database Backup`,
      `-- Generated: ${new Date().toISOString()}`,
      `-- Tables: ${EXPORTABLE_TABLES.length}`,
      "",
      "BEGIN;",
      "",
    ];

    let totalRows = 0;

    for (let i = 0; i < EXPORTABLE_TABLES.length; i++) {
      const table = EXPORTABLE_TABLES[i];
      setCurrentTable(table);
      setProgress(Math.round(((i) / EXPORTABLE_TABLES.length) * 100));

      try {
        // Fetch up to 10000 rows per table
        const { data, error } = await (supabase.from(table) as any).select("*").limit(10000);
        if (error) {
          lines.push(`-- ERROR exporting ${table}: ${error.message}`);
          continue;
        }
        if (!data || data.length === 0) {
          lines.push(`-- ${table}: 0 rows`);
          lines.push("");
          continue;
        }

        lines.push(`-- ${table}: ${data.length} rows`);
        for (const row of data) {
          lines.push(rowToInsert(table, row));
          totalRows++;
        }
        lines.push("");
      } catch (err: any) {
        lines.push(`-- ERROR exporting ${table}: ${err.message}`);
      }
    }

    lines.push("COMMIT;");
    lines.push("");
    lines.push(`-- Total rows exported: ${totalRows}`);

    // Download as .sql file
    const blob = new Blob([lines.join("\n")], { type: "application/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_${new Date().toISOString().slice(0, 10)}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setProgress(100);
    setCurrentTable("");
    setExporting(false);

    // Save last backup timestamp
    const now = new Date().toISOString();
    setLastBackup(now);
    await supabase.from("site_settings").upsert(
      { key: "last_db_backup", value: { timestamp: now } as any, updated_at: now },
      { onConflict: "key" }
    );

    toast({ title: "Backup downloaded", description: `${totalRows} rows across ${EXPORTABLE_TABLES.length} tables` });
  };

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card/50">
        <Database className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium tracking-wide uppercase" style={{ fontFamily: "var(--font-heading)" }}>
          Database Backup
        </h3>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
          Export all database tables as a SQL file containing INSERT statements. This backup can be used to restore data into a compatible PostgreSQL database.
        </p>

        {exporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="tracking-[0.15em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                Exporting: {currentTable.replace(/_/g, " ")}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={exportDB}
          disabled={exporting}
          className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          {exporting ? "Exporting..." : "Download SQL Backup"}
        </button>

        <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
          <strong className="text-foreground">Note:</strong> Exports up to 10,000 rows per table. Large tables may be truncated. The file includes all {EXPORTABLE_TABLES.length} core tables.
        </p>
      </div>
    </div>
  );
}
