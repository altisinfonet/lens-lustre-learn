import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  User, Camera, Trophy, Calendar, Edit2, Shield, Briefcase, Send, CheckCircle,
  Clock, XCircle, Award, GraduationCap, Wallet, UserCheck, UserX, Users,
  MessageSquare, Heart, Globe, Lock, Settings, ImageIcon, Rss, ExternalLink,
  KeyRound, Mail, MapPin, Phone, ChevronRight, Eye, TrendingUp, Star
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import T from "@/components/T";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { profilesPublic } from "@/lib/profilesPublic";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import PhotographerUpgradeCard from "@/components/PhotographerUpgradeCard";

/* ───── animation helpers ───── */
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};
const tabContent = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/* ───── types ───── */
interface Profile { full_name: string | null; avatar_url: string | null; bio: string | null; portfolio_url: string | null; photography_interests: string[] | null; created_at: string; city?: string; state?: string; country?: string; phone?: string; }
interface UserRole { role: string; created_at: string; }
interface RoleApplication { id: string; requested_role: string; status: string; reason: string | null; admin_message: string | null; created_at: string; }
interface RecentPost { id: string; content: string; privacy: string; created_at: string; like_count: number; comment_count: number; }
interface MyCompEntry { id: string; title: string; photos: string[]; status: string; created_at: string; competition_title: string; competition_id: string; vote_count: number; tags: { label: string; color: string }[]; }
interface FriendRequest { id: string; requester_id: string; created_at: string; requester_name: string | null; requester_avatar: string | null; }

type TabKey = "overview" | "submissions" | "social" | "settings";

const TABS: { key: TabKey; label: string; icon: React.ElementType; }[] = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "submissions", label: "My Submissions", icon: ImageIcon },
  { key: "social", label: "Social", icon: Users },
  { key: "settings", label: "Settings", icon: Settings },
];

/* ================================================================ */
const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get("tab") as TabKey) || "overview";
  const setTab = (t: TabKey) => setSearchParams({ tab: t }, { replace: true });

  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyRole, setApplyRole] = useState<"judge" | "content_editor" | "registered_photographer">("judge");
  const [applyReason, setApplyReason] = useState("");
  const [applyPortfolio, setApplyPortfolio] = useState("");
  const [applyExperience, setApplyExperience] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendActionLoading, setFriendActionLoading] = useState<string | null>(null);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [myEntries, setMyEntries] = useState<MyCompEntry[]>([]);
  const [sendingReset, setSendingReset] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /* ── stats ── */
  const totalVotes = useMemo(() => myEntries.reduce((s, e) => s + e.vote_count, 0), [myEntries]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    if (!authLoading && isAdmin && !searchParams.get("tab")) navigate("/admin");
  }, [user, authLoading, isAdmin, navigate, searchParams]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, rolesRes, appsRes, friendReqRes, postsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_roles").select("role, created_at").eq("user_id", user.id),
        supabase.from("role_applications").select("id, requested_role, status, reason, admin_message, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("friendships").select("id, requester_id, created_at").eq("addressee_id", user.id).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("posts").select("id, content, privacy, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
      if (appsRes.data) setApplications(appsRes.data);

      if (friendReqRes.data && friendReqRes.data.length > 0) {
        const requesterIds = friendReqRes.data.map((r) => r.requester_id);
        const { data: profiles } = await profilesPublic().select("id, full_name, avatar_url").in("id", requesterIds);
        const profileMap = new Map((profiles as any[] || []).map((p: any) => [p.id, p]));
        setFriendRequests(friendReqRes.data.map((r) => ({ ...r, requester_name: profileMap.get(r.requester_id)?.full_name || null, requester_avatar: profileMap.get(r.requester_id)?.avatar_url || null })));
      } else { setFriendRequests([]); }

      if (postsRes.data && postsRes.data.length > 0) {
        const postIds = postsRes.data.map((p) => p.id);
        const [reactionsRes, commentsRes] = await Promise.all([
          supabase.from("post_reactions").select("post_id").in("post_id", postIds),
          supabase.from("post_comments").select("post_id").in("post_id", postIds),
        ]);
        const likeCounts: Record<string, number> = {};
        (reactionsRes.data || []).forEach((r) => { likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1; });
        const commentCounts: Record<string, number> = {};
        (commentsRes.data || []).forEach((c) => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });
        setRecentPosts(postsRes.data.map((p) => ({ ...p, like_count: likeCounts[p.id] || 0, comment_count: commentCounts[p.id] || 0 })));
      }

      const { data: myEntriesData } = await supabase
        .from("competition_entries")
        .select("id, title, photos, status, created_at, competition_id")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);

      if (myEntriesData && myEntriesData.length > 0) {
        const entryIds = myEntriesData.map(e => e.id);
        const compIds = [...new Set(myEntriesData.map(e => e.competition_id))];
        const [compsRes, votesRes, tagAssignRes] = await Promise.all([
          supabase.from("competitions").select("id, title").in("id", compIds),
          supabase.from("competition_votes").select("entry_id").in("entry_id", entryIds),
          supabase.from("judge_tag_assignments").select("entry_id, tag_id").in("entry_id", entryIds),
        ]);
        const compMap = new Map((compsRes.data || []).map(c => [c.id, c.title]));
        const voteMap: Record<string, number> = {};
        (votesRes.data || []).forEach(v => { voteMap[v.entry_id] = (voteMap[v.entry_id] || 0) + 1; });
        const uniqueTagIds = [...new Set((tagAssignRes.data || []).map((t: any) => t.tag_id))];
        let tagInfoMap = new Map<string, { label: string; color: string }>();
        if (uniqueTagIds.length > 0) {
          const { data: tagsData } = await supabase.from("judging_tags" as any).select("id, label, color").in("id", uniqueTagIds);
          (tagsData as any[] || []).forEach((t: any) => tagInfoMap.set(t.id, { label: t.label, color: t.color }));
        }
        const entryTagMap: Record<string, { label: string; color: string }[]> = {};
        (tagAssignRes.data || []).forEach((t: any) => {
          if (!entryTagMap[t.entry_id]) entryTagMap[t.entry_id] = [];
          const info = tagInfoMap.get(t.tag_id);
          if (info && !entryTagMap[t.entry_id].some(x => x.label === info.label)) entryTagMap[t.entry_id].push(info);
        });
        setMyEntries(myEntriesData.map(e => ({ ...e, competition_title: compMap.get(e.competition_id) || "Unknown", vote_count: voteMap[e.id] || 0, tags: entryTagMap[e.id] || [] })));
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  /* ── handlers ── */
  const handleFriendAction = async (friendshipId: string, action: "accept" | "decline") => {
    setFriendActionLoading(friendshipId);
    if (action === "accept") {
      const { error } = await supabase.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", friendshipId);
      if (error) toast({ title: "Failed to accept", description: error.message, variant: "destructive" });
      else { toast({ title: "Friend request accepted!" }); setFriendRequests((p) => p.filter((r) => r.id !== friendshipId)); }
    } else {
      const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
      if (error) toast({ title: "Failed to decline", description: error.message, variant: "destructive" });
      else { toast({ title: "Friend request declined" }); setFriendRequests((p) => p.filter((r) => r.id !== friendshipId)); }
    }
    setFriendActionLoading(null);
  };

  const handleApply = async () => {
    if (!user) return;
    if (!applyReason.trim()) { toast({ title: "Please provide a reason", variant: "destructive" }); return; }
    setSubmitting(true);
    const { error } = await supabase.from("role_applications").insert({
      user_id: user.id, requested_role: applyRole,
      reason: applyReason.trim().slice(0, 1000),
      portfolio_url: applyPortfolio.trim().slice(0, 500) || null,
      experience: applyExperience.trim().slice(0, 1000) || null,
    });
    if (error) toast({ title: "Application failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Application submitted!" });
      setShowApplyForm(false); setApplyReason(""); setApplyPortfolio(""); setApplyExperience("");
      const { data } = await supabase.from("role_applications").select("id, requested_role, status, reason, admin_message, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data) setApplications(data);
    }
    setSubmitting(false);
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
    setSendingReset(false);
    if (error) toast({ title: "Failed to send reset email", description: error.message, variant: "destructive" });
    else toast({ title: "Password reset email sent", description: "Check your inbox for the reset link." });
  };

  if (authLoading || loading || !user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}><T>Loading...</T></div>
      </main>
    );
  }

  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "—";
  const displayName = profile?.full_name || user.email?.split("@")[0] || "Photographer";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const hasRole = (role: string) => roles.some((r) => r.role === role);
  const getRoleDate = (role: string) => { const r = roles.find((r) => r.role === role); return r ? new Date(r.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""; };
  const hasPendingApp = (role: string) => applications.some((a) => a.requested_role === role && a.status === "pending");
  const canApplyFor = (role: string) => !hasRole(role) && !hasPendingApp(role);
  const appStatusIcon = (status: string) => {
    switch (status) { case "pending": return <Clock className="h-3.5 w-3.5 text-yellow-500" />; case "approved": return <CheckCircle className="h-3.5 w-3.5 text-primary" />; case "rejected": return <XCircle className="h-3.5 w-3.5 text-destructive" />; default: return null; }
  };

  const filteredEntries = statusFilter === "all" ? myEntries : myEntries.filter(e => e.status === statusFilter);
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: myEntries.length };
    myEntries.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return counts;
  }, [myEntries]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 md:px-8 py-6 md:py-10 max-w-6xl">
        <Breadcrumbs items={[{ label: "Dashboard" }]} className="mb-4" />

        {/* ═══════ Profile Header Bar ═══════ */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
          className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 md:p-5 border border-border mb-4 bg-card/30"
        >
          {/* Avatar */}
          <Link to="/profile" className="shrink-0 group">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-14 h-14 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border group-hover:border-primary transition-colors">
                <span className="text-lg font-light text-primary" style={{ fontFamily: "var(--font-display)" }}>{initials}</span>
              </div>
            )}
          </Link>

          {/* Info */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <h1 className="text-lg md:text-xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{displayName}</h1>
              <TooltipProvider>
                {hasRole("admin") && (
                  <Tooltip><TooltipTrigger><span className="text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 bg-primary text-primary-foreground rounded-full" style={{ fontFamily: "var(--font-heading)" }}>Admin</span></TooltipTrigger><TooltipContent><T>Since</T> {getRoleDate("admin")}</TooltipContent></Tooltip>
                )}
                {hasRole("judge") && (
                  <Tooltip><TooltipTrigger><span className="text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 bg-accent text-accent-foreground rounded-full" style={{ fontFamily: "var(--font-heading)" }}>Judge</span></TooltipTrigger><TooltipContent><T>Since</T> {getRoleDate("judge")}</TooltipContent></Tooltip>
                )}
                {hasRole("registered_photographer") && (
                  <Tooltip><TooltipTrigger><span className="text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 bg-primary/20 text-primary rounded-full" style={{ fontFamily: "var(--font-heading)" }}>Photographer</span></TooltipTrigger><TooltipContent><T>Verified</T> {getRoleDate("registered_photographer")}</TooltipContent></Tooltip>
                )}
                {hasRole("content_editor") && (
                  <Tooltip><TooltipTrigger><span className="text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full" style={{ fontFamily: "var(--font-heading)" }}>Contributor</span></TooltipTrigger><TooltipContent><T>Since</T> {getRoleDate("content_editor")}</TooltipContent></Tooltip>
                )}
                {hasRole("student") && (
                  <Tooltip><TooltipTrigger><span className="text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 bg-accent/20 text-accent-foreground rounded-full" style={{ fontFamily: "var(--font-heading)" }}>Student</span></TooltipTrigger><TooltipContent><T>Since</T> {getRoleDate("student")}</TooltipContent></Tooltip>
                )}
              </TooltipProvider>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
              {user.email} · <T>Member since</T> {memberSince}
            </p>
          </div>

          {/* Quick stat pills */}
          <div className="flex gap-3 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex flex-col items-center px-3 py-1.5 border border-border rounded-sm hover:border-primary/50 transition-colors cursor-default">
                    <span className="text-base font-light text-primary" style={{ fontFamily: "var(--font-display)" }}>{myEntries.length}</span>
                    <span className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>Entries</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent><T>Total competition entries submitted</T></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex flex-col items-center px-3 py-1.5 border border-border rounded-sm hover:border-primary/50 transition-colors cursor-default">
                    <span className="text-base font-light text-primary" style={{ fontFamily: "var(--font-display)" }}>{totalVotes}</span>
                    <span className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>Votes</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent><T>Total votes received on entries</T></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex flex-col items-center px-3 py-1.5 border border-border rounded-sm hover:border-primary/50 transition-colors cursor-default">
                    <span className="text-base font-light text-primary" style={{ fontFamily: "var(--font-display)" }}>{friendRequests.length}</span>
                    <span className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>Requests</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent><T>Pending friend requests</T></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>

        {/* ═══════ Tab Navigation ═══════ */}
        <div className="flex items-center gap-0 border-b border-border mb-4 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const badge = tab.key === "social" && friendRequests.length > 0 ? friendRequests.length : tab.key === "submissions" && myEntries.length > 0 ? myEntries.length : null;
            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-[10px] tracking-[0.2em] uppercase transition-colors whitespace-nowrap ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <T>{tab.label}</T>
                {badge && (
                  <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 text-[8px] bg-primary text-primary-foreground rounded-full">
                    {badge}
                  </span>
                )}
                {isActive && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ═══════ Tab Content ═══════ */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" {...tabContent}>
              <OverviewTab
                displayName={displayName} user={user} profile={profile}
                myEntries={myEntries} recentPosts={recentPosts} roles={roles}
                memberSince={memberSince} friendRequests={friendRequests}
                hasRole={hasRole}
              />
            </motion.div>
          )}
          {activeTab === "submissions" && (
            <motion.div key="submissions" {...tabContent}>
              <SubmissionsTab
                myEntries={filteredEntries} statusFilter={statusFilter}
                setStatusFilter={setStatusFilter} statusCounts={statusCounts}
              />
            </motion.div>
          )}
          {activeTab === "social" && (
            <motion.div key="social" {...tabContent}>
              <SocialTab
                friendRequests={friendRequests} recentPosts={recentPosts}
                user={user} handleFriendAction={handleFriendAction}
                friendActionLoading={friendActionLoading}
              />
            </motion.div>
          )}
          {activeTab === "settings" && (
            <motion.div key="settings" {...tabContent}>
              <SettingsTab
                user={user} profile={profile} roles={roles} applications={applications}
                hasRole={hasRole} canApplyFor={canApplyFor} showApplyForm={showApplyForm}
                setShowApplyForm={setShowApplyForm} applyRole={applyRole} setApplyRole={setApplyRole}
                applyReason={applyReason} setApplyReason={setApplyReason}
                applyPortfolio={applyPortfolio} setApplyPortfolio={setApplyPortfolio}
                applyExperience={applyExperience} setApplyExperience={setApplyExperience}
                submitting={submitting} handleApply={handleApply}
                sendingReset={sendingReset} handlePasswordReset={handlePasswordReset}
                appStatusIcon={appStatusIcon} setRoles={setRoles}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

/* ================================================================
   OVERVIEW TAB
   ================================================================ */
const OverviewTab = ({ displayName, user, profile, myEntries, recentPosts, roles, memberSince, friendRequests, hasRole }: any) => (
  <div className="space-y-4">
    {/* Welcome + Quick Actions */}
    <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
      <h2 className="text-xl md:text-2xl font-light tracking-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
        <T>Welcome,</T> <em className="italic text-primary">{displayName.split(" ")[0]}</em>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: User, label: "Profile", desc: "View profile", to: "/profile" },
          { icon: Trophy, label: "Competitions", desc: "Enter contests", to: "/competitions" },
          { icon: Edit2, label: "Edit Profile", desc: "Update info", to: "/edit-profile" },
          { icon: Wallet, label: "Wallet", desc: "Balance & history", to: "/wallet" },
          { icon: Award, label: "Certificates", desc: "Achievements", to: "/certificates" },
          { icon: Rss, label: "Feed", desc: "Latest updates", to: "/feed" },
          { icon: GraduationCap, label: "Courses", desc: "Learn photography", to: "/courses" },
          ...(hasRole("admin") ? [{ icon: Shield, label: "Admin", desc: "Manage site", to: "/admin" }] : []),
        ].map((a) => (
          <Link key={a.label} to={a.to} className="group flex items-center gap-3 p-3 border border-border hover:border-primary/50 transition-all duration-300">
            <a.icon className="h-4 w-4 text-primary shrink-0 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            <div className="min-w-0">
              <h3 className="text-[11px] tracking-[0.1em] uppercase truncate" style={{ fontFamily: "var(--font-heading)" }}><T>{a.label}</T></h3>
              <p className="text-[9px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-body)" }}><T>{a.desc}</T></p>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>

    {/* Two-column: Recent Entries + Recent Posts */}
    <div className="grid md:grid-cols-2 gap-4">
      {/* Recent Entries */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            <T>Recent Entries</T>
          </span>
          <Link to="/dashboard?tab=submissions" className="text-[9px] tracking-[0.15em] uppercase text-primary hover:underline" style={{ fontFamily: "var(--font-heading)" }}><T>View All →</T></Link>
        </div>
        <div className="border border-border divide-y divide-border">
          {myEntries.slice(0, 4).map((entry: MyCompEntry) => (
            <Link key={entry.id} to={`/competitions/${entry.competition_id}`} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors group">
              {entry.photos.length > 0 && (
                <img src={entry.photos[0]} alt={entry.title} className="w-10 h-10 object-cover shrink-0 border border-border" loading="lazy" onContextMenu={(e) => e.preventDefault()} draggable={false} />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-light truncate" style={{ fontFamily: "var(--font-display)" }}>{entry.title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={entry.status} />
                  {entry.vote_count > 0 && <span className="text-[9px] text-muted-foreground inline-flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{entry.vote_count}</span>}
                </div>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </Link>
          ))}
          {myEntries.length === 0 && (
            <div className="p-6 text-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground/20 mx-auto mb-1.5" />
              <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}><T>No entries yet</T></p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Recent Posts */}
      <motion.div variants={fadeUp} custom={1.2} initial="hidden" animate="visible">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}><T>Recent Posts</T></span>
          <Link to={`/profile/${user.id}`} className="text-[9px] tracking-[0.15em] uppercase text-primary hover:underline" style={{ fontFamily: "var(--font-heading)" }}><T>My Wall →</T></Link>
        </div>
        <div className="border border-border divide-y divide-border">
          {recentPosts.slice(0, 4).map((post: RecentPost) => (
            <div key={post.id} className="p-3">
              <p className="text-xs text-foreground line-clamp-2 mb-1" style={{ fontFamily: "var(--font-body)" }}>{post.content}</p>
              <div className="flex items-center gap-3 text-[9px] text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                {post.privacy === "public" ? <Globe className="h-2.5 w-2.5" /> : post.privacy === "friends" ? <Users className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                <TimeAgo date={post.created_at} />
                {post.like_count > 0 && <span className="inline-flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{post.like_count}</span>}
                {post.comment_count > 0 && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{post.comment_count}</span>}
              </div>
            </div>
          ))}
          {recentPosts.length === 0 && (
            <div className="p-6 text-center">
              <MessageSquare className="h-5 w-5 text-muted-foreground/20 mx-auto mb-1.5" />
              <p className="text-[10px] text-muted-foreground mb-2" style={{ fontFamily: "var(--font-body)" }}><T>No posts yet</T></p>
              <Link to={`/profile/${user.id}`} className="text-[9px] tracking-[0.15em] uppercase text-primary hover:underline" style={{ fontFamily: "var(--font-heading)" }}><T>Write your first post →</T></Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>

    {/* Activity Timeline */}
    <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible">
      <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}><T>Activity</T></span>
      <div className="border border-border divide-y divide-border">
        <ActivityItem icon={<User className="h-3 w-3" />} title="Account created" description="Welcome to 50mm Retina World" time={memberSince} />
        {roles.map((r: UserRole) => (
          <ActivityItem key={r.role} icon={<Trophy className="h-3 w-3" />} title={`Role: ${r.role}`} description="Role-specific features unlocked" time={new Date(r.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })} />
        ))}
      </div>
    </motion.div>
  </div>
);

/* ================================================================
   SUBMISSIONS TAB
   ================================================================ */
const SubmissionsTab = ({ myEntries, statusFilter, setStatusFilter, statusCounts }: { myEntries: MyCompEntry[]; statusFilter: string; setStatusFilter: (s: string) => void; statusCounts: Record<string, number>; }) => {
  const statuses = ["all", "submitted", "approved", "winner", "rejected"];
  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mr-1" style={{ fontFamily: "var(--font-heading)" }}><T>Filter:</T></span>
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-[9px] tracking-[0.15em] uppercase px-3 py-1 border transition-all duration-300 ${
              statusFilter === s
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {s === "all" ? "All" : s}
            {statusCounts[s] ? <span className="ml-1 text-[8px] opacity-60">({statusCounts[s]})</span> : null}
          </button>
        ))}
      </div>

      {/* Grid view */}
      {myEntries.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {myEntries.map((entry, i) => (
            <motion.div key={entry.id} variants={fadeUp} custom={i * 0.05} initial="hidden" animate="visible">
              <Link to={`/competitions/${entry.competition_id}`} className="group block border border-border hover:border-primary/40 transition-all duration-300 overflow-hidden">
                {entry.photos.length > 0 && (
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={entry.photos[0]} alt={entry.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                      <div className="text-center">
                        <Heart className="h-4 w-4 text-primary mx-auto mb-0.5" />
                        <span className="text-xs text-foreground" style={{ fontFamily: "var(--font-heading)" }}>{entry.vote_count}</span>
                      </div>
                      <div className="text-center">
                        <Eye className="h-4 w-4 text-primary mx-auto mb-0.5" />
                        <span className="text-xs text-foreground" style={{ fontFamily: "var(--font-heading)" }}>View</span>
                      </div>
                    </div>
                    {/* Status badge */}
                    <div className="absolute top-2 left-2">
                      <StatusBadge status={entry.status} />
                    </div>
                  </div>
                )}
                <div className="p-3">
                  <h4 className="text-xs font-light tracking-tight truncate mb-0.5" style={{ fontFamily: "var(--font-display)" }}>{entry.title}</h4>
                  <p className="text-[9px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-body)" }}>{entry.competition_title}</p>
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {entry.tags.map(tag => (
                        <span key={tag.label} className="text-[7px] tracking-[0.1em] uppercase px-1.5 py-0.5 border rounded-sm font-semibold" style={{ borderColor: tag.color, color: tag.color, fontFamily: "var(--font-heading)" }}>{tag.label}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border p-10 text-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>
            {statusFilter === "all" ? <T>No entries yet. Enter a competition to get started!</T> : <T>No entries with this status.</T>}
          </p>
          <Link to="/competitions" className="inline-flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase px-4 py-2 border border-border hover:border-primary hover:text-primary transition-all duration-500" style={{ fontFamily: "var(--font-heading)" }}>
            <Trophy className="h-3 w-3" /> <T>Browse Competitions</T>
          </Link>
        </div>
      )}
    </div>
  );
};

/* ================================================================
   SOCIAL TAB
   ================================================================ */
const SocialTab = ({ friendRequests, recentPosts, user, handleFriendAction, friendActionLoading }: any) => (
  <div className="space-y-4">
    {/* Quick links */}
    <div className="flex flex-wrap gap-2">
      {[
        { icon: Users, label: "Friends & Network", to: "/friends" },
        { icon: MessageSquare, label: "My Wall", to: `/profile/${user.id}` },
        { icon: Rss, label: "Feed", to: "/feed" },
        { icon: Star, label: "Discover Photographers", to: "/discover" },
      ].map(l => (
        <Link key={l.label} to={l.to} className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-3 py-2 border border-border hover:border-primary hover:text-primary transition-all duration-300" style={{ fontFamily: "var(--font-heading)" }}>
          <l.icon className="h-3 w-3" /> <T>{l.label}</T>
        </Link>
      ))}
    </div>

    {/* Friend Requests */}
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-3.5 w-3.5 text-primary" />
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          <T>Friend Requests</T>
          {friendRequests.length > 0 && <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 text-[8px] bg-primary text-primary-foreground rounded-full">{friendRequests.length}</span>}
        </span>
      </div>
      {friendRequests.length > 0 ? (
        <div className="border border-border divide-y divide-border">
          {friendRequests.map((req: FriendRequest) => {
            const name = req.requester_name || "Unknown User";
            const reqInitials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div key={req.id} className="flex items-center gap-3 p-3">
                <Link to={`/profile/${req.requester_id}`} className="shrink-0">
                  {req.requester_avatar ? <img src={req.requester_avatar} alt={name} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-xs font-light text-primary">{reqInitials}</span></div>}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${req.requester_id}`} className="text-xs font-light hover:text-primary transition-colors" style={{ fontFamily: "var(--font-heading)" }}>{name}</Link>
                  <p className="text-[9px] text-muted-foreground"><TimeAgo date={req.created_at} /></p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => handleFriendAction(req.id, "accept")} disabled={friendActionLoading === req.id} className="text-[9px] tracking-[0.1em] uppercase px-2.5 py-1 border border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 disabled:opacity-50" style={{ fontFamily: "var(--font-heading)" }}><T>Accept</T></button>
                  <button onClick={() => handleFriendAction(req.id, "decline")} disabled={friendActionLoading === req.id} className="text-[9px] tracking-[0.1em] uppercase px-2.5 py-1 border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all duration-300 disabled:opacity-50" style={{ fontFamily: "var(--font-heading)" }}><T>Decline</T></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-border p-6 text-center">
          <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}><T>No pending friend requests</T></p>
        </div>
      )}
    </div>

    {/* Recent Wall Posts */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}><T>Wall Posts</T></span>
        <Link to={`/profile/${user.id}`} className="text-[9px] tracking-[0.15em] uppercase text-primary hover:underline" style={{ fontFamily: "var(--font-heading)" }}><T>View All →</T></Link>
      </div>
      {recentPosts.length > 0 ? (
        <div className="border border-border divide-y divide-border">
          {recentPosts.map((post: RecentPost) => (
            <div key={post.id} className="p-3">
              <p className="text-xs text-foreground line-clamp-2 mb-1" style={{ fontFamily: "var(--font-body)" }}>{post.content}</p>
              <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                <TimeAgo date={post.created_at} />
                {post.like_count > 0 && <span className="inline-flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{post.like_count}</span>}
                {post.comment_count > 0 && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{post.comment_count}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border p-6 text-center">
          <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}><T>No posts yet</T></p>
        </div>
      )}
    </div>
  </div>
);

/* ================================================================
   SETTINGS TAB
   ================================================================ */
const SettingsTab = ({ user, profile, roles, applications, hasRole, canApplyFor, showApplyForm, setShowApplyForm, applyRole, setApplyRole, applyReason, setApplyReason, applyPortfolio, setApplyPortfolio, applyExperience, setApplyExperience, submitting, handleApply, sendingReset, handlePasswordReset, appStatusIcon, setRoles }: any) => (
  <div className="space-y-4">
    {/* Account Info */}
    <div className="border border-border p-4 md:p-5">
      <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}><T>Account Information</T></span>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}><T>Email Address</T></span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span style={{ fontFamily: "var(--font-body)" }}>{user.email}</span>
            <span className="text-[8px] tracking-[0.1em] uppercase px-1.5 py-0.5 border border-border text-muted-foreground/60" style={{ fontFamily: "var(--font-heading)" }}><T>Fixed</T></span>
          </div>
        </div>
        <div>
          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}><T>Password</T></span>
          <button onClick={handlePasswordReset} disabled={sendingReset} className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 border border-border hover:border-primary hover:text-primary transition-all duration-500 disabled:opacity-50" style={{ fontFamily: "var(--font-heading)" }}>
            <KeyRound className="h-3 w-3" />
            {sendingReset ? <T>Sending…</T> : <T>Reset Password</T>}
          </button>
        </div>
      </div>
      {profile?.city && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}><T>Location</T></span>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" />{[profile.city, profile.state, profile.country].filter(Boolean).join(", ")}</p>
        </div>
      )}
      {profile?.phone && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}><T>Phone</T></span>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" />{profile.phone}</p>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-border">
        <Link to="/edit-profile" className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-primary hover:underline" style={{ fontFamily: "var(--font-heading)" }}>
          <Edit2 className="h-3 w-3" /> <T>Edit Profile</T>
        </Link>
      </div>
    </div>

    {/* Photographer Upgrade */}
    {!hasRole("registered_photographer") && (
      <PhotographerUpgradeCard onUpgraded={() => {
        supabase.from("user_roles").select("role, created_at").eq("user_id", user.id).then(({ data }: any) => { if (data) setRoles(data); });
      }} />
    )}

    {/* Role Applications */}
    <div className="border border-border p-4 md:p-5">
      <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}><T>Role Applications</T></span>
      {(canApplyFor("judge") || canApplyFor("content_editor") || canApplyFor("registered_photographer")) && !showApplyForm && (
        <div className="flex flex-wrap gap-2 mb-3">
          {canApplyFor("registered_photographer") && (
            <button onClick={() => { setApplyRole("registered_photographer"); setShowApplyForm(true); }} className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-3 py-2 border border-primary/30 bg-primary/5 hover:border-primary/50 transition-all duration-500" style={{ fontFamily: "var(--font-heading)" }}>
              <Camera className="h-3 w-3 text-primary" /> <T>Apply: Photographer</T>
            </button>
          )}
          {canApplyFor("judge") && (
            <button onClick={() => { setApplyRole("judge"); setShowApplyForm(true); }} className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-3 py-2 border border-border hover:border-primary/50 transition-all duration-500" style={{ fontFamily: "var(--font-heading)" }}>
              <Briefcase className="h-3 w-3 text-primary" /> <T>Apply: Judge</T>
            </button>
          )}
          {canApplyFor("content_editor") && (
            <button onClick={() => { setApplyRole("content_editor"); setShowApplyForm(true); }} className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-3 py-2 border border-border hover:border-primary/50 transition-all duration-500" style={{ fontFamily: "var(--font-heading)" }}>
              <Briefcase className="h-3 w-3 text-primary" /> <T>Apply: Editor</T>
            </button>
          )}
        </div>
      )}

      {showApplyForm && (
        <div className="border border-border p-4 mb-3 space-y-3 bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              <T>{`Apply as ${applyRole === "judge" ? "Judge" : applyRole === "registered_photographer" ? "Photographer" : "Content Editor"}`}</T>
            </span>
            <button onClick={() => setShowApplyForm(false)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}><T>Why?</T> *</label>
            <Textarea value={applyReason} onChange={(e: any) => setApplyReason(e.target.value)} placeholder="Your reason..." className="bg-transparent text-sm" maxLength={1000} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}><T>Portfolio URL</T></label>
            <Input value={applyPortfolio} onChange={(e: any) => setApplyPortfolio(e.target.value)} placeholder="https://..." className="bg-transparent text-sm" maxLength={500} />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}><T>Experience</T></label>
            <Textarea value={applyExperience} onChange={(e: any) => setApplyExperience(e.target.value)} placeholder="Awards, years..." className="bg-transparent text-sm" maxLength={1000} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleApply} disabled={submitting} className="text-[10px] tracking-[0.1em] uppercase bg-primary text-primary-foreground h-8" style={{ fontFamily: "var(--font-heading)" }}>
              <Send className="h-3 w-3 mr-1" /> {submitting ? <T>Submitting…</T> : <T>Submit</T>}
            </Button>
            <Button variant="ghost" onClick={() => setShowApplyForm(false)} className="text-[10px] tracking-[0.1em] uppercase h-8" style={{ fontFamily: "var(--font-heading)" }}><T>Cancel</T></Button>
          </div>
        </div>
      )}

      {applications.length > 0 ? (
        <div className="divide-y divide-border">
          {applications.map((app: any) => (
            <div key={app.id} className="flex items-start gap-3 py-3">
              <div className="mt-0.5">{appStatusIcon(app.status)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-light" style={{ fontFamily: "var(--font-heading)" }}>
                  {app.requested_role === "content_editor" ? "Content Editor" : app.requested_role === "registered_photographer" ? "Photographer" : "Judge"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  <span className={app.status === "approved" ? "text-primary" : app.status === "rejected" ? "text-destructive" : "text-yellow-500"}>{app.status}</span>
                </p>
                {app.admin_message && <p className="text-[10px] text-muted-foreground mt-1 p-1.5 bg-muted/50 border-l-2 border-primary">{app.admin_message}</p>}
              </div>
              <span className="text-[9px] text-muted-foreground shrink-0">{new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}><T>No applications yet.</T></p>
      )}
    </div>
  </div>
);

/* ================================================================
   SHARED COMPONENTS
   ================================================================ */
const StatusBadge = ({ status }: { status: string }) => (
  <span className={`text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 border ${
    status === "approved" || status === "winner" ? "border-primary/40 text-primary bg-primary/5" :
    status === "rejected" ? "border-destructive/40 text-destructive bg-destructive/5" :
    "border-border text-muted-foreground"
  }`} style={{ fontFamily: "var(--font-heading)" }}>{status}</span>
);

const TimeAgo = ({ date }: { date: string }) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  let text = "Just now";
  if (mins >= 1 && mins < 60) text = `${mins}m`;
  else if (mins >= 60 && mins < 1440) text = `${Math.floor(mins / 60)}h`;
  else if (mins >= 1440 && mins < 10080) text = `${Math.floor(mins / 1440)}d`;
  else if (mins >= 10080) text = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return <span>{text}</span>;
};

const ActivityItem = ({ icon, title, description, time }: { icon: React.ReactNode; title: string; description: string; time: string; }) => (
  <div className="flex items-start gap-3 p-3">
    <div className="mt-0.5 text-primary">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-light" style={{ fontFamily: "var(--font-heading)" }}><T>{title}</T></p>
      <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}><T>{description}</T></p>
    </div>
    <span className="text-[9px] text-muted-foreground shrink-0">{time}</span>
  </div>
);

export default Dashboard;
