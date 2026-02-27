import { useEffect, useState, useCallback } from "react";
import { Bell, UserPlus, Gift, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import T from "@/components/T";

const headingFont = { fontFamily: "var(--font-heading)" };
const bodyFont = { fontFamily: "var(--font-body)" };

interface FriendRequest {
  id: string;
  requester_id: string;
  created_at: string;
  requester_name: string | null;
  requester_avatar: string | null;
}

interface GiftNotification {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  expires_at: string | null;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [giftNotifications, setGiftNotifications] = useState<GiftNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const totalCount = friendRequests.length + giftNotifications.length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [friendsRes, giftsRes] = await Promise.all([
      supabase
        .from("friendships")
        .select("id, requester_id, created_at")
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("gift_announcements")
        .select("id, amount, reason, created_at, expires_at")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .eq("is_expired", false)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Get requester profiles
    const requesterIds = (friendsRes.data || []).map((f) => f.requester_id);
    let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    if (requesterIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", requesterIds);
      profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    }

    setFriendRequests(
      (friendsRes.data || []).map((f) => ({
        ...f,
        requester_name: profileMap.get(f.requester_id)?.full_name || null,
        requester_avatar: profileMap.get(f.requester_id)?.avatar_url || null,
      }))
    );
    setGiftNotifications(giftsRes.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const acceptFriend = async (id: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    setFriendRequests((prev) => prev.filter((f) => f.id !== id));
  };

  const declineFriend = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    setFriendRequests((prev) => prev.filter((f) => f.id !== id));
  };

  const dismissGift = async (id: string) => {
    await supabase.from("gift_announcements").update({ is_read: true }).eq("id", id);
    setGiftNotifications((prev) => prev.filter((g) => g.id !== id));
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-full border border-border hover:border-primary hover:text-primary transition-all duration-500"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-[420px] bg-card border border-border shadow-xl z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-[11px] tracking-[0.2em] uppercase text-foreground" style={headingFont}>
                  <T>Notifications</T>
                </span>
                {totalCount > 0 && (
                  <span className="text-[10px] text-primary" style={headingFont}>
                    {totalCount} <T>new</T>
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1">
                {loading && totalCount === 0 ? (
                  <div className="py-8 text-center">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground animate-pulse" style={headingFont}>
                      <T>Loading...</T>
                    </span>
                  </div>
                ) : totalCount === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground" style={bodyFont}>
                      <T>No new notifications</T>
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Friend Requests */}
                    {friendRequests.length > 0 && (
                      <div>
                        <div className="px-4 py-2 bg-muted/30">
                          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={headingFont}>
                            <T>Friend Requests</T>
                          </span>
                        </div>
                        {friendRequests.map((fr) => (
                          <div key={fr.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <Link
                              to={`/profile/${fr.requester_id}`}
                              onClick={() => setOpen(false)}
                              className="shrink-0"
                            >
                              {fr.requester_avatar ? (
                                <img src={fr.requester_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                  <UserPlus className="h-4 w-4 text-primary" />
                                </div>
                              )}
                            </Link>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs truncate" style={bodyFont}>
                                <Link
                                  to={`/profile/${fr.requester_id}`}
                                  onClick={() => setOpen(false)}
                                  className="font-medium hover:text-primary transition-colors"
                                >
                                  {fr.requester_name || "Someone"}
                                </Link>
                                {" "}<T>sent you a friend request</T>
                              </p>
                              <span className="text-[9px] text-muted-foreground" style={headingFont}>
                                {timeAgo(fr.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => acceptFriend(fr.id)}
                                className="h-7 w-7 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors"
                                title="Accept"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => declineFriend(fr.id)}
                                className="h-7 w-7 rounded-full bg-muted hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                title="Decline"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Gift Credits */}
                    {giftNotifications.length > 0 && (
                      <div>
                        <div className="px-4 py-2 bg-muted/30">
                          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={headingFont}>
                            <T>Gift Credits</T>
                          </span>
                        </div>
                        {giftNotifications.map((gift) => (
                          <div key={gift.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                              <Gift className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs" style={bodyFont}>
                                <T>You received</T>{" "}
                                <span className="font-semibold text-primary">${gift.amount}</span>
                                {" — "}{gift.reason}
                              </p>
                              <span className="text-[9px] text-muted-foreground" style={headingFont}>
                                {timeAgo(gift.created_at)}
                                {gift.expires_at && (
                                  <> · <T>Expires</T> {new Date(gift.expires_at).toLocaleDateString()}</>
                                )}
                              </span>
                            </div>
                            <button
                              onClick={() => dismissGift(gift.id)}
                              className="h-7 w-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground shrink-0 transition-colors"
                              title="Dismiss"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border px-4 py-2.5 text-center">
                <Link
                  to="/friends"
                  onClick={() => setOpen(false)}
                  className="text-[10px] tracking-[0.15em] uppercase text-primary hover:underline"
                  style={headingFont}
                >
                  <T>View All Friends</T>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
