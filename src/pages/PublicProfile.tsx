import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Camera, ExternalLink, Globe, Trophy, BookOpen, Newspaper, User } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import GlobalSearch from "@/components/GlobalSearch";

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  portfolio_url: string | null;
  photography_interests: string[] | null;
  created_at: string;
}

interface CompEntry {
  id: string;
  title: string;
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

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [profileRes, entriesRes, certsRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, bio, portfolio_url, photography_interests, created_at").eq("id", userId).maybeSingle(),
        supabase.from("competition_entries").select("id, title, photos, status, competition:competitions(title)").eq("user_id", userId).in("status", ["approved", "winner"]).order("created_at", { ascending: false }).limit(12),
        supabase.from("certificates").select("id, title, type, issued_at").eq("user_id", userId).order("issued_at", { ascending: false }).limit(10),
      ]);

      if (!profileRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileRes.data);
      setEntries((entriesRes.data as any) || []);
      setCertificates(certsRes.data || []);
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
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="container mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/logo.png" alt="ArteFoto Global" className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
              ArteFoto Global
            </span>
          </Link>
          <div className="flex items-center gap-6 text-xs tracking-[0.15em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
            <GlobalSearch />
            <Link to="/competitions" className="hover:opacity-60 transition-opacity duration-500 hidden md:block">Competitions</Link>
            <Link to="/journal" className="hover:opacity-60 transition-opacity duration-500 hidden md:block">Journal</Link>
          </div>
        </div>
      </nav>

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
                className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {displayName}
              </h1>
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

        {/* Photo Gallery */}
        {galleryPhotos.length > 0 && (
          <motion.section {...fadeUp(0.3)} className="py-12 md:py-16 border-t border-border">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  Gallery
                </span>
                <h2 className="text-2xl md:text-3xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Featured <em className="italic text-primary">Work</em>
                </h2>
              </div>
              <Camera className="h-5 w-5 text-muted-foreground/30" />
            </div>

            <div className="columns-2 md:columns-3 gap-4 space-y-4">
              {galleryPhotos.map((photo, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.05 * i, ease: [0.4, 0, 0.2, 1] }}
                  className="break-inside-avoid group relative overflow-hidden"
                >
                  <img
                    src={photo}
                    alt={`Work ${i + 1}`}
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Competition Submissions */}
        {entries.length > 0 && (
          <motion.section {...fadeUp(0.35)} className="py-12 md:py-16 border-t border-border">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  Competitions
                </span>
                <h2 className="text-2xl md:text-3xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Contest <em className="italic text-primary">Entries</em>
                </h2>
              </div>
              <Trophy className="h-5 w-5 text-muted-foreground/30" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.06 * i }}
                  className="group border border-border overflow-hidden hover:border-primary/30 transition-all duration-500"
                >
                  {entry.photos[0] && (
                    <div className="relative overflow-hidden aspect-[4/3]">
                      <img
                        src={entry.photos[0]}
                        alt={entry.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                      {entry.status === "winner" && (
                        <div className="absolute top-3 left-3">
                          <span className="text-[9px] tracking-[0.2em] uppercase px-3 py-1 bg-primary text-primary-foreground inline-flex items-center gap-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                            <Trophy className="h-3 w-3" /> Winner
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-sm font-medium mb-1 tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                      {entry.title}
                    </h3>
                    {entry.competition && (
                      <p className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                        {(entry.competition as any).title}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

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
