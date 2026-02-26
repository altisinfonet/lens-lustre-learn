import { Link } from "react-router-dom";
import { Calendar, Trophy, Clock, ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import T from "@/components/T";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

type StatusFilter = "all" | "upcoming" | "open" | "judging" | "closed";

interface Competition {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category: string;
  entry_fee: number;
  prize_info: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
}

const statusColors: Record<string, string> = {
  upcoming: "border-muted-foreground/40 text-muted-foreground",
  open: "border-primary text-primary",
  judging: "border-yellow-500 text-yellow-500",
  closed: "border-foreground/20 text-foreground/40",
};

const Competitions = () => {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from("competitions")
        .select("id, title, description, cover_image_url, category, entry_fee, prize_info, status, starts_at, ends_at")
        .order("starts_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data } = await query;
      setCompetitions(data || []);
      setLoading(false);
    };
    fetch();
  }, [filter]);

  const filterLabels: Record<string, string> = {
    all: "All",
    open: "Open",
    upcoming: "Upcoming",
    judging: "Judging",
    closed: "Closed",
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20">
        <Breadcrumbs items={[{ label: "Competitions" }]} className="mb-10" />

        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0} className="flex items-center gap-4 mb-2">
            <div className="w-12 h-px bg-primary" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}><T>Compete</T></span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-6xl font-light tracking-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
            <T>Photography</T> <em className="italic text-primary"><T>Competitions</T></em>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-sm text-muted-foreground max-w-lg mb-12" style={{ fontFamily: "var(--font-body)" }}>
            <T>Showcase your talent, compete with photographers worldwide, and win recognition.</T>
          </motion.p>

          {/* Filters */}
          <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-2 mb-12">
            {(["all", "open", "upcoming", "judging", "closed"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => { setFilter(s); setLoading(true); }}
                className={`text-[10px] tracking-[0.2em] uppercase px-4 py-2 border transition-all duration-500 ${
                  filter === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/50"
                }`}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <T>{filterLabels[s]}</T>
              </button>
            ))}
          </motion.div>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse py-20 text-center" style={{ fontFamily: "var(--font-heading)" }}>
            <T>Loading competitions...</T>
          </div>
        ) : competitions.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              <T>No competitions found. Check back soon!</T>
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((comp, i) => (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
              >
                <Link
                  to={`/competitions/${comp.id}`}
                  className="group block border border-border hover:border-primary/40 transition-all duration-700 overflow-hidden"
                >
                  {/* Cover */}
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {comp.cover_image_url ? (
                      <img
                        src={comp.cover_image_url}
                        alt={comp.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1.5s]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Trophy className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`text-[9px] tracking-[0.2em] uppercase px-3 py-1 border bg-background/80 backdrop-blur-sm ${statusColors[comp.status] || ""}`} style={{ fontFamily: "var(--font-heading)" }}>
                        <T>{comp.status.charAt(0).toUpperCase() + comp.status.slice(1)}</T>
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <span className="text-[9px] tracking-[0.2em] uppercase text-primary block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                      {comp.category}
                    </span>
                    <h3 className="text-lg font-light tracking-tight mb-2 group-hover:text-primary transition-colors duration-500" style={{ fontFamily: "var(--font-display)" }}>
                      {comp.title}
                    </h3>
                    {comp.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-4" style={{ fontFamily: "var(--font-body)" }}>
                        {comp.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span style={{ fontFamily: "var(--font-body)" }}>
                          {new Date(comp.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {comp.entry_fee > 0 && (
                          <span style={{ fontFamily: "var(--font-heading)" }} className="tracking-[0.1em]">
                            ${comp.entry_fee} <T>entry</T>
                          </span>
                        )}
                        {comp.prize_info && (
                          <span className="text-primary" style={{ fontFamily: "var(--font-heading)" }} title={comp.prize_info}>
                            🏆 <T>Prize</T>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Competitions;
