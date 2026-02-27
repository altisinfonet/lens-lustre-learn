import { UserPlus, UserMinus, UserCheck, Users, Heart, Clock } from "lucide-react";
import { useFriendFollow } from "@/hooks/useFriendFollow";
import T from "@/components/T";
import { useNavigate } from "react-router-dom";

interface Props {
  targetUserId: string;
}

const FriendFollowActions = ({ targetUserId }: Props) => {
  const {
    friendStatus,
    isFollowing,
    friendCount,
    followerCount,
    followingCount,
    loading,
    isSelf,
    isLoggedIn,
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

  const btnBase =
    "inline-flex items-center gap-2 text-xs tracking-[0.12em] uppercase px-5 py-2.5 border transition-all duration-500 disabled:opacity-50";
  const headingFont = { fontFamily: "var(--font-heading)" };

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

      {/* Action buttons (hidden for self) */}
      {!isSelf && (
        <div className="flex flex-wrap gap-3">
          {/* Friend button */}
          {friendStatus === "none" && (
            <button
              onClick={() => !requireLogin() && sendFriendRequest()}
              disabled={loading}
              className={`${btnBase} border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground`}
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
              className={`${btnBase} border-green-500/50 text-green-600 hover:bg-green-500 hover:text-white`}
              style={headingFont}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <T>Accept Request</T>
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
              <T>Remove Friend</T>
            </button>
          )}

          {/* Follow button */}
          <button
            onClick={() => !requireLogin() && toggleFollow()}
            disabled={loading}
            className={`${btnBase} ${
              isFollowing
                ? "border-accent text-accent-foreground bg-accent/10 hover:bg-accent/20"
                : "border-border hover:border-primary hover:text-primary"
            }`}
            style={headingFont}
          >
            <Heart className={`h-3.5 w-3.5 ${isFollowing ? "fill-current" : ""}`} />
            {isFollowing ? <T>Following</T> : <T>Follow</T>}
          </button>
        </div>
      )}
    </div>
  );
};

export default FriendFollowActions;
