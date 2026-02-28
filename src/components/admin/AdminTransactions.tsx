import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Download, Search, Calendar, FileText, Table2, Globe, Loader2, ArrowDownLeft, ArrowUpRight, Filter } from "lucide-react";
import T from "@/components/T";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  status: string;
  created_at: string;
  metadata: any;
  reference_id: string | null;
  reference_type: string | null;
  user_name: string | null;
  user_email: string | null;
}

const txnTypeLabel: Record<string, string> = {
  deposit: "Deposit",
  competition_fee: "Competition Fee",
  course_purchase: "Course Purchase",
  prize_winning: "Prize Winnings",
  refund: "Refund",
  withdrawal: "Withdrawal",
  referral_earning: "Referral Reward",
  referral_bonus: "Referral Welcome Bonus",
  honorarium: "Judging Honorarium",
  gift: "Gift from Admin",
  gift_expiry: "Gift Expired",
  vote_reward: "Vote Reward",
  promo_credit: "Promo Credit",
};

const creditTypes = ["deposit", "prize_winning", "refund", "referral_earning", "referral_bonus", "honorarium", "gift", "promo_credit", "vote_reward"];

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 1 year", days: 365 },
  { label: "Last 3 years", days: 365 * 3 },
  { label: "Last 5 years", days: 365 * 5 },
];

const AdminTransactions = ({ user }: { user: any }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showHtml, setShowHtml] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    // Fetch last 5 years by default
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .gte("created_at", fiveYearsAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      toast({ title: "Failed to load transactions", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(t => t.user_id))];
      // Batch fetch profiles
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      setTransactions(data.map(t => ({
        ...t,
        user_name: profileMap.get(t.user_id) || null,
        user_email: null,
      })));
    } else {
      setTransactions([]);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (dateFrom && new Date(t.created_at) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(t.created_at) > end) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (t.user_name || "").toLowerCase();
        const desc = (t.description || "").toLowerCase();
        const type = (txnTypeLabel[t.type] || t.type).toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !type.includes(q) && !t.user_id.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, search, typeFilter, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const credits = filtered.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const debits = filtered.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    return { credits, debits, net: credits - debits };
  }, [filtered]);

  const applyPreset = (days: number) => {
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateFrom(from);
    setDateTo(new Date());
  };

  const allTypes = useMemo(() => {
    const types = new Set(transactions.map(t => t.type));
    return Array.from(types).sort();
  }, [transactions]);

  const generateCSV = () => {
    const headers = ["Date", "User", "Type", "Amount (USD)", "Balance After", "Description", "Status"];
    const rows = filtered.map(t => [
      new Date(t.created_at).toLocaleString(),
      t.user_name || t.user_id,
      txnTypeLabel[t.type] || t.type,
      Number(t.amount).toFixed(2),
      Number(t.balance_after).toFixed(2),
      (t.description || "").replace(/,/g, ";"),
      t.status,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV downloaded" });
  };

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("All User Transactions — Admin Ledger", 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
    doc.text(`Period: ${dateFrom ? format(dateFrom, "PP") : "All"} to ${dateTo ? format(dateTo, "PP") : "Now"} | ${filtered.length} transactions`, 14, 31);
    doc.text(`Credits: $${totals.credits.toFixed(2)} | Debits: $${totals.debits.toFixed(2)} | Net: $${totals.net.toFixed(2)}`, 14, 37);

    let y = 47;
    doc.setFontSize(7);
    doc.text("Date", 14, y);
    doc.text("User", 55, y);
    doc.text("Type", 110, y);
    doc.text("Amount", 155, y);
    doc.text("Balance", 180, y);
    doc.text("Description", 205, y);
    y += 2;
    doc.line(14, y, 282, y);
    y += 5;

    for (const t of filtered) {
      if (y > 195) { doc.addPage(); y = 20; }
      doc.text(new Date(t.created_at).toLocaleDateString(), 14, y);
      doc.text((t.user_name || t.user_id.slice(0, 8)).slice(0, 30), 55, y);
      doc.text((txnTypeLabel[t.type] || t.type).slice(0, 25), 110, y);
      doc.text(`$${Number(t.amount).toFixed(2)}`, 155, y);
      doc.text(`$${Number(t.balance_after).toFixed(2)}`, 180, y);
      doc.text((t.description || "—").slice(0, 40), 205, y);
      y += 5;
    }

    doc.save(`transactions-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF downloaded" });
  };

  const htmlContent = useMemo(() => {
    if (!showHtml) return "";
    return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Transaction Ledger</title>
<style>
body{font-family:system-ui;padding:20px;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
th{background:#f5f5f5;font-weight:600}
.credit{color:green}.debit{color:red}
h1{font-size:18px;margin-bottom:4px}
.meta{color:#666;margin-bottom:12px}
</style></head><body>
<h1>All User Transactions — Admin Ledger</h1>
<p class="meta">Generated: ${new Date().toLocaleString()} | ${filtered.length} transactions<br/>
Credits: $${totals.credits.toFixed(2)} | Debits: $${totals.debits.toFixed(2)} | Net: $${totals.net.toFixed(2)}</p>
<table>
<thead><tr><th>Date</th><th>User</th><th>Type</th><th>Amount</th><th>Balance</th><th>Description</th><th>Status</th></tr></thead>
<tbody>
${filtered.map(t => `<tr>
<td>${new Date(t.created_at).toLocaleString()}</td>
<td>${t.user_name || t.user_id.slice(0, 8)}</td>
<td>${txnTypeLabel[t.type] || t.type}</td>
<td class="${Number(t.amount) >= 0 ? "credit" : "debit"}">$${Number(t.amount).toFixed(2)}</td>
<td>$${Number(t.balance_after).toFixed(2)}</td>
<td>${t.description || "—"}</td>
<td>${t.status}</td>
</tr>`).join("")}
</tbody></table></body></html>`;
  }, [showHtml, filtered, totals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-px bg-primary" />
        <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
          <T>All Transactions</T>
        </span>
      </div>
      <h2 className="text-2xl font-light tracking-tight mb-6" style={{ fontFamily: "var(--font-display)" }}>
        <T>Transaction</T> <em className="italic text-primary"><T>Ledger</T></em>
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-border p-4">
          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>Total Transactions</span>
          <span className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>{filtered.length}</span>
        </div>
        <div className="border border-border p-4">
          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>Credits</span>
          <span className="text-2xl font-light text-primary" style={{ fontFamily: "var(--font-display)" }}>${totals.credits.toFixed(2)}</span>
        </div>
        <div className="border border-border p-4">
          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>Debits</span>
          <span className="text-2xl font-light text-destructive" style={{ fontFamily: "var(--font-display)" }}>${totals.debits.toFixed(2)}</span>
        </div>
        <div className="border border-border p-4">
          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>Net</span>
          <span className="text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>${totals.net.toFixed(2)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="border border-border p-4 mb-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>Filters</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user name, description, type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-2.5 pl-9 pr-3 text-sm transition-colors duration-300"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          {/* Type filter */}
          <div>
            <span className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>Type</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent border border-border px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <option value="all">All Types</option>
              {allTypes.map(t => (
                <option key={t} value={t}>{txnTypeLabel[t] || t}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <span className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>From</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn("inline-flex items-center gap-2 border border-border px-3 py-2 text-xs transition-colors hover:border-primary/50", dateFrom ? "text-foreground" : "text-muted-foreground")} style={{ fontFamily: "var(--font-body)" }}>
                  <Calendar className="h-3 w-3" />
                  {dateFrom ? format(dateFrom, "PP") : "Start date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUI mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date To */}
          <div>
            <span className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>To</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn("inline-flex items-center gap-2 border border-border px-3 py-2 text-xs transition-colors hover:border-primary/50", dateTo ? "text-foreground" : "text-muted-foreground")} style={{ fontFamily: "var(--font-body)" }}>
                  <Calendar className="h-3 w-3" />
                  {dateTo ? format(dateTo, "PP") : "End date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUI mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p.days} onClick={() => applyPreset(p.days)}
                className="px-2.5 py-2 border border-border text-[9px] tracking-[0.1em] uppercase text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {p.label}
              </button>
            ))}
            <button onClick={() => { setDateFrom(undefined); setDateTo(undefined); setSearch(""); setTypeFilter("all"); }}
              className="px-2.5 py-2 border border-border text-[9px] tracking-[0.1em] uppercase text-destructive/70 hover:border-destructive/50 transition-all"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={generatePDF}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-[10px] tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <Download className="h-3 w-3" /> PDF
        </button>
        <button onClick={generateCSV}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-[10px] tracking-[0.15em] uppercase hover:border-primary/50 transition-all"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <Table2 className="h-3 w-3" /> CSV
        </button>
        <button onClick={() => setShowHtml(!showHtml)}
          className={cn("inline-flex items-center gap-2 px-5 py-2.5 border text-[10px] tracking-[0.15em] uppercase transition-all", showHtml ? "border-primary text-primary" : "border-border hover:border-primary/50")}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <Globe className="h-3 w-3" /> {showHtml ? "Hide HTML" : "View HTML"}
        </button>
      </div>

      {/* HTML Preview */}
      {showHtml && (
        <div className="border border-border mb-6">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>HTML Preview</span>
            <button onClick={() => {
              const blob = new Blob([htmlContent], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.html`;
              a.click();
              URL.revokeObjectURL(url);
              toast({ title: "HTML downloaded" });
            }}
              className="text-[9px] tracking-[0.15em] uppercase text-primary hover:opacity-70 transition-opacity"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Download HTML
            </button>
          </div>
          <iframe srcDoc={htmlContent} className="w-full h-96 bg-background" title="Transaction Ledger HTML" />
        </div>
      )}

      {/* Transaction Table */}
      <div className="border border-border divide-y divide-border">
        <div className="hidden md:grid grid-cols-[1fr_1.2fr_1fr_0.8fr_0.8fr_1.5fr] gap-2 px-4 py-2.5 bg-muted/30">
          {["Date", "User", "Type", "Amount", "Balance", "Description"].map(h => (
            <span key={h} className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>No transactions found.</p>
          </div>
        ) : (
          filtered.slice(0, 500).map(t => (
            <div key={t.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_1fr_0.8fr_0.8fr_1.5fr] gap-1 md:gap-2 px-4 py-3 hover:bg-muted/20 transition-colors duration-200">
              <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                {new Date(t.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                <span className="block text-[9px] opacity-60">{new Date(t.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
              </span>
              <span className="text-[11px] truncate" style={{ fontFamily: "var(--font-body)" }}>
                {t.user_name || <span className="text-muted-foreground">{t.user_id.slice(0, 12)}…</span>}
              </span>
              <span className="text-[11px] flex items-center gap-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                {creditTypes.includes(t.type)
                  ? <ArrowDownLeft className="h-3 w-3 text-primary shrink-0" />
                  : <ArrowUpRight className="h-3 w-3 text-destructive shrink-0" />}
                {txnTypeLabel[t.type] || t.type}
              </span>
              <span className={cn("text-[11px] font-medium", Number(t.amount) >= 0 ? "text-primary" : "text-destructive")} style={{ fontFamily: "var(--font-heading)" }}>
                {Number(t.amount) >= 0 ? "+" : ""}${Number(t.amount).toFixed(2)}
              </span>
              <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                ${Number(t.balance_after).toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-body)" }}>
                {t.description || "—"}
              </span>
            </div>
          ))
        )}

        {filtered.length > 500 && (
          <div className="px-4 py-3 text-center">
            <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              Showing 500 of {filtered.length} transactions. Download PDF/CSV for full data.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTransactions;
