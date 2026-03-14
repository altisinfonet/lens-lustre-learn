import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Trophy, Eye, MessageSquare, Loader2, AlertTriangle, Camera, Tag, Layers, Send, ChevronRight, ChevronLeft, CheckCircle, Zap, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Keyboard } from "lucide-react";
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
  const [fullscreen, setFullscreen] = useState(false);

  const [availableTags, setAvailableTags] = useState<JudgingTag[]>([]);
  const [rounds, setRounds] = useState<JudgingRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  const [feedbackInput, setFeedbackInput] = useState("");
  const [commentInput, setCommentInput] = useState("");

  // Zoom & Pan for fullscreen
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showShortcuts, setShowShortcuts] = useState(false);

  const isJudge = hasRole("judge") || hasRole("admin");
  const isAdmin = hasRole("admin");

  useEffect(() => {
    if (!authLoading && !rolesLoading && !isJudge) navigate("/");
  }, [isJudge, authLoading, rolesLoading, navigate]);

  // Reset zoom on photo change
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedPhotoKey]);

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
      const fetchedRounds = (roundsData as any as JudgingRound[]) || [];
      setRounds(fetchedRounds);
      // Auto-select the active round, or first round if none active
      const active = fetchedRounds.find(r => r.status === "active");
      if (active) setSelectedRound(active.id);
      else if (fetchedRounds.length > 0) setSelectedRound(fetchedRounds[0].id);
      else setSelectedRound(null);
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

  // Flatten all photos
  const allPhotos: FlatPhoto[] = useMemo(() => {
    const photos: FlatPhoto[] = [];
    entries.forEach(entry => {
      entry.photos.forEach((url, idx) => {
        photos.push({ entryId: entry.id, photoUrl: url, photoIndex: idx, entry });
      });
    });
    return photos;
  }, [entries]);

  const filteredPhotos = useMemo(() => {
    if (activeFilter === "all") return allPhotos;
    if (activeFilter === "scored") return allPhotos.filter(p => p.entry.my_score !== null);
    if (activeFilter === "unscored") return allPhotos.filter(p => p.entry.my_score === null);
    return allPhotos.filter(p => p.entry.all_tags.some(t => t.tag_id === activeFilter));
  }, [allPhotos, activeFilter]);

  const selectedPhoto = selectedPhotoKey ? filteredPhotos.find(p => `${p.entryId}-${p.photoIndex}` === selectedPhotoKey) : null;
  const selectedEntry = selectedPhoto?.entry || null;
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
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else if (selectedPhotoKey) setSelectedPhotoKey(null);
      }
      // Number keys 1-9 for quick score, 0 for 10
      if (selectedEntry && !fullscreen) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) { e.preventDefault(); handleQuickScore(selectedEntry.id, num); }
        if (e.key === "0") { e.preventDefault(); handleQuickScore(selectedEntry.id, 10); }
      }
      // Zoom shortcuts in fullscreen
      if (fullscreen) {
        if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(z => Math.min(5, z + 0.5)); }
        if (e.key === "-") { e.preventDefault(); setZoom(z => Math.max(0.5, z - 0.5)); }
        if (e.key === "r" || e.key === "R") { e.preventDefault(); setZoom(1); setPan({ x: 0, y: 0 }); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, fullscreen, selectedEntry, selectedPhotoKey]);

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
    setTimeout(() => goNext(), 300);
  };

  // BUG FIX: Only ONE tag per entry per judge. Last marked tag is final.
  // When toggling a tag: if it's the same tag, remove it. If different, remove all previous and set new one.
  const toggleTag = async (entryId: string, tagId: string) => {
    if (!user) return;
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    const hasTag = entry.my_tags.includes(tagId);

    if (hasTag) {
      // Remove this tag (untoggle)
      await supabase.from("judge_tag_assignments" as any).delete().eq("entry_id", entryId).eq("tag_id", tagId).eq("judge_id", user.id);
      setEntries(prev => prev.map(e => e.id === entryId ? {
        ...e,
        my_tags: [],
        all_tags: e.all_tags.filter(t => !(t.tag_id === tagId && t.judge_id === user!.id)),
      } : e));
    } else {
      // Remove ALL previous tags for this entry by this judge, then insert new one
      if (entry.my_tags.length > 0) {
        await supabase.from("judge_tag_assignments" as any).delete().eq("entry_id", entryId).eq("judge_id", user.id);
      }
      const { error } = await supabase.from("judge_tag_assignments" as any).insert({ entry_id: entryId, tag_id: tagId, judge_id: user.id } as any);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
      setEntries(prev => prev.map(e => e.id === entryId ? {
        ...e,
        my_tags: [tagId],
        all_tags: [
          ...e.all_tags.filter(t => t.judge_id !== user!.id),
          { tag_id: tagId, judge_id: user!.id },
        ],
      } : e));
      const tagLabel = availableTags.find(t => t.id === tagId)?.label;
      toast({ title: `Tagged: ${tagLabel} ✓` });
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

  // Zoom handlers for fullscreen
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    setZoom(z => Math.max(0.5, Math.min(5, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

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

  const filterOptions: { key: string; label: string; color?: string; count: number; icon?: string }[] = [
    { key: "all", label: "All Photos", count: totalPhotos, icon: "📸" },
    { key: "scored", label: "Scored", count: allPhotos.filter(p => p.entry.my_score !== null).length, icon: "✅" },
    { key: "unscored", label: "Pending", count: allPhotos.filter(p => p.entry.my_score === null).length, icon: "⏳" },
    ...availableTags.map(tag => ({
      key: tag.id,
      label: tag.label,
      color: tag.color,
      count: allPhotos.filter(p => p.entry.all_tags.some(t => t.tag_id === tag.id)).length,
    })),
  ];

  // ── FULLSCREEN BIG PREVIEW MODE with ZOOM ──
  if (fullscreen && selectedEntry && selectedPhoto) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setFullscreen(false)} className="text-white/70 hover:text-white transition-colors p-1">
              <Minimize2 className="h-5 w-5" />
            </button>
            <div>
              <h3 className="text-sm text-white font-medium" style={{ fontFamily: "var(--font-display)" }}>{selectedEntry.title}</h3>
              <p className="text-[11px] text-white/50">by {selectedEntry.photographer_name || "Anonymous"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedEntry.is_ai_generated && (
              <span className="text-[10px] px-2 py-1 bg-orange-500/80 text-white rounded-full flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> AI
              </span>
            )}
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} className="p-1 text-white/70 hover:text-white">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] text-white/70 w-12 text-center tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={() => setZoom(z => Math.min(5, z + 0.5))} className="p-1 text-white/70 hover:text-white">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1 text-white/70 hover:text-white ml-0.5">
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
            <span className="text-sm text-white/60 tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>
              {currentPhotoIdx + 1} / {filteredPhotos.length}
            </span>
            <button onClick={() => setShowShortcuts(!showShortcuts)} className="p-1 text-white/50 hover:text-white">
              <Keyboard className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Shortcuts overlay */}
        {showShortcuts && (
          <div className="absolute top-14 right-4 z-50 bg-black/95 border border-white/20 rounded-lg p-4 text-white/80 text-[11px] space-y-1" style={{ fontFamily: "var(--font-heading)" }}>
            <p className="text-white font-bold mb-2 text-xs">Keyboard Shortcuts</p>
            <p><span className="text-white/50 mr-2">← →</span> Previous / Next photo</p>
            <p><span className="text-white/50 mr-2">1-9, 0</span> Score 1-10</p>
            <p><span className="text-white/50 mr-2">+ / -</span> Zoom in / out</p>
            <p><span className="text-white/50 mr-2">R</span> Reset zoom</p>
            <p><span className="text-white/50 mr-2">ESC</span> Exit fullscreen</p>
          </div>
        )}

        {/* Big image with zoom & pan */}
        <div
          className="flex-1 relative overflow-hidden"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          {/* Nav arrows */}
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            disabled={currentPhotoIdx <= 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white/10 hover:bg-white/25 disabled:opacity-10 flex items-center justify-center text-white transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          <AnimatePresence mode="wait">
            <motion.img
              key={selectedPhotoKey}
              src={selectedPhoto.photoUrl}
              alt={selectedEntry.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="absolute top-1/2 left-1/2 max-w-[90vw] max-h-[80vh] object-contain"
              style={{
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: isDragging ? "none" : "transform 0.15s ease-out",
              }}
              draggable={false}
            />
          </AnimatePresence>

          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            disabled={currentPhotoIdx >= filteredPhotos.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white/10 hover:bg-white/25 disabled:opacity-10 flex items-center justify-center text-white transition-all backdrop-blur-sm"
          >
            <ChevronRight className="h-7 w-7" />
          </button>

          {/* Current tag stamp on image */}
          {selectedEntry.my_tags.length > 0 && zoom <= 1 && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-t from-black/80 to-transparent z-10">
              {selectedEntry.my_tags.map(tagId => {
                const tag = availableTags.find(t => t.id === tagId);
                return tag ? <JudgingStampBadge key={tagId} label={tag.label} color={tag.color} icon={tag.icon || "award"} imageUrl={tag.image_url} size="md" /> : null;
              })}
            </div>
          )}

          {/* Zoom indicator */}
          {zoom > 1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-black/70 text-white/80 text-[10px] px-3 py-1 rounded-full backdrop-blur-sm" style={{ fontFamily: "var(--font-heading)" }}>
              {Math.round(zoom * 100)}% — scroll to zoom, drag to pan
            </div>
          )}
        </div>

        {/* Bottom: Score + Tag bar */}
        <div className="bg-black/90 border-t border-white/10 px-4 py-3 shrink-0">
          <div className="max-w-4xl mx-auto">
            {/* Score buttons - LARGE for easy tapping */}
            <div className="flex items-center justify-center gap-2.5 mb-2.5">
              <span className="text-[10px] text-white/40 uppercase tracking-widest mr-2" style={{ fontFamily: "var(--font-heading)" }}>Score</span>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                const isActive = selectedEntry.my_score === n;
                return (
                  <button
                    key={n}
                    onClick={() => handleQuickScore(selectedEntry.id, n)}
                    disabled={scoringEntry === selectedEntry.id}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-200 ${
                      isActive
                        ? `${SCORE_COLORS[n]} text-white scale-110 ring-2 ring-white/50 shadow-lg shadow-white/10`
                        : "bg-white/10 text-white/70 hover:bg-white/25 hover:text-white hover:scale-105"
                    } disabled:opacity-40`}
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {/* Tags row - single selection with visual indicator */}
            {availableTags.length > 0 && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-[9px] text-white/30 uppercase tracking-widest mr-1" style={{ fontFamily: "var(--font-heading)" }}>Tag</span>
                {availableTags.map(tag => {
                  const isActive = selectedEntry.my_tags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(selectedEntry.id, tag.id)}
                      className={`inline-flex items-center gap-1.5 text-[11px] px-4 py-2 rounded-xl border-2 transition-all duration-200 ${
                        isActive ? "ring-1 ring-white/30 text-white scale-105 shadow-lg" : "border-white/15 text-white/50 hover:text-white/80 hover:border-white/30 hover:scale-105"
                      }`}
                      style={{
                        fontFamily: "var(--font-heading)",
                        ...(isActive ? { borderColor: tag.color, backgroundColor: `${tag.color}35`, color: "#fff" } : {}),
                      }}
                    >
                      {tag.image_url ? (
                        <img src={tag.image_url} alt="" className="h-4 w-auto" />
                      ) : (
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      )}
                      {tag.label}
                      {isActive && <CheckCircle className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN 3-COLUMN LAYOUT ──
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

        {/* Progress bar with round info */}
        {selectedCompId && totalEntries > 0 && (
          <div className="mb-3 flex items-center gap-3">
            {activeRound && (
              <span className="shrink-0 text-[10px] px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary font-semibold flex items-center gap-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {activeRound.name}
              </span>
            )}
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${(scoredEntries / totalEntries) * 100}%` }} transition={{ duration: 0.5 }} />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap font-medium" style={{ fontFamily: "var(--font-heading)" }}>
              ✅ {scoredEntries} / {totalEntries} scored ({totalEntries > 0 ? Math.round((scoredEntries / totalEntries) * 100) : 0}%)
            </span>
          </div>
        )}

        {/* 3-Column Layout */}
        <div className="flex gap-0 border border-border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
          {/* ─── LEFT: Competition List ─── */}
          <div className="w-56 shrink-0 border-r border-border flex flex-col bg-muted/20 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-muted/40">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                🏆 Competitions
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {competitions.length === 0 ? (
                <p className="text-[10px] text-muted-foreground p-3" style={{ fontFamily: "var(--font-body)" }}>No competitions assigned.</p>
              ) : (
                competitions.map(comp => (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedCompId(comp.id === selectedCompId ? null : comp.id)}
                    className={`w-full text-left px-3 py-3 border-b border-border/50 transition-all duration-300 group ${
                      selectedCompId === comp.id ? "bg-primary/10 border-l-3 border-l-primary" : "hover:bg-muted/40 border-l-3 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className={`h-3.5 w-3.5 shrink-0 ${selectedCompId === comp.id ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-[11px] font-medium truncate ${selectedCompId === comp.id ? "text-primary" : "text-foreground"}`} style={{ fontFamily: "var(--font-heading)" }} title={comp.title}>
                        {comp.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-5">
                      <span className={`text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded-full border ${comp.status === "judging" ? "border-yellow-500/50 text-yellow-600 dark:text-yellow-400" : "border-primary/50 text-primary"}`} style={{ fontFamily: "var(--font-heading)" }}>
                        {comp.status}
                      </span>
                      {comp.entry_count !== undefined && (
                        <span className="text-[9px] text-muted-foreground font-medium">{comp.entry_count} entries</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

          </div>

          {/* ─── MIDDLE: Big Preview + Thumbnails ─── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {!selectedCompId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground/15 mx-auto mb-4" />
                  <p className="text-base text-muted-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>Select a Competition</p>
                  <p className="text-xs text-muted-foreground/60" style={{ fontFamily: "var(--font-body)" }}>← Choose from the left panel to start judging</p>
                </div>
              </div>
            ) : loadingEntries ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* ── ROUND SELECTOR BANNER ── */}
                {rounds.length > 0 && (
                  <div className="px-3 py-2.5 border-b border-border bg-primary/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                          Judging Round
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                        {rounds.map(round => {
                          const isActive = selectedRound === round.id;
                          const isRoundActive = round.status === "active";
                          const isCompleted = round.status === "completed";
                          return (
                            <button
                              key={round.id}
                              onClick={() => setSelectedRound(round.id)}
                              className={`relative inline-flex items-center gap-1.5 text-[11px] font-medium px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 border-2 ${
                                isActive
                                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                  : isCompleted
                                  ? "bg-muted/40 text-muted-foreground border-muted-foreground/20 opacity-60"
                                  : "bg-background text-foreground border-border hover:border-primary/50 hover:scale-105"
                              }`}
                              style={{ fontFamily: "var(--font-heading)" }}
                            >
                              {isRoundActive && !isActive && (
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                              )}
                              {isCompleted && <CheckCircle className="h-3 w-3 shrink-0" />}
                              R{round.round_number}: {round.name}
                              {isRoundActive && (
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/25" : "bg-green-500/15 text-green-600 dark:text-green-400"}`}>
                                  LIVE
                                </span>
                              )}
                              {isCompleted && (
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/25" : "bg-muted-foreground/10"}`}>
                                  DONE
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Active round info */}
                    {selectedRound && (
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground ml-6" style={{ fontFamily: "var(--font-body)" }}>
                        {(() => {
                          const r = rounds.find(r => r.id === selectedRound);
                          if (!r) return null;
                          return (
                            <>
                              <span>You are scoring for <strong className="text-foreground">{r.name}</strong></span>
                              <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border ${
                                r.status === "active" ? "border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/5" :
                                r.status === "completed" ? "border-muted-foreground/30 text-muted-foreground bg-muted/30" :
                                "border-yellow-500/40 text-yellow-600 dark:text-yellow-400 bg-yellow-500/5"
                              }`} style={{ fontFamily: "var(--font-heading)" }}>
                                {r.status === "active" ? "🟢" : r.status === "completed" ? "✅" : "⏳"} {r.status}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* No rounds warning for admin */}
                {rounds.length === 0 && isAdmin && (
                  <div className="px-3 py-2 border-b border-border bg-yellow-500/5 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                    <span className="text-[10px] text-yellow-600 dark:text-yellow-400" style={{ fontFamily: "var(--font-body)" }}>
                      No judging rounds created. Go to <strong>Admin → Competitions</strong> to add rounds for this competition.
                    </span>
                  </div>
                )}

                {/* ── Modern Filter Pills ── */}
                <div className="px-3 py-2.5 border-b border-border bg-muted/10">
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
                    {filterOptions.map(opt => {
                      const isActive = activeFilter === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setActiveFilter(opt.key)}
                          className={`relative inline-flex items-center gap-1.5 text-[11px] font-medium px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md scale-105"
                              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                          style={{
                            fontFamily: "var(--font-heading)",
                            ...(opt.color && isActive ? { backgroundColor: opt.color, color: "#fff" } : {}),
                          }}
                        >
                          {opt.icon && <span className="text-sm">{opt.icon}</span>}
                          {opt.color && !opt.icon && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: isActive ? "#fff" : opt.color }} />}
                          {opt.label}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ml-0.5 ${isActive ? "bg-white/25" : "bg-muted-foreground/10"}`}>
                            {opt.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── BIG PREVIEW AREA ── */}
                {selectedEntry && selectedPhoto ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Preview header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-display)" }}>{selectedEntry.title}</h3>
                          <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                            by {selectedEntry.photographer_name || "Anonymous"} · Photo {selectedPhoto.photoIndex + 1}/{selectedEntry.photos.length}
                            {selectedEntry.my_score !== null && <> · Score: <span className="text-primary font-bold">{selectedEntry.my_score}/10</span></>}
                          </p>
                        </div>
                        {selectedEntry.is_ai_generated && (
                          <span className="shrink-0 text-[9px] px-2 py-0.5 bg-orange-500/15 text-orange-500 rounded-full flex items-center gap-1 border border-orange-500/30">
                            <AlertTriangle className="h-3 w-3" /> AI
                          </span>
                        )}
                        {/* Active tag badge */}
                        {selectedEntry.my_tags.length > 0 && (
                          <div className="shrink-0 flex gap-1">
                            {selectedEntry.my_tags.map(tagId => {
                              const tag = availableTags.find(t => t.id === tagId);
                              return tag ? <JudgingStampBadge key={tagId} label={tag.label} color={tag.color} icon={tag.icon || "award"} imageUrl={tag.image_url} size="sm" /> : null;
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={goPrev} disabled={currentPhotoIdx <= 0} className="p-1.5 hover:bg-muted rounded-full disabled:opacity-20 transition-colors">
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-[11px] text-muted-foreground tabular-nums w-16 text-center" style={{ fontFamily: "var(--font-heading)" }}>
                          {currentPhotoIdx + 1} / {filteredPhotos.length}
                        </span>
                        <button onClick={goNext} disabled={currentPhotoIdx >= filteredPhotos.length - 1} className="p-1.5 hover:bg-muted rounded-full disabled:opacity-20 transition-colors">
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <button onClick={() => setFullscreen(true)} className="p-1.5 hover:bg-muted rounded-full transition-colors ml-1" title="Fullscreen (zoom up to 500%)">
                          <Maximize2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Big image */}
                    <div className="flex-1 bg-black/95 relative flex items-center justify-center overflow-hidden min-h-0">
                      <button
                        onClick={goPrev}
                        disabled={currentPhotoIdx <= 0}
                        className="absolute left-3 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-10 flex items-center justify-center text-white transition-all"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      <AnimatePresence mode="wait">
                        <motion.img
                          key={selectedPhotoKey}
                          src={selectedPhoto.photoUrl}
                          alt={selectedEntry.title}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="max-w-full max-h-full object-contain cursor-pointer"
                          onClick={() => setFullscreen(true)}
                        />
                      </AnimatePresence>

                      <button
                        onClick={goNext}
                        disabled={currentPhotoIdx >= filteredPhotos.length - 1}
                        className="absolute right-3 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-10 flex items-center justify-center text-white transition-all"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      {/* Tag stamp overlay */}
                      {selectedEntry.my_tags.length > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                          {selectedEntry.my_tags.map(tagId => {
                            const tag = availableTags.find(t => t.id === tagId);
                            return tag ? <JudgingStampBadge key={tagId} label={tag.label} color={tag.color} icon={tag.icon || "award"} imageUrl={tag.image_url} size="sm" /> : null;
                          })}
                        </div>
                      )}

                      {/* Click to fullscreen hint */}
                      <div className="absolute bottom-2 right-3 text-[9px] text-white/30 flex items-center gap-1" style={{ fontFamily: "var(--font-heading)" }}>
                        <Maximize2 className="h-3 w-3" /> Click image for 500% zoom
                      </div>
                    </div>

                    {/* Thumbnail filmstrip at bottom */}
                    <div className="h-20 border-t border-border bg-muted/20 overflow-x-auto flex items-center gap-0.5 px-2 py-1.5 scrollbar-hide">
                      {filteredPhotos.map((photo, i) => {
                        const key = `${photo.entryId}-${photo.photoIndex}`;
                        const isCurrent = selectedPhotoKey === key;
                        const hasScore = photo.entry.my_score !== null;
                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedPhotoKey(key)}
                            className={`relative shrink-0 w-14 h-14 cursor-pointer overflow-hidden rounded transition-all duration-150 ${
                              isCurrent ? "ring-2 ring-primary scale-110" : "opacity-50 hover:opacity-100 hover:ring-1 hover:ring-primary/40"
                            }`}
                          >
                            <img src={photo.photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                            {hasScore && (
                              <div className={`absolute top-0 right-0 w-4 h-4 rounded-bl text-[7px] font-bold text-white flex items-center justify-center ${SCORE_COLORS[photo.entry.my_score!] || 'bg-primary'}`}>
                                {photo.entry.my_score}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* No photo selected — show grid */
                  <div className="flex-1 overflow-y-auto p-3">
                    {filteredPhotos.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Camera className="h-10 w-10 text-muted-foreground/15 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">No photos match this filter.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground mb-3 px-1" style={{ fontFamily: "var(--font-heading)" }}>
                          📸 {filteredPhotos.length} photos · Click any photo to start judging · Use number keys <span className="px-1 py-0.5 bg-muted rounded text-[9px]">1-9</span> to score
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5">
                          {filteredPhotos.map((photo) => {
                            const key = `${photo.entryId}-${photo.photoIndex}`;
                            const hasScore = photo.entry.my_score !== null;
                            const hasTags = photo.entry.my_tags.length > 0;
                            return (
                              <div
                                key={key}
                                onClick={() => setSelectedPhotoKey(key)}
                                className="relative group cursor-pointer aspect-square overflow-hidden rounded-lg border-2 border-transparent hover:border-primary/50 transition-all duration-200 hover:scale-[1.03] hover:shadow-lg"
                                title={`${photo.entry.title} by ${photo.entry.photographer_name || "Anonymous"}`}
                              >
                                <img src={photo.photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                                {hasScore && (
                                  <div className={`absolute top-1 right-1 w-6 h-6 rounded-full ${SCORE_COLORS[photo.entry.my_score!] || 'bg-primary'} text-white flex items-center justify-center text-[9px] font-bold shadow-md`}>
                                    {photo.entry.my_score}
                                  </div>
                                )}
                                {hasTags && (
                                  <div className="absolute bottom-0 left-0 right-0 flex gap-0.5 p-1 bg-gradient-to-t from-black/60 to-transparent">
                                    {photo.entry.my_tags.map(tagId => {
                                      const tag = availableTags.find(t => t.id === tagId);
                                      return tag ? <span key={tagId} className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: tag.color }} title={tag.label} /> : null;
                                    })}
                                  </div>
                                )}
                                {photo.entry.placement && photo.photoIndex === 0 && (
                                  <div className="absolute top-1 left-1 text-sm drop-shadow-lg">
                                    {photo.entry.placement === "winner" ? "🏆" : photo.entry.placement === "1st_runner_up" ? "🥈" : photo.entry.placement === "2nd_runner_up" ? "🥉" : "👁"}
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                                  <p className="text-[8px] text-white truncate w-full" style={{ fontFamily: "var(--font-heading)" }}>{photo.entry.title}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ─── RIGHT: Scoring Panel (when photo selected) ─── */}
          <AnimatePresence mode="wait">
            {selectedEntry && selectedPhoto && (
              <motion.div
                key={selectedPhotoKey}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.12 }}
                className="w-72 xl:w-80 shrink-0 border-l border-border overflow-y-auto bg-background"
              >
                {/* ★ BIG SCORE BUTTONS ★ */}
                <div className="px-3 py-3 border-b border-border">
                  <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1 mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                    <Zap className="h-3 w-3" /> Tap to Score (auto-advances)
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                      const isActive = selectedEntry.my_score === n;
                      return (
                        <button
                          key={n}
                          onClick={() => handleQuickScore(selectedEntry.id, n)}
                          disabled={scoringEntry === selectedEntry.id}
                          className={`aspect-square flex items-center justify-center text-lg font-bold rounded-xl transition-all duration-200 ${
                            isActive
                              ? `${SCORE_COLORS[n]} text-white scale-105 ring-2 ring-offset-1 ring-offset-background ring-current shadow-lg`
                              : "bg-muted hover:bg-muted/80 text-foreground hover:scale-105"
                          } disabled:opacity-40`}
                          style={{ fontFamily: "var(--font-heading)" }}
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
                    className="w-full mt-2 bg-transparent border border-border focus:border-primary outline-none px-2 py-1.5 text-xs rounded-lg transition-colors"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 px-3 py-2 border-b border-border text-[10px]" style={{ fontFamily: "var(--font-heading)" }}>
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

                {/* Tags - Single selection mode */}
                {availableTags.length > 0 && (
                  <div className="px-3 py-2.5 border-b border-border">
                    <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1 mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                      <Tag className="h-3 w-3" /> Tag (select one)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map(tag => {
                        const isActive = selectedEntry.my_tags.includes(tag.id);
                        const totalCount = selectedEntry.all_tags.filter(t => t.tag_id === tag.id).length;
                        return (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(selectedEntry.id, tag.id)}
                            className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border-2 transition-all duration-200 ${
                              isActive ? "ring-1 ring-offset-1 shadow-md scale-105" : "border-border/60 text-muted-foreground hover:border-foreground/40 hover:scale-105"
                            }`}
                            style={{
                              fontFamily: "var(--font-heading)",
                              ...(isActive ? { color: tag.color, borderColor: tag.color, backgroundColor: `${tag.color}15` } : {}),
                            }}
                          >
                            {tag.image_url ? (
                              <img src={tag.image_url} alt="" className="h-4 w-auto object-contain" />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                            )}
                            {tag.label}
                            {isActive && <CheckCircle className="h-3.5 w-3.5" />}
                            {totalCount > 0 && <span className="text-[7px] opacity-50">({totalCount})</span>}
                          </button>
                        );
                      })}
                    </div>
                    {/* Active stamp preview */}
                    {selectedEntry.my_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/30">
                        <span className="text-[8px] text-muted-foreground mr-1">Stamp on photo:</span>
                        {selectedEntry.my_tags.map(tagId => {
                          const tag = availableTags.find(t => t.id === tagId);
                          return tag ? <JudgingStampBadge key={tagId} label={tag.label} color={tag.color} icon={tag.icon || "award"} imageUrl={tag.image_url} size="sm" /> : null;
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Placement (admin) */}
                {isAdmin && (
                  <div className="px-3 py-2 border-b border-border">
                    <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1 block" style={{ fontFamily: "var(--font-heading)" }}>Placement</span>
                    <div className="flex flex-wrap gap-1">
                      {PLACEMENTS.map(p => {
                        const isActive = selectedEntry.placement === p.value;
                        return (
                          <button
                            key={p.value}
                            onClick={() => handlePlacement(selectedEntry.id, p.value)}
                            className={`text-[9px] uppercase px-2 py-1 rounded-full border transition-all ${
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

                {/* EXIF */}
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

                {/* Notes */}
                <div className="px-3 py-2">
                  <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground flex items-center gap-1 mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                    <MessageSquare className="h-2.5 w-2.5" /> Private Notes
                  </span>
                  {selectedEntry.my_comments.length > 0 && (
                    <div className="space-y-1 mb-1.5 max-h-[100px] overflow-y-auto">
                      {selectedEntry.my_comments.map(c => {
                        const roundName = rounds.find(r => r.id === c.round_id)?.name;
                        return (
                          <div key={c.id} className="text-[10px] px-2 py-1 border border-border/50 bg-muted/20 rounded-lg" style={{ fontFamily: "var(--font-body)" }}>
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
                      className="flex-1 bg-transparent border border-border focus:border-primary outline-none px-2 py-1 text-xs rounded-lg transition-colors"
                      style={{ fontFamily: "var(--font-body)" }}
                      maxLength={500}
                      onKeyDown={e => e.key === "Enter" && addComment(selectedEntry.id)}
                    />
                    <button onClick={() => addComment(selectedEntry.id)} disabled={!commentInput.trim()} className="px-2 py-1 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
                      <Send className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty right panel */}
          {!selectedEntry && selectedCompId && !loadingEntries && entries.length > 0 && (
            <div className="w-72 xl:w-80 shrink-0 border-l border-border flex items-center justify-center bg-muted/10">
              <div className="text-center p-6">
                <Camera className="h-10 w-10 text-muted-foreground/15 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>Click any photo</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5 space-y-1" style={{ fontFamily: "var(--font-heading)" }}>
                  <span className="block">← → Arrow keys to navigate</span>
                  <span className="block">1-9, 0 = Score 1-10</span>
                  <span className="block">ESC = Back to grid</span>
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
