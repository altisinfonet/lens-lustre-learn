import { Link, useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, Trophy, Heart, Upload, Users } from "lucide-react";
import ImageEngagement from "@/components/ImageEngagement";
import PhaseBanner from "@/components/PhaseBanner";
import Breadcrumbs from "@/components/Breadcrumbs";
import CommentsSection from "@/components/CommentsSection";
import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";


interface Competition {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category: string;
  entry_fee: number;
  prize_info: string | null;
  status: string;
  max_entries_per_user: number;
  max_photos_per_entry: number;
  starts_at: string;
  ends_at: string;
}

interface Entry {
  id: string;
  title: string;
  description: string | null;
  photos: string[];
  user_id: string;
  status: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
  vote_count: number;
  user_voted: boolean;
}

const statusColors: Record<string, string> = {
  upcoming: "border-muted-foreground/40 text-muted-foreground",
  open: "border-primary text-primary",
  judging: "border-yellow-500 text-yellow-500",
  closed: "border-foreground/20 text-foreground/40",
};

const CompetitionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEntryCount, setUserEntryCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      // Fetch competition
      const { data: comp } = await supabase
        .from("competitions")
        .select("*")
        .eq("id", id)
        .single();
      setCompetition(comp);

      // Fetch approved entries with vote counts
      const { data: rawEntries } = await supabase
        .from("competition_entries")
        .select("id, title, description, photos, user_id, status, created_at")
        .eq("competition_id", id)
        .in("status", ["approved", "winner"])
        .order("created_at", { ascending: false });

      // Get vote counts and user votes
      if (rawEntries && rawEntries.length > 0) {
        const entryIds = rawEntries.map((e) => e.id);
        const { data: votes } = await supabase
          .from("competition_votes")
          .select("entry_id, user_id")
          .in("entry_id", entryIds);

        // Get profile names
        const userIds = [...new Set(rawEntries.map((e) => e.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        const enriched: Entry[] = rawEntries.map((entry) => {
          const entryVotes = votes?.filter((v) => v.entry_id === entry.id) || [];
          return {
            ...entry,
            profiles: profileMap.get(entry.user_id) || null,
            vote_count: entryVotes.length,
            user_voted: user ? entryVotes.some((v) => v.user_id === user.id) : false,
          };
        });
        setEntries(enriched.sort((a, b) => b.vote_count - a.vote_count));
      }

      // Check user's entry count
      if (user && id) {
        const { count } = await supabase
          .from("competition_entries")
          .select("id", { count: "exact", head: true })
          .eq("competition_id", id)
          .eq("user_id", user.id);
        setUserEntryCount(count || 0);
      }

      setLoading(false);
    };
    fetchAll();
  }, [id, user]);

  const handleVote = async (entryId: string, hasVoted: boolean) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (hasVoted) {
      await supabase.from("competition_votes").delete().eq("entry_id", entryId).eq("user_id", user.id);
    } else {
      await supabase.from("competition_votes").insert({ entry_id: entryId, user_id: user.id });

      // Award vote rewards if configured
      try {
        const { data: rewardSetting } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "vote_reward_config")
          .maybeSingle();
        const cfg = rewardSetting?.value as any;
        if (cfg?.active) {
          const entry = entries.find(e => e.id === entryId);
          // Reward voter
          if (cfg.voter_reward > 0) {
            await supabase.rpc("wallet_transaction", {
              _user_id: user.id,
              _type: "vote_reward",
              _amount: cfg.voter_reward,
              _description: "Vote reward — thank you for voting!",
            });
          }
          // Reward entry owner
          if (cfg.entry_owner_reward > 0 && entry && entry.user_id !== user.id) {
            await supabase.rpc("wallet_transaction", {
              _user_id: entry.user_id,
              _type: "vote_reward",
              _amount: cfg.entry_owner_reward,
              _description: "Someone voted on your entry!",
            });
          }
        }
      } catch (err) {
        // Non-blocking: rewards are best-effort
        console.error("Vote reward error:", err);
      }
    }
    // Optimistic update
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, vote_count: hasVoted ? e.vote_count - 1 : e.vote_count + 1, user_voted: !hasVoted }
          : e
      )
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>Loading...</div>
      </main>
    );
  }

  if (!competition) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-light mb-4" style={{ fontFamily: "var(--font-display)" }}>Competition not found</h1>
          <Link to="/competitions" className="text-xs text-primary tracking-[0.15em] uppercase hover:underline" style={{ fontFamily: "var(--font-heading)" }}>Browse competitions</Link>
        </div>
      </main>
    );
  }

  const canSubmit = competition.status === "open" && user && userEntryCount < competition.max_entries_per_user;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden bg-muted">
        {competition.cover_image_url ? (
          <img src={competition.cover_image_url} alt={competition.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-card to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-6 md:px-12 pb-10">
          <Breadcrumbs items={[{ label: "Competitions", to: "/competitions" }, { label: competition.title }]} className="mb-6" />
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[9px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>{competition.category}</span>
            <span className={`text-[9px] tracking-[0.2em] uppercase px-3 py-1 border ${statusColors[competition.status]}`} style={{ fontFamily: "var(--font-heading)" }}>
              {competition.status}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            {competition.title}
          </h1>
        </div>
      </div>

      {/* Phase Banner with Countdown */}
      <PhaseBanner competition={competition} />

      <div className="container mx-auto px-6 md:px-12 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main content */}
          <div className="lg:col-span-2">
            {competition.description && (
              <div className="mb-12">
                <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>About</span>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line" style={{ fontFamily: "var(--font-body)" }}>
                  {competition.description}
                </p>
              </div>
            )}

            {/* Entries */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  Submissions ({entries.length})
                </span>
                {canSubmit && (
                  <Link
                    to={`/competitions/${competition.id}/submit`}
                    className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-500"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    <Upload className="h-3 w-3" /> Submit Entry
                  </Link>
                )}
              </div>

              {entries.length === 0 ? (
                <div className="text-center py-16 border border-border">
                  <Trophy className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                    No submissions yet. Be the first!
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {entries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border border-border overflow-hidden group"
                    >
                      {/* Photo grid */}
                      {entry.photos.length > 0 && (
                        <div className="relative h-52 overflow-hidden bg-muted">
                          <img
                            src={entry.photos[0]}
                            alt={entry.title}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-[1.5s]"
                            loading="lazy"
                          />
                          {entry.photos.length > 1 && (
                            <span className="absolute bottom-2 right-2 text-[9px] bg-background/80 backdrop-blur-sm px-2 py-1 text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                              +{entry.photos.length - 1} more
                            </span>
                          )}
                          {entry.status === "winner" && (
                            <span className="absolute top-2 left-2 text-[9px] tracking-[0.2em] uppercase px-3 py-1 bg-yellow-500/90 text-background" style={{ fontFamily: "var(--font-heading)" }}>
                              🏆 Winner
                            </span>
                          )}
                          {(entry as any).placement === "1st_runner_up" && (
                            <span className="absolute top-2 left-2 text-[9px] tracking-[0.2em] uppercase px-3 py-1 bg-muted-foreground/90 text-background" style={{ fontFamily: "var(--font-heading)" }}>
                              🥈 1st Runner Up
                            </span>
                          )}
                          {(entry as any).placement === "2nd_runner_up" && (
                            <span className="absolute top-2 left-2 text-[9px] tracking-[0.2em] uppercase px-3 py-1 bg-amber-700/90 text-background" style={{ fontFamily: "var(--font-heading)" }}>
                              🥉 2nd Runner Up
                            </span>
                          )}
                          {(entry as any).placement === "most_viewed" && (
                            <span className="absolute top-2 left-2 text-[9px] tracking-[0.2em] uppercase px-3 py-1 bg-primary/90 text-primary-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                              👁 Most Viewed
                            </span>
                          )}
                        </div>
                      )}
                    <div className="p-4">
                        <h4 className="text-sm font-light tracking-tight mb-1" style={{ fontFamily: "var(--font-display)" }}>{entry.title}</h4>
                        {/* During judging: anonymous — hide participant name & description */}
                        {competition.status !== "judging" && (
                          <p className="text-[10px] text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>
                            by {entry.profiles?.full_name || "Anonymous"}
                          </p>
                        )}
                        {competition.status !== "judging" && entry.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3" style={{ fontFamily: "var(--font-body)" }}>
                            {entry.description}
                          </p>
                        )}
                        {competition.status === "judging" && (
                          <p className="text-[9px] text-muted-foreground/60 italic mb-3" style={{ fontFamily: "var(--font-body)" }}>
                            Participant details hidden during judging
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          {/* Voting only allowed during judging phase */}
                          {competition.status === "judging" ? (
                            <button
                              onClick={() => handleVote(entry.id, entry.user_voted)}
                              className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.1em] px-3 py-1.5 border transition-all duration-500 ${
                                entry.user_voted
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                              }`}
                              style={{ fontFamily: "var(--font-heading)" }}
                            >
                              <Heart className={`h-3 w-3 ${entry.user_voted ? "fill-primary" : ""}`} />
                              {entry.vote_count}
                            </button>
                          ) : competition.status === "closed" ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.1em] px-3 py-1.5 border border-border text-muted-foreground"
                              style={{ fontFamily: "var(--font-heading)" }}
                            >
                              <Heart className="h-3 w-3" />
                              {entry.vote_count} votes
                            </span>
                          ) : (
                            <button
                              onClick={() => handleVote(entry.id, entry.user_voted)}
                              className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.1em] px-3 py-1.5 border transition-all duration-500 ${
                                entry.user_voted
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                              }`}
                              style={{ fontFamily: "var(--font-heading)" }}
                            >
                              <Heart className={`h-3 w-3 ${entry.user_voted ? "fill-primary" : ""}`} />
                              {entry.vote_count}
                            </button>
                          )}
                          <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                            {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        {/* Like/Love/Comment engagement — hidden during judging & closed phases */}
                        {competition.status !== "judging" && competition.status !== "closed" && (
                          <div className="mt-3 border-t border-border/50 pt-3">
                            <ImageEngagement imageType="competition_entry" imageId={entry.id} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments on entries — hidden during judging & closed */}
            {competition.status !== "judging" && competition.status !== "closed" && entries.map((entry) => (
              <div key={`comments-${entry.id}`} className="mt-4 border border-border p-4">
                <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-2 block" style={{ fontFamily: "var(--font-heading)" }}>
                  Comments on "{entry.title}"
                </span>
                <CommentsSection entryId={entry.id} />
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="border border-border p-6 space-y-5">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block" style={{ fontFamily: "var(--font-heading)" }}>Details</span>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <div style={{ fontFamily: "var(--font-body)" }}>
                  <div>Opens: {new Date(competition.starts_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                  <div>Closes: {new Date(competition.ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                </div>
              </div>

              {competition.entry_fee > 0 && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span style={{ fontFamily: "var(--font-body)" }}>Entry fee: ${competition.entry_fee}</span>
                </div>
              )}

              {competition.prize_info && (
                <div className="flex items-start gap-3 text-xs text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5 text-primary mt-0.5" />
                  <span style={{ fontFamily: "var(--font-body)" }}>{competition.prize_info}</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span style={{ fontFamily: "var(--font-body)" }}>Max {competition.max_photos_per_entry} photos per entry</span>
              </div>
            </div>

            {canSubmit && (
              <Link
                to={`/competitions/${competition.id}/submit`}
                className="block w-full text-center py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Submit Your Entry
              </Link>
            )}

            {competition.status === "open" && !user && (
              <Link
                to="/login"
                className="block w-full text-center py-3.5 border border-primary text-primary text-xs tracking-[0.2em] uppercase hover:bg-primary hover:text-primary-foreground transition-all duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Login to Submit
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default CompetitionDetail;
