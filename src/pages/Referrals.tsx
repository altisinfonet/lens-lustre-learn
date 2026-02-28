import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Users, Gift, Share2, Link as LinkIcon, Loader2, UserPlus, DollarSign } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import T from "@/components/T";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

interface Referral {
  id: string;
  referred_id: string;
  status: string;
  reward_amount: number;
  created_at: string;
  rewarded_at: string | null;
  referred_name?: string;
}

const Referrals = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateCode = useCallback(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Fetch or create referral code
    const { data: codeData } = await (supabase
      .from("referral_codes" as any)
      .select("code")
      .eq("user_id", user.id)
      .maybeSingle() as any);

    if (codeData) {
      setReferralCode(codeData.code);
    } else {
      // Auto-generate code
      setGenerating(true);
      const code = generateCode();
      const { error } = await (supabase.from("referral_codes" as any).insert({
        user_id: user.id,
        code,
      } as any) as any);
      if (!error) {
        setReferralCode(code);
      }
      setGenerating(false);
    }

    // Fetch referrals
    const { data: refs } = await (supabase
      .from("referrals" as any)
      .select("id, referred_id, status, reward_amount, created_at, rewarded_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }) as any);

    if (refs && refs.length > 0) {
      const userIds = refs.map((r) => r.referred_id);
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, full_name")
        .in("id", userIds);
      const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
      setReferrals(refs.map((r) => ({ ...r, referred_name: nameMap.get(r.referred_id) || "User" })));
    } else {
      setReferrals([]);
    }

    setLoading(false);
  }, [user, generateCode]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    fetchData();
  }, [user, authLoading, navigate, fetchData]);

  const referralLink = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Referral link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Join me on 50mm Retina!",
        text: "Sign up using my referral link and we both earn rewards!",
        url: referralLink,
      });
    } else {
      handleCopy();
    }
  };

  const totalRewards = referrals.filter(r => r.status === "rewarded").reduce((sum, r) => sum + (r.reward_amount || 0), 0);
  const pendingCount = referrals.filter(r => r.status === "pending").length;
  const rewardedCount = referrals.filter(r => r.status === "rewarded").length;

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
        <Breadcrumbs items={[{ label: "Referrals" }]} />

        <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
          <h1 className="text-3xl md:text-4xl font-light mt-6 mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Invite <em className="italic text-primary">Friends</em>
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            <T>Share your referral link and earn wallet rewards when your friends make their first paid activity.</T>
          </p>
        </motion.div>

        {/* Referral Link Card */}
        <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp}>
          <Card className="mb-8 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm tracking-[0.15em] uppercase flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                <LinkIcon className="h-4 w-4 text-primary" />
                <T>Your Referral Link</T>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-muted/50 border border-border rounded-md px-4 py-3 text-sm font-mono truncate select-all">
                  {generating ? "Generating..." : referralLink}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} disabled={!referralCode}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-1.5 text-xs uppercase tracking-wider">{copied ? "Copied" : "Copy"}</span>
                  </Button>
                  <Button size="sm" onClick={handleShare} disabled={!referralCode}>
                    <Share2 className="h-4 w-4" />
                    <span className="ml-1.5 text-xs uppercase tracking-wider">Share</span>
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                <T>Your code:</T> <span className="font-mono font-bold text-primary">{referralCode || "..."}</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div initial="hidden" animate="visible" custom={2} variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <UserPlus className="h-8 w-8 mx-auto mb-2 text-primary/60" />
              <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{referrals.length}</div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Total Invites</T>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Gift className="h-8 w-8 mx-auto mb-2 text-primary/60" />
              <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{rewardedCount}</div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Rewards Earned</T>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary/60" />
              <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>${totalRewards.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Total Earned</T>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referrals Table */}
        <motion.div initial="hidden" animate="visible" custom={3} variants={fadeUp}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm tracking-[0.15em] uppercase flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                <Users className="h-4 w-4 text-primary" />
                <T>Invited Friends</T>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm"><T>No referrals yet. Share your link to start earning!</T></p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] uppercase tracking-wider">Friend</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">Reward</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.referred_name}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "rewarded" ? "default" : "secondary"} className="text-[9px] uppercase tracking-wider">
                            {r.status === "rewarded" ? "Rewarded" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {r.status === "rewarded" ? `$${r.reward_amount.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* How it works */}
        <motion.div initial="hidden" animate="visible" custom={4} variants={fadeUp} className="mt-8">
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <h3 className="text-xs tracking-[0.2em] uppercase font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                <T>How It Works</T>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="text-2xl font-bold text-primary/30" style={{ fontFamily: "var(--font-display)" }}>1</span>
                  <p><T>Share your unique referral link with friends</T></p>
                </div>
                <div className="flex gap-3">
                  <span className="text-2xl font-bold text-primary/30" style={{ fontFamily: "var(--font-display)" }}>2</span>
                  <p><T>They sign up using your link</T></p>
                </div>
                <div className="flex gap-3">
                  <span className="text-2xl font-bold text-primary/30" style={{ fontFamily: "var(--font-display)" }}>3</span>
                  <p><T>You earn a wallet reward when they complete a paid activity</T></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
};

export default Referrals;
