import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Trophy, Award, Medal, Eye, MessageSquare, Loader2, AlertTriangle, Camera, ShieldCheck, Tag, Layers, Send, Maximize2, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [scoringEntry, setScoringEntry] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const [availableTags, setAvailableTags] = useState<JudgingTag[]>([]);
  const [rounds, setRounds] = useState<JudgingRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  const [scoreInputs, setScoreInputs] = useState<Record<string, { score: string; feedback: string }>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const isJudge = hasRole("judge") || hasRole("admin");
  const isAdmin = hasRole("admin");

  useEffect(() => {
    if (!authLoading && !rolesLoading && !isJudge) navigate("/");
  }, [isJudge, authLoading, rolesLoading, navigate]);

  // Fetch competitions
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
          const { data: entryCounts } = await supabase.from("competition_entries").select("competition_id").in("competition_id", compIds);
          const countMap: Record<string, number> = {};
          (entryCounts || []).forEach(e => { countMap[e.competition_id] = (countMap[e.competition_id] || 0) + 1; });
          setCompetitions(data.map(c => ({ ...c, entry_count: countMap[c.id] || 0 })));
        } else {
          setCompetitions([]);
        }
      } else {
        const { data: assignments } = await supabase.from("competition_judges" as any).select("competition_id").eq("judge_id", user.id);
        if (assignments && (assignments as any[]).length > 0) {
          const compIds = (assignments as any[]).map((a: any) => a.competition_id);
          const { data } = await supabase.from("competitions").select("id, title, category, status, ends_at").in("id", compIds).in("status", ["open", "judging"]).order("ends_at", { ascending: true });
          if (data && data.length > 0) {
            const { data: entryCounts } = await supabase.from("competition_entries").select("competition_id").in("competition_id", data.map(c => c.id));
            const countMap: Record<string, number> = {};
            (entryCounts || []).forEach(e => { countMap[e.competition_id] = (countMap[e.competition_id] || 0) + 1; });
            setCompetitions(data.map(c => ({ ...c, entry_count: countMap[c.id] || 0 })));
          } else {
            setCompetitions([]);
          }
        }
      }
      setLoading(false);
    };
    fetchComps();
  }, [isJudge, isAdmin, user]);

  // Fetch tags & rounds
  useEffect(() => {
    if (!selectedCompId) { setAvailableTags([]); setRounds([]); return; }
    const fetchMeta = async () => {
      const { data: compTags } = await supabase.from("competition_judging_tags" as any).select("tag_id").eq("competition_id", selectedCompId);
      if (compTags && (compTags as any[]).length > 0) {
        const tagIds = (compTags as any[]).map((ct: any) => ct.tag_id);
        const { data: tags } = await supabase.from("judging_tags" as any).select("id, label, color, image_url").in("id", tagIds).eq("is_active", true).order("sort_order", { ascending: true });
        setAvailableTags((tags as any as JudgingTag[]) || []);
      } else {
        const { data: tags } = await supabase.from("judging_tags" as any).select("id, label, color, image_url").eq("is_active", true).order("sort_order", { ascending: true });
        setAvailableTags((tags as any as JudgingTag[]) || []);
      }
      const { data: roundsData } = await supabase.from("judging_rounds" as any).select("id, round_number, name, status").eq("competition_id", selectedCompId).order("round_number", { ascending: true });
      setRounds((roundsData as any as JudgingRound[]) || []);
    };
    fetchMeta();
  }, [selectedCompId]);

  // Fetch entries
  useEffect(() => {
    if (!selectedCompId || !user) return;
    const fetchEntries = async () => {
      setLoadingEntries(true);
      setSelectedEntryId(null);
      setActiveFilter("all");

      const { data: rawEntries } = await supabase
        .from("competition_entries")
        .select("id, title, description, photos, user_id, status, created_at, competition_id, placement, is_ai_generated, ai_detection_result, exif_data")
        .eq("competition_id", selectedCompId)
        .in("status", ["submitted", "approved", "winner"])
        .order("created_at", { ascending: false });

      if (!rawEntries || rawEntries.length === 0) { setEntries([]); setLoadingEntries(false); return; }

      const entryIds = rawEntries.map(e => e.id);
      const userIds = [...new Set(rawEntries.map(e => e.user_id))];

      const [profilesRes, votesRes, scoresRes, tagAssignRes, commentsRes] = await Promise.all([
        profilesPublic().select("id, full_name").in("id", userIds),
        supabase.from("competition_votes").select("entry_id").in("entry_id", entryIds),
        supabase.from("judge_scores").select("entry_id, judge_id, score, feedback").in("entry_id", entryIds),
        supabase.from("judge_tag_assignments" as any).select("entry_id, tag_id, judge_id").in("entry_id", entryIds),
        supabase.from("judge_comments" as any).select("id, entry_id, judge_id, comment, created_at, round_id").eq("judge_id", user.id).in("entry_id", entryIds),
      ]);

      const profileMap = new Map((profilesRes.data as any[] || []).map((p: any) => [p.id, p.full_name]));

      const enriched: JudgeEntry[] = rawEntries.map(entry => {
        const entryVotes = votesRes.data?.filter(v => v.entry_id === entry.id) || [];
        const entryScores = scoresRes.data?.filter(s => s.entry_id === entry.id) || [];
        const myScore = entryScores.find(s => s.judge_id === user.id);
        const avgScore = entryScores.length > 0 ? entryScores.reduce((sum, s) => sum + s.score, 0) / entryScores.length : null;
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

      enriched.sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0) || b.vote_count - a.vote_count);
      setEntries(enriched);

      const inputs: Record<string, { score: string; feedback: string }> = {};
      enriched.forEach(e => { inputs[e.id] = { score: e.my_score !== null ? String(e.my_score) : "", feedback: e.my_feedback || "" }; });
      setScoreInputs(inputs);
      setLoadingEntries(false);
    };
    fetchEntries();
  }, [selectedCompId, user]);

  // Filtered entries based on active filter
  const filteredEntries = useMemo(() => {
    if (activeFilter === "all") return entries;
    if (activeFilter === "scored") return entries.filter(e => e.my_score !== null);
    if (activeFilter === "unscored") return entries.filter(e => e.my_score === null);
    // Filter by tag id
    return entries.filter(e => e.all_tags.some(t => t.tag_id === activeFilter));
  }, [entries, activeFilter]);

  const selectedEntry = selectedEntryId ? entries.find(e => e.id === selectedEntryId) : null;

  // Handlers (unchanged logic)
  const handleScore = async (entryId: string) => {
    if (!user) return;
    const input = scoreInputs[entryId];
    const score = parseInt(input?.score);
    if (isNaN(score) || score < 1 || score > 10) { toast({ title: "Score must be 1–10", variant: "destructive" }); return; }
    setScoringEntry(entryId);
    const existing = entries.find(e => e.id === entryId)?.my_score;
    if (existing !== null) {
      const { error } = await supabase.from("judge_scores").update({ score, feedback: input.feedback.trim() || null, updated_at: new Date().toISOString() }).eq("entry_id", entryId).eq("judge_id", user.id);
      if (error) toast({ title: "Failed", description: error.message, variant: "destructive" }); else toast({ title: "Score updated" });
    } else {
      const { error } = await supabase.from("judge_scores").insert({ entry_id: entryId, judge_id: user.id, score, feedback: input.feedback.trim() || null });
      if (error) toast({ title: "Failed", description: error.message, variant: "destructive" }); else toast({ title: "Score saved" });
    }
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, my_score: score, my_feedback: input.feedback.trim() || null } : e));
    setScoringEntry(null);
  };

  const handlePlacement = async (entryId: string, placement: string | null) => {
    if (placement && placement !== "most_viewed") {
      const existing = entries.find(e => e.placement === placement && e.id !== entryId);
      if (existing) await supabase.from("competition_entries").update({ placement: null }).eq("id", existing.id);
    }
    const currentEntry = entries.find(e => e.id === entryId);
    const newPlacement = currentEntry?.placement === placement ? null : placement;
    const { error } = await supabase.from("competition_entries").update({ placement: newPlacement, status: newPlacement === "winner" ? "winner" : "approved" }).eq("id", entryId);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: newPlacement ? `Marked as ${newPlacement.replace(/_/g, " ")}` : "Placement removed" });
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) return { ...e, placement: newPlacement, status: newPlacement === "winner" ? "winner" : "approved" };
      if (newPlacement && newPlacement !== "most_viewed" && e.placement === newPlacement) return { ...e, placement: null };
      return e;
    }));
  };

  const toggleTag = async (entryId: string, tagId: string) => {
    if (!user) return;
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    const hasTag = entry.my_tags.includes(tagId);
    if (hasTag) {
      await supabase.from("judge_tag_assignments" as any).delete().eq("entry_id", entryId).eq("tag_id", tagId).eq("judge_id", user.id);
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, my_tags: e.my_tags.filter(t => t !== tagId) } : e));
    } else {
      const { error } = await supabase.from("judge_tag_assignments" as any).insert({ entry_id: entryId, tag_id: tagId, judge_id: user.id } as any);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, my_tags: [...e.my_tags, tagId] } : e));
    }
  };

  const addComment = async (entryId: string) => {
    if (!user) return;
    const text = commentInputs[entryId]?.trim();
    if (!text) return;
    const { data, error } = await supabase.from("judge_comments" as any).insert({ entry_id: entryId, judge_id: user.id, comment: text, round_id: selectedRound || null } as any).select("id, comment, created_at, round_id").single();
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setCommentInputs(prev => ({ ...prev, [entryId]: "" }));
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, my_comments: [...e.my_comments, data as any as JudgeComment] } : e));
    toast({ title: "Note saved" });
  };

  const handleViewerScore = async (entryId: string, score: number, feedback: string) => {
    if (!user) return;
    const existing = entries.find(e => e.id === entryId)?.my_score;
    if (existing !== null) {
      await supabase.from("judge_scores").update({ score, feedback: feedback || null, updated_at: new Date().toISOString() }).eq("entry_id", entryId).eq("judge_id", user.id);
    } else {
      await supabase.from("judge_scores").insert({ entry_id: entryId, judge_id: user.id, score, feedback: feedback || null });
    }
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, my_score: score, my_feedback: feedback || null } : e));
    toast({ title: existing !== null ? "Score updated" : "Score saved" });
  };

  const handleViewerComment = async (entryId: string, text: string) => {
    if (!user) return;
    const { data, error } = await supabase.from("judge_comments" as any).insert({ entry_id: entryId, judge_id: user.id, comment: text, round_id: selectedRound || null } as any).select("id, comment, created_at, round_id").single();
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, my_comments: [...e.my_comments, data as any as JudgeComment] } : e));
    toast({ title: "Note saved" });
  };

  const handleViewerStatus = async (entryId: string, status: "rejected" | "approved") => {
    const newStatus = status === "rejected" ? "rejected" : "approved";
    await supabase.from("competition_entries").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", entryId);
    if (status === "rejected") {
      setEntries(prev => prev.filter(e => e.id !== entryId));
      if (selectedEntryId === entryId) setSelectedEntryId(null);
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

  const activeRound = rounds.find(r => r.status === "active");

  // Build filter options: All, Scored, Unscored + dynamic tags
  const filterOptions: { key: string; label: string; color?: string; count: number }[] = [
    { key: "all", label: "All Images", count: entries.length },
    { key: "scored", label: "Scored", count: entries.filter(e => e.my_score !== null).length },
    { key: "unscored", label: "Unscored", count: entries.filter(e => e.my_score === null).length },
    ...availableTags.map(tag => ({
      key: tag.id,
      label: tag.label,
      color: tag.color,
      count: entries.filter(e => e.all_tags.some(t => t.tag_id === tag.id)).length,
    })),
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-3 md:px-6 py-4 md:py-6">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Judge Panel" }]} className="mb-3" />

        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-px bg-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Judging</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-light tracking-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Judge <em className="italic text-primary">Panel</em>
        </h1>

        {/* 3-Column Layout */}
        <div className="flex gap-0 border border-border" style={{ height: "calc(100vh - 160px)", minHeight: 500 }}>
          {/* ─── LEFT: Competition List ─── */}
          <div className="w-56 shrink-0 border-r border-border flex flex-col bg-muted/20 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-muted/40">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                Competitions
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {competitions.length === 0 ? (
                <p className="text-[10px] text-muted-foreground p-3" style={{ fontFamily: "var(--font-body)" }}>
                  No competitions assigned.
                </p>
              ) : (
                competitions.map(comp => (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedCompId(comp.id === selectedCompId ? null : comp.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border/50 transition-all duration-300 group relative ${
                      selectedCompId === comp.id
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : "hover:bg-muted/40 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Trophy className={`h-3 w-3 shrink-0 ${selectedCompId === comp.id ? "text-primary" : "text-muted-foreground"}`} />
                      <span
                        className={`text-[11px] font-medium truncate ${selectedCompId === comp.id ? "text-primary" : "text-foreground"}`}
                        style={{ fontFamily: "var(--font-heading)" }}
                        title={comp.title}
                      >
                        {comp.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-5">
                      <span className={`text-[8px] tracking-wider uppercase px-1.5 py-0.5 border ${
                        comp.status === "judging" ? "border-yellow-500/50 text-yellow-600 dark:text-yellow-400" : "border-primary/50 text-primary"
                      }`} style={{ fontFamily: "var(--font-heading)" }}>
                        {comp.status}
                      </span>
                      {comp.entry_count !== undefined && (
                        <span className="text-[8px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                          {comp.entry_count} entries
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Round selector inside left column */}
            {selectedCompId && rounds.length > 0 && (
              <div className="border-t border-border px-3 py-2.5 bg-muted/30">
                <span className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1 mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                  <Layers className="h-2.5 w-2.5" /> Rounds
                </span>
                <div className="space-y-1">
                  {rounds.map(round => (
                    <button
                      key={round.id}
                      onClick={() => setSelectedRound(round.id === selectedRound ? null : round.id)}
                      className={`w-full text-left text-[10px] px-2 py-1.5 border transition-all duration-300 ${
                        selectedRound === round.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-foreground/30"
                      }`}
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      R{round.round_number}: {round.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── MIDDLE: Thumbnails + Filters ─── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {!selectedCompId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Trophy className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                    Select a competition from the left
                  </p>
                </div>
              </div>
            ) : loadingEntries ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Filter bar */}
                <div className="px-3 py-2 border-b border-border bg-muted/20 overflow-x-auto">
                  <div className="flex items-center gap-1.5 min-w-max">
                    <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
                    {filterOptions.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setActiveFilter(opt.key)}
                        className={`relative inline-flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase px-2.5 py-1.5 border transition-all duration-300 whitespace-nowrap ${
                          activeFilter === opt.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                        }`}
                        style={{
                          fontFamily: "var(--font-heading)",
                          ...(opt.color && activeFilter === opt.key ? { borderColor: opt.color, color: opt.color, backgroundColor: `${opt.color}15` } : {}),
                        }}
                        title={`${opt.label} (${opt.count})`}
                      >
                        {opt.color && (
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                        )}
                        {opt.label}
                        <span className="text-[7px] opacity-60">{opt.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info bar */}
                <div className="px-3 py-1.5 border-b border-border/50 bg-background">
                  <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    {filteredEntries.length} of {entries.length} entries
                    {activeRound && <> · Round: <span className="text-primary">{activeRound.name}</span></>}
                  </span>
                </div>

                {/* Thumbnail grid */}
                <div className="flex-1 overflow-y-auto p-2">
                  {filteredEntries.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>No entries match this filter.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
                      {filteredEntries.map(entry => {
                        const isSelected = selectedEntryId === entry.id;
                        return (
                          <motion.div
                            key={entry.id}
                            layout
                            onClick={() => setSelectedEntryId(entry.id)}
                            className={`relative group cursor-pointer aspect-square overflow-hidden border-2 transition-all duration-200 ${
                              isSelected ? "border-primary ring-1 ring-primary/30" : "border-transparent hover:border-primary/40"
                            }`}
                            title={`${entry.title} by ${entry.photographer_name || "Anonymous"}`}
                          >
                            <img
                              src={entry.photos[0]}
                              alt={entry.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-1.5">
                              <p className="text-[8px] text-white font-medium truncate" style={{ fontFamily: "var(--font-heading)" }}>
                                {entry.title}
                              </p>
                              <div className="flex items-center gap-1.5 text-[7px] text-white/70">
                                <span className="flex items-center gap-0.5">
                                  <Star className="h-2 w-2" />
                                  {entry.my_score !== null ? entry.my_score : "—"}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Eye className="h-2 w-2" />
                                  {entry.vote_count}
                                </span>
                                {entry.photos.length > 1 && (
                                  <span className="flex items-center gap-0.5">
                                    <Camera className="h-2 w-2" />
                                    {entry.photos.length}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status indicators */}
                            {entry.my_score !== null && (
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[7px] font-bold">
                                {entry.my_score}
                              </div>
                            )}
                            {entry.placement && (
                              <div className="absolute top-1 left-1">
                                <span className="text-[10px]">
                                  {entry.placement === "winner" ? "🏆" : entry.placement === "1st_runner_up" ? "🥈" : entry.placement === "2nd_runner_up" ? "🥉" : "👁"}
                                </span>
                              </div>
                            )}
                            {entry.my_tags.length > 0 && (
                              <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-primary/80 flex items-center justify-center">
                                <Tag className="h-1.5 w-1.5 text-primary-foreground" />
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ─── RIGHT: Entry Detail Panel ─── */}
          <AnimatePresence mode="wait">
            {selectedEntry && (
              <motion.div
                key={selectedEntry.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="w-80 xl:w-96 shrink-0 border-l border-border overflow-y-auto bg-background"
              >
                {/* Hero image */}
                <div
                  className="relative group cursor-pointer"
                  onClick={() => setViewerIndex(entries.indexOf(selectedEntry))}
                >
                  <img src={selectedEntry.photos[0]} alt={selectedEntry.title} className="w-full aspect-[4/3] object-cover" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="h-6 w-6 text-white" />
                  </div>
                  {selectedEntry.photos.length > 1 && (
                    <span className="absolute bottom-2 right-2 text-[9px] bg-black/70 text-white px-2 py-0.5 rounded-sm">
                      +{selectedEntry.photos.length - 1} more
                    </span>
                  )}
                </div>

                {/* Additional photos strip */}
                {selectedEntry.photos.length > 1 && (
                  <div className="flex gap-0.5 p-1 bg-muted/30">
                    {selectedEntry.photos.slice(1, 5).map((p, i) => (
                      <img key={i} src={p} alt="" className="h-12 w-12 object-cover flex-shrink-0 border border-border/50" />
                    ))}
                    {selectedEntry.photos.length > 5 && (
                      <div className="h-12 w-12 flex items-center justify-center bg-muted text-[9px] text-muted-foreground">+{selectedEntry.photos.length - 5}</div>
                    )}
                  </div>
                )}

                <div className="p-3 space-y-3">
                  {/* Title & meta */}
                  <div>
                    <h3 className="text-sm font-medium mb-0.5" style={{ fontFamily: "var(--font-display)" }}>{selectedEntry.title}</h3>
                    <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                      by {selectedEntry.photographer_name || "Anonymous"}
                    </p>
                    {selectedEntry.description && (
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                        {selectedEntry.description}
                      </p>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 text-[10px]" style={{ fontFamily: "var(--font-heading)" }}>
                    <span className="flex items-center gap-1 text-yellow-500">
                      <Star className="h-3 w-3" />
                      {selectedEntry.my_score !== null ? `${selectedEntry.my_score}/10` : "—"}
                    </span>
                    {selectedEntry.avg_score !== null && (
                      <span className="text-muted-foreground">Avg: {selectedEntry.avg_score.toFixed(1)}</span>
                    )}
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="h-3 w-3" /> {selectedEntry.vote_count}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    {selectedEntry.placement && (
                      <span className={`text-[8px] tracking-[0.1em] uppercase px-2 py-0.5 border ${
                        PLACEMENTS.find(p => p.value === selectedEntry.placement)?.color || "border-border"
                      }`} style={{ fontFamily: "var(--font-heading)" }}>
                        {selectedEntry.placement.replace(/_/g, " ")}
                      </span>
                    )}
                    {selectedEntry.is_ai_generated && (
                      <span className="text-[8px] tracking-[0.1em] uppercase px-2 py-0.5 border border-orange-500 text-orange-500 bg-orange-500/10" style={{ fontFamily: "var(--font-heading)" }}>
                        🤖 AI
                      </span>
                    )}
                  </div>

                  {/* AI / EXIF */}
                  {(selectedEntry.is_ai_generated || selectedEntry.exif_data) && (
                    <div className="border border-border p-2 space-y-1.5">
                      <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground flex items-center gap-1" style={{ fontFamily: "var(--font-heading)" }}>
                        <AlertTriangle className="h-2.5 w-2.5" /> Authenticity
                      </span>
                      <div className={`text-[9px] px-2 py-1 border ${
                        selectedEntry.is_ai_generated ? "border-destructive/40 text-destructive" : "border-green-600/40 text-green-600 dark:text-green-400"
                      }`} style={{ fontFamily: "var(--font-heading)" }}>
                        {selectedEntry.is_ai_generated ? "⚠ AI-Generated" : "✓ Original"}
                      </div>
                      {selectedEntry.exif_data && (
                        <div className="grid grid-cols-2 gap-1 text-[9px]" style={{ fontFamily: "var(--font-body)" }}>
                          {selectedEntry.exif_data.camera_model && <div><span className="text-muted-foreground">Camera:</span> {selectedEntry.exif_data.camera_model}</div>}
                          {selectedEntry.exif_data.lens && <div><span className="text-muted-foreground">Lens:</span> {selectedEntry.exif_data.lens}</div>}
                          {selectedEntry.exif_data.aperture && <div><span className="text-muted-foreground">f/</span>{selectedEntry.exif_data.aperture}</div>}
                          {selectedEntry.exif_data.iso && <div><span className="text-muted-foreground">ISO</span> {selectedEntry.exif_data.iso}</div>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {availableTags.length > 0 && (
                    <div>
                      <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground flex items-center gap-1 mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                        <Tag className="h-2.5 w-2.5" /> Tags
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {availableTags.map(tag => {
                          const isActive = selectedEntry.my_tags.includes(tag.id);
                          const totalCount = selectedEntry.all_tags.filter(t => t.tag_id === tag.id).length;
                          return (
                            <button
                              key={tag.id}
                              onClick={() => toggleTag(selectedEntry.id, tag.id)}
                              className={`inline-flex items-center gap-1 text-[9px] tracking-[0.05em] px-2 py-1 border transition-all duration-200 ${
                                isActive ? "bg-current/10" : "border-border/60 text-muted-foreground hover:border-foreground/40"
                              }`}
                              style={{
                                fontFamily: "var(--font-heading)",
                                ...(isActive ? { color: tag.color, borderColor: tag.color } : {}),
                              }}
                              title={tag.label}
                            >
                              {tag.image_url ? (
                                <img src={tag.image_url} alt="" className="h-3 w-auto object-contain" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                              )}
                              {tag.label}
                              {totalCount > 0 && <span className="text-[7px] opacity-50">({totalCount})</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Scoring */}
                  <div className="border-t border-border pt-3">
                    <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground block mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                      Score
                    </span>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min={1} max={10}
                        value={scoreInputs[selectedEntry.id]?.score || ""}
                        onChange={e => setScoreInputs(prev => ({ ...prev, [selectedEntry.id]: { ...prev[selectedEntry.id], score: e.target.value } }))}
                        placeholder="1-10"
                        className="w-14 bg-transparent border border-border focus:border-primary outline-none px-2 py-1.5 text-xs text-center transition-colors"
                        style={{ fontFamily: "var(--font-body)" }}
                      />
                      <input
                        type="text"
                        value={scoreInputs[selectedEntry.id]?.feedback || ""}
                        onChange={e => setScoreInputs(prev => ({ ...prev, [selectedEntry.id]: { ...prev[selectedEntry.id], feedback: e.target.value } }))}
                        placeholder="Feedback..."
                        className="flex-1 min-w-0 bg-transparent border border-border focus:border-primary outline-none px-2 py-1.5 text-xs transition-colors"
                        style={{ fontFamily: "var(--font-body)" }}
                      />
                      <button
                        onClick={() => handleScore(selectedEntry.id)}
                        disabled={scoringEntry === selectedEntry.id}
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-[9px] uppercase tracking-wider hover:opacity-90 disabled:opacity-50 shrink-0"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {scoringEntry === selectedEntry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : selectedEntry.my_score !== null ? "Update" : "Score"}
                      </button>
                    </div>
                  </div>

                  {/* Placement */}
                  <div className="border-t border-border pt-3">
                    <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground block mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                      Placement
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {PLACEMENTS.map(p => {
                        const isActive = selectedEntry.placement === p.value;
                        return (
                          <button
                            key={p.value}
                            onClick={() => handlePlacement(selectedEntry.id, p.value)}
                            className={`text-[9px] tracking-[0.05em] uppercase px-2 py-1 border transition-all duration-300 ${
                              isActive ? `${p.color} bg-primary/5` : "border-border text-muted-foreground hover:border-foreground/40"
                            }`}
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="border-t border-border pt-3">
                    <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground flex items-center gap-1 mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                      <MessageSquare className="h-2.5 w-2.5" /> Private Notes
                    </span>
                    {selectedEntry.my_comments.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {selectedEntry.my_comments.map(c => {
                          const roundName = rounds.find(r => r.id === c.round_id)?.name;
                          return (
                            <div key={c.id} className="text-[10px] px-2 py-1.5 border border-border/50 bg-muted/20" style={{ fontFamily: "var(--font-body)" }}>
                              <p>{c.comment}</p>
                              <p className="text-[8px] text-muted-foreground mt-0.5">
                                {new Date(c.created_at).toLocaleDateString()}
                                {roundName && <> · <span className="text-primary">{roundName}</span></>}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={commentInputs[selectedEntry.id] || ""}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [selectedEntry.id]: e.target.value }))}
                        placeholder="Add note..."
                        className="flex-1 bg-transparent border border-border focus:border-primary outline-none px-2 py-1.5 text-xs transition-colors"
                        style={{ fontFamily: "var(--font-body)" }}
                        maxLength={500}
                        onKeyDown={e => e.key === "Enter" && addComment(selectedEntry.id)}
                      />
                      <button
                        onClick={() => addComment(selectedEntry.id)}
                        disabled={!commentInputs[selectedEntry.id]?.trim()}
                        className="px-2 py-1.5 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <Send className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Public Comments */}
                  <div className="border-t border-border pt-3">
                    <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground flex items-center gap-1 mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                      <MessageSquare className="h-2.5 w-2.5" /> Public Comments
                    </span>
                    <CommentsSection entryId={selectedEntry.id} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Jury Image Viewer */}
        {viewerIndex !== null && (
          <JuryImageViewer
            entries={entries}
            currentIndex={viewerIndex}
            availableTags={availableTags}
            rounds={rounds}
            onClose={() => setViewerIndex(null)}
            onNavigate={i => setViewerIndex(i)}
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
