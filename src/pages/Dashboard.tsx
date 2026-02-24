import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Camera, Trophy, Calendar, ArrowLeft, Edit2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

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
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
      setLoading(false);
    };

    fetchData();
  }, [user]);

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
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-500 mb-10" style={{ fontFamily: "var(--font-heading)" }}>
          <ArrowLeft className="h-3 w-3" /> Home
        </Link>

        <div className="grid lg:grid-cols-3 gap-10 lg:gap-16">
          {/* Profile Card */}
          <motion.div
            initial="hidden"
            animate="visible"
            className="lg:col-span-1"
          >
            <motion.div variants={fadeUp} custom={0} className="border border-border p-8 md:p-10">
              {/* Avatar */}
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
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{user.email}</p>
              </div>

              {/* Roles */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {roles.map((r) => (
                  <span key={r.role} className="text-[9px] tracking-[0.2em] uppercase px-3 py-1 border border-primary/30 text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                    {r.role}
                  </span>
                ))}
              </div>

              {/* Bio */}
              {profile?.bio && (
                <p className="text-sm text-muted-foreground text-center leading-relaxed mb-6" style={{ fontFamily: "var(--font-body)" }}>
                  {profile.bio}
                </p>
              )}

              {/* Meta */}
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

              {/* Interests */}
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
          <motion.div
            initial="hidden"
            animate="visible"
            className="lg:col-span-2 space-y-10"
          >
            {/* Welcome */}
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
                  { icon: Trophy, label: "Competitions", desc: "Browse & enter contests", to: "/competitions" },
                  { icon: Camera, label: "My Works", desc: "Manage your portfolio", to: "#" },
                  { icon: Edit2, label: "Edit Profile", desc: "Update your info", to: "#" },
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

            {/* Recent Activity */}
            <motion.div variants={fadeUp} custom={3}>
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
  icon,
  title,
  description,
  time,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
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
