import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Camera, ExternalLink, Globe, Trophy, BookOpen, Newspaper, User, Expand, Award, ChevronLeft, ChevronRight, Facebook, Instagram, GraduationCap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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

      {/* Arrows – only visible on hover when multiple photos */}
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

          {/* Dots */}
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

          {/* Photo count badge */}
          <div className="absolute top-3 right-3 z-10 text-[8px] tracking-[0.15em] uppercase px-2 py-1 bg-background/50 backdrop-blur-sm text-foreground/80 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-300 border border-border/20" style={{ fontFamily: "var(--font-heading)" }}>
            {activeIdx + 1}/{photos.length}
          </div>
        </>
      )}
    </div>
  );
};
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  portfolio_url: string | null;
  photography_interests: string[] | null;
  created_at: string;
  facebook_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
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

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
});

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [entries, setEntries] = useState<CompEntry[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ src: string; title: string; desc?: string } | null>(null);
  const [isVerifiedPhotographer, setIsVerifiedPhotographer] = useState(false);
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [profileRes, entriesRes, certsRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, bio, portfolio_url, photography_interests, created_at, facebook_url, instagram_url, website_url").eq("id", userId).maybeSingle(),
        supabase.from("competition_entries").select("id, title, description, photos, status, competition:competitions(title)").eq("user_id", userId).in("status", ["approved", "winner"]).order("created_at", { ascending: false }).limit(12),
        supabase.from("certificates").select("id, title, type, issued_at").eq("user_id", userId).order("issued_at", { ascending: false }).limit(10),
        supabase.from("user_roles").select("role").eq("user_id", userId).in("role", ["registered_photographer", "student"] as any),
      ]);

      if (!profileRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileRes.data);
      setEntries((entriesRes.data as any) || []);
      setCertificates(certsRes.data || []);
      const userRoles = rolesRes.data?.map((r: any) => r.role) || [];
      setIsVerifiedPhotographer(userRoles.includes("registered_photographer"));
      setIsStudent(userRoles.includes("student"));
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>
          Loading portfolio…
        </div>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <User className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm" style={{ fontFamily: "var(--font-body)" }}>This profile doesn't exist.</p>
        <Link to="/" className="text-xs tracking-[0.15em] uppercase text-primary hover:underline" style={{ fontFamily: "var(--font-heading)" }}>
          Back to Home
        </Link>
      </main>
    );
  }

  const displayName = profile.full_name || "Photographer";
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const galleryPhotos = entries.flatMap((e) => e.photos).slice(0, 12);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background ambient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <div className="container mx-auto px-6 md:px-12 py-16 md:py-28 relative z-10">
          <motion.div {...fadeUp()} className="flex flex-col md:flex-row items-center md:items-end gap-10 md:gap-14">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-3 bg-gradient-to-br from-primary/20 via-transparent to-accent/10 rounded-full blur-xl" />
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="relative h-36 w-36 md:h-48 md:w-48 rounded-full object-cover border-2 border-border shadow-2xl"
                />
              ) : (
                <div className="relative h-36 w-36 md:h-48 md:w-48 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                  <Camera className="h-14 w-14 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center gap-3 mb-3 justify-center md:justify-start">
                <div className="w-10 h-px bg-primary hidden md:block" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  Portfolio
                </span>
              </div>
              <h1
                className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {displayName}
              </h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {isVerifiedPhotographer && (
                  <span className="inline-flex items-center gap-2 text-[9px] tracking-[0.25em] uppercase px-4 py-1.5 bg-primary/15 text-primary rounded-full" style={{ fontFamily: "var(--font-heading)" }}>
                    <Camera className="h-3 w-3" />
                    Verified Photographer
                  </span>
                )}
                {isStudent && (
                  <span className="inline-flex items-center gap-2 text-[9px] tracking-[0.25em] uppercase px-4 py-1.5 bg-accent/15 text-accent-foreground rounded-full" style={{ fontFamily: "var(--font-heading)" }}>
                    <GraduationCap className="h-3 w-3" />
                    Student
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-6" style={{ fontFamily: "var(--font-heading)" }}>
                <span>Member since {memberSince}</span>
                {entries.length > 0 && (
                  <>
                    <span className="text-border">•</span>
                    <span>{entries.length} submission{entries.length !== 1 ? "s" : ""}</span>
                  </>
                )}
                {certificates.length > 0 && (
                  <>
                    <span className="text-border">•</span>
                    <span>{certificates.length} certificate{certificates.length !== 1 ? "s" : ""}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {profile.portfolio_url && (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase px-5 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    <Globe className="h-3 w-3" />
                    {profile.portfolio_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                )}
                {profile.facebook_url && (
                  <a
                    href={profile.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase px-4 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    <Facebook className="h-3.5 w-3.5" />
                    Facebook
                  </a>
                )}
                {profile.instagram_url && (
                  <a
                    href={profile.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase px-4 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    Instagram
                  </a>
                )}
                {profile.website_url && !profile.portfolio_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase px-4 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    <Globe className="h-3 w-3" />
                    Website
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-6 md:px-12 max-w-6xl">
        {/* Bio */}
        {profile.bio && (
          <motion.section {...fadeUp(0.15)} className="py-12 md:py-16 border-t border-border">
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-5" style={{ fontFamily: "var(--font-heading)" }}>
              About
            </span>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl" style={{ fontFamily: "var(--font-body)" }}>
              {profile.bio}
            </p>
          </motion.section>
        )}

        {/* Interests */}
        {profile.photography_interests && profile.photography_interests.length > 0 && (
          <motion.section {...fadeUp(0.25)} className="py-12 md:py-16 border-t border-border">
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-5" style={{ fontFamily: "var(--font-heading)" }}>
              Specializations
            </span>
            <div className="flex flex-wrap gap-3">
              {profile.photography_interests.map((interest) => (
                <span
                  key={interest}
                  className="text-[11px] tracking-[0.15em] uppercase px-5 py-2.5 border border-border text-foreground/70 hover:border-primary/50 hover:text-primary transition-all duration-500"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {interest}
                </span>
              ))}
            </div>
          </motion.section>
        )}

        {/* ═══ Selected Works — Immersive Gallery ═══ */}
        {entries.length > 0 && (
          <motion.section {...fadeUp(0.3)} className="py-16 md:py-24 border-t border-border">
            {/* Section header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12 md:mb-16">
              <div>
                <span className="text-[9px] tracking-[0.3em] uppercase text-primary block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                  Selected Works
                </span>
                <h2 className="text-3xl md:text-5xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Through the <em className="italic text-primary">Lens</em>
                </h2>
              </div>
              <p className="text-xs text-muted-foreground max-w-xs" style={{ fontFamily: "var(--font-body)" }}>
                A curated collection of competition entries and award-winning photographs.
              </p>
            </div>

            {/* Hero piece — first entry, cinematic */}
            {(() => {
              const hero = entries[0];
              if (!hero || !hero.photos[0]) return null;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                  className="relative group cursor-pointer mb-8"
                  onClick={() => setLightboxPhoto({ src: hero.photos[0], title: hero.title, desc: hero.description || undefined })}
                >
                  <div className="relative overflow-hidden aspect-[21/9]">
                    <MiniCarousel
                      photos={hero.photos}
                      alt={hero.title}
                      className="w-full h-full"
                      onPhotoClick={(src) => setLightboxPhoto({ src, title: hero.title, desc: hero.description || undefined })}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute top-5 right-5 h-10 w-10 rounded-full bg-background/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 border border-border/50">
                      <Expand className="h-4 w-4 text-foreground" />
                    </div>

                    {hero.status === "winner" && (
                      <div className="absolute top-5 left-5">
                        <span className="text-[9px] tracking-[0.2em] uppercase px-4 py-1.5 bg-primary text-primary-foreground inline-flex items-center gap-2 shadow-lg" style={{ fontFamily: "var(--font-heading)" }}>
                          <Award className="h-3.5 w-3.5" /> Award Winner
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-px bg-primary" />
                        {hero.competition && (
                          <span className="text-[9px] tracking-[0.2em] uppercase text-primary/80" style={{ fontFamily: "var(--font-heading)" }}>
                            {(hero.competition as any).title}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl md:text-4xl font-light tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                        {hero.title}
                      </h3>
                      {hero.description && (
                        <p className="text-sm text-muted-foreground mt-2 max-w-lg line-clamp-2" style={{ fontFamily: "var(--font-body)" }}>
                          {hero.description}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Asymmetric grid */}
            {entries.length > 1 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {entries.slice(1).map((entry, i) => {
                  const isLarge = i === 0 || i === 3;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.08 * i, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                      className={`group relative cursor-pointer overflow-hidden ${isLarge ? "col-span-2 row-span-2" : "col-span-1"}`}
                      onClick={() => entry.photos[0] && setLightboxPhoto({ src: entry.photos[0], title: entry.title, desc: entry.description || undefined })}
                    >
                      <div className={`relative overflow-hidden ${isLarge ? "aspect-square" : "aspect-[3/4]"}`}>
                        <MiniCarousel
                          photos={entry.photos}
                          alt={entry.title}
                          className="w-full h-full"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />

                        {entry.status === "winner" && (
                          <div className="absolute top-3 left-3 z-10">
                            <span className="text-[8px] tracking-[0.2em] uppercase px-2.5 py-1 bg-primary text-primary-foreground inline-flex items-center gap-1" style={{ fontFamily: "var(--font-heading)" }}>
                              <Trophy className="h-2.5 w-2.5" /> Winner
                            </span>
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                          <h3 className={`font-medium tracking-wide text-foreground mb-1 ${isLarge ? "text-lg md:text-xl" : "text-xs md:text-sm"}`} style={{ fontFamily: "var(--font-heading)" }}>
                            {entry.title}
                          </h3>
                          {entry.competition && (
                            <p className="text-[9px] tracking-[0.1em] uppercase text-primary/70" style={{ fontFamily: "var(--font-heading)" }}>
                              {(entry.competition as any).title}
                            </p>
                          )}
                        </div>

                        <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                          <Expand className="h-3 w-3 text-foreground" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Stats bar */}
            <div className="flex items-center justify-center gap-8 md:gap-16 mt-12 md:mt-16 py-6 border-t border-b border-border/50">
              <div className="text-center">
                <span className="text-2xl md:text-3xl font-light text-foreground block" style={{ fontFamily: "var(--font-display)" }}>
                  {entries.length}
                </span>
                <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  Works
                </span>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div className="text-center">
                <span className="text-2xl md:text-3xl font-light text-primary block" style={{ fontFamily: "var(--font-display)" }}>
                  {entries.filter(e => e.status === "winner").length}
                </span>
                <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  Awards
                </span>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div className="text-center">
                <span className="text-2xl md:text-3xl font-light text-foreground block" style={{ fontFamily: "var(--font-display)" }}>
                  {new Set(entries.map(e => (e.competition as any)?.title).filter(Boolean)).size}
                </span>
                <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  Competitions
                </span>
              </div>
            </div>
          </motion.section>
        )}

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
                <img
                  src={lightboxPhoto.src}
                  alt={lightboxPhoto.title}
                  className="w-full max-h-[75vh] object-contain"
                />
                <div className="mt-6 text-center">
                  <h3 className="text-xl md:text-2xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                    {lightboxPhoto.title}
                  </h3>
                  {lightboxPhoto.desc && (
                    <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto" style={{ fontFamily: "var(--font-body)" }}>
                      {lightboxPhoto.desc}
                    </p>
                  )}
                  <button
                    onClick={() => setLightboxPhoto(null)}
                    className="mt-6 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-300"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Certificates */}
        {certificates.length > 0 && (
          <motion.section {...fadeUp(0.4)} className="py-12 md:py-16 border-t border-border">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  Achievements
                </span>
                <h2 className="text-2xl md:text-3xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Certificates & <em className="italic text-primary">Awards</em>
                </h2>
              </div>
              <BookOpen className="h-5 w-5 text-muted-foreground/30" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {certificates.map((cert, i) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.06 * i }}
                  className="flex items-center gap-4 p-5 border border-border hover:border-primary/30 transition-all duration-500"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {cert.type === "competition" ? (
                      <Trophy className="h-4 w-4 text-primary" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-heading)" }}>
                      {cert.title}
                    </h3>
                    <p className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                      {new Date(cert.issued_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Empty portfolio state */}
        {!profile.bio && galleryPhotos.length === 0 && entries.length === 0 && certificates.length === 0 && (
          <motion.section {...fadeUp(0.2)} className="py-20 text-center">
            <Camera className="h-10 w-10 text-muted-foreground/20 mx-auto mb-6" />
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              This photographer hasn't added any work yet.
            </p>
          </motion.section>
        )}

        {/* Footer */}
        <div className="py-12 border-t border-border text-center">
          <Link to="/" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500" style={{ fontFamily: "var(--font-heading)" }}>
            ← Back to ArteFoto Global
          </Link>
        </div>
      </div>
    </main>
  );
};

export default PublicProfile;
