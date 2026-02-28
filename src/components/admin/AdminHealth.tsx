import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Activity, HardDrive, AlertTriangle, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

interface HealthData {
  dbConnected: boolean;
  authConnected: boolean;
  storageConnected: boolean;
  tableCounts: Record<string, number>;
  storageBuckets: { name: string; public: boolean }[];
  recentErrors: number;
  lastChecked: string;
}

const CORE_TABLES = [
  "profiles", "competitions", "competition_entries", "courses", "journal_articles",
  "posts", "portfolio_images", "certificates", "wallets", "friendships",
] as const;

const AdminHealth = ({ user }: { user: User | null }) => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageMetrics, setPageMetrics] = useState<{ lcp: number | null; fcp: number | null; ttfb: number | null }>({ lcp: null, fcp: null, ttfb: null });

  const runCheck = async () => {
    setLoading(true);
    const result: HealthData = {
      dbConnected: false,
      authConnected: false,
      storageConnected: false,
      tableCounts: {},
      storageBuckets: [],
      recentErrors: 0,
      lastChecked: new Date().toISOString(),
    };

    // DB connectivity + table counts
    try {
      const counts = await Promise.all(
        CORE_TABLES.map(async (table) => {
          const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
          return { table, count: error ? -1 : (count ?? 0) };
        })
      );
      result.dbConnected = counts.some((c) => c.count >= 0);
      counts.forEach((c) => { result.tableCounts[c.table] = c.count; });
    } catch { result.dbConnected = false; }

    // Auth check
    try {
      const { data } = await supabase.auth.getSession();
      result.authConnected = !!data;
    } catch { result.authConnected = false; }

    // Storage check
    try {
      const { data } = await supabase.storage.listBuckets();
      if (data) {
        result.storageConnected = true;
        result.storageBuckets = data.map((b) => ({ name: b.name, public: b.public }));
      }
    } catch { result.storageConnected = false; }

    setHealth(result);
    setLoading(false);
  };

  useEffect(() => {
    runCheck();
    // Gather web vitals from current page
    try {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav) {
        setPageMetrics((p) => ({ ...p, ttfb: Math.round(nav.responseStart - nav.requestStart) }));
      }
      const paints = performance.getEntriesByType("paint");
      const fcp = paints.find((e) => e.name === "first-contentful-paint");
      if (fcp) setPageMetrics((p) => ({ ...p, fcp: Math.round(fcp.startTime) }));

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as any;
        if (last?.startTime) setPageMetrics((p) => ({ ...p, lcp: Math.round(last.startTime) }));
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      return () => observer.disconnect();
    } catch { /* not supported */ }
  }, []);

  const StatusDot = ({ ok }: { ok: boolean }) => (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-green-500" : "bg-destructive"}`} />
  );

  const MetricCard = ({ label, value, unit, icon: Icon, status }: { label: string; value: string | number | null; unit?: string; icon: any; status?: "good" | "warn" | "bad" }) => (
    <div className="border border-border p-5 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-light ${status === "good" ? "text-green-500" : status === "warn" ? "text-yellow-500" : status === "bad" ? "text-destructive" : "text-foreground"}`} style={{ fontFamily: "var(--font-display)" }}>
          {value ?? "—"}
        </span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );

  const getMetricStatus = (val: number | null, good: number, warn: number): "good" | "warn" | "bad" | undefined => {
    if (val === null) return undefined;
    if (val <= good) return "good";
    if (val <= warn) return "warn";
    return "bad";
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>
            Site <em className="italic text-primary">Health</em>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Real-time system status and performance metrics</p>
        </div>
        <button
          onClick={runCheck}
          disabled={loading}
          className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Service Status */}
      <div>
        <h3 className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
          Service Status
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Database", ok: health?.dbConnected },
            { label: "Authentication", ok: health?.authConnected },
            { label: "File Storage", ok: health?.storageConnected },
          ].map((s) => (
            <div key={s.label} className="border border-border p-4 flex items-center gap-3">
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : s.ok ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <div>
                <p className="text-sm">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{loading ? "Checking…" : s.ok ? "Operational" : "Unreachable"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page Performance */}
      <div>
        <h3 className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
          Page Performance (This Page)
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="LCP" value={pageMetrics.lcp} unit="ms" icon={Clock} status={getMetricStatus(pageMetrics.lcp, 2500, 4000)} />
          <MetricCard label="FCP" value={pageMetrics.fcp} unit="ms" icon={Activity} status={getMetricStatus(pageMetrics.fcp, 1800, 3000)} />
          <MetricCard label="TTFB" value={pageMetrics.ttfb} unit="ms" icon={Activity} status={getMetricStatus(pageMetrics.ttfb, 800, 1800)} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Green ≤ good threshold · Yellow = needs improvement · Red = poor</p>
      </div>

      {/* Storage Buckets */}
      {health && health.storageBuckets.length > 0 && (
        <div>
          <h3 className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            Storage Buckets ({health.storageBuckets.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {health.storageBuckets.map((b) => (
              <div key={b.name} className="border border-border p-4 flex items-center gap-3">
                <HardDrive className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm truncate">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground">{b.public ? "Public" : "Private"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Overview */}
      {health && Object.keys(health.tableCounts).length > 0 && (
        <div>
          <h3 className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            Data Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(health.tableCounts)
              .filter(([, v]) => v >= 0)
              .map(([table, count]) => (
                <div key={table} className="border border-border p-4 text-center">
                  <p className="text-xl font-light" style={{ fontFamily: "var(--font-display)" }}>{count.toLocaleString()}</p>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mt-1" style={{ fontFamily: "var(--font-heading)" }}>
                    {table.replace(/_/g, " ")}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {health && (
        <p className="text-[10px] text-muted-foreground">
          Last checked: {new Date(health.lastChecked).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default AdminHealth;
