import { Link, useNavigate } from "react-router-dom";
import { Camera, Copy, Check, Edit2, ExternalLink, Globe, KeyRound, Lock, Mail, MapPin, MessageSquare, Phone, Share2, User, Users } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import T from "@/components/T";
import ProfileCompletionBar from "@/components/ProfileCompletionBar";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BADGES, type BadgeType } from "@/lib/badgeConfig";

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  portfolio_url: string | null;
  photography_interests: string[] | null;
  created_at: string;
  [key: string]: any;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReset, setSendingReset] = useState(false);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);
    if (error) {
      toast({ title: "Failed to send reset email", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent", description: "Check your inbox for the reset link." });
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const [profileRes, badgesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_badges").select("badge_type").eq("user_id", user.id),
      ]);
      setProfile(profileRes.data);
      setUserBadges((badgesRes.data as any[])?.map((b: any) => b.badge_type) || []);
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>
          <T>Loading...</T>
        </div>
      </main>
    );
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Photographer";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20 max-w-3xl">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Profile" }]} className="mb-12" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Avatar + Name header */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-8 mb-16">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-32 w-32 md:h-40 md:w-40 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="h-32 w-32 md:h-40 md:w-40 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                  <User className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <Camera className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </div>

            <div className="text-center md:text-left flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-2 justify-center md:justify-start">
                <div className="w-12 h-px bg-primary hidden md:block" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  <T>Profile</T>
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
                {displayName}
              </h1>
              {/* Badge Ribbons */}
              {userBadges.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 justify-center md:justify-start">
                  {userBadges.map((b) => {
                    const cfg = BADGES[b as BadgeType];
                    if (!cfg) return null;
                    return (
                      <span
                        key={b}
                        className={`inline-flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase px-4 py-1.5 rounded-full shadow-lg ${cfg.ribbonClass}`}
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <span className="text-xs">{cfg.icon}</span>
                        {cfg.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Member Since & Email (private) */}
              <div className="space-y-2 mb-5">
                {memberSince && (
                  <div className="flex items-center gap-2 justify-center md:justify-start text-[10px] tracking-[0.15em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    <span><T>Member since</T> {memberSince}</span>
                  </div>
                )}
                {user?.email && (
                  <div className="flex items-center gap-2 justify-center md:justify-start text-[10px] tracking-[0.15em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    <Mail className="h-3 w-3" />
                    <span>{user.email}</span>
                    <span className="inline-flex items-center gap-1 text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 border border-border text-muted-foreground/50 rounded-sm">
                      <Lock className="h-2.5 w-2.5" />
                      <T>Private</T>
                    </span>
                  </div>
                )}
              </div>

              {/* Public Profile URL */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border border-border rounded-sm max-w-full overflow-hidden">
                  <Share2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-[10px] tracking-[0.1em] text-muted-foreground truncate" style={{ fontFamily: "var(--font-heading)" }}>
                    {window.location.origin}/profile/{user?.id}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/profile/${user?.id}`);
                      setCopied(true);
                      toast({ title: "Profile URL copied!" });
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex-shrink-0 p-1 hover:text-primary transition-colors duration-300"
                    title="Copy profile URL"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <Link
                  to={`/profile/${user?.id}`}
                  className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-primary hover:underline transition-all duration-300"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <ExternalLink className="h-3 w-3" />
                  <T>View Public Profile</T>
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/edit-profile"
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500 flex-shrink-0"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <Edit2 className="h-3 w-3" /> <T>Edit Profile</T>
              </Link>
              <Link
                to={`/profile/${user?.id}`}
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500 flex-shrink-0"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <MessageSquare className="h-3 w-3" /> <T>My Wall</T>
              </Link>
              <Link
                to="/friends"
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500 flex-shrink-0"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <Users className="h-3 w-3" /> <T>Friends</T>
              </Link>
            </div>
          </div>

          {/* Profile Completion */}
          {profile && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.8 }}>
              <ProfileCompletionBar profile={profile} showSections className="mb-12 border border-border p-6" />
            </motion.div>
          )}

          {/* Address */}
          {profile?.city && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }} className="mb-12">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}><T>Location</T></span>
              <p className="text-sm text-muted-foreground flex items-center gap-2" style={{ fontFamily: "var(--font-body)" }}>
                <MapPin className="h-3.5 w-3.5" />
                {[profile.city, profile.state, profile.country].filter(Boolean).join(", ")}
              </p>
            </motion.div>
          )}

          {/* Phone */}
          {profile?.phone && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.8 }} className="mb-12">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}><T>Contact</T></span>
              <p className="text-sm text-muted-foreground flex items-center gap-2" style={{ fontFamily: "var(--font-body)" }}>
                <Phone className="h-3.5 w-3.5" /> {profile.phone}
              </p>
            </motion.div>
          )}

          {/* Bio */}
          {profile?.bio && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }} className="mb-12">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                <T>About</T>
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl" style={{ fontFamily: "var(--font-body)" }}>
                {profile.bio}
              </p>
            </motion.div>
          )}

          {/* Portfolio */}
          {profile?.portfolio_url && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="mb-12">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Portfolio</T>
              </span>
              <a
                href={profile.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline transition-all duration-500"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <Globe className="h-3.5 w-3.5" />
                {profile.portfolio_url.replace(/^https?:\/\//, "")}
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
            </motion.div>
          )}

          {/* Photography interests */}
          {profile?.photography_interests && profile.photography_interests.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="mb-12">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Photography Interests</T>
              </span>
              <div className="flex flex-wrap gap-2">
                {profile.photography_interests.map((interest) => (
                  <span
                    key={interest}
                    className="text-[11px] tracking-[0.1em] px-4 py-2 border border-border text-muted-foreground"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Account Settings */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="mb-12 border border-border p-8">
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              <T>Account Settings</T>
            </span>

            <div className="mb-6">
              <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Email Address</T>
              </span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span style={{ fontFamily: "var(--font-body)" }}>{user?.email}</span>
                <span className="text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border border-border text-muted-foreground/60 ml-2" style={{ fontFamily: "var(--font-heading)" }}>
                  <T>Cannot be changed</T>
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Password</T>
              </span>
              <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>
                <T>We'll send a password reset link to your email address.</T>
              </p>
              <button
                onClick={handlePasswordReset}
                disabled={sendingReset}
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500 disabled:opacity-50"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <KeyRound className="h-3 w-3" />
                {sendingReset ? <T>Sending…</T> : <T>Send Reset Link</T>}
              </button>
            </div>
          </motion.div>

          {!profile?.bio && !profile?.portfolio_url && (!profile?.photography_interests || profile.photography_interests.length === 0) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }} className="border border-border p-10 text-center">
              <Camera className="h-8 w-8 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>
                <T>Your profile is looking a little empty. Add a bio, portfolio, and interests to let others know about your work.</T>
              </p>
              <Link
                to="/edit-profile"
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-6 py-3 bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <Edit2 className="h-3 w-3" /> <T>Complete Your Profile</T>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </main>
  );
};

export default Profile;
