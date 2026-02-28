import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Compass, UserPlus, Heart, Clock, UserCheck, UserMinus, X, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { profilesPublic } from "@/lib/profilesPublic";
import { useFriendFollow } from "@/hooks/useFriendFollow";
import { useUserBadgesBatch } from "@/hooks/useUserBadges";
import UserBadgeInline from "@/components/UserBadgeInline";
import Breadcrumbs from "@/components/Breadcrumbs";
import T from "@/components/T";
import { motion, AnimatePresence } from "framer-motion";

const headingFont = { fontFamily: "var(--font-heading)" };
const bodyFont = { fontFamily: "var(--font-body)" };
const displayFont = { fontFamily: "var(--font-display)" };

const INTEREST_OPTIONS = [
  "Wildlife", "Street", "Portrait", "Aerial", "Documentary",
  "Landscape", "Architecture", "Macro", "Sports", "Fashion",
  "Underwater", "Astrophotography", "Food", "Travel", "Abstract",
];

type SortOption = "newest" | "name";

interface DiscoverProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  photography_interests: string[] | null;
  created_at: string | null;
}

// Inline action buttons per card
const DiscoverActions = ({ targetUserId }: { targetUserId: string }) => {
  const {
    friendStatus, isFollowing, loading, isSelf, isTargetAdmin,
    sendFriendRequest, removeFriend, acceptFriendRequest, toggleFollow,
  } = useFriendFollow(targetUserId);

  if (isSelf) return null;

  const btnBase = "inline-flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 border transition-all duration-300 disabled:opacity-40";

  return (
    <div className="flex gap-2 mt-3">
      {!isTargetAdmin && friendStatus === "none" && (
        <button onClick={sendFriendRequest} disabled={loading}
          className={`${btnBase} border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground`} style={headingFont}>
          <UserPlus className="h-3 w-3" /> <T>Add Friend</T>
        </button>
      )}
      {friendStatus === "pending_sent" && (
        <button onClick={removeFriend} disabled={loading}
          className={`${btnBase} border-muted-foreground/30 text-muted-foreground`} style={headingFont}>
          <Clock className="h-3 w-3" /> <T>Pending</T>
        </button>
      )}
      {friendStatus === "pending_received" && (
        <button onClick={acceptFriendRequest} disabled={loading}
          className={`${btnBase} border-green-500/50 text-green-600 hover:bg-green-500 hover:text-white`} style={headingFont}>
          <UserCheck className="h-3 w-3" /> <T>Accept</T>
        </button>
      )}
      {friendStatus === "accepted" && (
        <button onClick={removeFriend} disabled={loading}
          className={`${btnBase} border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground`} style={headingFont}>
          <UserMinus className="h-3 w-3" /> <T>Unfriend</T>
        </button>
      )}
      <button onClick={toggleFollow} disabled={loading}
        className={`${btnBase} ${isFollowing ? "border-accent text-accent-foreground bg-accent/10" : "border-border hover:border-primary hover:text-primary"}`} style={headingFont}>
        <Heart className={`h-3 w-3 ${isFollowing ? "fill-current" : ""}`} />
        {isFollowing ? <T>Following</T> : <T>Follow</T>}
      </button>
    </div>
  );
};

const Discover = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    if (!authLoading && isAdmin) navigate("/admin");
  }, [user, authLoading, isAdmin, navigate]);

  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch admin & judge user IDs to exclude from results
    const { data: hiddenRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "judge"]);
    const hiddenIds = [...new Set((hiddenRoles || []).map((r) => r.user_id))];

    let query = profilesPublic()
      .select("id, full_name, avatar_url, bio, photography_interests, created_at")
      .eq("is_suspended", false)
      .neq("id", user.id);

    // Exclude admin and jury profiles
    if (hiddenIds.length > 0) {
      query = query.not("id", "in", `(${hiddenIds.join(",")})`);
    }

    if (search.trim()) {
      query = query.ilike("full_name", `%${search.trim()}%`);
    }

    if (selectedInterests.length > 0) {
      query = query.overlaps("photography_interests", selectedInterests);
    }

    if (sortBy === "newest") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("full_name", { ascending: true });
    }

    query = query.limit(60);

    const { data } = await query;
    setProfiles((data as DiscoverProfile[] | null) || []);
    setLoading(false);
  }, [user, search, selectedInterests, sortBy]);

  useEffect(() => {
    const timeout = setTimeout(fetchProfiles, 300);
    return () => clearTimeout(timeout);
  }, [fetchProfiles]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={headingFont}><T>Loading...</T></span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-14 max-w-6xl">
        <Breadcrumbs items={[{ label: "Discover" }]} className="mb-6" />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-px bg-primary" />
            <span className="text-[9px] tracking-[0.3em] uppercase text-primary" style={headingFont}>
              <Compass className="h-3 w-3 inline mr-1.5" /><T>Discover</T>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight" style={displayFont}>
            <T>Discover </T><em className="text-primary"><T>Photographers</T></em>
          </h1>
          <p className="text-sm text-muted-foreground mt-2" style={bodyFont}>
            <T>Find and connect with talented photographers from around the world.</T>
          </p>
        </div>

        {/* Search + Filter toggle */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-border focus:border-primary outline-none text-sm transition-colors"
              style={bodyFont}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 border text-[10px] tracking-[0.12em] uppercase transition-all duration-300 flex items-center gap-2 ${
              showFilters || selectedInterests.length > 0
                ? "border-primary text-primary"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
            style={headingFont}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <T>Filters</T>
            {selectedInterests.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground px-1.5 py-0.5 text-[8px] rounded-sm">
                {selectedInterests.length}
              </span>
            )}
          </button>
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="border border-border p-5 mb-6 space-y-4">
                {/* Interests */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground" style={headingFont}>
                      <T>Photography Interests</T>
                    </span>
                    {selectedInterests.length > 0 && (
                      <button onClick={() => setSelectedInterests([])} className="text-[9px] tracking-[0.1em] uppercase text-primary hover:underline" style={headingFont}>
                        <T>Clear all</T>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((interest) => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`text-[10px] tracking-[0.08em] uppercase px-3 py-1.5 border transition-all duration-300 ${
                          selectedInterests.includes(interest)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                        style={headingFont}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground block mb-3" style={headingFont}>
                    <T>Sort by</T>
                  </span>
                  <div className="flex gap-2">
                    {[
                      { value: "newest" as SortOption, label: "Newest Members" },
                      { value: "name" as SortOption, label: "Name (A-Z)" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSortBy(opt.value)}
                        className={`text-[10px] tracking-[0.08em] uppercase px-3 py-1.5 border transition-all duration-300 ${
                          sortBy === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                        style={headingFont}
                      >
                        <T>{opt.label}</T>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filters chips */}
        {selectedInterests.length > 0 && !showFilters && (
          <div className="flex flex-wrap gap-2 mb-5">
            {selectedInterests.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.1em] uppercase px-2.5 py-1 border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                style={headingFont}
              >
                {interest}
                <X className="h-2.5 w-2.5" />
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="text-center py-16">
            <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={headingFont}>
              <T>Searching photographers...</T>
            </span>
          </div>
        ) : profiles.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center">
            <Compass className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground" style={bodyFont}>
              <T>No photographers found matching your criteria.</T>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1" style={bodyFont}>
              <T>Try adjusting your search or filters.</T>
            </p>
          </div>
        ) : (
          <>
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-5" style={headingFont}>
              {profiles.length} <T>{profiles.length !== 1 ? "photographers found" : "photographer found"}</T>
            </p>
            <DiscoverGrid profiles={profiles} />
          </>
        )}
      </div>
    </main>
  );
};

// Extracted grid to use batch badge hook
const DiscoverGrid = ({ profiles }: { profiles: DiscoverProfile[] }) => {
  const badgeMap = useUserBadgesBatch(profiles.map((p) => p.id));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {profiles.map((profile, i) => (
          <motion.div
            key={profile.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
            className="border border-border p-5 hover:border-primary/30 transition-colors duration-500 group"
          >
            <div className="flex items-start gap-3.5">
              <Link to={`/profile/${profile.id}`} className="shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm text-primary" style={displayFont}>
                      {(profile.full_name || "?")[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <span className="flex items-center gap-1">
                  <Link
                    to={`/profile/${profile.id}`}
                    className="text-sm font-light hover:text-primary transition-colors truncate"
                    style={headingFont}
                  >
                    {profile.full_name || "Photographer"}
                  </Link>
                  {(badgeMap.get(profile.id) || []).length > 0 && (
                    <UserBadgeInline badges={badgeMap.get(profile.id) || []} />
                  )}
                </span>
                {profile.bio && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed" style={bodyFont}>
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Interests tags */}
            {profile.photography_interests && profile.photography_interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profile.photography_interests.slice(0, 4).map((interest) => (
                  <span
                    key={interest}
                    className="text-[8px] tracking-[0.08em] uppercase px-2 py-0.5 border border-border text-muted-foreground"
                    style={headingFont}
                  >
                    {interest}
                  </span>
                ))}
                {profile.photography_interests.length > 4 && (
                  <span className="text-[8px] text-muted-foreground/50" style={headingFont}>
                    +{profile.photography_interests.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <DiscoverActions targetUserId={profile.id} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Discover;
