import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Camera, Trophy, Calendar, Edit2, Shield, Briefcase, Send, CheckCircle, Clock, XCircle, Award } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  portfolio_url: string | null;
  photography_interests: string[] | null;
  created_at: string;
}

interface UserRole {
  role: string;
  created_at: string;
}

interface RoleApplication {
  id: string;
  requested_role: string;
  status: string;
  reason: string | null;
  admin_message: string | null;
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Role application state
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyRole, setApplyRole] = useState<"judge" | "content_editor">("judge");
  const [applyReason, setApplyReason] = useState("");
  const [applyPortfolio, setApplyPortfolio] = useState("");
  const [applyExperience, setApplyExperience] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [profileRes, rolesRes, appsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_roles").select("role, created_at").eq("user_id", user.id),
        supabase.from("role_applications").select("id, requested_role, status, reason, admin_message, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
      if (appsRes.data) setApplications(appsRes.data);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleApply = async () => {
    if (!user) return;
    if (!applyReason.trim()) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("role_applications").insert({
      user_id: user.id,
      requested_role: applyRole,
      reason: applyReason.trim().slice(0, 1000),
      portfolio_url: applyPortfolio.trim().slice(0, 500) || null,
      experience: applyExperience.trim().slice(0, 1000) || null,
    });
    if (error) {
      toast({ title: "Application failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Application submitted!", description: "You'll be notified when an admin reviews it." });
      setShowApplyForm(false);
      setApplyReason("");
      setApplyPortfolio("");
      setApplyExperience("");
      const { data } = await supabase.from("role_applications").select("id, requested_role, status, reason, admin_message, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data) setApplications(data);
    }
    setSubmitting(false);
  };

  if (authLoading || loading || !user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>
          Loading...
        </div>
      </main>
    );
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : "—";

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Photographer";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const hasRole = (role: string) => roles.some((r) => r.role === role);
  const getRoleDate = (role: string) => {
    const r = roles.find((r) => r.role === role);
    return r ? new Date(r.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
  };
  const hasPendingApp = (role: string) => applications.some((a) => a.requested_role === role && a.status === "pending");
  const canApplyFor = (role: string) => !hasRole(role) && !hasPendingApp(role);

  const appStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
      case "approved": return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
      case "rejected": return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return null;
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border" aria-label="Dashboard navigation">
        <div className="container mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="ArteFoto Global Home">
            <img src="/images/logo.png" alt="ArteFoto Global" className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
              ArteFoto Global
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground hidden sm:inline" style={{ fontFamily: "var(--font-heading)" }}>
              {displayName}
            </span>
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              className="text-xs tracking-[0.15em] uppercase px-4 py-2 border border-foreground/30 hover:bg-foreground hover:text-background transition-all duration-700 inline-flex items-center gap-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <LogOut className="h-3 w-3" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20">
        <Breadcrumbs items={[{ label: "Dashboard" }]} className="mb-10" />

        <div className="grid lg:grid-cols-3 gap-10 lg:gap-16">
          {/* Profile Card */}
          <motion.div initial="hidden" animate="visible" className="lg:col-span-1">
            <motion.div variants={fadeUp} custom={0} className="border border-border p-8 md:p-10">
              <div className="flex flex-col items-center text-center mb-8">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-20 h-20 rounded-full object-cover mb-4" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <span className="text-xl font-light text-primary" style={{ fontFamily: "var(--font-display)" }}>{initials}</span>
                  </div>
                )}
                <h1 className="text-2xl font-light tracking-tight mb-1" style={{ fontFamily: "var(--font-display)" }}>
                  {displayName}
                </h1>
                <TooltipProvider>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center">
                    {hasRole("admin") && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] uppercase px-3 py-1 bg-primary text-primary-foreground rounded-full" style={{ fontFamily: "var(--font-heading)" }}>
                            <Shield className="h-3 w-3" />
                            Admin
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p>Assigned {getRoleDate("admin")}</p></TooltipContent>
                      </Tooltip>
                    )}
                    {hasRole("judge") && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] uppercase px-3 py-1 bg-accent text-accent-foreground rounded-full" style={{ fontFamily: "var(--font-heading)" }}>
                            <Award className="h-3 w-3" />
                            Judge
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p>Assigned {getRoleDate("judge")}</p></TooltipContent>
                      </Tooltip>
                    )}
                    {hasRole("content_editor") && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] uppercase px-3 py-1 bg-secondary text-secondary-foreground rounded-full" style={{ fontFamily: "var(--font-heading)" }}>
                            <Edit2 className="h-3 w-3" />
                            Contributor
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p>Assigned {getRoleDate("content_editor")}</p></TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{user.email}</p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {roles.map((r) => (
                  <span key={r.role} className="text-[9px] tracking-[0.2em] uppercase px-3 py-1 border border-primary/30 text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                    {r.role}
                  </span>
                ))}
              </div>

              {profile?.bio && (
                <p className="text-sm text-muted-foreground text-center leading-relaxed mb-6" style={{ fontFamily: "var(--font-body)" }}>
                  {profile.bio}
                </p>
              )}

              <div className="space-y-3 border-t border-border pt-6">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span style={{ fontFamily: "var(--font-body)" }}>Member since {memberSince}</span>
                </div>
                {profile?.portfolio_url && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Camera className="h-3.5 w-3.5" />
                    <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}>
                      Portfolio
                    </a>
                  </div>
                )}
              </div>

              {profile?.photography_interests && profile.photography_interests.length > 0 && (
                <div className="mt-6 border-t border-border pt-6">
                  <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                    Interests
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.photography_interests.map((interest) => (
                      <span key={interest} className="text-[10px] tracking-[0.1em] px-2.5 py-1 bg-muted text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* Main content */}
          <motion.div initial="hidden" animate="visible" className="lg:col-span-2 space-y-10">
            <motion.div variants={fadeUp} custom={1}>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-px bg-primary" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Dashboard</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Welcome, <em className="italic text-primary">{displayName.split(" ")[0]}</em>
              </h2>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={fadeUp} custom={2}>
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                Quick Actions
              </span>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: User, label: "My Profile", desc: "View your public profile", to: "/profile" },
                  { icon: Trophy, label: "Competitions", desc: "Browse & enter contests", to: "/competitions" },
                  { icon: Camera, label: "My Works", desc: "Manage your portfolio", to: "#" },
                  { icon: Edit2, label: "Edit Profile", desc: "Update your info", to: "/edit-profile" },
                  { icon: Award, label: "Certificates", desc: "View your achievements", to: "/certificates" },
                  ...(roles.some((r) => r.role === "admin")
                    ? [{ icon: Shield, label: "Admin Panel", desc: "Manage competitions & entries", to: "/admin" }]
                    : []),
                ].map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="group border border-border p-6 hover:border-primary/50 transition-all duration-700"
                  >
                    <action.icon className="h-5 w-5 text-primary mb-3" strokeWidth={1.5} />
                    <h3 className="text-sm font-light tracking-wide mb-1" style={{ fontFamily: "var(--font-heading)" }}>{action.label}</h3>
                    <p className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{action.desc}</p>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Role Applications */}
            <motion.div variants={fadeUp} custom={3}>
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                Role Applications
              </span>

              {(canApplyFor("judge") || canApplyFor("content_editor")) && !showApplyForm && (
                <div className="flex flex-wrap gap-3 mb-6">
                  {canApplyFor("judge") && (
                    <button
                      onClick={() => { setApplyRole("judge"); setShowApplyForm(true); }}
                      className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-3 border border-border hover:border-primary/50 transition-all duration-500"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      Apply as Judge
                    </button>
                  )}
                  {canApplyFor("content_editor") && (
                    <button
                      onClick={() => { setApplyRole("content_editor"); setShowApplyForm(true); }}
                      className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-3 border border-border hover:border-primary/50 transition-all duration-500"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      Apply as Content Editor
                    </button>
                  )}
                </div>
              )}

              {showApplyForm && (
                <div className="border border-border p-6 md:p-8 mb-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                      Apply as {applyRole === "judge" ? "Judge" : "Content Editor"}
                    </span>
                    <button onClick={() => setShowApplyForm(false)} className="text-muted-foreground hover:text-foreground">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                      Why do you want this role? *
                    </label>
                    <Textarea
                      value={applyReason}
                      onChange={(e) => setApplyReason(e.target.value)}
                      placeholder={applyRole === "judge" ? "Describe your experience in photography judging..." : "Tell us about your writing and photography experience..."}
                      className="bg-transparent"
                      maxLength={1000}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                      Portfolio URL
                    </label>
                    <Input
                      value={applyPortfolio}
                      onChange={(e) => setApplyPortfolio(e.target.value)}
                      placeholder="https://yourportfolio.com"
                      className="bg-transparent"
                      maxLength={500}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                      Relevant Experience
                    </label>
                    <Textarea
                      value={applyExperience}
                      onChange={(e) => setApplyExperience(e.target.value)}
                      placeholder="Awards, publications, years of experience..."
                      className="bg-transparent"
                      maxLength={1000}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleApply}
                      disabled={submitting}
                      className="text-xs tracking-[0.1em] uppercase bg-primary text-primary-foreground"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {submitting ? "Submitting…" : "Submit Application"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowApplyForm(false)} className="text-xs tracking-[0.1em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {applications.length > 0 ? (
                <div className="border border-border divide-y divide-border">
                  {applications.map((app) => (
                    <div key={app.id} className="flex items-start gap-4 p-5">
                      <div className="mt-0.5">{appStatusIcon(app.status)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-light" style={{ fontFamily: "var(--font-heading)" }}>
                          {app.requested_role === "content_editor" ? "Content Editor" : "Judge"} Application
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
                          Status: <span className={app.status === "approved" ? "text-primary" : app.status === "rejected" ? "text-destructive" : "text-yellow-500"}>{app.status}</span>
                        </p>
                        {app.admin_message && (
                          <p className="text-[11px] text-muted-foreground mt-2 p-2 bg-muted/50 border-l-2 border-primary" style={{ fontFamily: "var(--font-body)" }}>
                            Admin: {app.admin_message}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0" style={{ fontFamily: "var(--font-body)" }}>
                        {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  {canApplyFor("judge") || canApplyFor("content_editor")
                    ? "No applications yet. Apply for a role above to unlock new features."
                    : "You already have all available roles."}
                </p>
              )}
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={fadeUp} custom={4}>
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                Recent Activity
              </span>
              <div className="border border-border divide-y divide-border">
                <ActivityItem
                  icon={<User className="h-3.5 w-3.5" />}
                  title="Account created"
                  description="Welcome to ArteFoto Global"
                  time={memberSince}
                />
                {roles.map((r) => (
                  <ActivityItem
                    key={r.role}
                    icon={<Trophy className="h-3.5 w-3.5" />}
                    title={`Role assigned: ${r.role}`}
                    description="You can now access role-specific features"
                    time={memberSince}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

const ActivityItem = ({
  icon, title, description, time,
}: {
  icon: React.ReactNode; title: string; description: string; time: string;
}) => (
  <div className="flex items-start gap-4 p-5">
    <div className="mt-0.5 text-primary">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-light" style={{ fontFamily: "var(--font-heading)" }}>{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-body)" }}>{description}</p>
    </div>
    <span className="text-[10px] text-muted-foreground shrink-0" style={{ fontFamily: "var(--font-body)" }}>{time}</span>
  </div>
);

export default Dashboard;
