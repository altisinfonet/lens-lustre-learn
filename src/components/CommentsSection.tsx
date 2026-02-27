import { useState, useEffect } from "react";
import { MessageSquare, Reply, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { profilesPublic } from "@/lib/profilesPublic";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  replies: Comment[];
}

interface Props {
  articleId?: string;
  entryId?: string;
}

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

    // Fetch profiles
    const userIds = [...new Set(data.map((c) => c.user_id))];
    const { data: profiles } = await profilesPublic()
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profiles as any[] || []).map((p: any) => [p.id, p]));

    // Build tree
    const allComments = data.map((c) => ({
      ...c,
      profile: profileMap.get(c.user_id) || null,
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
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
    <div className={`${depth > 0 ? "ml-6 md:ml-10 border-l border-border pl-4 md:pl-6" : ""}`}>
      <div className="py-4">
        <div className="flex items-center gap-3 mb-2">
          {comment.profile?.avatar_url ? (
            <img src={comment.profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] text-muted-foreground">
              {(comment.profile?.full_name || "?")[0].toUpperCase()}
            </div>
          )}
          <Link
            to={`/profile/${comment.user_id}`}
            className="text-xs font-medium hover:text-primary transition-colors"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {comment.profile?.full_name || "Anonymous"}
          </Link>
          <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            {timeAgo(comment.created_at)}
          </span>
        </div>

        <p className="text-sm text-foreground/85 leading-relaxed mb-2" style={{ fontFamily: "var(--font-body)" }}>
          {comment.content}
        </p>

        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyText(""); }}
              className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <Reply className="h-3 w-3" /> Reply
            </button>
          )}
          {user?.id === comment.user_id && (
            <button
              onClick={() => handleDelete(comment.id)}
              className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>

        {/* Reply form */}
        {replyTo === comment.id && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              maxLength={2000}
              className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm transition-colors duration-500"
              style={{ fontFamily: "var(--font-body)" }}
              onKeyDown={(e) => e.key === "Enter" && handlePost(comment.id)}
            />
            <button
              onClick={() => handlePost(comment.id)}
              disabled={submitting || !replyText.trim()}
              className="p-2 text-primary hover:opacity-70 transition-opacity disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies.map((reply) => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );

  return (
    <div className="mt-16 border-t border-border pt-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-px bg-primary" />
        <span className="text-[10px] tracking-[0.3em] uppercase text-primary inline-flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <MessageSquare className="h-3.5 w-3.5" />
          Comments ({comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)})
        </span>
      </div>

      {/* New comment form */}
      {user ? (
        <div className="flex gap-3 mb-8">
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              maxLength={2000}
              rows={3}
              className="w-full bg-transparent border border-border focus:border-primary outline-none p-4 text-sm transition-colors duration-500 resize-none"
              style={{ fontFamily: "var(--font-body)" }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground">{newComment.length}/2000</span>
              <button
                onClick={() => handlePost()}
                disabled={submitting || !newComment.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-[10px] tracking-[0.2em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <Send className="h-3 w-3" />
                {submitting ? "Posting…" : "Post Comment"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-border p-6 text-center mb-8">
          <p className="text-sm text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>
            Log in to join the conversation
          </p>
          <Link
            to="/login"
            className="text-xs tracking-[0.15em] uppercase text-primary hover:underline"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Login
          </Link>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading comments…</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 border border-border">
          <MessageSquare className="h-6 w-6 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            No comments yet. Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
