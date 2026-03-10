import { UserPlus, UserMinus, UserCheck, Users, Heart, Clock } from "lucide-react";
import { useFriendFollow } from "@/hooks/useFriendFollow";
import T from "@/components/T";
import { useNavigate } from "react-router-dom";

interface Props {
  targetUserId: string;
}

const headingFont = { fontFamily: "var(--font-heading)" };

/** Stats-only row: Friends • Followers • Following */
export const FriendFollowStats = ({ targetUserId }: Props) => {
  const { friendCount, followerCount, followingCount } = useFriendFollow(targetUserId);

  return (
    <>
      <span className="flex flex-col items-center md:items-end leading-tight">
        <strong className="text-foreground text-sm font-semibold">{friendCount.toLocaleString()}</strong>
        <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground" style={headingFont}>
          <T>Friends</T>
        </span>
      </span>
      <span className="h-6 w-px bg-border" />
      <span className="flex flex-col items-center md:items-end leading-tight">
        <strong className="text-foreground text-sm font-semibold">{followerCount.toLocaleString()}</strong>
        <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground" style={headingFont}>
          <T>Followers</T>
        </span>
      </span>
      <span className="h-6 w-px bg-border" />
      <span className="flex flex-col items-center md:items-end leading-tight">
        <strong className="text-foreground text-sm font-semibold">{followingCount.toLocaleString()}</strong>
        <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground" style={headingFont}>
          <T>Following</T>
        </span>
      </span>
    </>
  );
};

/** Action buttons only: Add Friend / Follow */
export const FriendFollowButtons = ({ targetUserId }: Props) => {
  const {
    friendStatus,
    isFollowing,
    loading,
    isSelf,
    isLoggedIn,
    isTargetAdmin,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    toggleFollow,
  } = useFriendFollow(targetUserId);
  const navigate = useNavigate();

  const requireLogin = () => {
    if (!isLoggedIn) {
      navigate("/login");
      return true;
    }
    return false;
  };

  if (isSelf) return null;

  const btnBase =
    "inline-flex items-center gap-2 text-[10px] tracking-[0.12em] uppercase px-4 py-2 rounded-md border transition-all duration-300 font-semibold disabled:opacity-50";

  return (
    <div className="flex items-center gap-2">
      {/* Friend button */}
      {!isTargetAdmin && friendStatus === "none" && (
        <button
          onClick={() => !requireLogin() && sendFriendRequest()}
          disabled={loading}
          className={`${btnBase} border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:shadow-primary/20`}
          style={headingFont}
        >
          <UserPlus className="h-3.5 w-3.5" />
          <T>Add Friend</T>
        </button>
      )}
      {friendStatus === "pending_sent" && (
        <button
          onClick={removeFriend}
          disabled={loading}
          className={`${btnBase} border-muted-foreground/30 text-muted-foreground`}
          style={headingFont}
        >
          <Clock className="h-3.5 w-3.5" />
          <T>Request Sent</T>
        </button>
      )}
      {friendStatus === "pending_received" && (
        <button
          onClick={acceptFriendRequest}
          disabled={loading}
          className={`${btnBase} border-emerald-500/40 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20`}
          style={headingFont}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <T>Accept</T>
        </button>
      )}
      {friendStatus === "accepted" && (
        <button
          onClick={removeFriend}
          disabled={loading}
          className={`${btnBase} border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground`}
          style={headingFont}
        >
          <UserMinus className="h-3.5 w-3.5" />
          <T>Unfriend</T>
        </button>
      )}

      {/* Follow button */}
      <button
        onClick={() => !requireLogin() && toggleFollow()}
        disabled={loading}
        className={`${btnBase} ${
          isFollowing
            ? "bg-primary/10 border-primary/40 text-primary hover:bg-primary/20"
            : "border-border text-muted-foreground hover:border-primary hover:text-primary hover:shadow-lg hover:shadow-primary/10"
        }`}
        style={headingFont}
      >
        <Heart className={`h-3.5 w-3.5 ${isFollowing ? "fill-current" : ""}`} />
        {isFollowing ? <T>Following</T> : <T>Follow</T>}
      </button>
    </div>
  );
};

/** Legacy combined component (still used in other places) */
const FriendFollowActions = ({ targetUserId }: Props) => {
  const {
    friendCount,
    followerCount,
    followingCount,
  } = useFriendFollow(targetUserId);

  return (
    <div className="flex flex-col gap-4">
      {/* Counts */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] tracking-[0.15em] uppercase text-muted-foreground" style={headingFont}>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3 w-3" />
          <strong className="text-foreground">{friendCount.toLocaleString()}</strong> <T>Friends</T>
        </span>
        <span className="text-border">•</span>
        <span className="inline-flex items-center gap-1.5">
          <Heart className="h-3 w-3" />
          <strong className="text-foreground">{followerCount.toLocaleString()}</strong> <T>Followers</T>
        </span>
        <span className="text-border">•</span>
        <span className="inline-flex items-center gap-1.5">
          <strong className="text-foreground">{followingCount.toLocaleString()}</strong> <T>Following</T>
        </span>
      </div>

      {/* Action buttons */}
      <FriendFollowButtons targetUserId={targetUserId} />
    </div>
  );
};

export default FriendFollowActions;