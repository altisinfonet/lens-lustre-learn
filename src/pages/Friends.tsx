import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Heart, UserMinus, UserX, UserCheck, Search, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import T from "@/components/T";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FriendProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
}

interface FriendRow {
  friendshipId: string;
  profile: FriendProfile;
  since: string;
}

interface FollowRow {
  id: string;
  profile: FriendProfile;
  since: string;
}

interface PendingRequest {
  friendshipId: string;
  profile: FriendProfile;
  since: string;
  direction: "sent" | "received";
}

const headingFont = { fontFamily: "var(--font-heading)" };
const bodyFont = { fontFamily: "var(--font-body)" };
const displayFont = { fontFamily: "var(--font-display)" };

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

const Friends = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [followers, setFollowers] = useState<FollowRow[]>([]);
  const [following, setFollowing] = useState<FollowRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchAll = useCallback(async () => {
    if (!user) return;

    const [friendshipsRes, followersRes, followingRes, pendingRes] = await Promise.all([
      supabase.from("friendships")
        .select("id, requester_id, addressee_id, created_at")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted"),
      supabase.from("follows")
        .select("id, follower_id, created_at")
        .eq("following_id", user.id),
      supabase.from("follows")
        .select("id, following_id, created_at")
        .eq("follower_id", user.id),
      supabase.from("friendships")
        .select("id, requester_id, addressee_id, created_at")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "pending"),
    ]);

    // Collect all user IDs we need profiles for
    const userIds = new Set<string>();
    friendshipsRes.data?.forEach((f) => {
      userIds.add(f.requester_id === user.id ? f.addressee_id : f.requester_id);
    });
    followersRes.data?.forEach((f) => userIds.add(f.follower_id));
    followingRes.data?.forEach((f) => userIds.add(f.following_id));
    pendingRes.data?.forEach((f) => {
      userIds.add(f.requester_id === user.id ? f.addressee_id : f.requester_id);
    });

    // Batch fetch all profiles
    const profileMap = new Map<string, FriendProfile>();
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, city, country")
        .in("id", Array.from(userIds));
      profiles?.forEach((p) => profileMap.set(p.id, p));
    }

    const fallback: FriendProfile = { id: "", full_name: "Unknown", avatar_url: null, bio: null, city: null, country: null };

    setFriends(
      (friendshipsRes.data || []).map((f) => {
        const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        return { friendshipId: f.id, profile: profileMap.get(otherId) || { ...fallback, id: otherId }, since: f.created_at };
      })
    );

    setFollowers(
      (followersRes.data || []).map((f) => ({
        id: f.id, profile: profileMap.get(f.follower_id) || { ...fallback, id: f.follower_id }, since: f.created_at,
      }))
    );

    setFollowing(
      (followingRes.data || []).map((f) => ({
        id: f.id, profile: profileMap.get(f.following_id) || { ...fallback, id: f.following_id }, since: f.created_at,
      }))
    );

    setPendingRequests(
      (pendingRes.data || []).map((f) => {
        const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        return {
          friendshipId: f.id,
          profile: profileMap.get(otherId) || { ...fallback, id: otherId },
          since: f.created_at,
          direction: f.requester_id === user.id ? "sent" : "received",
        };
      })
    );

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const removeFriend = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Friend removed" });
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
    }
    setActionLoading(null);
  };

  const unfollow = async (followId: string, followingId: string) => {
    setActionLoading(followId);
    const { error } = await supabase.from("follows").delete().eq("follower_id", user!.id).eq("following_id", followingId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Unfollowed" });
      setFollowing((prev) => prev.filter((f) => f.id !== followId));
    }
    setActionLoading(null);
  };

  const acceptRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const { error } = await supabase.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", friendshipId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Friend request accepted!" });
      await fetchAll();
    }
    setActionLoading(null);
  };

  const declineRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Request removed" });
      setPendingRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
    }
    setActionLoading(null);
  };

  const filterBySearch = (profile: FriendProfile) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (profile.full_name || "").toLowerCase().includes(q) ||
      (profile.city || "").toLowerCase().includes(q) ||
      (profile.country || "").toLowerCase().includes(q);
  };

  if (authLoading || loading || !user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={headingFont}>
          <T>Loading...</T>
        </div>
      </main>
    );
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Friends & Connections" }]} className="mb-10" />

        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0} className="mb-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-px bg-primary" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={headingFont}>
                <T>Connections</T>
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-6" style={displayFont}>
              <T>Friends</T> & <em className="italic text-primary"><T>Network</T></em>
            </h1>

            {/* Summary stats */}
            <div className="flex flex-wrap gap-6 text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-8" style={headingFont}>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                <strong className="text-foreground">{friends.length}</strong> <T>Friends</T>
              </span>
              <span className="text-border">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-3 w-3" />
                <strong className="text-foreground">{followers.length}</strong> <T>Followers</T>
              </span>
              <span className="text-border">•</span>
              <span className="inline-flex items-center gap-1.5">
                <strong className="text-foreground">{following.length}</strong> <T>Following</T>
              </span>
              {pendingRequests.length > 0 && (
                <>
                  <span className="text-border">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <strong className="text-foreground">{pendingRequests.length}</strong> <T>Pending</T>
                  </span>
                </>
              )}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} custom={1}>
            {/* Search */}
            <div className="relative max-w-sm mb-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, city or country..."
                className="pl-9 bg-transparent text-sm"
              />
            </div>

            <Tabs defaultValue={pendingRequests.length > 0 ? "pending" : "friends"} className="w-full">
              <TabsList className="bg-muted/30 border border-border mb-6">
                {pendingRequests.length > 0 && (
                  <TabsTrigger value="pending" className="text-[10px] tracking-[0.15em] uppercase gap-1.5" style={headingFont}>
                    <Clock className="h-3 w-3" />
                    <T>Pending</T>
                    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 text-[8px] bg-primary text-primary-foreground rounded-full">
                      {pendingRequests.length}
                    </span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="friends" className="text-[10px] tracking-[0.15em] uppercase gap-1.5" style={headingFont}>
                  <Users className="h-3 w-3" /> <T>Friends</T> ({friends.length})
                </TabsTrigger>
                <TabsTrigger value="followers" className="text-[10px] tracking-[0.15em] uppercase gap-1.5" style={headingFont}>
                  <Heart className="h-3 w-3" /> <T>Followers</T> ({followers.length})
                </TabsTrigger>
                <TabsTrigger value="following" className="text-[10px] tracking-[0.15em] uppercase gap-1.5" style={headingFont}>
                  <T>Following</T> ({following.length})
                </TabsTrigger>
              </TabsList>

              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <TabsContent value="pending">
                  <div className="border border-border divide-y divide-border">
                    {pendingRequests.filter((r) => filterBySearch(r.profile)).map((req) => (
                      <PersonRow
                        key={req.friendshipId}
                        profile={req.profile}
                        subtitle={req.direction === "sent" ? "Request sent" : "Wants to be your friend"}
                        date={formatDate(req.since)}
                        actions={
                          req.direction === "received" ? (
                            <div className="flex gap-2">
                              <ActionBtn
                                icon={<UserCheck className="h-3 w-3" />}
                                label="Accept"
                                onClick={() => acceptRequest(req.friendshipId)}
                                disabled={actionLoading === req.friendshipId}
                                variant="primary"
                              />
                              <ActionBtn
                                icon={<UserX className="h-3 w-3" />}
                                label="Decline"
                                onClick={() => declineRequest(req.friendshipId)}
                                disabled={actionLoading === req.friendshipId}
                                variant="muted"
                              />
                            </div>
                          ) : (
                            <ActionBtn
                              icon={<UserX className="h-3 w-3" />}
                              label="Cancel"
                              onClick={() => declineRequest(req.friendshipId)}
                              disabled={actionLoading === req.friendshipId}
                              variant="muted"
                            />
                          )
                        }
                      />
                    ))}
                  </div>
                  {pendingRequests.filter((r) => filterBySearch(r.profile)).length === 0 && (
                    <EmptyState message="No matching pending requests" />
                  )}
                </TabsContent>
              )}

              {/* Friends */}
              <TabsContent value="friends">
                {friends.filter((f) => filterBySearch(f.profile)).length > 0 ? (
                  <div className="border border-border divide-y divide-border">
                    {friends.filter((f) => filterBySearch(f.profile)).map((f) => (
                      <PersonRow
                        key={f.friendshipId}
                        profile={f.profile}
                        subtitle={f.profile.city && f.profile.country ? `${f.profile.city}, ${f.profile.country}` : f.profile.bio?.slice(0, 60) || null}
                        date={`Friends since ${formatDate(f.since)}`}
                        actions={
                          <ActionBtn
                            icon={<UserMinus className="h-3 w-3" />}
                            label="Remove"
                            onClick={() => removeFriend(f.friendshipId)}
                            disabled={actionLoading === f.friendshipId}
                            variant="danger"
                          />
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message={search ? "No friends match your search" : "You haven't added any friends yet. Visit other profiles to connect!"} />
                )}
              </TabsContent>

              {/* Followers */}
              <TabsContent value="followers">
                {followers.filter((f) => filterBySearch(f.profile)).length > 0 ? (
                  <div className="border border-border divide-y divide-border">
                    {followers.filter((f) => filterBySearch(f.profile)).map((f) => (
                      <PersonRow
                        key={f.id}
                        profile={f.profile}
                        subtitle={f.profile.city && f.profile.country ? `${f.profile.city}, ${f.profile.country}` : null}
                        date={`Following since ${formatDate(f.since)}`}
                        actions={null}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message={search ? "No followers match your search" : "No followers yet. Share your profile to grow your audience!"} />
                )}
              </TabsContent>

              {/* Following */}
              <TabsContent value="following">
                {following.filter((f) => filterBySearch(f.profile)).length > 0 ? (
                  <div className="border border-border divide-y divide-border">
                    {following.filter((f) => filterBySearch(f.profile)).map((f) => (
                      <PersonRow
                        key={f.id}
                        profile={f.profile}
                        subtitle={f.profile.city && f.profile.country ? `${f.profile.city}, ${f.profile.country}` : null}
                        date={`Since ${formatDate(f.since)}`}
                        actions={
                          <ActionBtn
                            icon={<Heart className="h-3 w-3" />}
                            label="Unfollow"
                            onClick={() => unfollow(f.id, f.profile.id)}
                            disabled={actionLoading === f.id}
                            variant="muted"
                          />
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message={search ? "No following match your search" : "You're not following anyone yet. Discover photographers to follow!"} />
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
};

/* ─── Sub-components ─── */

const PersonRow = ({ profile, subtitle, date, actions }: {
  profile: FriendProfile;
  subtitle: string | null;
  date: string;
  actions: React.ReactNode;
}) => {
  const name = profile.full_name || "Unknown User";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex items-center gap-4 p-4 md:p-5">
      <Link to={`/profile/${profile.id}`} className="shrink-0">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={name} className="w-11 h-11 rounded-full object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-light text-primary" style={{ fontFamily: "var(--font-display)" }}>{initials}</span>
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          to={`/profile/${profile.id}`}
          className="text-sm font-light hover:text-primary transition-colors duration-300 block truncate"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {name}
        </Link>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
            {subtitle}
          </p>
        )}
      </div>
      <span className="text-[9px] text-muted-foreground shrink-0 hidden sm:block" style={{ fontFamily: "var(--font-body)" }}>
        {date}
      </span>
      <div className="shrink-0">{actions}</div>
    </div>
  );
};

const ActionBtn = ({ icon, label, onClick, disabled, variant }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
  variant: "primary" | "danger" | "muted";
}) => {
  const styles = {
    primary: "border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground",
    danger: "border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground",
    muted: "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 border transition-all duration-300 disabled:opacity-50 ${styles[variant]}`}
      style={{ fontFamily: "var(--font-heading)" }}
    >
      {icon}
      <T>{label}</T>
    </button>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="border border-dashed border-border p-10 text-center">
    <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
    <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
      <T>{message}</T>
    </p>
  </div>
);

export default Friends;
