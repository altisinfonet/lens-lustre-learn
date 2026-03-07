import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { profilesPublic } from "@/lib/profilesPublic";
import { getAdminIds } from "@/lib/adminBrand";
import T from "@/components/T";

const headingFont = { fontFamily: "var(--font-heading)" };
const bodyFont = { fontFamily: "var(--font-body)" };

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

const FeedRightSidebar = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [ads, setAds] = useState<AdSlot[]>([]);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    loadSuggestions();
    loadAds();
  }, [user]);

  const loadSuggestions = async () => {
    if (!user) return;

    // Get current friends & follows to exclude
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
    // Exclude admins
    adminIds.forEach((id) => excludeIds.add(id));

    // Get friend-of-friend IDs for mutual count
    const friendIds = new Set<string>();
    (friendsRes.data || []).filter((f: any) => f.status === "accepted" || true).forEach((f: any) => {
      if (f.requester_id === user.id) friendIds.add(f.addressee_id);
      else friendIds.add(f.requester_id);
    });

    // Fetch random profiles not in exclude list
    const { data: profiles } = await profilesPublic()
      .select("id, full_name, avatar_url")
      .not("id", "in", `(${Array.from(excludeIds).join(",")})`)
      .eq("is_suspended", false)
      .limit(20);

    if (!profiles || profiles.length === 0) { setSuggestions([]); return; }

    // Calculate mutual friends
    const suggested: SuggestedUser[] = (profiles as any[]).map((p) => ({
      id: p.id!,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      mutual_count: 0,
    }));

    // Sort randomly and take top 5
    const shuffled = suggested.sort(() => Math.random() - 0.5).slice(0, 5);
    setSuggestions(shuffled);
  };

  const loadAds = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "advertisements").maybeSingle();
    if (!data?.value) return;

    const settings = data.value as any;
    const slots = settings.slots || [];
    const sidebarAds = slots.filter((s: any) => s.is_active && s.placement === "sidebar");
    setAds(sidebarAds.map((s: any) => ({ id: s.id, html: s.html_code, placement: s.placement })));
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

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* People You May Know */}
      <div className="border border-border bg-card/50">
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
                      <span className="text-xs text-primary" style={{ fontFamily: "var(--font-display)" }}>
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
                  <span className="text-[8px] tracking-[0.15em] uppercase text-muted-foreground px-2 py-1 border border-border" style={headingFont}>
                    Sent
                  </span>
                ) : (
                  <button
                    onClick={() => sendFriendRequest(s.id)}
                    className="inline-flex items-center gap-1 text-[8px] tracking-[0.15em] uppercase px-2 py-1 border border-primary/40 text-primary hover:bg-primary/10 transition-all"
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

      {/* Sponsored / Ads */}
      {ads.length > 0 && (
        <div className="border border-border bg-card/50">
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

      {/* Fallback sponsored placeholder when no ads configured */}
      {ads.length === 0 && (
        <div className="border border-dashed border-border p-6 text-center">
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/50 block mb-2" style={headingFont}>
            Sponsored
          </span>
          <p className="text-[10px] text-muted-foreground/40" style={bodyFont}>
            Ad space available
          </p>
        </div>
      )}
    </div>
  );
};

export default FeedRightSidebar;
