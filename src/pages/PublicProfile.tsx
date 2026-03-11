import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Camera, CheckCircle2, ExternalLink, Globe, Trophy, BookOpen, User, Expand, Award, ChevronLeft, ChevronRight, Facebook, Instagram, GraduationCap, Twitter, Youtube, MapPin, Calendar, Image, BadgeCheck, ImagePlus, Move, Check, X } from "lucide-react";
import FriendFollowActions, { FriendFollowStats, FriendFollowButtons } from "@/components/FriendFollowActions";
import { storageUpload } from "@/lib/storageUpload";
import { toast } from "@/hooks/use-toast";
import WallPosts from "@/components/WallPosts";
import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { BADGES, type BadgeType } from "@/lib/badgeConfig";
import { supabase } from "@/integrations/supabase/client";
import { profilesPublic } from "@/lib/profilesPublic";
import { getAdminIds, resolveName, resolveBadges, isAdminUser } from "@/lib/adminBrand";
import { canViewField, getPrivacy, type PrivacyLevel } from "@/components/PrivacyToggle";

/* ── Mini Carousel on hover ── */
const MiniCarousel = ({
  photos,
  alt,
  className,
  onPhotoClick,
}: {
  photos: string[];
  alt: string;
  className?: string;
  onPhotoClick?: (src: string) => void;
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasMultiple = photos.length > 1;

  const startAutoplay = useCallback(() => {
    if (!hasMultiple) return;
    intervalRef.current = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % photos.length);
    }, 1800);
  }, [hasMultiple, photos.length]);

  const stopAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setActiveIdx(0);
  }, []);

  const goTo = (dir: "prev" | "next", e: React.MouseEvent) => {
    e.stopPropagation();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveIdx((prev) =>
      dir === "next"
        ? (prev + 1) % photos.length
        : (prev - 1 + photos.length) % photos.length
    );
    startAutoplay();
  };

  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      onMouseEnter={startAutoplay}
      onMouseLeave={stopAutoplay}
    >
      {photos.map((photo, i) => (
        <img
          key={photo + i}
          src={photo}
          alt={`${alt} – ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            i === activeIdx ? "opacity-100 z-[1]" : "opacity-0 z-0"
          }`}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
      {hasMultiple && (
        <>
          <button
            onClick={(e) => goTo("prev", e)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border border-border/30 hover:bg-background/80"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-foreground" />
          </button>
          <button
            onClick={(e) => goTo("next", e)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border border-border/30 hover:bg-background/80"
          >
            <ChevronRight className="h-3.5 w-3.5 text-foreground" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIdx ? "w-4 bg-primary" : "w-1.5 bg-foreground/40"
                }`}
              />
            ))}
          </div>
          <div className="absolute top-3 right-3 z-10 text-[8px] tracking-[0.15em] uppercase px-2 py-1 bg-background/50 backdrop-blur-sm text-foreground/80 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-300 border border-border/20" style={{ fontFamily: "var(--font-heading)" }}>
            {activeIdx + 1}/{photos.length}
          </div>
        </>
      )}
    </div>
  );
};

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  portfolio_url: string | null;
  photography_interests: string[] | null;
  created_at: string;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
  privacy_settings: Record<string, string> | null;
}

interface CompEntry {
  id: string;
  title: string;
  description: string | null;
  photos: string[];
  status: string;
  competition: { title: string } | null;
}

interface Certificate {
  id: string;
  title: string;
  type: string;
  issued_at: string;
}

const headingFont = { fontFamily: "var(--font-heading)" };
const bodyFont = { fontFamily: "var(--font-body)" };
const displayFont = { fontFamily: "var(--font-display)" };

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
});

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [entries, setEntries] = useState<CompEntry[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ src: string; title: string; desc?: string } | null>(null);
  const [isVerifiedPhotographer, setIsVerifiedPhotographer] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"wall" | "works" | "about">("wall");
  const [isFriend, setIsFriend] = useState(false);
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [profileRes, entriesRes, certsRes, rolesRes, badgesRes, adminIds, friendRes] = await Promise.all([
    profilesPublic().select("full_name, avatar_url, cover_url, bio, portfolio_url, photography_interests, created_at, facebook_url, instagram_url, twitter_url, youtube_url, website_url, privacy_settings").eq("id", userId).maybeSingle(),
        supabase.from("competition_entries").select("id, title, description, photos, status, competition:competitions(title)").eq("user_id", userId).in("status", ["approved", "winner"]).order("created_at", { ascending: false }).limit(12),
        supabase.from("certificates").select("id, title, type, issued_at").eq("user_id", userId).order("issued_at", { ascending: false }).limit(10),
        supabase.from("user_roles").select("role").eq("user_id", userId).in("role", ["registered_photographer", "student"] as any),
        supabase.from("user_badges").select("badge_type").eq("user_id", userId),
        getAdminIds(),
        currentUser ? supabase.rpc("are_friends", { _user_a: currentUser.id, _user_b: userId }) : Promise.resolve({ data: false }),
      ]);

      if (!profileRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // If admin, override name to brand name
      const isAdmin = isAdminUser(userId, adminIds);
      if (isAdmin) {
        profileRes.data.full_name = resolveName(userId, profileRes.data.full_name, adminIds);
      }

      setProfile(profileRes.data);
      setEntries((entriesRes.data as any) || []);
      setCertificates(certsRes.data || []);
      const userRoles = rolesRes.data?.map((r: any) => r.role) || [];
      setIsVerifiedPhotographer(userRoles.includes("registered_photographer"));
      setIsStudent(userRoles.includes("student"));
      const rawBadges = (badgesRes.data as any[])?.map((b: any) => b.badge_type) || [];
      setUserBadges(resolveBadges(userId, rawBadges, adminIds));
      setIsFriend(!!(friendRes as any)?.data);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={headingFont}>
          Loading portfolio…
        </div>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <User className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm" style={bodyFont}>This profile doesn't exist.</p>
        <Link to="/" className="text-xs tracking-[0.15em] uppercase text-primary hover:underline" style={headingFont}>
          Back to Home
        </Link>
      </main>
    );
  }

  const displayName = profile.full_name || "Photographer";
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const isOwner = currentUser?.id === userId;
  const ps = profile.privacy_settings;
  const canView = (field: string) => canViewField(getPrivacy(ps, field), isOwner, isFriend);

  const socialLinks = canView("social_links") ? [
    profile.facebook_url && { icon: Facebook, label: "Facebook", url: profile.facebook_url },
    profile.instagram_url && { icon: Instagram, label: "Instagram", url: profile.instagram_url },
    profile.twitter_url && { icon: Twitter, label: "X", url: profile.twitter_url },
    profile.youtube_url && { icon: Youtube, label: "YouTube", url: profile.youtube_url },
    profile.website_url && { icon: Globe, label: "Website", url: profile.website_url },
    canView("portfolio") && profile.portfolio_url && !profile.website_url && { icon: Globe, label: "Portfolio", url: profile.portfolio_url },
  ].filter(Boolean) as { icon: any; label: string; url: string }[] : [];

  const tabs = [
    { key: "wall" as const, label: "Wall" },
    { key: "works" as const, label: "Works", count: entries.length },
    { key: "about" as const, label: "About" },
  ];

    // Deduplicate: if user has "verified" badge, skip the role-based "Verified Photographer" tag
    const hasVerifiedBadge = userBadges.includes("verified");
    const otherBadges = userBadges.filter((b) => b !== "verified");

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0] || !isOwner || !currentUser) return;
      const file = e.target.files[0];
      try {
        const path = `covers/${currentUser.id}/${Date.now()}-${file.name}`;
        const result = await storageUpload("avatars", path, file);
        const url = result.url;
        await supabase.from("profiles").update({ cover_url: url }).eq("id", currentUser.id);
        setProfile((prev) => prev ? { ...prev, cover_url: url } : prev);
        toast({ title: "Cover photo updated!" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      }
    };

    return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ═══ Cover Photo ═══ */}
      <section className="relative">
        {/* Cover Image */}
        <div className="relative h-48 sm:h-64 md:h-72 lg:h-80 overflow-hidden bg-gradient-to-br from-muted via-muted/80 to-muted/60">
          {profile.cover_url ? (
            <img
              src={profile.cover_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-muted to-accent/5" />
          )}
          {/* Gradient overlay at bottom for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

          {/* Cover upload button for owner */}
          {isOwner && (
            <label className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 cursor-pointer text-[10px] tracking-[0.12em] uppercase px-4 py-2 bg-background/80 backdrop-blur-sm text-foreground border border-border hover:bg-background hover:border-primary transition-all duration-300 rounded-sm" style={headingFont}>
              <ImagePlus className="h-3.5 w-3.5" />
              {profile.cover_url ? "Change Cover" : "Add Cover Photo"}
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          )}
        </div>

        {/* ═══ Profile Info Bar (overlaps cover) ═══ */}
        <div className="container mx-auto px-4 md:px-8 max-w-7xl relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 -mt-16 sm:-mt-20">
            {/* ── Avatar ── */}
            <div className="relative flex-shrink-0 z-10">
              {canView("avatar") && profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-32 w-32 sm:h-40 sm:w-40 rounded-full object-cover border-4 border-background shadow-xl ring-2 ring-border/30"
                />
              ) : (
                <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-muted border-4 border-background flex items-center justify-center shadow-xl ring-2 ring-border/30">
                  <Camera className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* ── Name + Badges + Stats ── */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 w-full min-w-0">
              {/* Left: Name + badges */}
              <div className="text-center sm:text-left min-w-0">
                <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  <h1
                    className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight"
                    style={displayFont}
                  >
                    {displayName}
                  </h1>
                  {/* Blue verified tick — filled checkmark */}
                  {(hasVerifiedBadge || isVerifiedPhotographer) && (
                    <svg viewBox="0 0 22 22" className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" aria-label="Verified">
                      <circle cx="11" cy="11" r="11" className="fill-blue-500" />
                      <path d="M6 11.5l3 3 7-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  )}
                </div>

                {/* Small badge tags */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2 justify-center sm:justify-start">
                  {isVerifiedPhotographer && !hasVerifiedBadge && (
                    <span className="inline-flex items-center gap-1 text-[8px] tracking-[0.12em] uppercase px-2 py-0.5 bg-primary/10 text-primary rounded-sm border border-primary/20" style={headingFont}>
                      <Camera className="h-2.5 w-2.5" />
                      Photographer
                    </span>
                  )}
                  {isStudent && (
                    <span className="inline-flex items-center gap-1 text-[8px] tracking-[0.12em] uppercase px-2 py-0.5 bg-accent/10 text-accent-foreground rounded-sm border border-accent/20" style={headingFont}>
                      <GraduationCap className="h-2.5 w-2.5" />
                      Student
                    </span>
                  )}
                  {otherBadges.map((b) => {
                    const cfg = BADGES[b as BadgeType];
                    if (!cfg) return null;
                    return (
                      <span
                        key={b}
                        className={`inline-flex items-center gap-1 text-[8px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-sm border ${cfg.badgeClass}`}
                        style={headingFont}
                      >
                        <span className="text-[9px] leading-none">{cfg.icon}</span>
                        {cfg.label}
                      </span>
                    );
                  })}
                </div>

                {/* Member since */}
                {canView("member_since") && (
                  <p className="text-[10px] tracking-[0.1em] text-muted-foreground mt-1.5" style={headingFont}>
                    Member since {memberSince}
                  </p>
                )}
              </div>

              {/* Right: Stats + Actions */}
              <div className="flex flex-col items-center sm:items-end gap-3 flex-shrink-0">
                {/* Stats row */}
                <div className="flex items-center gap-5 text-[11px] tracking-[0.12em] uppercase text-muted-foreground" style={headingFont}>
                  <FriendFollowStats targetUserId={userId!} />
                </div>

                {/* Action buttons */}
                {!isOwner && (
                  <FriendFollowButtons targetUserId={userId!} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Tabs Navigation ═══ */}
      <div className="border-b border-border bg-background sticky top-0 z-20">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="flex items-center gap-0 sm:pl-44">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-3.5 text-[11px] tracking-[0.15em] uppercase transition-colors duration-300 ${
                  activeTab === tab.key
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={headingFont}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1.5 text-[9px] text-muted-foreground">({tab.count})</span>
                )}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="profile-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Main Content: Two-Column Layout ═══ */}
      <div className="container mx-auto px-4 md:px-8 max-w-7xl py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left Sidebar ── */}
          <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
            {/* Intro Card */}
            <div className="border border-border p-5 space-y-4">
              <h3 className="text-[11px] tracking-[0.2em] uppercase text-foreground" style={headingFont}>
                Intro
              </h3>

              {canView("bio") && profile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed" style={bodyFont}>
                  {profile.bio.length > 150 ? profile.bio.slice(0, 150) + "…" : profile.bio}
                </p>
              )}

              <div className="space-y-2.5 text-xs text-muted-foreground">
                {canView("member_since") && (
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span style={bodyFont}>Member since {memberSince}</span>
                  </div>
                )}
                {entries.length > 0 && (
                  <div className="flex items-center gap-2.5">
                    <Image className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span style={bodyFont}>{entries.length} submission{entries.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {certificates.length > 0 && (
                  <div className="flex items-center gap-2.5">
                    <Award className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span style={bodyFont}>{certificates.length} certificate{certificates.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {entries.filter(e => e.status === "winner").length > 0 && (
                  <div className="flex items-center gap-2.5">
                    <Trophy className="h-3.5 w-3.5 text-primary/60" />
                    <span style={bodyFont} className="text-primary">{entries.filter(e => e.status === "winner").length} award{entries.filter(e => e.status === "winner").length !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Interests */}
            {canView("interests") && profile.photography_interests && profile.photography_interests.length > 0 && (
              <div className="border border-border p-5 space-y-3">
                <h3 className="text-[11px] tracking-[0.2em] uppercase text-foreground" style={headingFont}>
                  Specializations
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.photography_interests.map((interest) => (
                    <span
                      key={interest}
                      className="text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 bg-muted text-muted-foreground rounded-sm"
                      style={headingFont}
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="border border-border p-5 space-y-3">
                <h3 className="text-[11px] tracking-[0.2em] uppercase text-foreground" style={headingFont}>
                  Links
                </h3>
                <div className="space-y-2">
                  {socialLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                      style={bodyFont}
                    >
                      <link.icon className="h-3.5 w-3.5" />
                      {link.label}
                      <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-40" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Certificates sidebar preview */}
            {certificates.length > 0 && (
              <div className="border border-border p-5 space-y-3">
                <h3 className="text-[11px] tracking-[0.2em] uppercase text-foreground" style={headingFont}>
                  Certificates
                </h3>
                <div className="space-y-2">
                  {certificates.slice(0, 4).map((cert) => (
                    <div key={cert.id} className="flex items-center gap-2.5 py-1">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {cert.type === "competition" ? (
                          <Trophy className="h-3 w-3 text-primary" />
                        ) : (
                          <BookOpen className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] truncate" style={headingFont}>{cert.title}</p>
                        <p className="text-[9px] text-muted-foreground" style={headingFont}>
                          {new Date(cert.issued_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {certificates.length > 4 && (
                    <button
                      onClick={() => setActiveTab("about")}
                      className="text-[10px] text-primary hover:underline" style={headingFont}
                    >
                      View all {certificates.length} certificates
                    </button>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* ── Main Content Column ── */}
          <div className="flex-1 min-w-0">
            {/* Wall Tab */}
            {activeTab === "wall" && (
              <motion.div
                key="wall"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <WallPosts targetUserId={userId!} isOwnWall={currentUser?.id === userId} />
              </motion.div>
            )}

            {/* Works Tab */}
            {activeTab === "works" && (
              <motion.div
                key="works"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {entries.length === 0 ? (
                  <div className="border border-dashed border-border p-12 text-center">
                    <Camera className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-xs text-muted-foreground" style={bodyFont}>
                      No works to show yet.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Hero piece */}
                    {(() => {
                      const hero = entries[0];
                      if (!hero || !hero.photos[0]) return null;
                      return (
                        <div
                          className="relative group cursor-pointer border border-border overflow-hidden"
                          onClick={() => setLightboxPhoto({ src: hero.photos[0], title: hero.title, desc: hero.description || undefined })}
                        >
                          <div className="relative overflow-hidden aspect-[16/9]">
                            <MiniCarousel
                              photos={hero.photos}
                              alt={hero.title}
                              className="w-full h-full"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
                            {hero.status === "winner" && (
                              <div className="absolute top-4 left-4">
                                <span className="text-[9px] tracking-[0.2em] uppercase px-3 py-1 bg-primary text-primary-foreground inline-flex items-center gap-1.5" style={headingFont}>
                                  <Award className="h-3 w-3" /> Winner
                                </span>
                              </div>
                            )}
                            <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-background/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <Expand className="h-3.5 w-3.5 text-foreground" />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                              {hero.competition && (
                                <span className="text-[9px] tracking-[0.2em] uppercase text-primary/80 block mb-1" style={headingFont}>
                                  {(hero.competition as any).title}
                                </span>
                              )}
                              <h3 className="text-xl md:text-2xl font-light tracking-tight text-foreground" style={displayFont}>
                                {hero.title}
                              </h3>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Grid */}
                    {entries.length > 1 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {entries.slice(1).map((entry) => (
                          <div
                            key={entry.id}
                            className="group relative cursor-pointer border border-border overflow-hidden"
                            onClick={() => entry.photos[0] && setLightboxPhoto({ src: entry.photos[0], title: entry.title, desc: entry.description || undefined })}
                          >
                            <div className="relative overflow-hidden aspect-square">
                              <MiniCarousel photos={entry.photos} alt={entry.title} className="w-full h-full" />
                              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
                              {entry.status === "winner" && (
                                <div className="absolute top-2 left-2 z-10">
                                  <span className="text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 bg-primary text-primary-foreground inline-flex items-center gap-1" style={headingFont}>
                                    <Trophy className="h-2.5 w-2.5" /> Winner
                                  </span>
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                <h3 className="text-xs font-medium truncate text-foreground" style={headingFont}>
                                  {entry.title}
                                </h3>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* About Tab */}
            {activeTab === "about" && (
              <motion.div
                key="about"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Full bio */}
                {canView("bio") && profile.bio && (
                  <div className="border border-border p-6">
                    <h3 className="text-[11px] tracking-[0.2em] uppercase text-foreground mb-4" style={headingFont}>About</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed" style={bodyFont}>{profile.bio}</p>
                  </div>
                )}

                {/* All certificates */}
                {certificates.length > 0 && (
                  <div className="border border-border p-6">
                    <h3 className="text-[11px] tracking-[0.2em] uppercase text-foreground mb-4" style={headingFont}>
                      Certificates & Awards
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {certificates.map((cert) => (
                        <div key={cert.id} className="flex items-center gap-3 p-4 bg-muted/30 border border-border">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {cert.type === "competition" ? (
                              <Trophy className="h-4 w-4 text-primary" />
                            ) : (
                              <BookOpen className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium truncate" style={headingFont}>{cert.title}</h4>
                            <p className="text-[10px] text-muted-foreground" style={headingFont}>
                              {new Date(cert.issued_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All social links */}
                {socialLinks.length > 0 && (
                  <div className="border border-border p-6">
                    <h3 className="text-[11px] tracking-[0.2em] uppercase text-foreground mb-4" style={headingFont}>Links & Social</h3>
                    <div className="space-y-3">
                      {socialLinks.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors"
                          style={bodyFont}
                        >
                          <link.icon className="h-4 w-4" />
                          {link.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          <ExternalLink className="h-3 w-3 ml-auto opacity-40" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests full */}
                {canView("interests") && profile.photography_interests && profile.photography_interests.length > 0 && (
                  <div className="border border-border p-6">
                    <h3 className="text-[11px] tracking-[0.2em] uppercase text-foreground mb-4" style={headingFont}>Specializations</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.photography_interests.map((interest) => (
                        <span
                          key={interest}
                          className="text-[10px] tracking-[0.1em] uppercase px-4 py-2 border border-border text-muted-foreground"
                          style={headingFont}
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!profile.bio && certificates.length === 0 && socialLinks.length === 0 && (
                  <div className="border border-dashed border-border p-12 text-center">
                    <User className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-xs text-muted-foreground" style={bodyFont}>No additional info available.</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-6 cursor-pointer"
            onClick={() => setLightboxPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
              className="max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={lightboxPhoto.src} alt={lightboxPhoto.title} className="w-full max-h-[75vh] object-contain" />
              <div className="mt-6 text-center">
                <h3 className="text-xl md:text-2xl font-light tracking-tight" style={displayFont}>{lightboxPhoto.title}</h3>
                {lightboxPhoto.desc && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto" style={bodyFont}>{lightboxPhoto.desc}</p>
                )}
                <button
                  onClick={() => setLightboxPhoto(null)}
                  className="mt-6 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-300"
                  style={headingFont}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="container mx-auto px-4 md:px-8 max-w-7xl py-8 text-center">
        <Link to="/" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500" style={headingFont}>
          ← Back to 50mm Retina World
        </Link>
      </div>
    </main>
  );
};

export default PublicProfile;
