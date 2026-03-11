import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Trophy, Award, Medal, Eye, MessageSquare, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CommentsSection from "@/components/CommentsSection";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { profilesPublic } from "@/lib/profilesPublic";
import { toast } from "@/hooks/use-toast";

interface Competition {
  id: string;
  title: string;
  category: string;
  status: string;
  ends_at: string;
}

interface JudgeEntry {
  id: string;
  title: string;
  description: string | null;
  photos: string[];
  user_id: string;
  status: string;
  placement: string | null;
  created_at: string;
  competition_id: string;
  photographer_name: string | null;
  vote_count: number;
  my_score: number | null;
  my_feedback: string | null;
  avg_score: number | null;
  is_ai_generated: boolean;
}

const PLACEMENTS = [
  { value: "winner", label: "🏆 Winner", icon: Trophy, color: "text-yellow-500 border-yellow-500" },
  { value: "1st_runner_up", label: "🥈 1st Runner Up", icon: Award, color: "text-muted-foreground border-muted-foreground" },
  { value: "2nd_runner_up", label: "🥉 2nd Runner Up", icon: Medal, color: "text-amber-700 border-amber-700" },
  { value: "most_viewed", label: "👁 Most Viewed", icon: Eye, color: "text-primary border-primary" },
];

const JudgePanel = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasRole, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [entries, setEntries] = useState<JudgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [scoringEntry, setScoringEntry] = useState<string | null>(null);

  // Score form state per entry
  const [scoreInputs, setScoreInputs] = useState<Record<string, { score: string; feedback: string }>>({});

  const isJudge = hasRole("judge") || hasRole("admin");

  useEffect(() => {
    if (!authLoading && !rolesLoading && !isJudge) {
      navigate("/");
    }
  }, [isJudge, authLoading, rolesLoading, navigate]);

  // Fetch competitions (open or judging status)
  useEffect(() => {
    if (!isJudge) return;
    const fetchComps = async () => {
      const { data } = await supabase
        .from("competitions")
        .select("id, title, category, status, ends_at")
        .in("status", ["open", "judging"])
        .order("ends_at", { ascending: true });
      setCompetitions(data || []);
      setLoading(false);
    };
    fetchComps();
  }, [isJudge]);

  // Fetch entries for selected competition
  useEffect(() => {
    if (!selectedCompId || !user) return;
    const fetchEntries = async () => {
      setLoadingEntries(true);

      const { data: rawEntries } = await supabase
        .from("competition_entries")
        .select("id, title, description, photos, user_id, status, created_at, competition_id, placement, is_ai_generated")
        .eq("competition_id", selectedCompId)
        .in("status", ["approved", "winner"])
        .order("created_at", { ascending: false });

      if (!rawEntries || rawEntries.length === 0) {
        setEntries([]);
        setLoadingEntries(false);
        return;
      }

      const entryIds = rawEntries.map((e) => e.id);
      const userIds = [...new Set(rawEntries.map((e) => e.user_id))];

      // Fetch in parallel: profiles, votes, scores
      const [profilesRes, votesRes, scoresRes] = await Promise.all([
        profilesPublic().select("id, full_name").in("id", userIds),
        supabase.from("competition_votes").select("entry_id").in("entry_id", entryIds),
        supabase.from("judge_scores").select("entry_id, judge_id, score, feedback").in("entry_id", entryIds),
      ]);

      const profileMap = new Map((profilesRes.data as any[] || []).map((p: any) => [p.id, p.full_name]) || []);

      const enriched: JudgeEntry[] = rawEntries.map((entry) => {
        const entryVotes = votesRes.data?.filter((v) => v.entry_id === entry.id) || [];
        const entryScores = scoresRes.data?.filter((s) => s.entry_id === entry.id) || [];
        const myScore = entryScores.find((s) => s.judge_id === user.id);
        const avgScore = entryScores.length > 0
          ? entryScores.reduce((sum, s) => sum + s.score, 0) / entryScores.length
          : null;

        return {
          ...entry,
          placement: (entry as any).placement || null,
          is_ai_generated: (entry as any).is_ai_generated || false,
          photographer_name: profileMap.get(entry.user_id) || null,
          vote_count: entryVotes.length,
          my_score: myScore?.score ?? null,
          my_feedback: myScore?.feedback ?? null,
          avg_score: avgScore,
        };
      });

      // Sort by avg score desc, then vote count desc
      enriched.sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0) || b.vote_count - a.vote_count);
      setEntries(enriched);

      // Pre-fill score inputs
      const inputs: Record<string, { score: string; feedback: string }> = {};
      enriched.forEach((e) => {
        inputs[e.id] = {
          score: e.my_score !== null ? String(e.my_score) : "",
          feedback: e.my_feedback || "",
        };
      });
      setScoreInputs(inputs);

      setLoadingEntries(false);
    };
    fetchEntries();
  }, [selectedCompId, user]);

  const handleScore = async (entryId: string) => {
    if (!user) return;
    const input = scoreInputs[entryId];
    const score = parseInt(input?.score);
    if (isNaN(score) || score < 1 || score > 10) {
      toast({ title: "Score must be between 1 and 10", variant: "destructive" });
      return;
    }

    setScoringEntry(entryId);
    const existing = entries.find((e) => e.id === entryId)?.my_score;

    if (existing !== null) {
      // Update
      const { error } = await supabase
        .from("judge_scores")
        .update({ score, feedback: input.feedback.trim() || null, updated_at: new Date().toISOString() })
        .eq("entry_id", entryId)
        .eq("judge_id", user.id);
      if (error) {
        toast({ title: "Failed to update score", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Score updated" });
      }
    } else {
      // Insert
      const { error } = await supabase
        .from("judge_scores")
        .insert({ entry_id: entryId, judge_id: user.id, score, feedback: input.feedback.trim() || null });
      if (error) {
        toast({ title: "Failed to save score", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Score saved" });
      }
    }

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, my_score: score, my_feedback: input.feedback.trim() || null } : e
      )
    );
    setScoringEntry(null);
  };

  const handlePlacement = async (entryId: string, placement: string | null) => {
    // If assigning a unique placement (winner, 1st_runner_up, 2nd_runner_up), remove from others first
    if (placement && placement !== "most_viewed") {
      const existing = entries.find((e) => e.placement === placement && e.id !== entryId);
      if (existing) {
        await supabase.from("competition_entries").update({ placement: null }).eq("id", existing.id);
      }
    }

    const currentEntry = entries.find((e) => e.id === entryId);
    const newPlacement = currentEntry?.placement === placement ? null : placement;

    const { error } = await supabase
      .from("competition_entries")
      .update({ placement: newPlacement, status: newPlacement === "winner" ? "winner" : "approved" })
      .eq("id", entryId);

    if (error) {
      toast({ title: "Failed to update placement", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: newPlacement ? `Marked as ${newPlacement.replace(/_/g, " ")}` : "Placement removed" });

    setEntries((prev) =>
      prev.map((e) => {
        if (e.id === entryId) return { ...e, placement: newPlacement, status: newPlacement === "winner" ? "winner" : "approved" };
        // Clear placement from others if same unique placement
        if (newPlacement && newPlacement !== "most_viewed" && e.placement === newPlacement) return { ...e, placement: null };
        return e;
      })
    );
  };

  if (authLoading || rolesLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>Loading...</div>
      </main>
    );
  }

  if (!isJudge) return null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 md:px-12 py-12 md:py-16">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Judge Panel" }]} className="mb-8" />

        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-px bg-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Judging</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-light tracking-tight mb-10" style={{ fontFamily: "var(--font-display)" }}>
          Judge <em className="italic text-primary">Panel</em>
        </h1>

        {/* Competition selector */}
        <div className="mb-8">
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            Select Competition
          </span>
          {competitions.length === 0 ? (
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              No active competitions available for judging.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {competitions.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => setSelectedCompId(comp.id === selectedCompId ? null : comp.id)}
                  className={`inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border transition-all duration-500 ${
                    selectedCompId === comp.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/50"
                  }`}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <Trophy className="h-3.5 w-3.5" />
                  {comp.title}
                  <span className={`text-[8px] px-1.5 py-0.5 border ${
                    comp.status === "judging" ? "border-yellow-500 text-yellow-500" : "border-primary text-primary"
                  }`}>
                    {comp.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Entries list */}
        {selectedCompId && (
          <div>
            {loadingEntries ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-16 border border-border">
                <Trophy className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  No approved entries to judge yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block" style={{ fontFamily: "var(--font-heading)" }}>
                  {entries.length} entr{entries.length !== 1 ? "ies" : "y"} to judge
                </span>

                {entries.map((entry) => {
                  const isExpanded = expandedEntry === entry.id;
                  return (
                    <div key={entry.id} className="border border-border overflow-hidden">
                      {/* Entry header */}
                      <div
                        className="flex items-start gap-4 p-5 cursor-pointer hover:bg-muted/30 transition-colors duration-300"
                        onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                      >
                        {/* Thumbnail */}
                        {entry.photos.length > 0 && (
                          <img src={entry.photos[0]} alt={entry.title} className="w-20 h-20 object-cover shrink-0 border border-border" />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-light" style={{ fontFamily: "var(--font-display)" }}>{entry.title}</h3>
                            {entry.placement && (
                              <span className={`text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 border ${
                                PLACEMENTS.find((p) => p.value === entry.placement)?.color || "border-border text-muted-foreground"
                              }`} style={{ fontFamily: "var(--font-heading)" }}>
                                {entry.placement.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-1" style={{ fontFamily: "var(--font-body)" }}>
                            by {entry.photographer_name || "Anonymous"}
                          </p>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              {entry.my_score !== null ? `${entry.my_score}/10` : "Not scored"}
                            </span>
                            {entry.avg_score !== null && (
                              <span>Avg: {entry.avg_score.toFixed(1)}/10</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {entry.vote_count} votes
                            </span>
                          </div>
                        </div>

                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-border">
                          {/* Photos */}
                          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {entry.photos.map((photo, i) => (
                              <img key={i} src={photo} alt={`${entry.title} ${i + 1}`} className="w-full aspect-square object-cover border border-border" />
                            ))}
                          </div>

                          {entry.description && (
                            <div className="px-5 pb-4">
                              <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                                {entry.description}
                              </p>
                            </div>
                          )}

                          {/* Scoring */}
                          <div className="px-5 pb-5 border-t border-border pt-5">
                            <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                              Your Score
                            </span>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={scoreInputs[entry.id]?.score || ""}
                                  onChange={(e) =>
                                    setScoreInputs((prev) => ({
                                      ...prev,
                                      [entry.id]: { ...prev[entry.id], score: e.target.value },
                                    }))
                                  }
                                  placeholder="1-10"
                                  className="w-20 bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-sm text-center transition-colors duration-500"
                                  style={{ fontFamily: "var(--font-body)" }}
                                />
                                <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>/10</span>
                              </div>
                              <input
                                type="text"
                                value={scoreInputs[entry.id]?.feedback || ""}
                                onChange={(e) =>
                                  setScoreInputs((prev) => ({
                                    ...prev,
                                    [entry.id]: { ...prev[entry.id], feedback: e.target.value },
                                  }))
                                }
                                placeholder="Optional feedback..."
                                className="flex-1 bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-sm transition-colors duration-500"
                                style={{ fontFamily: "var(--font-body)" }}
                              />
                              <button
                                onClick={() => handleScore(entry.id)}
                                disabled={scoringEntry === entry.id}
                                className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-[10px] tracking-[0.15em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50 shrink-0"
                                style={{ fontFamily: "var(--font-heading)" }}
                              >
                                {scoringEntry === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3" />}
                                {entry.my_score !== null ? "Update" : "Score"}
                              </button>
                            </div>
                          </div>

                          {/* Placement buttons */}
                          <div className="px-5 pb-5 border-t border-border pt-5">
                            <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                              Assign Placement
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {PLACEMENTS.map((p) => {
                                const isActive = entry.placement === p.value;
                                return (
                                  <button
                                    key={p.value}
                                    onClick={() => handlePlacement(entry.id, p.value)}
                                    className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 border transition-all duration-500 ${
                                      isActive
                                        ? `${p.color} bg-primary/5`
                                        : "border-border text-muted-foreground hover:border-foreground/50"
                                    }`}
                                    style={{ fontFamily: "var(--font-heading)" }}
                                  >
                                    {p.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Comments */}
                          <div className="px-5 pb-5 border-t border-border pt-5">
                            <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                              <MessageSquare className="h-3 w-3 inline mr-1" />
                              Comments
                            </span>
                            <CommentsSection entryId={entry.id} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default JudgePanel;
