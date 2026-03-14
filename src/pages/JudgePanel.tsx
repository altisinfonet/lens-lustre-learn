import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Trophy, Award, Medal, Eye, MessageSquare, Loader2, AlertTriangle, Camera, Tag, Layers, Send, Maximize2, Filter, ChevronRight, ChevronLeft, CheckCircle, XCircle, ThumbsUp, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Breadcrumbs from "@/components/Breadcrumbs";
import JudgingStampBadge from "@/components/JudgingStampBadge";
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
  icon?: string | null;
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

// Flattened photo item for grid display
interface FlatPhoto {
  entryId: string;
  photoUrl: string;
  photoIndex: number;
  entry: JudgeEntry;
}

const PLACEMENTS = [
  { value: "winner", label: "🏆 Winner", color: "text-yellow-500 border-yellow-500" },
  { value: "1st_runner_up", label: "🥈 1st Runner Up", color: "text-muted-foreground border-muted-foreground" },
  { value: "2nd_runner_up", label: "🥉 2nd Runner Up", color: "text-amber-700 border-amber-700" },
  { value: "most_viewed", label: "👁 Most Viewed", color: "text-primary border-primary" },
];

const SCORE_COLORS: Record<number, string> = {
  1: "bg-red-600", 2: "bg-red-500", 3: "bg-orange-500", 4: "bg-orange-400",
  5: "bg-yellow-500", 6: "bg-yellow-400", 7: "bg-lime-500", 8: "bg-green-500",
  9: "bg-emerald-500", 10: "bg-emerald-600",
};

const JudgePanel = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasRole, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();

  const [competitions, setCompetitions] = useState<(Competition & { entry_count?: number })[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [entries, setEntries] = useState<JudgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [selectedPhotoKey, setSelectedPhotoKey] = useState<string | null>(null);
  const [scoringEntry, setScoringEntry] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const [availableTags, setAvailableTags] = useState<JudgingTag[]>([]);
  const [rounds, setRounds] = useState<JudgingRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  const [feedbackInput, setFeedbackInput] = useState("");
  const [commentInput, setCommentInput] = useState("");

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
        const { data: tags } = await supabase.from("judging_tags" as any).select("id, label, color, icon, image_url").in("id", tagIds).eq("is_active", true).order("sort_order", { ascending: true });
        setAvailableTags((tags as any as JudgingTag[]) || []);
      } else {
        const { data: tags } = await supabase.from("judging_tags" as any).select("id, label, color, icon, image_url").eq("is_active", true).order("sort_order", { ascending: true });
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
      setSelectedPhotoKey(null);
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
      setLoadingEntries(false);
    };
    fetchEntries();
  }, [selectedCompId, user]);

  // Flatten all photos from all entries into individual grid items
  const allPhotos: FlatPhoto[] = useMemo(() => {
    const photos: FlatPhoto[] = [];
    entries.forEach(entry => {
      entry.photos.forEach((url, idx) => {
        photos.push({ entryId: entry.id, photoUrl: url, photoIndex: idx, entry });
      });
    });
    return photos;
  }, [entries]);

  // Filtered photos based on active filter
  const filteredPhotos = useMemo(() => {
    if (activeFilter === "all") return allPhotos;
    if (activeFilter === "scored") return allPhotos.filter(p => p.entry.my_score !== null);
    if (activeFilter === "unscored") return allPhotos.filter(p => p.entry.my_score === null);
    return allPhotos.filter(p => p.entry.all_tags.some(t => t.tag_id === activeFilter));
  }, [allPhotos, activeFilter]);

  // Selected photo and its entry
  const selectedPhoto = selectedPhotoKey ? filteredPhotos.find(p => `${p.entryId}-${p.photoIndex}` === selectedPhotoKey) : null;
  const selectedEntry = selectedPhoto?.entry || null;

  // Navigate to next/prev photo in the grid
  const currentPhotoIdx = selectedPhotoKey ? filteredPhotos.findIndex(p => `${p.entryId}-${p.photoIndex}` === selectedPhotoKey) : -1;

  const goNext = useCallback(() => {
    if (currentPhotoIdx < filteredPhotos.length - 1) {
      const next = filteredPhotos[currentPhotoIdx + 1];
      setSelectedPhotoKey(`${next.entryId}-${next.photoIndex}`);
    }
  }, [currentPhotoIdx, filteredPhotos]);

  const goPrev = useCallback(() => {
    if (currentPhotoIdx > 0) {
      const prev = filteredPhotos[currentPhotoIdx - 1];
      setSelectedPhotoKey(`${prev.entryId}-${prev.photoIndex}`);
    }
  }, [currentPhotoIdx, filteredPhotos]);

  // Reset feedback when selection changes
  useEffect(() => {
    if (selectedEntry) {
      setFeedbackInput(selectedEntry.my_feedback || "");
      setCommentInput("");
    }
  }, [selectedPhotoKey]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // Score handler - tap a number 1-10
  const handleQuickScore = async (entryId: string, score: number) => {
    if (!user) return;
    setScoringEntry(entryId);
    const existing = entries.find(e => e.id === entryId)?.my_score;
    if (existing !== null) {
      await supabase.from("judge_scores").update({ score, feedback: feedbackInput.trim() || null, updated_at: new Date().toISOString() }).eq("entry_id", entryId).eq("judge_id", user.id);
    } else {
      await supabase.from("judge_scores").insert({ entry_id: entryId, judge_id: user.id, score, feedback: feedbackInput.trim() || null });
    }
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, my_score: score, my_feedback: feedbackInput.trim() || null } : e));
    setScoringEntry(null);
    toast({ title: `Score: ${score}/10 ✓` });
    // Auto-advance to next photo
    setTimeout(() => goNext(), 300);
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

  const addComment = async (entryId: string) => {
    if (!user || !commentInput.trim()) return;
    const { data, error } = await supabase.from("judge_comments" as any).insert({ entry_id: entryId, judge_id: user.id, comment: commentInput.trim(), round_id: selectedRound || null } as any).select("id, comment, created_at, round_id").single();
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }
    setCommentInput("");
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, my_comments: [...e.my_comments, data as any as JudgeComment] } : e));
    toast({ title: "Note saved ✓" });
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
  const totalPhotos = allPhotos.length;
  const scoredEntries = entries.filter(e => e.my_score !== null).length;
  const totalEntries = entries.length;

  // Build filter options
  const filterOptions: { key: string; label: string; color?: string; count: number }[] = [
    { key: "all", label: "All Photos", count: totalPhotos },
    { key: "scored", label: "✅ Scored", count: allPhotos.filter(p => p.entry.my_score !== null).length },
    { key: "unscored", label: "⭕ Unscored", count: allPhotos.filter(p => p.entry.my_score === null).length },
    ...availableTags.map(tag => ({
      key: tag.id,
      label: tag.label,
      color: tag.color,
      count: allPhotos.filter(p => p.entry.all_tags.some(t => t.tag_id === tag.id)).length,
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

        {/* Progress bar */}
        {selectedCompId && totalEntries > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(scoredEntries / totalEntries) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap" style={{ fontFamily: "var(--font-heading)" }}>
              {scoredEntries}/{totalEntries} scored
            </span>
          </div>
        )}

        {/* 3-Column Layout */}
        <div className="flex gap-0 border border-border" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
          {/* ─── LEFT: Competition List ─── */}
          <div className="w-52 shrink-0 border-r border-border flex flex-col bg-muted/20 overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/40">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                Select Competition
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
                    className={`w-full text-left px-3 py-2 border-b border-border/50 transition-all duration-300 group ${
                      selectedCompId === comp.id
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : "hover:bg-muted/40 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Trophy className={`h-3 w-3 shrink-0 ${selectedCompId === comp.id ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-[11px] font-medium truncate ${selectedCompId === comp.id ? "text-primary" : "text-foreground"}`} style={{ fontFamily: "var(--font-heading)" }} title={comp.title}>
                        {comp.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-5">
                      <span className={`text-[8px] tracking-wider uppercase px-1.5 py-0.5 border ${comp.status === "judging" ? "border-yellow-500/50 text-yellow-600 dark:text-yellow-400" : "border-primary/50 text-primary"}`} style={{ fontFamily: "var(--font-heading)" }}>
                        {comp.status}
                      </span>
                      {comp.entry_count !== undefined && (
                        <span className="text-[8px] text-muted-foreground">{comp.entry_count} entries</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Round selector */}
            {selectedCompId && rounds.length > 0 && (
              <div className="border-t border-border px-3 py-2 bg-muted/30">
                <span className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1 mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                  <Layers className="h-2.5 w-2.5" /> Rounds
                </span>
                <div className="space-y-0.5">
                  {rounds.map(round => (
                    <button
                      key={round.id}
                      onClick={() => setSelectedRound(round.id === selectedRound ? null : round.id)}
                      className={`w-full text-left text-[10px] px-2 py-1 border transition-all ${
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

          {/* ─── MIDDLE: All Photos Grid ─── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {!selectedCompId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Trophy className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                    ← Select a competition to start judging
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    All submitted photos will appear here
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
                <div className="px-2 py-1.5 border-b border-border bg-muted/20 overflow-x-auto">
                  <div className="flex items-center gap-1 min-w-max">
                    <Filter className="h-3 w-3 text-muted-foreground shrink-0 mr-1" />
                    {filterOptions.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setActiveFilter(opt.key)}
                        className={`relative inline-flex items-center gap-1 text-[9px] tracking-[0.05em] uppercase px-2 py-1 border transition-all whitespace-nowrap ${
                          activeFilter === opt.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-foreground/40"
                        }`}
                        style={{
                          fontFamily: "var(--font-heading)",
                          ...(opt.color && activeFilter === opt.key ? { borderColor: opt.color, color: opt.color, backgroundColor: `${opt.color}15` } : {}),
                        }}
                      >
                        {opt.color && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color }} />}
                        {opt.label}
                        <span className="text-[7px] opacity-60">{opt.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats bar */}
                <div className="px-3 py-1 border-b border-border/50 bg-background flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    {filteredPhotos.length} photos · {entries.length} participants
                    {activeRound && <> · <span className="text-primary">{activeRound.name}</span></>}
                  </span>
                  <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    Click photo → Score on right →
                  </span>
                </div>

                {/* Photo grid - showing ALL individual photos */}
                <div className="flex-1 overflow-y-auto p-1.5">
                  {filteredPhotos.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs text-muted-foreground">No photos match this filter.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1">
                      {filteredPhotos.map((photo) => {
                        const key = `${photo.entryId}-${photo.photoIndex}`;
                        const isSelected = selectedPhotoKey === key;
                        const hasScore = photo.entry.my_score !== null;
                        const hasTags = photo.entry.my_tags.length > 0;
                        return (
                          <motion.div
                            key={key}
                            layout
                            onClick={() => setSelectedPhotoKey(key)}
                            className={`relative group cursor-pointer aspect-square overflow-hidden border-2 transition-all duration-150 ${
                              isSelected ? "border-primary ring-2 ring-primary/30 scale-[0.95]" : "border-transparent hover:border-primary/40"
                            }`}
                            title={`${photo.entry.title} (Photo ${photo.photoIndex + 1})`}
                          >
                            <img src={photo.photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                            
                            {/* Score badge */}
                            {hasScore && (
                              <div className={`absolute top-0.5 right-0.5 w-5 h-5 rounded-full ${SCORE_COLORS[photo.entry.my_score!] || 'bg-primary'} text-white flex items-center justify-center text-[8px] font-bold shadow-sm`}>
                                {photo.entry.my_score}
                              </div>
                            )}
                            
                            {/* Tag indicator */}
                            {hasTags && (
                              <div className="absolute bottom-0 left-0 right-0 flex gap-0.5 p-0.5 bg-black/50">
                                {photo.entry.my_tags.slice(0, 3).map(tagId => {
                                  const tag = availableTags.find(t => t.id === tagId);
                                  return tag ? (
                                    <span key={tagId} className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} title={tag.label} />
                                  ) : null;
                                })}
                              </div>
                            )}

                            {/* Placement badge */}
                            {photo.entry.placement && photo.photoIndex === 0 && (
                              <div className="absolute top-0.5 left-0.5 text-[10px]">
                                {photo.entry.placement === "winner" ? "🏆" : photo.entry.placement === "1st_runner_up" ? "🥈" : photo.entry.placement === "2nd_runner_up" ? "🥉" : "👁"}
                              </div>
                            )}

                            {/* Hover: title */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                              <p className="text-[7px] text-white truncate w-full" style={{ fontFamily: "var(--font-heading)" }}>
                                {photo.entry.title}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ─── RIGHT: Quick Judge Panel ─── */}
          <AnimatePresence mode="wait">
            {selectedEntry && selectedPhoto && (
              <motion.div
                key={selectedPhotoKey}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="w-80 xl:w-96 shrink-0 border-l border-border overflow-y-auto bg-background"
              >
                {/* Photographer info header */}
                <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-display)" }}>
                      {selectedEntry.title}
                    </h3>
                    <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                      by {selectedEntry.photographer_name || "Anonymous"} · Photo {(selectedPhoto.photoIndex + 1)}/{selectedEntry.photos.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={goPrev} disabled={currentPhotoIdx <= 0} className="p-1 hover:bg-muted rounded disabled:opacity-30 transition-colors">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-[9px] text-muted-foreground w-12 text-center" style={{ fontFamily: "var(--font-heading)" }}>
                      {currentPhotoIdx + 1}/{filteredPhotos.length}
                    </span>
                    <button onClick={goNext} disabled={currentPhotoIdx >= filteredPhotos.length - 1} className="p-1 hover:bg-muted rounded disabled:opacity-30 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Large photo preview */}
                <div className="relative bg-black/95">
                  <img src={selectedPhoto.photoUrl} alt={selectedEntry.title} className="w-full aspect-[4/3] object-contain" />
                  {/* AI warning overlay */}
                  {selectedEntry.is_ai_generated && (
                    <div className="absolute top-2 left-2 text-[9px] px-2 py-1 bg-orange-500/90 text-white flex items-center gap-1 rounded-sm">
                      <AlertTriangle className="h-3 w-3" /> AI Detected
                    </div>
                  )}
                </div>

                {/* Stats & quick info */}
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border text-[10px]" style={{ fontFamily: "var(--font-heading)" }}>
                  <span className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-3 w-3" />
                    {selectedEntry.my_score !== null ? `${selectedEntry.my_score}/10` : "Not scored"}
                  </span>
                  {selectedEntry.avg_score !== null && (
                    <span className="text-muted-foreground">Avg: {selectedEntry.avg_score.toFixed(1)}</span>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-3 w-3" /> {selectedEntry.vote_count} votes
                  </span>
                </div>

                {/* ★ BIG SCORE BUTTONS - Tap to score ★ */}
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1 mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                    <Zap className="h-3 w-3" /> Tap to Score
                  </span>
                  <div className="grid grid-cols-10 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                      const isActive = selectedEntry.my_score === n;
                      return (
                        <button
                          key={n}
                          onClick={() => handleQuickScore(selectedEntry.id, n)}
                          disabled={scoringEntry === selectedEntry.id}
                          className={`aspect-square flex items-center justify-center text-sm font-bold rounded transition-all duration-200 ${
                            isActive
                              ? `${SCORE_COLORS[n]} text-white scale-110 ring-2 ring-offset-1 ring-current shadow-lg`
                              : "bg-muted hover:bg-muted/80 text-foreground hover:scale-105"
                          } disabled:opacity-50`}
                          style={{ fontFamily: "var(--font-heading)" }}
                          title={`Score ${n}`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Optional feedback..."
                    className="w-full mt-1.5 bg-transparent border border-border focus:border-primary outline-none px-2 py-1 text-[11px] transition-colors"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>

                {/* Tags - one-tap toggle */}
                {availableTags.length > 0 && (
                  <div className="px-3 py-2 border-b border-border">
                    <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1 mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                      <Tag className="h-3 w-3" /> Tag (stamps shown to photographer)
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {availableTags.map(tag => {
                        const isActive = selectedEntry.my_tags.includes(tag.id);
                        const totalCount = selectedEntry.all_tags.filter(t => t.tag_id === tag.id).length;
                        return (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(selectedEntry.id, tag.id)}
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 border transition-all duration-200 ${
                              isActive ? "ring-1 ring-offset-1" : "border-border/60 text-muted-foreground hover:border-foreground/40"
                            }`}
                            style={{
                              fontFamily: "var(--font-heading)",
                              ...(isActive ? { color: tag.color, borderColor: tag.color, backgroundColor: `${tag.color}15` } : {}),
                            }}
                            title={`${isActive ? "Remove" : "Add"} "${tag.label}" tag`}
                          >
                            {tag.image_url ? (
                              <img src={tag.image_url} alt="" className="h-3.5 w-auto object-contain" />
                            ) : (
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                            )}
                            {tag.label}
                            {isActive && <CheckCircle className="h-3 w-3" />}
                            {totalCount > 0 && <span className="text-[7px] opacity-50">({totalCount})</span>}
                          </button>
                        );
                      })}
                    </div>
                    {/* Show active stamps preview */}
                    {selectedEntry.my_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-border/30">
                        <span className="text-[8px] text-muted-foreground mr-1">Stamps:</span>
                        {selectedEntry.my_tags.map(tagId => {
                          const tag = availableTags.find(t => t.id === tagId);
                          return tag ? (
                            <JudgingStampBadge key={tagId} label={tag.label} color={tag.color} icon={tag.icon || "award"} imageUrl={tag.image_url} size="sm" />
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Placement (admin only) */}
                {isAdmin && (
                  <div className="px-3 py-2 border-b border-border">
                    <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1 block" style={{ fontFamily: "var(--font-heading)" }}>
                      Placement
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {PLACEMENTS.map(p => {
                        const isActive = selectedEntry.placement === p.value;
                        return (
                          <button
                            key={p.value}
                            onClick={() => handlePlacement(selectedEntry.id, p.value)}
                            className={`text-[9px] uppercase px-2 py-1 border transition-all ${
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
                )}

                {/* EXIF data (collapsed) */}
                {selectedEntry.exif_data && (
                  <div className="px-3 py-2 border-b border-border">
                    <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground flex items-center gap-1 mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                      <Camera className="h-2.5 w-2.5" /> EXIF
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[9px]" style={{ fontFamily: "var(--font-body)" }}>
                      {selectedEntry.exif_data.camera_model && <div><span className="text-muted-foreground">Camera:</span> {selectedEntry.exif_data.camera_model}</div>}
                      {selectedEntry.exif_data.lens && <div><span className="text-muted-foreground">Lens:</span> {selectedEntry.exif_data.lens}</div>}
                      {selectedEntry.exif_data.aperture && <div><span className="text-muted-foreground">f/</span>{selectedEntry.exif_data.aperture}</div>}
                      {selectedEntry.exif_data.iso && <div><span className="text-muted-foreground">ISO</span> {selectedEntry.exif_data.iso}</div>}
                    </div>
                  </div>
                )}

                {/* Private notes */}
                <div className="px-3 py-2">
                  <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground flex items-center gap-1 mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                    <MessageSquare className="h-2.5 w-2.5" /> Private Notes
                  </span>
                  {selectedEntry.my_comments.length > 0 && (
                    <div className="space-y-1 mb-1.5 max-h-[120px] overflow-y-auto">
                      {selectedEntry.my_comments.map(c => {
                        const roundName = rounds.find(r => r.id === c.round_id)?.name;
                        return (
                          <div key={c.id} className="text-[10px] px-2 py-1 border border-border/50 bg-muted/20" style={{ fontFamily: "var(--font-body)" }}>
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
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      placeholder="Add note..."
                      className="flex-1 bg-transparent border border-border focus:border-primary outline-none px-2 py-1 text-xs transition-colors"
                      style={{ fontFamily: "var(--font-body)" }}
                      maxLength={500}
                      onKeyDown={e => e.key === "Enter" && addComment(selectedEntry.id)}
                    />
                    <button
                      onClick={() => addComment(selectedEntry.id)}
                      disabled={!commentInput.trim()}
                      className="px-2 py-1 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty right panel state */}
          {!selectedEntry && selectedCompId && !loadingEntries && entries.length > 0 && (
            <div className="w-80 xl:w-96 shrink-0 border-l border-border flex items-center justify-center bg-muted/10">
              <div className="text-center p-6">
                <Camera className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  Click any photo to start judging
                </p>
                <p className="text-[9px] text-muted-foreground/60 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                  Use arrow keys ← → to navigate
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default JudgePanel;
