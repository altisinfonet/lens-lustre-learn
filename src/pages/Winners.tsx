import { Link, useNavigate } from "react-router-dom";
import { Trophy, Award, User, LogOut } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GlobalSearch from "@/components/GlobalSearch";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

interface WinnerEntry {
  id: string;
  title: string;
  description: string | null;
  photos: string[];
  competition: {
    id: string;
    title: string;
    category: string;
    cover_image_url: string | null;
    ends_at: string;
  };
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const Winners = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWinners = async () => {
      const { data } = await supabase
        .from("competition_entries")
        .select(`
          id, title, description, photos,
          competitions!inner(id, title, category, cover_image_url, ends_at),
          profiles:user_id(full_name, avatar_url)
        `)
        .eq("status", "winner")
        .order("created_at", { ascending: false });

      if (data) {
        const mapped: WinnerEntry[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          photos: row.photos || [],
          competition: {
            id: row.competitions.id,
            title: row.competitions.title,
            category: row.competitions.category,
            cover_image_url: row.competitions.cover_image_url,
            ends_at: row.competitions.ends_at,
          },
          profile: row.profiles
            ? { full_name: row.profiles.full_name, avatar_url: row.profiles.avatar_url }
            : null,
        }));
        setWinners(mapped);
      }
      setLoading(false);
    };
    fetchWinners();
  }, []);

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
            <Link to="/competitions" className="hover:opacity-60 transition-opacity duration-500">Competitions</Link>
            <Link to="/dashboard" className="hover:opacity-60 transition-opacity duration-500">Dashboard</Link>
            {user && (
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="inline-flex items-center gap-1.5 hover:opacity-60 transition-opacity duration-500"
              >
                <LogOut className="h-3 w-3" /> Logout
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20">
        <Breadcrumbs items={[{ label: "Winners" }]} className="mb-10" />

        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0} className="flex items-center gap-4 mb-2">
            <div className="w-12 h-px bg-primary" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              Hall of Fame
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-4xl md:text-6xl font-light tracking-tight mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Competition <em className="italic text-primary">Winners</em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-sm text-muted-foreground max-w-lg mb-16"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Celebrating the photographers whose vision and craft stood above the rest.
          </motion.p>
        </motion.div>

        {loading ? (
          <div
            className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse py-20 text-center"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Loading winners...
          </div>
        ) : winners.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              No winners announced yet. Stay tuned!
            </p>
          </div>
        ) : (
          <div className="space-y-20">
            {winners.map((winner, i) => (
              <motion.article
                key={winner.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                className="group"
              >
                {/* Competition context */}
                <div className="flex items-center gap-3 mb-4">
                  <Award className="h-4 w-4 text-primary" />
                  <Link
                    to={`/competitions/${winner.competition.id}`}
                    className="text-[10px] tracking-[0.2em] uppercase text-primary hover:underline"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {winner.competition.title}
                  </Link>
                  <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    • {winner.competition.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto" style={{ fontFamily: "var(--font-body)" }}>
                    {new Date(winner.competition.ends_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                </div>

                {/* Photos grid */}
                {winner.photos.length > 0 && (
                  <div className={`mb-6 gap-2 ${
                    winner.photos.length === 1
                      ? "block"
                      : winner.photos.length === 2
                      ? "grid grid-cols-2"
                      : "grid grid-cols-2 md:grid-cols-3"
                  }`}>
                    {winner.photos.slice(0, 6).map((photo, pi) => (
                      <div
                        key={pi}
                        className={`overflow-hidden bg-muted ${
                          winner.photos.length === 1 ? "max-h-[500px]" : "h-64 md:h-80"
                        }`}
                      >
                        <img
                          src={photo}
                          alt={`${winner.title} — photo ${pi + 1}`}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-[1.5s]"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Entry info + photographer */}
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2
                      className="text-2xl md:text-3xl font-light tracking-tight mb-2"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {winner.title}
                    </h2>
                    {winner.description && (
                      <p className="text-sm text-muted-foreground max-w-xl leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                        {winner.description}
                      </p>
                    )}
                  </div>

                  {/* Photographer */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {winner.profile?.avatar_url ? (
                      <img
                        src={winner.profile.avatar_url}
                        alt={winner.profile.full_name || "Winner"}
                        className="h-10 w-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <span
                      className="text-xs tracking-[0.1em] uppercase text-muted-foreground"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {winner.profile?.full_name || "Photographer"}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                {i < winners.length - 1 && (
                  <div className="mt-16 h-px bg-border" />
                )}
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Winners;
