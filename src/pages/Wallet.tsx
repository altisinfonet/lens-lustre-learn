import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon, Plus, ArrowDownLeft, ArrowUpRight, Download, CreditCard, Loader2, Banknote, IndianRupee, AlertTriangle, Clock } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useAuth } from "@/hooks/useAuth";
import { useWallet, WalletTransaction } from "@/hooks/useWallet";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import jsPDF from "jspdf";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

const txnTypeLabel: Record<string, string> = {
  deposit: "Deposit",
  competition_fee: "Competition Fee",
  course_purchase: "Course Purchase",
  prize_winning: "Prize Winnings",
  refund: "Refund",
  withdrawal: "Withdrawal",
  referral_earning: "Referral Earning",
  honorarium: "Judging Honorarium",
  gift: "Gift from Admin",
  gift_expiry: "Gift Expired",
  vote_reward: "Vote Reward",
  promo_credit: "Promo Credit",
};

const txnIcon = (type: string) => {
  const credit = ["deposit", "prize_winning", "refund", "referral_earning", "honorarium", "gift", "promo_credit", "vote_reward"];
  return credit.includes(type) ? (
    <ArrowDownLeft className="h-4 w-4 text-primary" />
  ) : (
    <ArrowUpRight className="h-4 w-4 text-destructive" />
  );
};

const Wallet = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const { balance, transactions, exchangeRate, loading, toINR, addFunds, refresh } = useWallet();

  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [currencyDisplay, setCurrencyDisplay] = useState<"usd" | "inr">("usd");
  const [ledgerYears, setLedgerYears] = useState(1);
  const [expiringBalance, setExpiringBalance] = useState<{ amount: number; soonest: string | null; count: number }>({ amount: 0, soonest: null, count: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchExpiring = async () => {
      const { data } = await supabase
        .from("gift_announcements")
        .select("amount, expires_at")
        .eq("user_id", user.id)
        .eq("is_expired", false)
        .not("expires_at", "is", null);
      if (data && data.length > 0) {
        const now = new Date();
        const active = data.filter(g => new Date(g.expires_at!) > now);
        const total = active.reduce((sum, g) => sum + Number(g.amount), 0);
        const soonest = active.length > 0
          ? active.sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())[0].expires_at
          : null;
        setExpiringBalance({ amount: total, soonest, count: active.length });
      }
    };
    fetchExpiring();
  }, [user]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>Loading…</div>
      </main>
    );
  }

  if (!user) { navigate("/login"); return null; }
  if (isAdmin) { navigate("/admin"); return null; }

  const formatCurrency = (amount: number) => {
    if (currencyDisplay === "inr") {
      return `₹${toINR(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleManualDeposit = async () => {
    const amt = parseFloat(addAmount);
    if (!amt || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setProcessing(true);
    try {
      await addFunds(amt, "Manual wallet top-up");
      toast({ title: `${formatCurrency(amt)} added to wallet` });
      setShowAddMoney(false);
      setAddAmount("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0 || amt > balance) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (!bankDetails.trim()) {
      toast({ title: "Enter bank details", variant: "destructive" });
      return;
    }
    setProcessing(true);
    const { error } = await supabase.from("withdrawal_requests").insert({
      user_id: user.id,
      amount: amt,
      bank_details: { details: bankDetails.trim() },
    });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Withdrawal request submitted", description: "Admin will review and process." });
      setShowWithdraw(false);
      setWithdrawAmount("");
      setBankDetails("");
    }
    setProcessing(false);
  };

  const generateLedgerPDF = () => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - ledgerYears);
    const filtered = transactions.filter(t => new Date(t.created_at) >= cutoff);

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Wallet Transaction Ledger", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Period: Last ${ledgerYears} year(s) | ${filtered.length} transactions`, 14, 36);
    doc.text(`Exchange Rate: 1 USD = ₹${exchangeRate.rate}`, 14, 42);

    let y = 52;
    doc.setFontSize(8);
    doc.text("Date", 14, y);
    doc.text("Type", 50, y);
    doc.text("USD", 110, y);
    doc.text("INR", 140, y);
    doc.text("Balance (USD)", 165, y);
    y += 2;
    doc.line(14, y, 196, y);
    y += 6;

    for (const t of filtered) {
      if (y > 280) { doc.addPage(); y = 20; }
      const date = new Date(t.created_at).toLocaleDateString();
      doc.text(date, 14, y);
      doc.text(txnTypeLabel[t.type] || t.type, 50, y);
      doc.text(`$${Number(t.amount).toFixed(2)}`, 110, y);
      doc.text(`₹${(Number(t.amount) * exchangeRate.rate).toFixed(2)}`, 140, y);
      doc.text(`$${Number(t.balance_after).toFixed(2)}`, 165, y);
      y += 6;
    }

    doc.save(`wallet-ledger-${ledgerYears}yr.pdf`);
    toast({ title: "Ledger downloaded" });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20 max-w-4xl">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Wallet" }]} className="mb-10" />

        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-px bg-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>e-Wallet</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-light tracking-tight mb-10" style={{ fontFamily: "var(--font-display)" }}>
          My <em className="italic text-primary">Wallet</em>
        </h1>

        {/* Balance Card */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
          className="border border-border p-8 md:p-10 mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Available Balance</span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl md:text-5xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  ${Number(balance).toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  ≈ ₹{toINR(balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2" style={{ fontFamily: "var(--font-body)" }}>
                1 USD ≈ ₹{exchangeRate.rate}
              </p>
              {/* Expiring Balance Warning */}
              {expiringBalance.amount > 0 && (
                <div className="mt-3 flex items-start gap-2 px-3 py-2 border border-yellow-500/40 bg-yellow-500/5 rounded-sm">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-medium text-yellow-700 dark:text-yellow-400" style={{ fontFamily: "var(--font-heading)" }}>
                      ${expiringBalance.amount.toFixed(2)} expiring soon
                    </p>
                    <p className="text-[9px] text-yellow-600/80 dark:text-yellow-500/80" style={{ fontFamily: "var(--font-body)" }}>
                      {expiringBalance.count} gift credit{expiringBalance.count > 1 ? "s" : ""} with expiry
                      {expiringBalance.soonest && (
                        <> · Next: {new Date(expiringBalance.soonest).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowAddMoney(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <Plus className="h-3.5 w-3.5" /> Add Money
              </button>
              <button
                onClick={() => setShowWithdraw(true)}
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-xs tracking-[0.2em] uppercase hover:border-primary/50 transition-all duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <Banknote className="h-3.5 w-3.5" /> Withdraw
              </button>
              <button
                onClick={() => setCurrencyDisplay(c => c === "usd" ? "inr" : "usd")}
                className="inline-flex items-center gap-2 px-4 py-3 border border-border text-xs tracking-[0.2em] uppercase hover:border-primary/50 transition-all duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {currencyDisplay === "usd" ? <IndianRupee className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                {currencyDisplay === "usd" ? "Show INR" : "Show USD"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Add Money Form */}
        {showAddMoney && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="border border-primary/30 p-6 md:p-8 mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Add Money</span>
              <button onClick={() => setShowAddMoney(false)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[10, 25, 50, 100].map(amt => (
                <button key={amt} onClick={() => setAddAmount(String(amt))}
                  className={`px-4 py-2 border text-xs tracking-[0.15em] uppercase transition-all duration-300 ${addAmount === String(amt) ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-foreground/50"}`}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <input
              type="number" min="1" step="0.01" placeholder="Or enter custom amount ($)"
              value={addAmount} onChange={e => setAddAmount(e.target.value)}
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              style={{ fontFamily: "var(--font-body)" }}
            />
            {addAmount && parseFloat(addAmount) > 0 && (
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                ≈ ₹{toINR(parseFloat(addAmount)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={handleManualDeposit} disabled={processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Confirm (Manual)
              </button>
              <button onClick={() => toast({ title: "Stripe checkout coming soon", description: "Payment gateway integration is in progress." })}
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-xs tracking-[0.2em] uppercase hover:border-primary/50 transition-all duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <CreditCard className="h-3.5 w-3.5" /> Pay with Stripe
              </button>
            </div>
          </motion.div>
        )}

        {/* Withdraw Form */}
        {showWithdraw && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="border border-primary/30 p-6 md:p-8 mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Withdraw to Bank</span>
              <button onClick={() => setShowWithdraw(false)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
            </div>
            <input
              type="number" min="1" step="0.01" placeholder="Amount ($)" max={balance}
              value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              style={{ fontFamily: "var(--font-body)" }}
            />
            <textarea
              placeholder="Bank account details (account number, IFSC, name, etc.)"
              value={bankDetails} onChange={e => setBankDetails(e.target.value)}
              rows={3}
              className="w-full bg-transparent border border-border focus:border-primary outline-none p-4 text-sm transition-colors duration-500 resize-none"
              style={{ fontFamily: "var(--font-body)" }}
            />
            <button onClick={handleWithdraw} disabled={processing}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
              Submit Request
            </button>
          </motion.div>
        )}

        {/* Ledger Download */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="flex flex-wrap items-center gap-4 mb-8 p-4 border border-border"
        >
          <Download className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>Download Ledger</span>
          <div className="flex gap-2">
            {[1, 2, 3, 5].map(yr => (
              <button key={yr} onClick={() => setLedgerYears(yr)}
                className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase border transition-all duration-300 ${ledgerYears === yr ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {yr}yr
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={generateLedgerPDF}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-[10px] tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <Download className="h-3 w-3" /> PDF (USD)
            </button>
            <button onClick={() => { setCurrencyDisplay("inr"); generateLedgerPDF(); setCurrencyDisplay("usd"); }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-border text-[10px] tracking-[0.15em] uppercase hover:border-primary/50 transition-all"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <IndianRupee className="h-3 w-3" /> PDF (INR)
            </button>
          </div>
        </motion.div>

        {/* Transaction History */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
            Transaction History ({transactions.length})
          </span>

          {transactions.length === 0 ? (
            <div className="border border-border p-10 text-center">
              <WalletIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>No transactions yet. Add money to get started.</p>
            </div>
          ) : (
            <div className="border border-border divide-y divide-border">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors duration-300">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {txnIcon(t.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-light truncate" style={{ fontFamily: "var(--font-heading)" }}>
                      {txnTypeLabel[t.type] || t.type}
                    </p>
                    {t.description && (
                      <p className="text-[10px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-body)" }}>{t.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                        {new Date(t.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {t.type === "gift" && t.metadata?.expires_at && (
                        <span className={`text-[9px] px-1.5 py-0.5 border rounded-sm ${new Date(t.metadata.expires_at) < new Date() ? "border-destructive/40 text-destructive bg-destructive/5" : "border-yellow-500/40 text-yellow-600 bg-yellow-500/5"}`}>
                          {new Date(t.metadata.expires_at) < new Date() ? "Expired" : `Expires: ${new Date(t.metadata.expires_at).toLocaleDateString()}`}
                        </span>
                      )}
                      {t.type === "gift" && !t.metadata?.expires_at && (
                        <span className="text-[9px] px-1.5 py-0.5 border border-primary/30 text-primary bg-primary/5 rounded-sm">No expiry</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-medium ${Number(t.amount) >= 0 ? "text-primary" : "text-destructive"}`} style={{ fontFamily: "var(--font-heading)" }}>
                      {Number(t.amount) >= 0 ? "+" : ""}{formatCurrency(Number(t.amount))}
                    </p>
                    <p className="text-[9px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                      Bal: {formatCurrency(Number(t.balance_after))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
};

export default Wallet;
