import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, ThumbsUp, Heart, Vote, Plus, Minus, Loader2, Image as ImageIcon, Eye } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
}

interface ImageItem {
  id: string;
  title: string;
  image_url: string;
  type: "portfolio" | "competition_entry";
  owner_name: string | null;
  reactions: { like: number; love: number; vote: number };
}

const REACTION_TYPES = [
  { type: "like", icon: ThumbsUp, label: "Likes", color: "text-primary" },
  { type: "love", icon: Heart, label: "Loves", color: "text-destructive" },
  { type: "vote", icon: Vote, label: "Votes", color: "text-primary" },
] as const;

const AdminEngagement = ({ user }: Props) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "portfolio" | "competition_entry">("all");
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [bulkCount, setBulkCount] = useState<Record<string, Record<string, number>>>({});

  const fetchImages = async () => {
    setLoading(true);

    // Fetch portfolio images
    const { data: portfolio } = await supabase
      .from("portfolio_images")
      .select("id, title, image_url, uploaded_by")
      .order("created_at", { ascending: false })
      .limit(100);

    // Fetch competition entries
    const { data: entries } = await supabase
      .from("competition_entries")
      .select("id, title, photos, user_id")
      .order("created_at", { ascending: false })
      .limit(100);

    // Get all image IDs
    const portfolioIds = portfolio?.map(p => p.id) || [];
    const entryIds = entries?.map(e => e.id) || [];
    const allIds = [...portfolioIds, ...entryIds];

    // Fetch reactions for all images
    const { data: reactions } = allIds.length > 0
      ? await supabase
          .from("image_reactions")
          .select("image_id, reaction_type")
          .in("image_id", allIds)
      : { data: [] };

    // Build reaction counts
    const reactionMap: Record<string, { like: number; love: number; vote: number }> = {};
    for (const r of reactions || []) {
      if (!reactionMap[r.image_id]) reactionMap[r.image_id] = { like: 0, love: 0, vote: 0 };
      if (r.reaction_type === "like") reactionMap[r.image_id].like++;
      else if (r.reaction_type === "love") reactionMap[r.image_id].love++;
      else if (r.reaction_type === "vote") reactionMap[r.image_id].vote++;
    }

    // Get owner profiles
    const ownerIds = [...new Set([
      ...(portfolio?.map(p => p.uploaded_by) || []),
      ...(entries?.map(e => e.user_id) || []),
    ])];
    const { data: profiles } = ownerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", ownerIds)
      : { data: [] };
    const profileMap = new Map<string, string | null>(profiles?.map(p => [p.id, p.full_name] as [string, string | null]) || []);

    const items: ImageItem[] = [
      ...(portfolio?.map(p => ({
        id: p.id,
        title: p.title,
        image_url: p.image_url,
        type: "portfolio" as const,
        owner_name: (profileMap.get(p.uploaded_by) || null) as string | null,
        reactions: reactionMap[p.id] || { like: 0, love: 0, vote: 0 },
      })) || []),
      ...(entries?.map(e => ({
        id: e.id,
        title: e.title,
        image_url: e.photos?.[0] || "",
        type: "competition_entry" as const,
        owner_name: (profileMap.get(e.user_id) || null) as string | null,
        reactions: reactionMap[e.id] || { like: 0, love: 0, vote: 0 },
      })) || []),
    ];

    setImages(items);
    setLoading(false);
  };

  useEffect(() => { fetchImages(); }, []);

  const adjustReaction = async (imageId: string, imageType: string, reactionType: string, delta: number) => {
    if (!user) return;
    setAdjusting(`${imageId}-${reactionType}`);

    if (delta > 0) {
      // Add fake reactions with admin's user ID but different timestamps to create multiple
      const promises = [];
      for (let i = 0; i < delta; i++) {
        // Use a generated UUID for user_id to simulate different users
        const fakeUserId = crypto.randomUUID();
        promises.push(
          supabase.from("image_reactions").insert({
            image_id: imageId,
            image_type: imageType,
            reaction_type: reactionType,
            user_id: fakeUserId,
          })
        );
      }
      await Promise.all(promises);
    } else if (delta < 0) {
      // Remove reactions (most recent first)
      const { data: existing } = await supabase
        .from("image_reactions")
        .select("id")
        .eq("image_id", imageId)
        .eq("image_type", imageType)
        .eq("reaction_type", reactionType)
        .order("created_at", { ascending: false })
        .limit(Math.abs(delta));

      if (existing && existing.length > 0) {
        await supabase
          .from("image_reactions")
          .delete()
          .in("id", existing.map(e => e.id));
      }
    }

    // Update local state
    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        return {
          ...img,
          reactions: {
            ...img.reactions,
            [reactionType]: Math.max(0, img.reactions[reactionType as keyof typeof img.reactions] + delta),
          },
        };
      }
      return img;
    }));

    setAdjusting(null);
    toast({ title: `${reactionType} ${delta > 0 ? "added" : "removed"}`, description: `${Math.abs(delta)} ${reactionType}(s) ${delta > 0 ? "added to" : "removed from"} image` });
  };

  const handleBulkApply = async (imageId: string, imageType: string) => {
    const counts = bulkCount[imageId] || {};
    for (const [type, count] of Object.entries(counts)) {
      if (count && count !== 0) {
        await adjustReaction(imageId, imageType, type, count);
      }
    }
    setBulkCount(prev => ({ ...prev, [imageId]: {} }));
  };

  const filtered = images.filter(img => {
    if (sourceFilter !== "all" && img.type !== sourceFilter) return false;
    if (search && !img.title.toLowerCase().includes(search.toLowerCase()) && !img.owner_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-light mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Engagement <em className="italic text-primary">Control</em>
        </h3>
        <p className="text-[10px] text-muted-foreground tracking-wide uppercase" style={{ fontFamily: "var(--font-heading)" }}>
          Manipulate likes, loves & votes on any image
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or photographer..."
            className="w-full pl-9 pr-3 py-2 bg-transparent border border-border rounded-sm text-xs focus:border-primary outline-none transition-colors"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <div className="flex gap-1">
          {(["all", "portfolio", "competition_entry"] as const).map(f => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className={`text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border rounded-sm transition-all ${
                sourceFilter === f ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {f === "all" ? "All" : f === "portfolio" ? "Portfolio" : "Entries"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground py-10 text-center">No images found</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(img => {
            const counts = bulkCount[img.id] || {};
            return (
              <div key={img.id} className="border border-border rounded-sm p-4 hover:border-primary/30 transition-colors">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-sm overflow-hidden shrink-0 bg-muted">
                    {img.image_url ? (
                      <img src={img.image_url} alt={img.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-heading)" }}>
                        {img.title}
                      </h4>
                      <span className={`text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 border rounded-sm ${
                        img.type === "portfolio" ? "text-primary border-primary/30" : "text-muted-foreground border-border"
                      }`} style={{ fontFamily: "var(--font-heading)" }}>
                        {img.type === "portfolio" ? "Portfolio" : "Entry"}
                      </span>
                    </div>
                    {img.owner_name && (
                      <p className="text-[10px] text-muted-foreground mb-2">by {img.owner_name}</p>
                    )}

                    {/* Current counts & controls */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {REACTION_TYPES.map(({ type, icon: Icon, label, color }) => (
                        <div key={type} className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${color}`} />
                          <span className="text-sm font-medium min-w-[20px] text-center">
                            {img.reactions[type as keyof typeof img.reactions]}
                          </span>

                          {/* Quick +/- buttons */}
                          <div className="flex items-center gap-0.5 ml-1">
                            <button
                              onClick={() => adjustReaction(img.id, img.type, type, -1)}
                              disabled={adjusting === `${img.id}-${type}` || img.reactions[type as keyof typeof img.reactions] === 0}
                              className="h-5 w-5 flex items-center justify-center border border-border rounded-sm text-muted-foreground hover:text-destructive hover:border-destructive transition-colors disabled:opacity-30"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => adjustReaction(img.id, img.type, type, 1)}
                              disabled={adjusting === `${img.id}-${type}`}
                              className="h-5 w-5 flex items-center justify-center border border-border rounded-sm text-muted-foreground hover:text-primary hover:border-primary transition-colors disabled:opacity-30"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>

                          {/* Bulk input */}
                          <input
                            type="number"
                            min={-999}
                            max={999}
                            value={counts[type] || ""}
                            onChange={e => setBulkCount(prev => ({
                              ...prev,
                              [img.id]: { ...prev[img.id], [type]: parseInt(e.target.value) || 0 },
                            }))}
                            placeholder="±"
                            className="w-12 text-center text-[10px] border border-border rounded-sm py-0.5 bg-transparent focus:border-primary outline-none"
                          />
                        </div>
                      ))}

                      {/* Bulk apply */}
                      {Object.values(counts).some(v => v && v !== 0) && (
                        <button
                          onClick={() => handleBulkApply(img.id, img.type)}
                          className="text-[9px] tracking-[0.15em] uppercase px-3 py-1 bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          Apply Bulk
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminEngagement;
