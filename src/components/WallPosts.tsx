import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Send, Trash2, Globe, Users, Lock, MoreHorizontal, ChevronDown, ImagePlus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { profilesPublic } from "@/lib/profilesPublic";
import { toast } from "@/hooks/use-toast";
import T from "@/components/T";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const headingFont = { fontFamily: "var(--font-heading)" };
const bodyFont = { fontFamily: "var(--font-body)" };
const displayFont = { fontFamily: "var(--font-display)" };

type Privacy = "public" | "friends" | "private";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  privacy: Privacy;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  author_avatar: string | null;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
}

interface PostComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
}

interface WallPostsProps {
  targetUserId: string;
  isOwnWall: boolean;
}

const PRIVACY_OPTIONS: { value: Privacy; label: string; icon: React.ReactNode }[] = [
  { value: "public", label: "Public", icon: <Globe className="h-3 w-3" /> },
  { value: "friends", label: "Friends", icon: <Users className="h-3 w-3" /> },
  { value: "private", label: "Only Me", icon: <Lock className="h-3 w-3" /> },
];

const WallPosts = ({ targetUserId, isOwnWall }: WallPostsProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newPrivacy, setNewPrivacy] = useState<Privacy>("public");
  const [posting, setPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    const { data: postsData, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !postsData) {
      setLoading(false);
      return;
    }

    // Get author profiles
    const authorIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profiles } = await profilesPublic()
      .select("id, full_name, avatar_url")
      .in("id", authorIds);
    const profileMap = new Map((profiles as any[] || []).map((p: any) => [p.id, p]));

    // Get reaction counts & user's reactions
    const postIds = postsData.map((p) => p.id);
    const [reactionsRes, userReactionsRes, commentsCountRes] = await Promise.all([
      supabase.from("post_reactions").select("post_id").in("post_id", postIds),
      user
        ? supabase.from("post_reactions").select("post_id").in("post_id", postIds).eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
    ]);

    const likeCounts: Record<string, number> = {};
    (reactionsRes.data || []).forEach((r) => {
      likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1;
    });

    const userLikedSet = new Set((userReactionsRes.data || []).map((r) => r.post_id));

    const commentCounts: Record<string, number> = {};
    (commentsCountRes.data || []).forEach((c) => {
      commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
    });

    setPosts(
      postsData.map((p) => ({
        ...p,
        privacy: p.privacy as Privacy,
        author_name: profileMap.get(p.user_id)?.full_name || null,
        author_avatar: profileMap.get(p.user_id)?.avatar_url || null,
        like_count: likeCounts[p.id] || 0,
        comment_count: commentCounts[p.id] || 0,
        is_liked: userLikedSet.has(p.id),
      }))
    );
    setLoading(false);
  }, [targetUserId, user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Only image files are allowed", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createPost = async () => {
    if (!user || !selectedImage) {
      toast({ title: "Please attach a photo to your post", variant: "destructive" });
      return;
    }
    setPosting(true);

    // Upload image
    const ext = selectedImage.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, selectedImage, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      toast({ title: "Image upload failed", description: uploadError.message, variant: "destructive" });
      setPosting(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: newContent.trim(),
      privacy: newPrivacy,
      image_url: urlData.publicUrl,
    });
    if (error) {
      toast({ title: "Failed to post", description: error.message, variant: "destructive" });
    } else {
      setNewContent("");
      clearImage();
      await fetchPosts();
    }
    setPosting(false);
  };

  const deletePost = async (postId: string) => {
    setActionLoading(postId);
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
    setActionLoading(null);
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.is_liked) {
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, is_liked: false, like_count: p.like_count - 1 } : p
        )
      );
    } else {
      const { error } = await supabase.from("post_reactions").insert({
        post_id: postId,
        user_id: user.id,
        reaction_type: "like",
      });
      if (!error) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, is_liked: true, like_count: p.like_count + 1 } : p
          )
        );
      }
    }
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!data) return;
    const authorIds = [...new Set(data.map((c) => c.user_id))];
    const { data: profiles } = await profilesPublic()
      .select("id, full_name, avatar_url")
      .in("id", authorIds);
    const profileMap = new Map((profiles as any[] || []).map((p: any) => [p.id, p]));

    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: data.map((c) => ({
        ...c,
        author_name: profileMap.get(c.user_id)?.full_name || null,
        author_avatar: profileMap.get(c.user_id)?.avatar_url || null,
      })),
    }));
  };

  const toggleComments = async (postId: string) => {
    const newSet = new Set(expandedComments);
    if (newSet.has(postId)) {
      newSet.delete(postId);
    } else {
      newSet.add(postId);
      if (!commentsByPost[postId]) {
        await loadComments(postId);
      }
    }
    setExpandedComments(newSet);
  };

  const submitComment = async (postId: string) => {
    if (!user) return;
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    setCommentLoading(postId);
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      content,
    });
    if (error) {
      toast({ title: "Failed to comment", description: error.message, variant: "destructive" });
    } else {
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      await loadComments(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
      );
      if (!expandedComments.has(postId)) {
        setExpandedComments((prev) => new Set(prev).add(postId));
      }
    }
    setCommentLoading(null);
  };

  const deleteComment = async (postId: string, commentId: string) => {
    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
    if (!error) {
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
      }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p))
      );
    }
  };

  const privacyIcon = (p: Privacy) => {
    switch (p) {
      case "public": return <Globe className="h-3 w-3" />;
      case "friends": return <Users className="h-3 w-3" />;
      case "private": return <Lock className="h-3 w-3" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Compose box — only on own wall */}
      {isOwnWall && user && (
        <div className="border border-border p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-px bg-primary" />
            <span className="text-[9px] tracking-[0.3em] uppercase text-primary" style={headingFont}>
              <T>Share a photo</T>
            </span>
          </div>

          {/* Image upload area */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          {imagePreview ? (
            <div className="relative group">
              <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover rounded-sm border border-border" />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm border border-border rounded-full text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragOver(false)}
              className={`w-full border-2 border-dashed transition-all duration-300 py-8 flex flex-col items-center gap-2 ${
                isDragOver
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary"
              }`}
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-[10px] tracking-[0.15em] uppercase" style={headingFont}><T>{isDragOver ? "Drop image here" : "Click or drag a photo"}</T></span>
              <span className="text-[9px] text-muted-foreground" style={bodyFont}><T>Required · Max 5MB</T></span>
            </button>
          )}

          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Add a caption (optional)..."
            className="bg-transparent resize-none min-h-[60px]"
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            {/* Privacy selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 border border-border hover:border-primary/50 transition-all duration-300" style={headingFont}>
                  {privacyIcon(newPrivacy)}
                  <T>{PRIVACY_OPTIONS.find((o) => o.value === newPrivacy)?.label || "Public"}</T>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                {PRIVACY_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setNewPrivacy(opt.value)}
                    className="flex items-center gap-2 text-xs"
                  >
                    {opt.icon}
                    <T>{opt.label}</T>
                    {opt.value === "private" && <span className="text-[9px] text-muted-foreground ml-auto"><T>Only you</T></span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={createPost}
              disabled={posting || !selectedImage}
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 disabled:opacity-50"
              style={headingFont}
            >
              <Send className="h-3 w-3" />
              {posting ? <T>Posting...</T> : <T>Post</T>}
            </button>
          </div>
        </div>
      )}

      {/* Posts feed */}
      {loading ? (
        <div className="text-center py-12">
          <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={headingFont}>
            <T>Loading posts...</T>
          </span>
        </div>
      ) : posts.length === 0 ? (
        <div className="border border-dashed border-border p-10 text-center">
          <MessageCircle className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground" style={bodyFont}>
            {isOwnWall
              ? <T>Your wall is empty. Share your first post above!</T>
              : <T>No posts to show yet.</T>}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="border border-border"
            >
              {/* Post header */}
              <div className="flex items-center gap-3 p-4 pb-0">
                <Link to={`/profile/${post.user_id}`} className="shrink-0">
                  {post.author_avatar ? (
                    <img src={post.author_avatar} alt="" className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] text-primary" style={displayFont}>
                        {(post.author_name || "?")[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${post.user_id}`}
                    className="text-sm font-light hover:text-primary transition-colors block truncate"
                    style={headingFont}
                  >
                    {post.author_name || "User"}
                  </Link>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground" style={headingFont}>
                    <span>{timeAgo(post.created_at)}</span>
                    <span className="inline-flex items-center gap-1">
                      {privacyIcon(post.privacy)}
                    </span>
                  </div>
                </div>
                {/* Actions menu for own posts */}
                {user?.id === post.user_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => deletePost(post.id)}
                        disabled={actionLoading === post.id}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        <T>Delete Post</T>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Post content */}
              <div className="px-4 py-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={bodyFont}>
                  {post.content}
                </p>
                {post.image_url && (
                  <img src={post.image_url} alt="" className="mt-3 rounded-sm max-h-96 w-full object-cover" />
                )}
              </div>

              {/* Like & Comment counts */}
              {(post.like_count > 0 || post.comment_count > 0) && (
                <div className="flex items-center gap-4 px-4 pb-2 text-[10px] text-muted-foreground" style={headingFont}>
                  {post.like_count > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3 fill-primary text-primary" />
                      {post.like_count}
                    </span>
                  )}
                  {post.comment_count > 0 && (
                    <button onClick={() => toggleComments(post.id)} className="hover:text-foreground transition-colors">
                      {post.comment_count} <T>{post.comment_count === 1 ? "comment" : "comments"}</T>
                    </button>
                  )}
                </div>
              )}

              {/* Action bar */}
              <div className="flex border-t border-border divide-x divide-border">
                <button
                  onClick={() => toggleLike(post.id)}
                  disabled={!user}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] tracking-[0.1em] uppercase transition-all duration-300 ${
                    post.is_liked
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  } disabled:opacity-40`}
                  style={headingFont}
                >
                  <Heart className={`h-3.5 w-3.5 ${post.is_liked ? "fill-current" : ""}`} />
                  <T>Like</T>
                </button>
                <button
                  onClick={() => toggleComments(post.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-all duration-300"
                  style={headingFont}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <T>Comment</T>
                </button>
              </div>

              {/* Comments section */}
              <AnimatePresence>
                {expandedComments.has(post.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-4 space-y-3">
                      {(commentsByPost[post.id] || []).map((c) => (
                        <div key={c.id} className="flex gap-2.5">
                          <Link to={`/profile/${c.user_id}`} className="shrink-0">
                            {c.author_avatar ? (
                              <img src={c.author_avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-[9px] text-muted-foreground">{(c.author_name || "?")[0]}</span>
                              </div>
                            )}
                          </Link>
                          <div className="flex-1 min-w-0">
                            <div className="bg-muted/50 rounded-sm px-3 py-2">
                              <Link
                                to={`/profile/${c.user_id}`}
                                className="text-[11px] font-medium hover:text-primary transition-colors"
                                style={headingFont}
                              >
                                {c.author_name || "User"}
                              </Link>
                              <p className="text-xs text-foreground/80 mt-0.5" style={bodyFont}>
                                {c.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 mt-1 px-1">
                              <span className="text-[9px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                              {user?.id === c.user_id && (
                                <button
                                  onClick={() => deleteComment(post.id, c.id)}
                                  className="text-[9px] text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <T>Delete</T>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* New comment input */}
                      {user && (
                        <div className="flex gap-2.5 pt-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[9px] text-primary" style={displayFont}>
                              {user.email?.[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div className="flex-1 flex gap-2">
                            <input
                              value={commentInputs[post.id] || ""}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  submitComment(post.id);
                                }
                              }}
                              placeholder="Write a comment..."
                              className="flex-1 bg-muted/50 border border-border rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-primary/50 transition-colors"
                              style={bodyFont}
                            />
                            <button
                              onClick={() => submitComment(post.id)}
                              disabled={commentLoading === post.id || !commentInputs[post.id]?.trim()}
                              className="p-1.5 text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};

export default WallPosts;
