import { Fragment, useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Send, Globe, Users, Rss, RefreshCw, Loader2, ArrowUp, Download, Share2, Copy } from "lucide-react";
import { getJpegDownloadUrl } from "@/lib/imageCompression";
import ReactionPicker, { ReactionType, REACTION_EMOJI_MAP } from "@/components/ReactionPicker";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { profilesPublic } from "@/lib/profilesPublic";
import Breadcrumbs from "@/components/Breadcrumbs";
import AdPlacement from "@/components/AdPlacement";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import T from "@/components/T";
import { motion, AnimatePresence } from "framer-motion";
import UserBadgeInline from "@/components/UserBadgeInline";
import { getAdminIds, resolveName, resolveBadges } from "@/lib/adminBrand";
import { useActivityLog } from "@/hooks/useActivityLog";

const headingFont = { fontFamily: "var(--font-heading)" };
const bodyFont = { fontFamily: "var(--font-body)" };
const displayFont = { fontFamily: "var(--font-display)" };

const PAGE_SIZE = 15;

/** Facebook-style image: landscape natural, portrait capped at 4:5, wide capped at 1.91:1 */
const FeedImage = ({ src }: { src: string }) => {
  const [ratio, setRatio] = useState<number | null>(null);
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
  };
  const clamped = ratio ? Math.max(0.8, Math.min(ratio, 1.91)) : 1;
  const paddingTop = ratio ? `${(1 / clamped) * 100}%` : "100%";

  return (
    <div className="mt-3 relative group/img bg-muted/30 rounded-sm overflow-hidden">
      <div style={{ paddingTop, position: "relative", width: "100%" }}>
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onLoad={handleLoad}
        />
      </div>
      <a
        href={getJpegDownloadUrl(src)}
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

interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  privacy: string;
  created_at: string;
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

const Feed = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const { log } = useActivityLog();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [relevantUserIds, setRelevantUserIds] = useState<string[]>([]);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Back to top visibility
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    if (!authLoading && isAdmin) navigate("/admin");
  }, [user, authLoading, isAdmin, navigate]);

  // Enrich raw posts with profiles, likes, comments
  const enrichPosts = useCallback(async (postsData: any[]): Promise<FeedPost[]> => {
    if (!user || postsData.length === 0) return [];

    const authorIds = [...new Set(postsData.map((p) => p.user_id))];
    const postIds = postsData.map((p) => p.id);

    const [profilesRes, badgesRes, reactionsRes, userReactionsRes, commentsCountRes, adminIds] = await Promise.all([
      profilesPublic().select("id, full_name, avatar_url").in("id", authorIds),
      supabase.from("user_badges").select("user_id, badge_type").in("user_id", authorIds),
      supabase.from("post_reactions").select("post_id, reaction_type").in("post_id", postIds),
      supabase.from("post_reactions").select("post_id, reaction_type").in("post_id", postIds).eq("user_id", user.id),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
      getAdminIds(),
    ]);

    const profileMap = new Map((profilesRes.data as any[] || []).map((p: any) => [p.id, p]));
    const badgeMap = new Map<string, string[]>();
    (badgesRes.data as any[] || []).forEach((b: any) => {
      const existing = badgeMap.get(b.user_id) || [];
      existing.push(b.badge_type);
      badgeMap.set(b.user_id, existing);
    });
    const likeCounts: Record<string, number> = {};
    const reactionTypeCounts: Record<string, Record<string, number>> = {};
    (reactionsRes.data || []).forEach((r: any) => {
      likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1;
      if (!reactionTypeCounts[r.post_id]) reactionTypeCounts[r.post_id] = {};
      reactionTypeCounts[r.post_id][r.reaction_type] = (reactionTypeCounts[r.post_id][r.reaction_type] || 0) + 1;
    });
    const userReactionMap = new Map<string, string>();
    (userReactionsRes.data || []).forEach((r: any) => userReactionMap.set(r.post_id, r.reaction_type));
    const commentCounts: Record<string, number> = {};
    (commentsCountRes.data || []).forEach((c) => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });

    return postsData.map((p) => {
      const userRx = userReactionMap.get(p.id) as ReactionType | undefined;
      const typeCounts = reactionTypeCounts[p.id] || {};
      const topReactions = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);
      return {
        ...p,
        author_name: resolveName(p.user_id, profileMap.get(p.user_id)?.full_name ?? null, adminIds),
        author_avatar: profileMap.get(p.user_id)?.avatar_url || null,
        author_badges: resolveBadges(p.user_id, badgeMap.get(p.user_id) || [], adminIds),
        like_count: likeCounts[p.id] || 0,
        comment_count: commentCounts[p.id] || 0,
        is_liked: !!userRx,
        user_reaction: userRx || null,
        top_reactions: topReactions,
      };
    });
  }, [user]);

  // Fetch relevant user IDs (follows + friends + self)
  const fetchRelevantUsers = useCallback(async () => {
    if (!user) return [];
    const [followsRes, friendsRes] = await Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      supabase.from("friendships").select("requester_id, addressee_id").eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    ]);
    const followedIds = new Set((followsRes.data || []).map((f) => f.following_id));
    const friendIds = new Set<string>();
    (friendsRes.data || []).forEach((f) => {
      if (f.requester_id === user.id) friendIds.add(f.addressee_id);
      else friendIds.add(f.requester_id);
    });
    return Array.from(new Set([...followedIds, ...friendIds, user.id]));
  }, [user]);

  // Initial load
  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);

    const userIds = await fetchRelevantUsers();
    setRelevantUserIds(userIds);

    if (userIds.length === 0) {
      setPosts([]);
      setLoading(false);
      setRefreshing(false);
      setHasMore(false);
      return;
    }

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .in("user_id", userIds)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setHasMore(false);
    } else {
      const enriched = await enrichPosts(postsData);
      setPosts(enriched);
      setHasMore(postsData.length === PAGE_SIZE);
    }

    setLoading(false);
    setRefreshing(false);
  }, [user, fetchRelevantUsers, enrichPosts]);

  // Load more (cursor-based using created_at of last post)
  const loadMore = useCallback(async () => {
    if (!user || loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);

    const lastPost = posts[posts.length - 1];
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .in("user_id", relevantUserIds)
      .lt("created_at", lastPost.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (!postsData || postsData.length === 0) {
      setHasMore(false);
    } else {
      const enriched = await enrichPosts(postsData);
      setPosts((prev) => [...prev, ...enriched]);
      setHasMore(postsData.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [user, loadingMore, hasMore, posts, relevantUserIds, enrichPosts]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  // Realtime: prepend new posts from relevant users
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('feed-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const newPost = payload.new as any;
          if (relevantUserIds.includes(newPost.user_id)) {
            const enriched = await enrichPosts([newPost]);
            if (enriched.length > 0) {
              setPosts((prev) => {
                if (prev.some((p) => p.id === enriched[0].id)) return prev;
                return [enriched[0], ...prev];
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setPosts((prev) => prev.filter((p) => p.id !== deletedId));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, relevantUserIds, enrichPosts]);

  const handleReact = async (postId: string, reactionType: ReactionType) => {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    if (post.user_reaction) {
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    }
    const { error } = await supabase.from("post_reactions").insert({ post_id: postId, user_id: user.id, reaction_type: reactionType });
    if (!error) {
      setPosts((prev) => prev.map((p) => {
        if (p.id !== postId) return p;
        const newCount = p.user_reaction ? p.like_count : p.like_count + 1;
        const topReactions = p.top_reactions.includes(reactionType) ? p.top_reactions : [reactionType, ...p.top_reactions].slice(0, 3);
        return { ...p, is_liked: true, user_reaction: reactionType, like_count: newCount, top_reactions: topReactions };
      }));
    }
  };

  const handleUnreact = async (postId: string) => {
    if (!user) return;
    await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, is_liked: false, user_reaction: null, like_count: Math.max(0, p.like_count - 1) } : p));
  };

  const shareToWall = async (post: FeedPost) => {
    if (!user) return;
    const sharedContent = `Shared from ${post.author_name || "a user"}:\n\n"${post.content}"`;
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: sharedContent,
      image_url: post.image_url,
      privacy: "public",
    });
    if (error) {
      toast({ title: "Failed to share", variant: "destructive" });
    } else {
      toast({ title: "Shared to your wall!" });
    }
  };

  const copyPostLink = (post: FeedPost) => {
    const url = `${window.location.origin}/profile/${post.user_id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard!" });
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(30);
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
        author_name: resolveName(c.user_id, profileMap.get(c.user_id)?.full_name ?? null, adminIds),
        author_avatar: profileMap.get(c.user_id)?.avatar_url || null,
        author_badges: resolveBadges(c.user_id, badgeMap.get(c.user_id) || [], adminIds),
      })),
    }));
  };

  const toggleComments = async (postId: string) => {
    const s = new Set(expandedComments);
    if (s.has(postId)) { s.delete(postId); } else { s.add(postId); if (!commentsByPost[postId]) await loadComments(postId); }
    setExpandedComments(s);
  };

  const submitComment = async (postId: string) => {
    if (!user) return;
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    setCommentLoading(postId);
    const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content });
    if (error) { toast({ title: "Failed to comment", variant: "destructive" }); }
    else {
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      await loadComments(postId);
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
      if (!expandedComments.has(postId)) setExpandedComments((prev) => new Set(prev).add(postId));
    }
    setCommentLoading(null);
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

  const privacyIcon = (p: string) => p === "friends" ? <Users className="h-3 w-3" /> : <Globe className="h-3 w-3" />;

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={headingFont}><T>Loading...</T></span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-14 max-w-6xl">
        <Breadcrumbs items={[{ label: "News Feed" }]} className="mb-6" />
        <div>
        {/* Main feed column */}
        <div className="max-w-2xl min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-px bg-primary" />
              <span className="text-[9px] tracking-[0.3em] uppercase text-primary" style={headingFont}>
                <Rss className="h-3 w-3 inline mr-1.5" /><T>News Feed</T>
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-light tracking-tight" style={displayFont}>
              <T>Your Feed</T>
            </h1>
          </div>
          <button
            onClick={() => fetchFeed(true)}
            disabled={refreshing}
            className="p-2 text-muted-foreground hover:text-primary transition-colors disabled:animate-spin"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="text-center py-16">
            <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={headingFont}><T>Loading feed...</T></span>
          </div>
        ) : posts.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center">
            <Rss className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2" style={bodyFont}><T>Your feed is empty</T></p>
            <p className="text-xs text-muted-foreground" style={bodyFont}><T>Follow people or add friends to see their posts here.</T></p>
            <Link to="/discover" className="inline-block mt-4 text-[10px] tracking-[0.15em] uppercase text-primary hover:underline" style={headingFont}>
              <T>Discover photographers</T>
            </Link>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {posts.map((post, i) => (
                <Fragment key={post.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i, 5) * 0.03 }}
                    className="border border-border mb-4"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 p-4 pb-0">
                      <Link to={`/profile/${post.user_id}`} className="shrink-0">
                        {post.author_avatar ? (
                          <img src={post.author_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs text-primary" style={displayFont}>{(post.author_name || "?")[0]?.toUpperCase()}</span>
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <span className="flex items-center gap-1">
                          <Link to={`/profile/${post.user_id}`} className="text-sm font-light hover:text-primary transition-colors truncate" style={headingFont}>
                            {post.author_name || "User"}
                          </Link>
                          {post.author_badges.length > 0 && <UserBadgeInline badges={post.author_badges} />}
                        </span>
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground" style={headingFont}>
                          <span>{timeAgo(post.created_at)}</span>
                          <span className="inline-flex items-center gap-1">{privacyIcon(post.privacy)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-3">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={bodyFont}>{post.content}</p>
                      {post.image_url && <FeedImage src={post.image_url} />}
                    </div>

                    {/* Counts */}
                    {(post.like_count > 0 || post.comment_count > 0) && (
                      <div className="flex items-center gap-4 px-4 pb-2 text-[10px] text-muted-foreground" style={headingFont}>
                        {post.like_count > 0 && (
                          <span className="inline-flex items-center gap-1">
                            {(post.top_reactions.length > 0 ? post.top_reactions : ["like"]).map((type) => (
                              <span key={type} className="text-sm">{REACTION_EMOJI_MAP[type] || "👍"}</span>
                            ))}
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

                    {/* Actions */}
                    <div className="flex border-t border-border divide-x divide-border">
                      <ReactionPicker
                        currentReaction={post.user_reaction}
                        onReact={(type) => handleReact(post.id, type)}
                        onUnreact={() => handleUnreact(post.id)}
                        disabled={!user}
                      />
                      <button onClick={() => toggleComments(post.id)} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-all duration-300" style={headingFont}>
                        <MessageCircle className="h-3.5 w-3.5" /><T>Comment</T>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-all duration-300" style={headingFont}>
                            <Share2 className="h-3.5 w-3.5" /><T>Share</T>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => shareToWall(post)} className="py-2.5 cursor-pointer">
                            <Share2 className="h-4 w-4 mr-2.5" />
                            <T>Share to your wall</T>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyPostLink(post)} className="py-2.5 cursor-pointer">
                            <Copy className="h-4 w-4 mr-2.5" />
                            <T>Copy link</T>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Comments section */}
                    {expandedComments.has(post.id) && (
                      <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-3">
                        {(commentsByPost[post.id] || []).map((c) => (
                          <div key={c.id} className="flex gap-2">
                            <Link to={`/profile/${c.user_id}`} className="shrink-0">
                              {c.author_avatar ? (
                                <img src={c.author_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-[8px] text-primary">{(c.author_name || "?")[0]?.toUpperCase()}</span>
                                </div>
                              )}
                            </Link>
                            <div className="flex-1 min-w-0">
                              <div className="bg-muted/50 px-3 py-2 rounded-sm">
                                <span className="flex items-center gap-1">
                                  <Link to={`/profile/${c.user_id}`} className="text-[11px] font-medium hover:text-primary transition-colors" style={headingFont}>
                                    {c.author_name || "User"}
                                  </Link>
                                  {c.author_badges.length > 0 && <UserBadgeInline badges={c.author_badges} />}
                                </span>
                                <p className="text-xs leading-relaxed" style={bodyFont}>{c.content}</p>
                              </div>
                              <span className="text-[9px] text-muted-foreground ml-3" style={headingFont}>{timeAgo(c.created_at)}</span>
                            </div>
                          </div>
                        ))}
                        {/* Comment input */}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="Write a comment..."
                            maxLength={1000}
                            className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none py-1.5 text-xs transition-colors"
                            style={bodyFont}
                            onKeyDown={(e) => e.key === "Enter" && submitComment(post.id)}
                          />
                          <button
                            onClick={() => submitComment(post.id)}
                            disabled={commentLoading === post.id || !commentInputs[post.id]?.trim()}
                            className="p-1.5 text-primary hover:opacity-70 transition-opacity disabled:opacity-30"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {i === 1 && (
                    <AdPlacement placement="between-entries" className="mb-4" />
                  )}
                </Fragment>
              ))}
            </AnimatePresence>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-6 text-center">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-[10px] tracking-[0.15em] uppercase" style={headingFont}><T>Loading more...</T></span>
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50" style={headingFont}>
                  <T>You've reached the end</T>
                </span>
              )}
            </div>
          </>
        )}
        </div>
        </div>
      </div>

      {/* Back to top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
            aria-label="Back to top"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
};

export default Feed;
