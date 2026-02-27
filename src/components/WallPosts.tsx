import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ThumbsUp, MessageCircle, Send, Trash2, Globe, Users, Lock, MoreHorizontal, ChevronDown, ImagePlus, X, Download } from "lucide-react";
import { compressImageToFiles, getJpegDownloadUrl } from "@/lib/imageCompression";
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

type Privacy = "public" | "friends" | "private";

/** Facebook-style image display: landscape natural, portrait capped at 4:5, square 1:1 */
const FacebookImage = ({ src, downloadUrl }: { src: string; downloadUrl: string }) => {
  const [ratio, setRatio] = useState<number | null>(null);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setRatio(img.naturalWidth / img.naturalHeight);
    }
  };

  // Facebook caps portrait at 4:5 (0.8), landscape shown naturally, very wide capped ~1.91:1
  const clampedRatio = ratio ? Math.max(0.8, Math.min(ratio, 1.91)) : 1;
  const paddingTop = ratio ? `${(1 / clampedRatio) * 100}%` : "100%";

  return (
    <div className="mt-2 relative group/img bg-muted/30">
      <div style={{ paddingTop, position: "relative", width: "100%" }}>
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover cursor-pointer"
          loading="lazy"
          onLoad={handleLoad}
        />
      </div>
      <a
        href={downloadUrl}
        download
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur-sm text-foreground opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-card shadow-sm"
        title="Download JPEG"
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
};

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
  { value: "public", label: "Public", icon: <Globe className="h-3.5 w-3.5" /> },
  { value: "friends", label: "Friends", icon: <Users className="h-3.5 w-3.5" /> },
  { value: "private", label: "Only Me", icon: <Lock className="h-3.5 w-3.5" /> },
];

const Avatar = ({ src, name, size = "md" }: { src: string | null; name: string | null; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-10 h-10 text-sm" };
  if (src) {
    return <img src={src} alt="" className={`${sizeClasses[size]} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground`}>
      {(name || "?")[0]?.toUpperCase()}
    </div>
  );
};

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

    const authorIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profiles } = await profilesPublic()
      .select("id, full_name, avatar_url")
      .in("id", authorIds);
    const profileMap = new Map((profiles as any[] || []).map((p: any) => [p.id, p]));

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
    try {
      const baseName = `${Date.now()}`;
      const { webpFile, jpegFile } = await compressImageToFiles(selectedImage, baseName);
      const webpPath = `${user.id}/${baseName}.webp`;
      const jpegPath = `${user.id}/${baseName}.jpg`;
      const [webpUpload, jpegUpload] = await Promise.all([
        supabase.storage.from("post-images").upload(webpPath, webpFile, { cacheControl: "3600", upsert: false }),
        supabase.storage.from("post-images").upload(jpegPath, jpegFile, { cacheControl: "3600", upsert: false }),
      ]);
      if (webpUpload.error) {
        toast({ title: "Image upload failed", description: webpUpload.error.message, variant: "destructive" });
        setPosting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(webpPath);
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
    } catch (err: any) {
      toast({ title: "Compression failed", description: err.message, variant: "destructive" });
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
        prev.map((p) => p.id === postId ? { ...p, is_liked: false, like_count: p.like_count - 1 } : p)
      );
    } else {
      const { error } = await supabase.from("post_reactions").insert({
        post_id: postId, user_id: user.id, reaction_type: "like",
      });
      if (!error) {
        setPosts((prev) =>
          prev.map((p) => p.id === postId ? { ...p, is_liked: true, like_count: p.like_count + 1 } : p)
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
      post_id: postId, user_id: user.id, content,
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
    <div className="space-y-4">
      {/* ── Facebook-style Compose Box ── */}
      {isOwnWall && user && (
        <div className="bg-card rounded-lg shadow-sm border border-border">
          {/* Top row: avatar + input */}
          <div className="flex items-center gap-3 p-3 pb-0">
            <Avatar src={null} name={user.email} size="md" />
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What's on your mind?"
              className="bg-muted/50 rounded-full px-4 py-2.5 resize-none min-h-[40px] max-h-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/60"
              maxLength={2000}
              rows={1}
            />
          </div>

          {/* Image preview */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          {imagePreview && (
            <div className="relative mx-3 mt-3">
              <img src={imagePreview} alt="Preview" className="w-full max-h-72 object-cover rounded-lg border border-border" />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 p-1.5 bg-card/90 backdrop-blur-sm rounded-full text-muted-foreground hover:text-destructive hover:bg-card transition-all shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Drop zone when no image */}
          {!imagePreview && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragOver(false)}
              className={`mx-3 mt-3 border border-dashed rounded-lg py-6 flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <ImagePlus className={`h-5 w-5 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <span className="text-sm font-medium text-foreground"><T>Add Photo</T></span>
              <span className="text-xs text-muted-foreground"><T>or drag and drop</T></span>
            </div>
          )}

          {/* Divider */}
          <div className="mx-3 mt-3 border-t border-border" />

          {/* Bottom actions row */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-1">
              {/* Photo button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <ImagePlus className="h-5 w-5 text-secondary" />
                <span className="hidden sm:inline"><T>Photo</T></span>
              </button>

              {/* Privacy selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                    {privacyIcon(newPrivacy)}
                    <span className="hidden sm:inline"><T>{PRIVACY_OPTIONS.find((o) => o.value === newPrivacy)?.label || "Public"}</T></span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[180px]">
                  {PRIVACY_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => setNewPrivacy(opt.value)}
                      className="flex items-center gap-2.5 py-2"
                    >
                      {opt.icon}
                      <div>
                        <div className="text-sm font-medium"><T>{opt.label}</T></div>
                        {opt.value === "private" && <div className="text-xs text-muted-foreground"><T>Only you can see this</T></div>}
                        {opt.value === "friends" && <div className="text-xs text-muted-foreground"><T>Your friends</T></div>}
                        {opt.value === "public" && <div className="text-xs text-muted-foreground"><T>Anyone can see</T></div>}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <button
              onClick={createPost}
              disabled={posting || !selectedImage}
              className="px-5 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {posting ? <T>Posting...</T> : <T>Post</T>}
            </button>
          </div>
        </div>
      )}

      {/* ── Posts Feed ── */}
      {loading ? (
        <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
          <span className="text-sm text-muted-foreground animate-pulse"><T>Loading posts...</T></span>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-card rounded-lg shadow-sm border border-border p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isOwnWall
              ? <T>Your wall is empty. Share your first photo above!</T>
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
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="bg-card rounded-lg shadow-sm border border-border"
            >
              {/* ── Post Header ── */}
              <div className="flex items-start gap-2.5 p-3 pb-0">
                <Link to={`/profile/${post.user_id}`} className="shrink-0">
                  <Avatar src={post.author_avatar} name={post.author_name} size="md" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${post.user_id}`}
                    className="text-[15px] font-semibold text-foreground hover:underline leading-tight"
                  >
                    {post.author_name || "User"}
                  </Link>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <span>{timeAgo(post.created_at)}</span>
                    <span>·</span>
                    {privacyIcon(post.privacy)}
                  </div>
                </div>
                {user?.id === post.user_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-full text-muted-foreground hover:bg-muted/50 transition-colors">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[200px]">
                      <DropdownMenuItem
                        onClick={() => deletePost(post.id)}
                        disabled={actionLoading === post.id}
                        className="text-destructive focus:text-destructive py-2.5"
                      >
                        <Trash2 className="h-4 w-4 mr-2.5" />
                        <T>Move to trash</T>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* ── Post Content ── */}
              {post.content && (
                <div className="px-3 pt-2 pb-1">
                  <p className="text-[15px] leading-[1.33] whitespace-pre-wrap text-foreground">
                    {post.content}
                  </p>
                </div>
              )}

              {/* ── Post Image (Facebook-style ratio) ── */}
              {post.image_url && (
                <FacebookImage
                  src={post.image_url}
                  downloadUrl={getJpegDownloadUrl(post.image_url)}
                />
              )}

              {/* ── Reaction & Comment Counts ── */}
              {(post.like_count > 0 || post.comment_count > 0) && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  {post.like_count > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-primary flex items-center justify-center">
                        <ThumbsUp className="h-2.5 w-2.5 text-primary-foreground fill-current" />
                      </div>
                      <span className="text-[15px] text-muted-foreground">{post.like_count}</span>
                    </div>
                  ) : <div />}
                  {post.comment_count > 0 && (
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="text-[15px] text-muted-foreground hover:underline"
                    >
                      {post.comment_count} {post.comment_count === 1 ? "comment" : "comments"}
                    </button>
                  )}
                </div>
              )}

              {/* ── Action Bar (Like / Comment) ── */}
              <div className="mx-3 border-t border-border">
                <div className="flex">
                  <button
                    onClick={() => toggleLike(post.id)}
                    disabled={!user}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md my-1 text-sm font-semibold transition-colors ${
                      post.is_liked
                        ? "text-primary hover:bg-primary/5"
                        : "text-muted-foreground hover:bg-muted/50"
                    } disabled:opacity-40`}
                  >
                    <ThumbsUp className={`h-5 w-5 ${post.is_liked ? "fill-current" : ""}`} />
                    <T>Like</T>
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md my-1 text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <T>Comment</T>
                  </button>
                </div>
              </div>

              {/* ── Comments Section ── */}
              <AnimatePresence>
                {expandedComments.has(post.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="px-3 py-2 space-y-2">
                      {(commentsByPost[post.id] || []).map((c) => (
                        <div key={c.id} className="flex gap-2 group">
                          <Link to={`/profile/${c.user_id}`} className="shrink-0 mt-0.5">
                            <Avatar src={c.author_avatar} name={c.author_name} size="sm" />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <div className="bg-muted rounded-2xl px-3 py-2 inline-block max-w-full">
                              <Link
                                to={`/profile/${c.user_id}`}
                                className="text-[13px] font-semibold text-foreground hover:underline block leading-tight"
                              >
                                {c.author_name || "User"}
                              </Link>
                              <p className="text-[15px] text-foreground leading-[1.33] break-words">
                                {c.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 px-1">
                              <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                              {user?.id === c.user_id && (
                                <button
                                  onClick={() => deleteComment(post.id, c.id)}
                                  className="text-xs text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <T>Delete</T>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* ── New Comment Input ── */}
                      {user && (
                        <div className="flex gap-2 pt-1 pb-1">
                          <Avatar src={null} name={user.email} size="sm" />
                          <div className="flex-1 relative">
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
                              className="w-full bg-muted rounded-full px-4 py-2 pr-10 text-[15px] focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
                            />
                            {(commentInputs[post.id] || "").trim() && (
                              <button
                                onClick={() => submitComment(post.id)}
                                disabled={commentLoading === post.id}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            )}
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
