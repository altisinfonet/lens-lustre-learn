import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, Tag, PenLine, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
  author_id: string;
  profiles?: { full_name: string | null } | null;
}

const Journal = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const checkEditorAccess = async () => {
      if (!user) return setCanEdit(false);
      if (isAdmin) return setCanEdit(true);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "content_editor")
        .maybeSingle();
      setCanEdit(!!data);
    };
    checkEditorAccess();
  }, [user, isAdmin]);

  useEffect(() => {
    const fetchArticles = async () => {
      const { data } = await supabase
        .from("journal_articles")
        .select("id, title, slug, excerpt, cover_image_url, tags, published_at, created_at, author_id")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (data) {
        // Fetch author names
        const authorIds = [...new Set(data.map((a) => a.author_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
        setArticles(
          data.map((a) => ({
            ...a,
            profiles: { full_name: profileMap.get(a.author_id) || null },
          }))
        );
      }
      setLoading(false);
    };
    fetchArticles();
  }, []);

  const allTags = [...new Set(articles.flatMap((a) => a.tags))];
  const filtered = selectedTag
    ? articles.filter((a) => a.tags.includes(selectedTag))
    : articles;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: "var(--font-heading)" }}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-4" style={{ fontFamily: "var(--font-heading)" }}>
            {canEdit && (
              <Link
                to="/journal/new"
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <PenLine className="h-3.5 w-3.5" />
                New Article
              </Link>
            )}
            {user && (
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-3 w-3" /> Logout
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-px bg-primary" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              Photography Journal
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-6" style={{ fontFamily: "var(--font-display)" }}>
            Stories & <em className="italic">Insights</em>
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg leading-relaxed mb-12" style={{ fontFamily: "var(--font-body)" }}>
            Dive into articles, behind-the-scenes stories, and photography techniques from our community of creators.
          </p>
        </motion.div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-12">
            <button
              onClick={() => setSelectedTag(null)}
              className={`text-[10px] tracking-[0.15em] uppercase px-4 py-2 border transition-all duration-300 ${
                !selectedTag
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`text-[10px] tracking-[0.15em] uppercase px-4 py-2 border transition-all duration-300 ${
                  selectedTag === tag
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Articles grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-56 bg-muted mb-4" />
                <div className="h-4 bg-muted w-3/4 mb-2" />
                <div className="h-3 bg-muted w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground text-sm" style={{ fontFamily: "var(--font-body)" }}>
              No articles published yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((article, i) => (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
              >
                <Link to={`/journal/${article.slug}`} className="group block">
                  {article.cover_image_url && (
                    <div className="relative overflow-hidden mb-4">
                      <img
                        src={article.cover_image_url}
                        alt={article.title}
                        className="w-full h-56 object-cover transition-transform duration-[1.5s] group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {article.tags.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {article.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] tracking-[0.2em] uppercase text-primary"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2
                    className="text-xl md:text-2xl font-light mb-2 group-hover:text-primary transition-colors duration-500"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2" style={{ fontFamily: "var(--font-body)" }}>
                      {article.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    <span>{article.profiles?.full_name || "Unknown"}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(article.published_at || article.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Journal;
