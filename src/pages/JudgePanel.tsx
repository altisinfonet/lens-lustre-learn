import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Trophy, Award, Medal, Eye, MessageSquare, ChevronDown, ChevronUp, Loader2, AlertTriangle, Camera, ShieldCheck, Tag, Layers, Send, Maximize2 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CommentsSection from "@/components/CommentsSection";
import JuryImageViewer from "@/components/JuryImageViewer";
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

interface JudgingTag {
  id: string;
  label: string;
  color: string;
  image_url?: string | null;
}

interface JudgingRound {
  id: string;
  round_number: number;
  name: string;
  status: string;
}

interface JudgeComment {
  id: string;
  comment: string;
  created_at: string;
  round_id: string | null;
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
  ai_detection_result: any[] | null;
  exif_data: any | null;
  my_tags: string[];
  all_tags: { tag_id: string; judge_id: string }[];
  my_comments: JudgeComment[];
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

  const [competitions, setCompetitions] = useState<(Competition & { entry_count?: number })[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [entries, setEntries] = useState<JudgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [scoringEntry, setScoringEntry] = useState<string | null>(null);

  // Tags & rounds
  const [availableTags, setAvailableTags] = useState<JudgingTag[]>([]);
  const [rounds, setRounds] = useState<JudgingRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  // Score form state per entry
  const [scoreInputs, setScoreInputs] = useState<Record<string, { score: string; feedback: string }>>({});
  // Comment form per entry
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  // Image viewer
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const isJudge = hasRole("judge") || hasRole("admin");
  const isAdmin = hasRole("admin");

  useEffect(() => {
    if (!authLoading && !rolesLoading && !isJudge) {
      navigate("/");
    }
  }, [isJudge, authLoading, rolesLoading, navigate]);

  // Fetch competitions assigned to this judge (or all for admin)
  useEffect(() => {
    if (!isJudge || !user) return;
    const fetchComps = async () => {
      if (isAdmin) {
        const { data } = await supabase
          .from("competitions")
          .select("id, title, category, status, ends_at")
          .in("status", ["open", "judging"])
          .order("ends_at", { ascending: true });
        if (data && data.length > 0) {
          const compIds = data.map(c => c.id);
          const { data: entryCounts } = await supabase
            .from("competition_entries")
            .select("competition_id")
            .in("competition_id", compIds);
          const countMap: Record<string, number> = {};
          (entryCounts || []).forEach(e => { countMap[e.competition_id] = (countMap[e.competition_id] || 0) + 1; });
          setCompetitions(data.map(c => ({ ...c, entry_count: countMap[c.id] || 0 })));
        } else {
          setCompetitions([]);
        }
      } else {
        // Judge sees only assigned competitions
        const { data: assignments } = await supabase
          .from("competition_judges" as any)
          .select("competition_id")
          .eq("judge_id", user.id);
        
        if (assignments && (assignments as any[]).length > 0) {
          const compIds = (assignments as any[]).map((a: any) => a.competition_id);
          const { data } = await supabase
            .from("competitions")
            .select("id, title, category, status, ends_at")
            .in("id", compIds)
            .in("status", ["open", "judging"])
            .order("ends_at", { ascending: true });
          if (data && data.length > 0) {
            const { data: entryCounts } = await supabase
              .from("competition_entries")
              .select("competition_id")
              .in("competition_id", data.map(c => c.id));
            const countMap: Record<string, number> = {};
            (entryCounts || []).forEach(e => { countMap[e.competition_id] = (countMap[e.competition_id] || 0) + 1; });
            setCompetitions(data.map(c => ({ ...c, entry_count: countMap[c.id] || 0 })));
          } else {
            setCompetitions([]);
          }
          setCompetitions([]);
        }
      }
      setLoading(false);
    };
    fetchComps();
  }, [isJudge, isAdmin, user]);

  // Fetch tags and rounds when competition is selected
  useEffect(() => {
    if (!selectedCompId) {
      setAvailableTags([]);
      setRounds([]);
      return;
    }

    const fetchMeta = async () => {
      // Fetch competition-specific tags, fall back to all global tags
      const { data: compTags } = await supabase
        .from("competition_judging_tags" as any)
        .select("tag_id")
        .eq("competition_id", selectedCompId);

      if (compTags && (compTags as any[]).length > 0) {
        const tagIds = (compTags as any[]).map((ct: any) => ct.tag_id);
        const { data: tags } = await supabase
          .from("judging_tags" as any)
          .select("id, label, color, image_url")
          .in("id", tagIds)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        setAvailableTags((tags as any as JudgingTag[]) || []);
      } else {
        // No per-competition tags configured — use all active global tags
        const { data: tags } = await supabase
          .from("judging_tags" as any)
          .select("id, label, color, image_url")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        setAvailableTags((tags as any as JudgingTag[]) || []);
      }

      // Fetch rounds
      const { data: roundsData } = await supabase
        .from("judging_rounds" as any)
        .select("id, round_number, name, status")
        .eq("competition_id", selectedCompId)
        .order("round_number", { ascending: true });
      setRounds((roundsData as any as JudgingRound[]) || []);
    };
    fetchMeta();
  }, [selectedCompId]);

  // Fetch entries for selected competition
  useEffect(() => {
    if (!selectedCompId || !user) return;
    const fetchEntries = async () => {
      setLoadingEntries(true);

      const { data: rawEntries } = await supabase
        .from("competition_entries")
        .select("id, title, description, photos, user_id, status, created_at, competition_id, placement, is_ai_generated, ai_detection_result, exif_data")
        .eq("competition_id", selectedCompId)
        .in("status", ["submitted", "approved", "winner"])
        .order("created_at", { ascending: false });

      if (!rawEntries || rawEntries.length === 0) {
        setEntries([]);
        setLoadingEntries(false);
        return;
      }

      const entryIds = rawEntries.map((e) => e.id);
      const userIds = [...new Set(rawEntries.map((e) => e.user_id))];

      // Fetch in parallel: profiles, votes, scores, tag assignments, comments
      const [profilesRes, votesRes, scoresRes, tagAssignRes, commentsRes] = await Promise.all([
        profilesPublic().select("id, full_name").in("id", userIds),
        supabase.from("competition_votes").select("entry_id").in("entry_id", entryIds),
        supabase.from("judge_scores").select("entry_id, judge_id, score, feedback").in("entry_id", entryIds),
        supabase.from("judge_tag_assignments" as any).select("entry_id, tag_id, judge_id").in("entry_id", entryIds),
        supabase.from("judge_comments" as any).select("id, entry_id, judge_id, comment, created_at, round_id").eq("judge_id", user.id).in("entry_id", entryIds),
      ]);

      const profileMap = new Map((profilesRes.data as any[] || []).map((p: any) => [p.id, p.full_name]) || []);

      const enriched: JudgeEntry[] = rawEntries.map((entry) => {
        const entryVotes = votesRes.data?.filter((v) => v.entry_id === entry.id) || [];
        const entryScores = scoresRes.data?.filter((s) => s.entry_id === entry.id) || [];
        const myScore = entryScores.find((s) => s.judge_id === user.id);
        const avgScore = entryScores.length > 0
          ? entryScores.reduce((sum, s) => sum + s.score, 0) / entryScores.length
          : null;

        const entryTagAssigns = (tagAssignRes.data as any[] || []).filter((t: any) => t.entry_id === entry.id);
        const myTags = entryTagAssigns.filter((t: any) => t.judge_id === user.id).map((t: any) => t.tag_id);
        const myComments = ((commentsRes.data as any[] || []).filter((c: any) => c.entry_id === entry.id) as JudgeComment[]);

        return {
          ...entry,
          placement: (entry as any).placement || null,
          is_ai_generated: (entry as any).is_ai_generated || false,
          ai_detection_result: (entry as any).ai_detection_result || null,
          exif_data: (entry as any).exif_data || null,
          photographer_name: profileMap.get(entry.user_id) || null,
          vote_count: entryVotes.length,
          my_score: myScore?.score ?? null,
          my_feedback: myScore?.feedback ?? null,
          avg_score: avgScore,
          my_tags: myTags,
          all_tags: entryTagAssigns,
          my_comments: myComments,
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
      const { error } = await supabase
        .from("judge_scores")
        .insert({ entry_id: entryId, judge_id: user.id, score, feedback: input.feedback.trim() || null });
      if (error) {
        toast({ title: "Failed to save score", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Score saved" });
      }
    }

    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, my_score: score, my_feedback: input.feedback.trim() || null } : e
      )
    );
    setScoringEntry(null);
  };

  const handlePlacement = async (entryId: string, placement: string | null) => {
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
        if (newPlacement && newPlacement !== "most_viewed" && e.placement === newPlacement) return { ...e, placement: null };
        return e;
      })
    );
  };

  const toggleTag = async (entryId: string, tagId: string) => {
    if (!user) return;
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    const hasTag = entry.my_tags.includes(tagId);

    if (hasTag) {
      // Remove
      await supabase
        .from("judge_tag_assignments" as any)
        .delete()
        .eq("entry_id", entryId)
        .eq("tag_id", tagId)
        .eq("judge_id", user.id);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, my_tags: e.my_tags.filter((t) => t !== tagId) }
            : e
        )
      );
    } else {
      // Add
      const { error } = await supabase.from("judge_tag_assignments" as any).insert({
        entry_id: entryId,
        tag_id: tagId,
        judge_id: user.id,
      } as any);
      if (error) {
        toast({ title: "Failed to assign tag", description: error.message, variant: "destructive" });
        return;
      }
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, my_tags: [...e.my_tags, tagId] }
            : e
        )
      );
    }
  };

  const addComment = async (entryId: string) => {
    if (!user) return;
    const text = commentInputs[entryId]?.trim();
    if (!text) return;

    const { data, error } = await supabase.from("judge_comments" as any).insert({
      entry_id: entryId,
      judge_id: user.id,
      comment: text,
      round_id: selectedRound || null,
    } as any).select("id, comment, created_at, round_id").single();

    if (error) {
      toast({ title: "Failed to add comment", description: error.message, variant: "destructive" });
      return;
    }

    setCommentInputs((prev) => ({ ...prev, [entryId]: "" }));
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, my_comments: [...e.my_comments, data as any as JudgeComment] }
          : e
      )
    );
    toast({ title: "Private note saved" });
  };

  // Viewer-compatible handlers
  const handleViewerScore = async (entryId: string, score: number, feedback: string) => {
    if (!user) return;
    const existing = entries.find((e) => e.id === entryId)?.my_score;
    if (existing !== null) {
      await supabase.from("judge_scores").update({ score, feedback: feedback || null, updated_at: new Date().toISOString() }).eq("entry_id", entryId).eq("judge_id", user.id);
    } else {
      await supabase.from("judge_scores").insert({ entry_id: entryId, judge_id: user.id, score, feedback: feedback || null });
    }
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, my_score: score, my_feedback: feedback || null } : e));
    toast({ title: existing !== null ? "Score updated" : "Score saved" });
  };

  const handleViewerComment = async (entryId: string, text: string) => {
    if (!user) return;
    const { data, error } = await supabase.from("judge_comments" as any).insert({
      entry_id: entryId, judge_id: user.id, comment: text, round_id: selectedRound || null,
    } as any).select("id, comment, created_at, round_id").single();
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, my_comments: [...e.my_comments, data as any as JudgeComment] } : e));
    toast({ title: "Note saved" });
  };

  const handleViewerStatus = async (entryId: string, status: "rejected" | "approved") => {
    const newStatus = status === "rejected" ? "rejected" : "approved";
    await supabase.from("competition_entries").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", entryId);
    if (status === "rejected") {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      toast({ title: "Entry rejected" });
    } else {
      toast({ title: "Entry shortlisted" });
    }
  };

  if (authLoading || rolesLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>Loading...</div>
      </main>
    );
  }

  if (!isJudge) return null;

  const activeRound = rounds.find((r) => r.status === "active");

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
              No competitions assigned to you for judging.
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
                  {comp.entry_count !== undefined && (
                    <span className="text-[8px] px-1.5 py-0.5 border border-border text-muted-foreground">
                      {comp.entry_count} entries
                    </span>
                  )}
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

        {/* Round selector (if rounds exist) */}
        {selectedCompId && rounds.length > 0 && (
          <div className="mb-6">
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
              <Layers className="h-3 w-3 inline mr-1" />
              Judging Round
            </span>
            <div className="flex flex-wrap gap-2">
              {rounds.map((round) => (
                <button
                  key={round.id}
                  onClick={() => setSelectedRound(round.id === selectedRound ? null : round.id)}
                  className={`inline-flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase px-4 py-2 border transition-all duration-500 ${
                    selectedRound === round.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/50"
                  }`}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  R{round.round_number}: {round.name}
                  <span className={`text-[8px] px-1.5 py-0.5 border ${
                    round.status === "active" ? "border-primary text-primary" :
                    round.status === "completed" ? "border-muted-foreground/40 text-muted-foreground" :
                    "border-yellow-500 text-yellow-500"
                  }`}>
                    {round.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

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
                  {activeRound && <> · Round: <span className="text-primary">{activeRound.name}</span></>}
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
                        {entry.photos.length > 0 && (
                          <div className="relative group cursor-pointer" onClick={(e) => { e.stopPropagation(); setViewerIndex(entries.indexOf(entry)); }}>
                            <img src={entry.photos[0]} alt={entry.title} className="w-20 h-20 object-cover shrink-0 border border-border" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="h-4 w-4 text-white" />
                            </div>
                          </div>
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
                            {entry.is_ai_generated && (
                              <span className="text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 border border-orange-500 text-orange-500 bg-orange-500/10" style={{ fontFamily: "var(--font-heading)" }}>
                                🤖 AI Generated
                              </span>
                            )}
                            {/* Show tag count */}
                            {entry.my_tags.length > 0 && (
                              <span className="text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 border border-primary/30 text-primary bg-primary/5" style={{ fontFamily: "var(--font-heading)" }}>
                                <Tag className="h-2.5 w-2.5 inline mr-0.5" />
                                {entry.my_tags.length} tag{entry.my_tags.length !== 1 ? "s" : ""}
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

                          {/* AI Detection & EXIF Info Panel */}
                          {(entry.is_ai_generated || entry.ai_detection_result || entry.exif_data) && (
                            <div className="px-5 pb-5 border-t border-border pt-5">
                              <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                                <AlertTriangle className="h-3 w-3 inline mr-1" />
                                AI & Authenticity Info
                              </span>

                              <div className={`flex items-center gap-2 mb-3 text-[10px] px-3 py-2 border ${
                                entry.is_ai_generated
                                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                                  : "border-green-600/40 bg-green-600/5 text-green-700 dark:text-green-400"
                              }`} style={{ fontFamily: "var(--font-heading)" }}>
                                {entry.is_ai_generated ? (
                                  <><AlertTriangle className="h-3.5 w-3.5" /> User declared: AI-GENERATED</>
                                ) : (
                                  <><ShieldCheck className="h-3.5 w-3.5" /> User declared: ORIGINAL CAPTURE</>
                                )}
                              </div>

                              {entry.ai_detection_result && Array.isArray(entry.ai_detection_result) && entry.ai_detection_result.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                                    Auto-Detection Results:
                                  </span>
                                  {entry.ai_detection_result.map((det: any, i: number) => (
                                    <div key={i} className={`text-[10px] px-3 py-2 border ${
                                      det.detection?.is_likely_ai
                                        ? "border-destructive/30 bg-destructive/5"
                                        : "border-border bg-muted/20"
                                    }`} style={{ fontFamily: "var(--font-body)" }}>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                                          Photo {det.photo_index + 1}:
                                        </span>
                                        <span className={det.detection?.is_likely_ai ? "text-destructive font-semibold" : "text-green-600 dark:text-green-400"}>
                                          {det.detection?.is_likely_ai
                                            ? `⚠ AI Likely (${det.detection?.confidence}% confidence)`
                                            : `✓ Likely Original`}
                                        </span>
                                      </div>
                                      {det.detection?.summary && (
                                        <p className="text-muted-foreground">{det.detection.summary}</p>
                                      )}
                                      {det.detection?.reasons?.length > 0 && (
                                        <ul className="mt-1 text-muted-foreground list-disc list-inside">
                                          {det.detection.reasons.map((r: string, ri: number) => (
                                            <li key={ri}>{r}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {entry.exif_data && (
                                <div className="border border-primary/30 bg-primary/5 p-3 space-y-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Camera className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-[9px] tracking-[0.15em] uppercase text-primary font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                                      User-Provided EXIF Data (Override)
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]" style={{ fontFamily: "var(--font-body)" }}>
                                    {entry.exif_data.camera_make && (
                                      <div><span className="text-muted-foreground">Make:</span> <strong>{entry.exif_data.camera_make}</strong></div>
                                    )}
                                    {entry.exif_data.camera_model && (
                                      <div><span className="text-muted-foreground">Model:</span> <strong>{entry.exif_data.camera_model}</strong></div>
                                    )}
                                    {entry.exif_data.lens && (
                                      <div><span className="text-muted-foreground">Lens:</span> <strong>{entry.exif_data.lens}</strong></div>
                                    )}
                                    {entry.exif_data.focal_length && (
                                      <div><span className="text-muted-foreground">Focal:</span> <strong>{entry.exif_data.focal_length}</strong></div>
                                    )}
                                    {entry.exif_data.aperture && (
                                      <div><span className="text-muted-foreground">Aperture:</span> <strong>{entry.exif_data.aperture}</strong></div>
                                    )}
                                    {entry.exif_data.shutter_speed && (
                                      <div><span className="text-muted-foreground">Shutter:</span> <strong>{entry.exif_data.shutter_speed}</strong></div>
                                    )}
                                    {entry.exif_data.iso && (
                                      <div><span className="text-muted-foreground">ISO:</span> <strong>{entry.exif_data.iso}</strong></div>
                                    )}
                                    {entry.exif_data.date_taken && (
                                      <div><span className="text-muted-foreground">Date:</span> <strong>{entry.exif_data.date_taken}</strong></div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Tag Marking */}
                          {availableTags.length > 0 && (
                            <div className="px-5 pb-5 border-t border-border pt-5">
                              <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                                <Tag className="h-3 w-3 inline mr-1" />
                                Tag This Entry
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {availableTags.map((tag) => {
                                  const isActive = entry.my_tags.includes(tag.id);
                                  // Count how many judges assigned this tag
                                  const totalCount = entry.all_tags.filter((t) => t.tag_id === tag.id).length;
                                  return (
                                    <button
                                      key={tag.id}
                                      onClick={() => toggleTag(entry.id, tag.id)}
                                      className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.1em] px-3 py-1.5 border transition-all duration-300 ${
                                        isActive
                                          ? "border-current bg-current/10"
                                          : "border-border text-muted-foreground hover:border-foreground/50"
                                      }`}
                                      style={{
                                        fontFamily: "var(--font-heading)",
                                        color: isActive ? tag.color : undefined,
                                        borderColor: isActive ? tag.color : undefined,
                                      }}
                                    >
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: tag.color }}
                                      />
                                      {tag.label}
                                      {totalCount > 0 && (
                                        <span className="text-[8px] opacity-60">({totalCount})</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
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

                          {/* Private Judge Notes */}
                          <div className="px-5 pb-5 border-t border-border pt-5">
                            <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                              <MessageSquare className="h-3 w-3 inline mr-1" />
                              Private Notes (visible to you & admins only)
                            </span>

                            {/* Existing comments */}
                            {entry.my_comments.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {entry.my_comments.map((c) => {
                                  const roundName = rounds.find((r) => r.id === c.round_id)?.name;
                                  return (
                                    <div key={c.id} className="text-xs px-3 py-2 border border-border/50 bg-muted/20" style={{ fontFamily: "var(--font-body)" }}>
                                      <p className="text-foreground">{c.comment}</p>
                                      <p className="text-[9px] text-muted-foreground mt-1">
                                        {new Date(c.created_at).toLocaleString()}
                                        {roundName && <> · <span className="text-primary">{roundName}</span></>}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Add new comment */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={commentInputs[entry.id] || ""}
                                onChange={(e) => setCommentInputs((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                                placeholder="Add a private note..."
                                className="flex-1 bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-sm transition-colors duration-500"
                                style={{ fontFamily: "var(--font-body)" }}
                                maxLength={500}
                                onKeyDown={(e) => e.key === "Enter" && addComment(entry.id)}
                              />
                              <button
                                onClick={() => addComment(entry.id)}
                                disabled={!commentInputs[entry.id]?.trim()}
                                className="px-4 py-2 bg-primary text-primary-foreground text-[10px] tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
                                style={{ fontFamily: "var(--font-heading)" }}
                              >
                                <Send className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Public Comments */}
                          <div className="px-5 pb-5 border-t border-border pt-5">
                            <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                              <MessageSquare className="h-3 w-3 inline mr-1" />
                              Public Comments
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

        {/* Jury Image Viewer */}
        {viewerIndex !== null && (
          <JuryImageViewer
            entries={entries}
            currentIndex={viewerIndex}
            availableTags={availableTags}
            rounds={rounds}
            onClose={() => setViewerIndex(null)}
            onNavigate={(i) => setViewerIndex(i)}
            onToggleTag={toggleTag}
            onScore={handleViewerScore}
            onAddComment={handleViewerComment}
            onStatusChange={handleViewerStatus}
          />
        )}
      </div>
    </main>
  );
};

export default JudgePanel;
