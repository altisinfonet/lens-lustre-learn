import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";

export const useFriendFollow = (targetUserId: string | undefined) => {
  const { user } = useAuth();
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus>("none");
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);

  const isSelf = user?.id === targetUserId;

  const fetchData = useCallback(async () => {
    if (!targetUserId) return;

    // Fetch public counts
    const [friendCountRes, followerRes, followingRes] = await Promise.all([
      supabase.rpc("friend_count", { _user_id: targetUserId }),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", targetUserId),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", targetUserId),
    ]);

    setFriendCount((friendCountRes.data as number) ?? 0);
    setFollowerCount(followerRes.count ?? 0);
    setFollowingCount(followingRes.count ?? 0);

    if (!user || isSelf) return;

    // Check friendship status
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id, status, requester_id")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (friendship) {
      setFriendshipId(friendship.id);
      if (friendship.status === "accepted") setFriendStatus("accepted");
      else if (friendship.requester_id === user.id) setFriendStatus("pending_sent");
      else setFriendStatus("pending_received");
    } else {
      setFriendStatus("none");
      setFriendshipId(null);
    }

    // Check follow status
    const { data: follow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    setIsFollowing(!!follow);
  }, [targetUserId, user, isSelf]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sendFriendRequest = async () => {
    if (!user || !targetUserId || isSelf) return;
    setLoading(true);
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: targetUserId,
      status: "pending",
    });
    if (error) {
      toast({ title: "Failed to send request", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Friend request sent!" });
      await fetchData();
    }
    setLoading(false);
  };

  const acceptFriendRequest = async () => {
    if (!friendshipId) return;
    setLoading(true);
    const { error } = await supabase.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", friendshipId);
    if (error) {
      toast({ title: "Failed to accept", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Friend request accepted!" });
      await fetchData();
    }
    setLoading(false);
  };

  const removeFriend = async () => {
    if (!friendshipId) return;
    setLoading(true);
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Friend removed" });
      await fetchData();
    }
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!user || !targetUserId || isSelf) return;
    setLoading(true);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
      toast({ title: "Unfollowed" });
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetUserId });
      if (error) {
        toast({ title: "Failed to follow", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Following!" });
      }
    }
    await fetchData();
    setLoading(false);
  };

  return {
    friendStatus,
    isFollowing,
    friendCount,
    followerCount,
    followingCount,
    loading,
    isSelf,
    isLoggedIn: !!user,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    toggleFollow,
  };
};
