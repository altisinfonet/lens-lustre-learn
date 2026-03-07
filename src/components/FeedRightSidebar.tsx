import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Users, TrendingUp, Trophy, Cake, Newspaper, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { profilesPublic } from "@/lib/profilesPublic";
import { getAdminIds } from "@/lib/adminBrand";
import T from "@/components/T";

const headingFont = { fontFamily: "var(--font-heading)" };
const bodyFont = { fontFamily: "var(--font-body)" };
const displayFont = { fontFamily: "var(--font-display)" };

interface SuggestedUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  mutual_count: number;
}

interface AdSlot {
  id: string;
  html: string;
  placement: string;
}

interface TrendingPhoto {
  id: string;
  image_url: string;
  title: string;
  reaction_count: number;
}

interface UpcomingComp {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  cover_image_url: string | null;
}

interface JournalPreview {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
  published_at: string | null;
}

interface MilestoneUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  years: number;
}

const FeedRightSidebar = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [ads, setAds] = useState<AdSlot[]>([]);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [trendingPhotos, setTrendingPhotos] = useState<TrendingPhoto[]>([]);
  const [upcomingComps, setUpcomingComps] = useState<UpcomingComp[]>([]);
  const [journalPreviews, setJournalPreviews] = useState<JournalPreview[]>([]);
  const [milestones, setMilestones] = useState<MilestoneUser[]>([]);

  useEffect(() => {
    if (!user) return;
    loadSuggestions();
    loadAds();
    loadTrendingPhotos();
    loadUpcomingCompetitions();
    loadJournalArticles();
    loadMilestones();
  }, [user]);

  const loadSuggestions = async () => {
    if (!user) return;
    const [friendsRes, followsRes, adminIds] = await Promise.all([
      supabase.from("friendships").select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      getAdminIds(),
    ]);

    const excludeIds = new Set<string>([user.id]);
    (friendsRes.data || []).forEach((f: any) => {
      excludeIds.add(f.requester_id);
      excludeIds.add(f.addressee_id);
    });
    (followsRes.data || []).forEach((f: any) => excludeIds.add(f.following_id));
    adminIds.forEach((id) => excludeIds.add(id));

    const { data: profiles } = await profilesPublic()
      .select("id, full_name, avatar_url")
      .not("id", "in", `(${Array.from(excludeIds).join(",")})`)
      .eq("is_suspended", false)
      .limit(20);

    if (!profiles || profiles.length === 0) { setSuggestions([]); return; }

    const suggested: SuggestedUser[] = (profiles as any[]).map((p) => ({
      id: p.id!,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      mutual_count: 0,
    }));
    setSuggestions(suggested.sort(() => Math.random() - 0.5).slice(0, 5));
  };

  const loadAds = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "advertisements").maybeSingle();
    if (!data?.value) return;
    const settings = data.value as any;
    const slots = settings.slots || [];
    const sidebarAds = slots.filter((s: any) => s.is_active && s.placement === "sidebar");
    setAds(sidebarAds.map((s: any) => ({ id: s.id, html: s.html_code, placement: s.placement })));
  };

  const loadTrendingPhotos = async () => {
    // Get portfolio images with most reactions in the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: reactions } = await supabase
      .from("image_reactions")
      .select("image_id")
      .eq("image_type", "portfolio")
      .gte("created_at", weekAgo);

    if (!reactions || reactions.length === 0) return;

    // Count reactions per image
    const counts: Record<string, number> = {};
    reactions.forEach((r) => { counts[r.image_id] = (counts[r.image_id] || 0) + 1; });
    const topIds = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id]) => id);

    if (topIds.length === 0) return;

    const { data: images } = await supabase
      .from("portfolio_images")
      .select("id, image_url, title")
      .in("id", topIds)
      .eq("is_visible", true);

    if (images) {
      setTrendingPhotos(images.map((img) => ({
        ...img,
        reaction_count: counts[img.id] || 0,
      })).sort((a, b) => b.reaction_count - a.reaction_count));
    }
  };

  const loadUpcomingCompetitions = async () => {
    const { data } = await supabase
      .from("competitions")
      .select("id, title, starts_at, ends_at, status, cover_image_url")
      .in("status", ["upcoming", "open"])
      .order("starts_at", { ascending: true })
      .limit(3);
    setUpcomingComps(data || []);
  };

  const loadJournalArticles = async () => {
    const { data } = await supabase
      .from("journal_articles")
      .select("id, title, slug, cover_image_url, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3);
    setJournalPreviews(data || []);
  };

  const loadMilestones = async () => {
    // Find users whose signup anniversary is today
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const { data: profiles } = await profilesPublic()
      .select("id, full_name, avatar_url, created_at")
      .eq("is_suspended", false)
      .limit(200);

    if (!profiles) return;

    const milestoneUsers: MilestoneUser[] = [];
    (profiles as any[]).forEach((p) => {
      if (!p.created_at || !p.id) return;
      const created = new Date(p.created_at);
      const createdMD = `${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`;
      if (createdMD === monthDay && created.getFullYear() < today.getFullYear()) {
        milestoneUsers.push({
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          years: today.getFullYear() - created.getFullYear(),
        });
      }
    });
    setMilestones(milestoneUsers.slice(0, 5));
  };

  const sendFriendRequest = async (targetId: string) => {
    if (!user) return;
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: targetId,
      status: "pending",
    });
    if (!error) {
      setRequestedIds((prev) => new Set(prev).add(targetId));
    }
  };

  const timeUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return "Now";
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d left`;
    const hrs = Math.floor(diff / 3600000);
    return `${hrs}h left`;
  };

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Sponsored / Ads — Top */}
      {ads.length > 0 && (
        <div className="border border-border bg-card/50 rounded-sm">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={headingFont}>
              <T>Sponsored</T>
            </span>
          </div>
          <div className="p-4 space-y-4">
            {ads.map((ad) => (
              <div key={ad.id} dangerouslySetInnerHTML={{ __html: ad.html }} className="text-xs [&_img]:max-w-full [&_img]:rounded-sm" />
            ))}
          </div>
        </div>
      )}

      {ads.length === 0 && (
        <div className="border border-dashed border-border p-6 text-center rounded-sm">
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/50 block mb-2" style={headingFont}>
            Sponsored
          </span>
          <p className="text-[10px] text-muted-foreground/40" style={bodyFont}>
            Ad space available
          </p>
        </div>
      )}

      {/* People You May Know */}
      <div className="border border-border bg-card/50 rounded-sm">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-[9px] tracking-[0.3em] uppercase text-primary flex items-center gap-1.5" style={headingFont}>
            <Users className="h-3 w-3" />
            <T>People You May Know</T>
          </span>
        </div>
        <div className="divide-y divide-border">
          {suggestions.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground" style={bodyFont}><T>No suggestions yet</T></p>
            </div>
          ) : (
            suggestions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <Link to={`/profile/${s.id}`} className="shrink-0">
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs text-primary" style={displayFont}>
                        {(s.full_name || "?")[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${s.id}`} className="text-xs font-medium truncate block hover:text-primary transition-colors" style={headingFont}>
                    {s.full_name || "Photographer"}
                  </Link>
                  {s.mutual_count > 0 && (
                    <span className="text-[9px] text-muted-foreground" style={bodyFont}>
                      {s.mutual_count} mutual {s.mutual_count === 1 ? "friend" : "friends"}
                    </span>
                  )}
                </div>
                {requestedIds.has(s.id) ? (
                  <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground px-2 py-1 border border-border rounded-sm" style={headingFont}>
                    Sent
                  </span>
                ) : (
                  <button
                    onClick={() => sendFriendRequest(s.id)}
                    className="inline-flex items-center gap-1 text-[8px] tracking-[0.15em] uppercase px-2 py-1 border border-primary/40 text-primary hover:bg-primary/10 transition-all rounded-sm"
                    style={headingFont}
                  >
                    <UserPlus className="h-3 w-3" /> Add
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-border">
          <Link to="/discover" className="text-[9px] tracking-[0.15em] uppercase text-primary hover:underline" style={headingFont}>
            <T>See All →</T>
          </Link>
        </div>
      </div>

      {/* Trending Photos */}
      {trendingPhotos.length > 0 && (
        <div className="border border-border bg-card/50 rounded-sm">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[9px] tracking-[0.3em] uppercase text-primary flex items-center gap-1.5" style={headingFont}>
              <TrendingUp className="h-3 w-3" />
              <T>Trending This Week</T>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 p-2">
            {trendingPhotos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square overflow-hidden rounded-sm">
                <img src={photo.image_url} alt={photo.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-1 left-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[8px] text-white truncate" style={headingFont}>{photo.title}</p>
                  <span className="text-[7px] text-white/70" style={bodyFont}>❤️ {photo.reaction_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Competitions */}
      {upcomingComps.length > 0 && (
        <div className="border border-border bg-card/50 rounded-sm">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[9px] tracking-[0.3em] uppercase text-primary flex items-center gap-1.5" style={headingFont}>
              <Trophy className="h-3 w-3" />
              <T>Competitions</T>
            </span>
          </div>
          <div className="divide-y divide-border">
            {upcomingComps.map((comp) => (
              <Link key={comp.id} to={`/competitions/${comp.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                {comp.cover_image_url ? (
                  <img src={comp.cover_image_url} alt="" className="w-10 h-10 rounded-sm object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                    <Trophy className="h-4 w-4 text-primary/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={headingFont}>{comp.title}</p>
                  <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground" style={bodyFont}>
                    <Clock className="h-2.5 w-2.5" />
                    {comp.status === "open" ? timeUntil(comp.ends_at) : `Starts ${new Date(comp.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </span>
                </div>
                <span className={`text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 border rounded-sm ${comp.status === "open" ? "text-green-500 border-green-500/40" : "text-yellow-500 border-yellow-500/40"}`} style={headingFont}>
                  {comp.status}
                </span>
              </Link>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-border">
            <Link to="/competitions" className="text-[9px] tracking-[0.15em] uppercase text-primary hover:underline" style={headingFont}>
              <T>View All →</T>
            </Link>
          </div>
        </div>
      )}

      {/* Membership Milestones */}
      {milestones.length > 0 && (
        <div className="border border-border bg-card/50 rounded-sm">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[9px] tracking-[0.3em] uppercase text-primary flex items-center gap-1.5" style={headingFont}>
              <Cake className="h-3 w-3" />
              <T>Membership Anniversaries</T>
            </span>
          </div>
          <div className="divide-y divide-border">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Link to={`/profile/${m.id}`} className="shrink-0">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] text-primary" style={displayFont}>{(m.full_name || "?")[0]?.toUpperCase()}</span>
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${m.id}`} className="text-xs font-medium truncate block hover:text-primary transition-colors" style={headingFont}>
                    {m.full_name || "Photographer"}
                  </Link>
                  <span className="text-[9px] text-muted-foreground" style={bodyFont}>
                    🎉 {m.years} {m.years === 1 ? "year" : "years"} today!
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Journal Articles */}
      {journalPreviews.length > 0 && (
        <div className="border border-border bg-card/50 rounded-sm">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[9px] tracking-[0.3em] uppercase text-primary flex items-center gap-1.5" style={headingFont}>
              <Newspaper className="h-3 w-3" />
              <T>Latest from Journal</T>
            </span>
          </div>
          <div className="divide-y divide-border">
            {journalPreviews.map((article) => (
              <Link key={article.id} to={`/journal/${article.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                {article.cover_image_url ? (
                  <img src={article.cover_image_url} alt="" className="w-12 h-9 rounded-sm object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-9 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                    <Newspaper className="h-4 w-4 text-primary/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-2 leading-snug" style={headingFont}>{article.title}</p>
                  {article.published_at && (
                    <span className="text-[9px] text-muted-foreground" style={bodyFont}>
                      {new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-border">
            <Link to="/journal" className="text-[9px] tracking-[0.15em] uppercase text-primary hover:underline" style={headingFont}>
              <T>Read More →</T>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedRightSidebar;
