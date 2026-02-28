import { useState, useEffect } from "react";
import { MessageCircle, Reply, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { profilesPublic } from "@/lib/profilesPublic";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import UserBadgeInline from "@/components/UserBadgeInline";
import { getAdminIds, resolveName } from "@/lib/adminBrand";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  badges: string[];
  replies: Comment[];
}

interface Props {
  articleId?: string;
  entryId?: string;
}

const Avatar = ({ src, name, size = "sm" }: { src: string | null | undefined; name: string | null | undefined; size?: "xs" | "sm" | "md" }) => {
  const sizeClasses = { xs: "w-6 h-6 text-[10px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm" };
  if (src) {
    return <img src={src} alt="" className={`${sizeClasses[size]} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground`}>
      {(name || "?")[0]?.toUpperCase()}
    </div>
  );
};

const CommentsSection = ({ articleId, entryId }: Props) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    const query = supabase
      .from("comments")
      .select("id, user_id, content, parent_id, created_at")
      .order("created_at", { ascending: true });

    if (articleId) query.eq("article_id", articleId);
    if (entryId) query.eq("entry_id", entryId);

    const { data } = await query;
    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.map((c) => c.user_id))];
    const [profilesRes, badgesRes, adminIds] = await Promise.all([
      profilesPublic().select("id, full_name, avatar_url").in("id", userIds),
      supabase.from("user_badges").select("user_id, badge_type").in("user_id", userIds),
      getAdminIds(),
    ]);

    const profileMap = new Map((profilesRes.data as any[] || []).map((p: any) => [p.id, p]));
    const badgeMap = new Map<string, string[]>();
    (badgesRes.data as any[] || []).forEach((b: any) => {
      const existing = badgeMap.get(b.user_id) || [];
      existing.push(b.badge_type);
      badgeMap.set(b.user_id, existing);
    });

    const allComments = data.map((c) => ({
      ...c,
      profile: {
        full_name: resolveName(c.user_id, profileMap.get(c.user_id)?.full_name ?? null, adminIds),
        avatar_url: profileMap.get(c.user_id)?.avatar_url ?? null,
      },
      badges: badgeMap.get(c.user_id) || [],
      replies: [] as Comment[],
    }));

    const rootComments: Comment[] = [];
    const commentMap = new Map<string, Comment>();
    allComments.forEach((c) => commentMap.set(c.id, c));
    allComments.forEach((c) => {
      if (c.parent_id && commentMap.has(c.parent_id)) {
        commentMap.get(c.parent_id)!.replies.push(c);
      } else {
        rootComments.push(c);
      }
    });

    setComments(rootComments);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [articleId, entryId]);

  const handlePost = async (parentId: string | null = null) => {
    if (!user) return;
    const text = parentId ? replyText.trim() : newComment.trim();
    if (!text) return;
    if (text.length > 2000) {
      toast({ title: "Comment too long (max 2000 chars)", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      content: text,
      parent_id: parentId,
      article_id: articleId || null,
      entry_id: entryId || null,
    } as any);

    if (error) {
      toast({ title: "Failed to post comment", description: error.message, variant: "destructive" });
    } else {
      if (parentId) { setReplyText(""); setReplyTo(null); }
      else setNewComment("");
      await fetchComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      await fetchComments();
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const totalCount = comments.reduce((acc, c) => acc + 1 + c.replies.length, 0);

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
    <div className={`${depth > 0 ? "ml-10" : ""}`}>
      <div className="flex gap-2 group py-1">
        <Link to={`/profile/${comment.user_id}`} className="shrink-0 mt-0.5">
          <Avatar src={comment.profile?.avatar_url} name={comment.profile?.full_name} size={depth > 0 ? "xs" : "sm"} />
        </Link>
        <div className="flex-1 min-w-0">
          {/* Bubble */}
          <div className="bg-muted rounded-2xl px-3 py-2 inline-block max-w-full">
            <Link
              to={`/profile/${comment.user_id}`}
              className="text-[13px] font-semibold text-foreground hover:underline leading-tight inline"
            >
              {comment.profile?.full_name || "Anonymous"}
            </Link>
            {comment.badges.length > 0 && (
              <span className="ml-1"><UserBadgeInline badges={comment.badges} /></span>
            )}
            <p className="text-[15px] text-foreground leading-[1.33] break-words">
              {comment.content}
            </p>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-3 mt-0.5 px-1">
            <span className="text-xs text-muted-foreground font-medium">{timeAgo(comment.created_at)}</span>
            {user && (
              <button
                onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyText(""); }}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline transition-colors"
              >
                Reply
              </button>
            )}
            {user?.id === comment.user_id && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive hover:underline transition-colors opacity-0 group-hover:opacity-100"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply input */}
          {replyTo === comment.id && (
            <div className="flex gap-2 mt-2">
              <Avatar src={null} name={user?.email} size="xs" />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  maxLength={2000}
                  className="w-full bg-muted rounded-full px-3 py-1.5 pr-9 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
                  onKeyDown={(e) => e.key === "Enter" && handlePost(comment.id)}
                  autoFocus
                />
                {replyText.trim() && (
                  <button
                    onClick={() => handlePost(comment.id)}
                    disabled={submitting}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies.map((reply) => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );

  return (
    <div className="mt-8 bg-card rounded-lg shadow-sm border border-border">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-border">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          Comments
          {totalCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({totalCount})</span>
          )}
        </h3>
      </div>

      <div className="p-4">
        {/* New comment input */}
        {user ? (
          <div className="flex gap-2 mb-4">
            <Avatar src={null} name={user.email} size="sm" />
            <div className="flex-1 relative">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                maxLength={2000}
                className="w-full bg-muted rounded-full px-4 py-2.5 pr-10 text-[15px] focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handlePost();
                  }
                }}
              />
              {newComment.trim() && (
                <button
                  onClick={() => handlePost()}
                  disabled={submitting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-muted rounded-lg p-4 text-center mb-4">
            <p className="text-sm text-muted-foreground mb-2">Log in to join the conversation</p>
            <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
              Login
            </Link>
          </div>
        )}

        {/* Comments list */}
        {loading ? (
          <div className="text-sm text-muted-foreground animate-pulse py-6 text-center">Loading comments…</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsSection;
