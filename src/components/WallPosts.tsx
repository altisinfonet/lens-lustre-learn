import { Fragment, useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send, Trash2, Globe, Users, Lock, MoreHorizontal, ChevronDown, ImagePlus, X, Download, Share2, Link2, Copy } from "lucide-react";
import { compressImageToFiles, getJpegDownloadUrl } from "@/lib/imageCompression";
import { scanFileWithToast } from "@/lib/fileSecurityScanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { storageUploadImagePair } from "@/lib/storageUpload";
import { profilesPublic } from "@/lib/profilesPublic";
import { toast } from "@/hooks/use-toast";
import T from "@/components/T";
import { motion, AnimatePresence } from "framer-motion";
import UserBadgeInline from "@/components/UserBadgeInline";
import FacebookPhotoGrid from "@/components/FacebookPhotoGrid";
import AdPlacement from "@/components/AdPlacement";
import EngagementFooter from "@/components/EngagementFooter";
import { Textarea } from "@/components/ui/textarea";
import { getAdminIds, resolveName, resolveBadges } from "@/lib/adminBrand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Privacy = "public" | "friends" | "private";

// FacebookImage replaced by FacebookPhotoGrid component

import ReactionPicker, { ReactionType, REACTION_EMOJI_MAP, getReactionColor } from "@/components/ReactionPicker";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  image_urls: string[];
  privacy: Privacy;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  author_avatar: string | null;
  author_badges: string[];
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  user_reaction: ReactionType | null;
  top_reactions: string[];
}

interface PostComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
  author_badges: string[];
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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
    const [profilesRes, badgesRes, adminIds] = await Promise.all([
      profilesPublic().select("id, full_name, avatar_url").in("id", authorIds),
      supabase.from("user_badges").select("user_id, badge_type").in("user_id", authorIds),
      getAdminIds(),
    ]);
    const profileMap = new Map((profilesRes.data as any[] || []).map((p: any) => [p.id, p]));
    const badgeMap = new Map<string, string[]>();
    (badgesRes.data as any[] || []).forEach((b: any) => {
      const existing = badgeMap.get(b.user_id) || [];
      existing.push(b.badge_type);
      badgeMap.set(b.user_id, existing);
    });

    const postIds = postsData.map((p) => p.id);
    const [reactionsRes, userReactionsRes, commentsCountRes] = await Promise.all([
      supabase.from("post_reactions").select("post_id, reaction_type").in("post_id", postIds),
      user
        ? supabase.from("post_reactions").select("post_id, reaction_type").in("post_id", postIds).eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
    ]);

    const likeCounts: Record<string, number> = {};
    const reactionTypeCounts: Record<string, Record<string, number>> = {};
    (reactionsRes.data || []).forEach((r) => {
      likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1;
      if (!reactionTypeCounts[r.post_id]) reactionTypeCounts[r.post_id] = {};
      reactionTypeCounts[r.post_id][r.reaction_type] = (reactionTypeCounts[r.post_id][r.reaction_type] || 0) + 1;
    });
    const userReactionMap = new Map<string, string>();
    (userReactionsRes.data || []).forEach((r: any) => userReactionMap.set(r.post_id, r.reaction_type));
    const commentCounts: Record<string, number> = {};
    (commentsCountRes.data || []).forEach((c) => {
      commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
    });

    setPosts(
      postsData.map((p) => {
        const userRx = userReactionMap.get(p.id) as ReactionType | undefined;
        const typeCounts = reactionTypeCounts[p.id] || {};
        const topReactions = Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type]) => type);
        return {
          ...p,
          privacy: p.privacy as Privacy,
          author_name: resolveName(p.user_id, profileMap.get(p.user_id)?.full_name, adminIds),
          author_avatar: profileMap.get(p.user_id)?.avatar_url || null,
          author_badges: resolveBadges(p.user_id, badgeMap.get(p.user_id) || [], adminIds),
          like_count: likeCounts[p.id] || 0,
          comment_count: commentCounts[p.id] || 0,
          is_liked: !!userRx,
          user_reaction: userRx || null,
          top_reactions: topReactions,
          image_urls: (p as any).image_urls || (p.image_url ? [p.image_url] : []),
        };
      })
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
    if (selectedImages.length >= 10) {
      toast({ title: "Maximum 10 photos per post", variant: "destructive" });
      return;
    }
    setSelectedImages(prev => [...prev, file]);
    setImagePreviews(prev => [...prev, URL.createObjectURL(file)]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => processFile(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => processFile(file));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const clearImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createPost = async () => {
    if (!user || selectedImages.length === 0) {
      toast({ title: "Please attach at least one photo", variant: "destructive" });
      return;
    }
    setPosting(true);
    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < selectedImages.length; i++) {
        const safe = await scanFileWithToast(selectedImages[i], toast, { allowedTypes: "image" });
        if (!safe) { setPosting(false); return; }
        const baseName = `${Date.now()}_${i}`;
        const { webpFile, jpegFile } = await compressImageToFiles(selectedImages[i], baseName);
        const webpPath = `${user.id}/${baseName}.webp`;
        const jpegPath = `${user.id}/${baseName}.jpg`;
        const uploadResult = await storageUploadImagePair(
          "post-images", webpPath, jpegPath, webpFile, jpegFile, { cacheControl: "3600" }
        );
        uploadedUrls.push(uploadResult.url);
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: newContent.trim(),
        privacy: newPrivacy,
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls,
      } as any);
      if (error) {
        toast({ title: "Failed to post", description: error.message, variant: "destructive" });
      } else {
        setNewContent("");
        clearAllImages();
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

  const handleReact = async (postId: string, reactionType: ReactionType) => {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Remove existing reaction first if any
    if (post.user_reaction) {
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    }

    const { error } = await supabase.from("post_reactions").insert({
      post_id: postId, user_id: user.id, reaction_type: reactionType,
    });
    if (!error) {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const newCount = p.user_reaction ? p.like_count : p.like_count + 1;
          const topReactions = p.top_reactions.includes(reactionType) ? p.top_reactions : [reactionType, ...p.top_reactions].slice(0, 3);
          return { ...p, is_liked: true, user_reaction: reactionType, like_count: newCount, top_reactions: topReactions };
        })
      );
    }
  };

  const handleUnreact = async (postId: string) => {
    if (!user) return;
    await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, is_liked: false, user_reaction: null, like_count: Math.max(0, p.like_count - 1) } : p)
    );
  };

  const shareToWall = async (post: Post) => {
    if (!user) return;
    const sharedContent = `Shared from ${post.author_name || "a user"}:\n\n"${post.content}"`;
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: sharedContent,
      image_url: post.image_url,
      image_urls: post.image_urls,
      privacy: "public",
    } as any);
    if (error) {
      toast({ title: "Failed to share", variant: "destructive" });
    } else {
      toast({ title: "Shared to your wall!" });
      fetchPosts();
    }
  };

  const copyPostLink = (postId: string) => {
    const url = `${window.location.origin}/profile/${posts.find(p => p.id === postId)?.user_id || ""}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard!" });
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
    const [profilesRes, badgesRes, adminIds] = await Promise.all([
      profilesPublic().select("id, full_name, avatar_url").in("id", authorIds),
      supabase.from("user_badges").select("user_id, badge_type").in("user_id", authorIds),
      getAdminIds(),
    ]);
    const profileMap = new Map((profilesRes.data as any[] || []).map((p: any) => [p.id, p]));
    const badgeMap = new Map<string, string[]>();
    (badgesRes.data as any[] || []).forEach((b: any) => {
      const existing = badgeMap.get(b.user_id) || [];
      existing.push(b.badge_type);
      badgeMap.set(b.user_id, existing);
    });
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: data.map((c) => ({
        ...c,
        author_name: resolveName(c.user_id, profileMap.get(c.user_id)?.full_name, adminIds),
        author_avatar: profileMap.get(c.user_id)?.avatar_url || null,
        author_badges: resolveBadges(c.user_id, badgeMap.get(c.user_id) || [], adminIds),
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

          {/* Image previews */}
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          {imagePreviews.length > 0 && (
            <div className="mx-3 mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{imagePreviews.length} photo{imagePreviews.length > 1 ? "s" : ""} selected</span>
                <button onClick={clearAllImages} className="text-xs text-destructive hover:underline"><T>Remove all</T></button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-border">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => clearImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-card/90 backdrop-blur-sm rounded-full text-muted-foreground hover:text-destructive hover:bg-card transition-all shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 10 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-md border border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Drop zone when no image */}
          {imagePreviews.length === 0 && (
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
              disabled={posting || selectedImages.length === 0}
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
            <Fragment key={post.id}>
              <motion.div
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
                  <span className="flex items-center gap-1">
                    <Link
                      to={`/profile/${post.user_id}`}
                      className="text-[15px] font-semibold text-foreground hover:underline leading-tight"
                    >
                      {post.author_name || "User"}
                    </Link>
                    {post.author_badges.length > 0 && <UserBadgeInline badges={post.author_badges} />}
                  </span>
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

              {/* ── Post Content with hashtag highlighting ── */}
              {post.content && (
                <div className="px-3 pt-2 pb-1">
                  <p className="text-[15px] leading-[1.33] whitespace-pre-wrap text-foreground">
                    {post.content.split(/(#\w+)/g).map((part, i) =>
                      part.startsWith("#") ? (
                        <span key={i} className="text-primary font-medium">{part}</span>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </p>
                </div>
              )}

              {/* ── Post Photos (Facebook-style grid) ── */}
              {(post.image_urls.length > 0 || post.image_url) && (
                <FacebookPhotoGrid
                  urls={post.image_urls.length > 0 ? post.image_urls : (post.image_url ? [post.image_url] : [])}
                />
              )}

              {/* ── Reaction & Comment Counts ── */}
              {(post.like_count > 0 || post.comment_count > 0) && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  {post.like_count > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1">
                        {(post.top_reactions.length > 0 ? post.top_reactions : ["like"]).map((type, i) => (
                          <span key={type} className="text-base leading-none" style={{ zIndex: 3 - i }}>
                            {REACTION_EMOJI_MAP[type] || "👍"}
                          </span>
                        ))}
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

              {/* ── Engagement Stats ── */}
              <EngagementFooter id={post.id} createdAt={post.created_at} className="border-t border-border mx-3" />

              {/* ── Action Bar (React / Comment / Share) ── */}
              <div className="mx-3 border-t border-border">
                <div className="flex">
                  <ReactionPicker
                    currentReaction={post.user_reaction}
                    onReact={(type) => handleReact(post.id, type)}
                    onUnreact={() => handleUnreact(post.id)}
                    disabled={!user}
                  />
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md my-1 text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <T>Comment</T>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md my-1 text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">
                        <Share2 className="h-5 w-5" />
                        <T>Share</T>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => shareToWall(post)} className="py-2.5 cursor-pointer">
                        <Share2 className="h-4 w-4 mr-2.5" />
                        <T>Share to your wall</T>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyPostLink(post.id)} className="py-2.5 cursor-pointer">
                        <Copy className="h-4 w-4 mr-2.5" />
                        <T>Copy link</T>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                              <span className="flex items-center gap-1">
                                <Link
                                  to={`/profile/${c.user_id}`}
                                  className="text-[13px] font-semibold text-foreground hover:underline leading-tight"
                                >
                                  {c.author_name || "User"}
                                </Link>
                                {c.author_badges.length > 0 && <UserBadgeInline badges={c.author_badges} />}
                              </span>
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

              {i === 1 && <AdPlacement placement="between-entries" className="my-4" />}
            </Fragment>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};

export default WallPosts;
