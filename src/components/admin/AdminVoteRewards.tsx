import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Vote, Power, PowerOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
}

interface VoteRewardConfig {
  voter_reward: number;
  entry_owner_reward: number;
  active: boolean;
  updated_at?: string;
}

const AdminVoteRewards = ({ user }: Props) => {
  const [config, setConfig] = useState<VoteRewardConfig | null>(null);
  const [voterReward, setVoterReward] = useState("0.010");
  const [ownerReward, setOwnerReward] = useState("0.010");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "vote_reward_config")
      .maybeSingle();
    if (data?.value) {
      const cfg = data.value as unknown as VoteRewardConfig;
      setConfig(cfg);
      setVoterReward(String(cfg.voter_reward));
      setOwnerReward(String(cfg.entry_owner_reward));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    const vr = parseFloat(voterReward);
    const or_ = parseFloat(ownerReward);
    if (isNaN(vr) || vr < 0 || isNaN(or_) || or_ < 0) {
      toast({ title: "Enter valid amounts", variant: "destructive" });
      return;
    }
    setSaving(true);
    const newConfig: VoteRewardConfig = {
      voter_reward: vr,
      entry_owner_reward: or_,
      active: config?.active ?? true,
    };
    await supabase.from("site_settings").upsert({
      key: "vote_reward_config",
      value: newConfig as any,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
    setConfig(newConfig);
    setSaving(false);
    toast({ title: "Vote rewards updated" });
  };

  const toggleActive = async () => {
    if (!user || !config) return;
    const updated = { ...config, active: !config.active };
    await supabase.from("site_settings").upsert({
      key: "vote_reward_config",
      value: updated as any,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
    setConfig(updated);
    toast({ title: updated.active ? "Vote rewards enabled" : "Vote rewards disabled" });
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground py-8"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {config && (
        <div className={`border p-4 rounded-sm flex items-center justify-between flex-wrap gap-3 ${config.active ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"}`}>
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase block mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              {config.active ? (
                <span className="text-primary">✅ Vote Rewards Active</span>
              ) : (
                <span className="text-muted-foreground">⏸ Vote Rewards Disabled</span>
              )}
            </span>
            <p className="text-xs text-muted-foreground">
              Voter: <strong>${config.voter_reward.toFixed(3)}</strong> per vote · Entry Owner: <strong>${config.entry_owner_reward.toFixed(3)}</strong> per vote received
            </p>
          </div>
          <button onClick={toggleActive}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-[10px] tracking-[0.15em] uppercase rounded-sm transition-all ${
              config.active ? "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            }`} style={{ fontFamily: "var(--font-heading)" }}>
            {config.active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
            {config.active ? "Disable" : "Enable"}
          </button>
        </div>
      )}

      {/* Configuration Form */}
      <div className="border border-border p-5 rounded-sm space-y-4">
        <span className="text-[10px] tracking-[0.2em] uppercase text-primary block" style={{ fontFamily: "var(--font-heading)" }}>
          <Vote className="h-3.5 w-3.5 inline mr-2" />Configure Vote Rewards
        </span>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
              Reward per vote (voter gets)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <input type="number" min="0" step="0.001" value={voterReward} onChange={e => setVoterReward(e.target.value)}
                className="flex-1 bg-transparent border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">Each voter receives this amount when they cast a vote</p>
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
              Reward per vote (entry owner gets)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <input type="number" min="0" step="0.001" value={ownerReward} onChange={e => setOwnerReward(e.target.value)}
                className="flex-1 bg-transparent border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">Entry owner receives this amount for each vote on their entry</p>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-[10px] tracking-[0.2em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50 rounded-sm"
          style={{ fontFamily: "var(--font-heading)" }}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Vote className="h-3.5 w-3.5" />}
          {config ? "Update Rewards" : "Create Rewards"}
        </button>
      </div>

      {/* Info */}
      <div className="border border-border/50 p-4 rounded-sm">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>How it works</span>
        <ul className="text-xs text-muted-foreground space-y-1.5" style={{ fontFamily: "var(--font-body)" }}>
          <li>• When a user votes on a competition entry, they receive the <strong>voter reward</strong> in their wallet</li>
          <li>• The entry's photographer receives the <strong>entry owner reward</strong> in their wallet</li>
          <li>• Rewards are only given when voting — unvoting does not deduct</li>
          <li>• Both rewards show as "Vote Reward" in wallet transaction history</li>
          <li>• Disable anytime to stop rewards without losing configuration</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminVoteRewards;
