import { useState, useEffect } from "react";
import { Gift, Loader2, Users, Mail, UserCheck, UserPlus, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
}

type TargetType = "email" | "role" | "all" | "new_registration";

const roleOptions = [
  { value: "user", label: "All Users" },
  { value: "registered_photographer", label: "Registered Photographers" },
  { value: "student", label: "Students" },
  { value: "judge", label: "Judges" },
  { value: "content_editor", label: "Content Editors" },
];

const AdminGiftCredit = ({ user }: Props) => {
  const [targetType, setTargetType] = useState<TargetType>("all");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("user");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [autoApplyFuture, setAutoApplyFuture] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activeAutoGift, setActiveAutoGift] = useState<any>(null);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => {
    fetchHistory();
    fetchAutoGift();
  }, []);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("gift_credits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory(data || []);
  };

  const fetchAutoGift = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "new_registration_gift")
      .maybeSingle();
    if (data?.value) setActiveAutoGift(data.value);
  };

  const handleSendGift = async () => {
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    if (!reason.trim()) { toast({ title: "Please provide a reason", variant: "destructive" }); return; }

    const expiresAt = hasExpiry && expiryDate ? new Date(expiryDate).toISOString() : null;

    setProcessing(true);

    try {
      let targetUserIds: string[] = [];
      let targetValue = "";

      if (targetType === "email") {
        if (!email.trim()) { toast({ title: "Enter an email", variant: "destructive" }); setProcessing(false); return; }
        targetValue = email.trim();
      } else if (targetType === "role") {
        const { data: roleUsers } = await supabase.from("user_roles").select("user_id").eq("role", selectedRole as any);
        targetUserIds = roleUsers?.map(r => r.user_id) || [];
        targetValue = selectedRole;
      } else if (targetType === "all") {
        const { data: allProfiles } = await supabase.from("profiles").select("id").limit(1000);
        targetUserIds = allProfiles?.map(p => p.id) || [];
        targetValue = "all";
      } else if (targetType === "new_registration") {
        if (autoApplyFuture) {
          await supabase.from("site_settings").upsert({
            key: "new_registration_gift",
            value: { amount: amt, reason: reason.trim(), active: true, expires_days: hasExpiry && expiryDate ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000) : null },
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          });
          setActiveAutoGift({ amount: amt, reason: reason.trim(), active: true });
          toast({ title: "Auto-gift activated" });
          setProcessing(false);
          fetchHistory();
          return;
        }
        if (!dateFrom || !dateTo) { toast({ title: "Select a date range", variant: "destructive" }); setProcessing(false); return; }
        const { data: newUsers } = await supabase.from("profiles").select("id")
          .gte("created_at", new Date(dateFrom).toISOString())
          .lte("created_at", new Date(dateTo + "T23:59:59").toISOString());
        targetUserIds = newUsers?.map(p => p.id) || [];
        targetValue = JSON.stringify({ from: dateFrom, to: dateTo });
      }

      if (targetType === "email") {
        const { data, error } = await supabase.functions.invoke("send-gift-credit", {
          body: {
            admin_id: user.id,
            target_type: "email",
            target_email: email.trim(),
            amount: amt,
            reason: reason.trim(),
            expires_at: expiresAt,
          },
        });
        if (error) throw error;
        toast({ title: `Gift of $${amt} sent to ${email.trim()}` });
      } else {
        if (targetUserIds.length === 0) {
          toast({ title: "No users found", variant: "destructive" });
          setProcessing(false);
          return;
        }

        const { data: giftCredit, error: gcError } = await supabase
          .from("gift_credits")
          .insert({
            admin_id: user.id,
            amount: amt,
            reason: reason.trim(),
            target_type: targetType,
            target_value: targetValue,
            recipients_count: targetUserIds.length,
            expires_at: expiresAt,
          })
          .select("id")
          .single();

        if (gcError) throw gcError;

        for (const uid of targetUserIds) {
          await supabase.rpc("admin_wallet_credit", {
            _admin_id: user.id,
            _target_user_id: uid,
            _amount: amt,
            _type: "gift",
            _description: reason.trim(),
            _reference_id: giftCredit.id,
            _reference_type: "gift_credit",
            _metadata: expiresAt ? { expires_at: expiresAt } : null,
          });

          await supabase.from("gift_announcements").insert({
            user_id: uid,
            gift_credit_id: giftCredit.id,
            amount: amt,
            reason: reason.trim(),
            expires_at: expiresAt,
          });
        }

        await supabase.functions.invoke("send-gift-credit", {
          body: {
            admin_id: user.id,
            target_type: targetType,
            user_ids: targetUserIds,
            amount: amt,
            reason: reason.trim(),
            gift_credit_id: giftCredit.id,
            expires_at: expiresAt,
          },
        });

        toast({ title: `🎁 Gift sent to ${targetUserIds.length} user(s)` });
      }

      setAmount("");
      setReason("");
      setEmail("");
      setHasExpiry(false);
      setExpiryDate("");
      fetchHistory();
    } catch (err: any) {
      toast({ title: "Gift failed", description: err.message, variant: "destructive" });
    }

    setProcessing(false);
  };

  const disableAutoGift = async () => {
    await supabase.from("site_settings").upsert({
      key: "new_registration_gift",
      value: { ...activeAutoGift, active: false },
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    });
    setActiveAutoGift(null);
    toast({ title: "Auto-gift disabled" });
  };

  const targetTypeOptions: { value: TargetType; label: string; icon: any }[] = [
    { value: "email", label: "By Email", icon: Mail },
    { value: "role", label: "By Role", icon: UserCheck },
    { value: "all", label: "All Users", icon: Users },
    { value: "new_registration", label: "New Registrations", icon: UserPlus },
  ];

  return (
    <div className="space-y-6">
      {/* Active Auto-Gift Banner */}
      {activeAutoGift?.active && (
        <div className="border border-primary/40 bg-primary/5 p-4 rounded-sm flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-primary block mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              🎁 Auto-Gift Active
            </span>
            <p className="text-xs text-muted-foreground">
              Every new user receives <strong>${activeAutoGift.amount}</strong> — "{activeAutoGift.reason}"
            </p>
          </div>
          <button onClick={disableAutoGift}
            className="px-3 py-1.5 border border-destructive text-destructive text-[10px] tracking-[0.15em] uppercase hover:bg-destructive hover:text-destructive-foreground transition-all rounded-sm"
            style={{ fontFamily: "var(--font-heading)" }}>
            Disable
          </button>
        </div>
      )}

      {/* Gift Credit Form */}
      <div className="border border-border p-5 rounded-sm space-y-4">
        <span className="text-[10px] tracking-[0.2em] uppercase text-primary block" style={{ fontFamily: "var(--font-heading)" }}>
          <Gift className="h-3.5 w-3.5 inline mr-2" />Bulk Gift Credit
        </span>

        {/* Target Type */}
        <div className="flex flex-wrap gap-2">
          {targetTypeOptions.map(opt => (
            <button key={opt.value} onClick={() => setTargetType(opt.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.15em] uppercase border transition-all rounded-sm ${
                targetType === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/50"
              }`} style={{ fontFamily: "var(--font-heading)" }}>
              <opt.icon className="h-3 w-3" /> {opt.label}
            </button>
          ))}
        </div>

        {/* Target-specific */}
        {targetType === "email" && (
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com"
            className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary" />
        )}
        {targetType === "role" && (
          <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
            className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary cursor-pointer">
            {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        )}
        {targetType === "new_registration" && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={autoApplyFuture} onChange={e => setAutoApplyFuture(e.target.checked)} className="accent-primary" />
              Auto-apply to future registrations
            </label>
            {!autoApplyFuture && (
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From"
                  className="bg-transparent border border-border rounded-sm px-3 py-2 text-xs outline-none focus:border-primary" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To"
                  className="bg-transparent border border-border rounded-sm px-3 py-2 text-xs outline-none focus:border-primary" />
              </div>
            )}
          </div>
        )}

        {/* Amount, Reason, Expiry */}
        <div className="grid md:grid-cols-2 gap-3">
          <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount ($)"
            className="bg-transparent border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary" />
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (visible to users)"
            className="bg-transparent border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>

        {/* Expiry Option */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={hasExpiry} onChange={e => setHasExpiry(e.target.checked)} className="accent-primary" />
            Set expiry date
          </label>
          {hasExpiry && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="bg-transparent border border-border rounded-sm px-3 py-1.5 text-xs outline-none focus:border-primary" />
            </div>
          )}
          {!hasExpiry && (
            <span className="text-[10px] text-muted-foreground italic">No expiry (permanent)</span>
          )}
        </div>

        <button onClick={handleSendGift} disabled={processing}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-[10px] tracking-[0.2em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50 rounded-sm"
          style={{ fontFamily: "var(--font-heading)" }}>
          {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
          Send Gift
        </button>
      </div>

      {/* Gift History */}
      {history.length > 0 && (
        <div>
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            Gift History ({history.length})
          </span>
          <div className="border border-border rounded-sm divide-y divide-border">
            {history.map((g: any) => (
              <div key={g.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                      ${Number(g.amount).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">→</span>
                    <span className="text-[10px] text-muted-foreground">
                      {g.target_type === "all" ? "All Users" : g.target_type === "role" ? `Role: ${g.target_value}` : g.target_type === "email" ? g.target_value : "New Registrations"}
                    </span>
                    <span className="text-[8px] px-1.5 py-0.5 border border-primary/30 text-primary rounded-sm uppercase tracking-wider">{g.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span>"{g.reason}"</span>
                    <span>·</span>
                    <span>{g.recipients_count} recipient(s)</span>
                    <span>·</span>
                    <span>{new Date(g.created_at).toLocaleDateString()}</span>
                    {g.expires_at ? (
                      <>
                        <span>·</span>
                        <span className="text-yellow-600">Expires: {new Date(g.expires_at).toLocaleDateString()}</span>
                      </>
                    ) : (
                      <>
                        <span>·</span>
                        <span className="text-primary">No expiry</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGiftCredit;
