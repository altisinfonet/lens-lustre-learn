import { useState, useEffect } from "react";
import { Gift, Loader2, Users, Mail, UserCheck, UserPlus, Search } from "lucide-react";
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

    setProcessing(true);

    try {
      // Step 1: Find target users
      let targetUserIds: string[] = [];
      let targetValue = "";

      if (targetType === "email") {
        if (!email.trim()) { toast({ title: "Enter an email", variant: "destructive" }); setProcessing(false); return; }
        // Look up user by email from auth — we search profiles instead
        // We need to find user by checking email from supabase auth admin, but we can't from client
        // Instead search profiles by name or use a different approach
        // Let's use the wallet approach: search by email in auth metadata
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .limit(1000);
        
        // We need a better approach — let's use an edge function or RPC
        // For now, let's check if the email matches any user
        // Actually, we can search auth.users via admin — not from client
        // Let's do a workaround: send email to edge function which handles it
        targetValue = email.trim();
        // We'll pass the email to the edge function to resolve
      } else if (targetType === "role") {
        const { data: roleUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", selectedRole as any);
        targetUserIds = roleUsers?.map(r => r.user_id) || [];
        targetValue = selectedRole;
      } else if (targetType === "all") {
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id")
          .limit(1000);
        targetUserIds = allProfiles?.map(p => p.id) || [];
        targetValue = "all";
      } else if (targetType === "new_registration") {
        if (autoApplyFuture) {
          // Save as site setting for future auto-apply
          await supabase.from("site_settings").upsert({
            key: "new_registration_gift",
            value: { amount: amt, reason: reason.trim(), active: true },
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          });
          setActiveAutoGift({ amount: amt, reason: reason.trim(), active: true });
          toast({ title: "Auto-gift for new registrations activated", description: `$${amt} will be credited to every new user.` });
          setProcessing(false);
          fetchHistory();
          return;
        }

        // Date range based
        if (!dateFrom || !dateTo) { toast({ title: "Select a date range", variant: "destructive" }); setProcessing(false); return; }
        const { data: newUsers } = await supabase
          .from("profiles")
          .select("id")
          .gte("created_at", new Date(dateFrom).toISOString())
          .lte("created_at", new Date(dateTo + "T23:59:59").toISOString());
        targetUserIds = newUsers?.map(p => p.id) || [];
        targetValue = JSON.stringify({ from: dateFrom, to: dateTo });
      }

      // For email type, we use the edge function
      if (targetType === "email") {
        const { data, error } = await supabase.functions.invoke("send-gift-credit", {
          body: {
            admin_id: user.id,
            target_type: "email",
            target_email: email.trim(),
            amount: amt,
            reason: reason.trim(),
          },
        });
        if (error) throw error;
        toast({ title: `Gift of $${amt} sent to ${email.trim()}` });
      } else {
        if (targetUserIds.length === 0) {
          toast({ title: "No users found for this target", variant: "destructive" });
          setProcessing(false);
          return;
        }

        // Create gift credit record
        const { data: giftCredit, error: gcError } = await supabase
          .from("gift_credits")
          .insert({
            admin_id: user.id,
            amount: amt,
            reason: reason.trim(),
            target_type: targetType,
            target_value: targetValue,
            recipients_count: targetUserIds.length,
          })
          .select("id")
          .single();

        if (gcError) throw gcError;

        // Credit each user's wallet and create announcement
        for (const uid of targetUserIds) {
          await supabase.rpc("admin_wallet_credit", {
            _admin_id: user.id,
            _target_user_id: uid,
            _amount: amt,
            _type: "gift",
            _description: reason.trim(),
          });

          await supabase.from("gift_announcements").insert({
            user_id: uid,
            gift_credit_id: giftCredit.id,
            amount: amt,
            reason: reason.trim(),
          });
        }

        // Send email notifications via edge function
        await supabase.functions.invoke("send-gift-credit", {
          body: {
            admin_id: user.id,
            target_type: targetType,
            user_ids: targetUserIds,
            amount: amt,
            reason: reason.trim(),
            gift_credit_id: giftCredit.id,
          },
        });

        toast({
          title: `🎁 Gift sent to ${targetUserIds.length} user(s)`,
          description: `$${amt} credited with reason: ${reason.trim()}`,
        });
      }

      setAmount("");
      setReason("");
      setEmail("");
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
    <div className="space-y-8">
      {/* Active Auto-Gift Banner */}
      {activeAutoGift?.active && (
        <div className="border border-primary/40 bg-primary/5 p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-primary block mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              🎁 Auto-Gift Active for New Registrations
            </span>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              Every new user receives <strong>${activeAutoGift.amount}</strong> — "{activeAutoGift.reason}"
            </p>
          </div>
          <button onClick={disableAutoGift}
            className="px-4 py-2 border border-destructive text-destructive text-[10px] tracking-[0.15em] uppercase hover:bg-destructive hover:text-destructive-foreground transition-all"
            style={{ fontFamily: "var(--font-heading)" }}>
            Disable
          </button>
        </div>
      )}

      {/* Gift Credit Form */}
      <div className="border border-border p-6 space-y-5">
        <span className="text-xs tracking-[0.2em] uppercase text-primary block" style={{ fontFamily: "var(--font-heading)" }}>
          <Gift className="h-3.5 w-3.5 inline mr-2" />Bulk Gift Credit
        </span>

        {/* Target Type Selection */}
        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            Target Recipients
          </label>
          <div className="flex flex-wrap gap-2">
            {targetTypeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTargetType(opt.value)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase border transition-all duration-300 ${
                  targetType === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/50"
                }`}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target-specific fields */}
        {targetType === "email" && (
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              User Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
        )}

        {targetType === "role" && (
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Select Role
            </label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {roleOptions.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        )}

        {targetType === "new_registration" && (
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-xs text-muted-foreground cursor-pointer" style={{ fontFamily: "var(--font-body)" }}>
              <input
                type="checkbox"
                checked={autoApplyFuture}
                onChange={e => setAutoApplyFuture(e.target.checked)}
                className="accent-primary"
              />
              Auto-apply to all future new registrations
            </label>

            {!autoApplyFuture && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Amount & Reason */}
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Amount ($)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 5.00"
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Reason (visible to users)
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Festival bonus, Welcome gift, Loyalty reward"
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
        </div>

        <button
          onClick={handleSendGift}
          disabled={processing}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
          Send Gift
        </button>
      </div>

      {/* Gift History */}
      {history.length > 0 && (
        <div>
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
            Gift History ({history.length})
          </span>
          <div className="border border-border divide-y divide-border">
            {history.map((g: any) => (
              <div key={g.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ fontFamily: "var(--font-heading)" }}>
                    ${Number(g.amount).toFixed(2)} → {g.target_type === "all" ? "All Users" : g.target_type === "role" ? `Role: ${g.target_value}` : g.target_type === "email" ? g.target_value : "New Registrations"}
                  </p>
                  <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                    "{g.reason}" · {g.recipients_count} recipient(s) · {new Date(g.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-[9px] tracking-[0.2em] uppercase text-primary border border-primary px-2.5 py-1" style={{ fontFamily: "var(--font-heading)" }}>
                  {g.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGiftCredit;
