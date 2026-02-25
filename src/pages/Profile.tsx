import { Link, useNavigate } from "react-router-dom";
import { Camera, Edit2, ExternalLink, Globe, KeyRound, Mail, User } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  portfolio_url: string | null;
  photography_interests: string[] | null;
  created_at: string;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReset, setSendingReset] = useState(false);

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
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, bio, portfolio_url, photography_interests, created_at")
        .eq("id", user.id)
        .single();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>
          Loading...
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
            {/* Avatar */}
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-32 w-32 md:h-40 md:w-40 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="h-32 w-32 md:h-40 md:w-40 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                  <User className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <Camera className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </div>

            {/* Name + meta */}
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center gap-4 mb-2 justify-center md:justify-start">
                <div className="w-12 h-px bg-primary hidden md:block" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  Profile
                </span>
              </div>
              <h1
                className="text-4xl md:text-5xl font-light tracking-tight mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {displayName}
              </h1>
              <div className="flex items-center gap-4 justify-center md:justify-start text-[10px] tracking-[0.15em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                {memberSince && <span>Member since {memberSince}</span>}
                {user?.email && (
                  <>
                    <span className="text-border">•</span>
                    <span>{user.email}</span>
                  </>
                )}
              </div>
            </div>

            {/* Edit button */}
            <Link
              to="/edit-profile"
              className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500 flex-shrink-0"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <Edit2 className="h-3 w-3" /> Edit Profile
            </Link>
          </div>

          {/* Bio section */}
          {profile?.bio && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="mb-12"
            >
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                About
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl" style={{ fontFamily: "var(--font-body)" }}>
                {profile.bio}
              </p>
            </motion.div>
          )}

          {/* Portfolio link */}
          {profile?.portfolio_url && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mb-12"
            >
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                Portfolio
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mb-12"
            >
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                Photography Interests
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mb-12 border border-border p-8"
          >
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              Account Settings
            </span>

            {/* Email (read-only) */}
            <div className="mb-6">
              <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                Email Address
              </span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span style={{ fontFamily: "var(--font-body)" }}>{user?.email}</span>
                <span className="text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border border-border text-muted-foreground/60 ml-2" style={{ fontFamily: "var(--font-heading)" }}>
                  Cannot be changed
                </span>
              </div>
            </div>

            {/* Change Password */}
            <div>
              <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                Password
              </span>
              <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>
                We'll send a password reset link to your email address.
              </p>
              <button
                onClick={handlePasswordReset}
                disabled={sendingReset}
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500 disabled:opacity-50"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <KeyRound className="h-3 w-3" />
                {sendingReset ? "Sending…" : "Send Reset Link"}
              </button>
            </div>
          </motion.div>


          {!profile?.bio && !profile?.portfolio_url && (!profile?.photography_interests || profile.photography_interests.length === 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="border border-border p-10 text-center"
            >
              <Camera className="h-8 w-8 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>
                Your profile is looking a little empty. Add a bio, portfolio, and interests to let others know about your work.
              </p>
              <Link
                to="/edit-profile"
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-6 py-3 bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <Edit2 className="h-3 w-3" /> Complete Your Profile
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </main>
  );
};

export default Profile;
