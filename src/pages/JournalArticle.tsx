import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Tag } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  tags: string[];
  photo_gallery: string[];
  published_at: string | null;
  created_at: string;
  author_id: string;
}

const JournalArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("journal_articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (data) {
        setArticle(data);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.author_id)
          .maybeSingle();
        setAuthorName(profile?.full_name || null);
      }
      setLoading(false);
    };
    fetch();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Article not found.</p>
        <Link to="/journal" className="text-primary text-sm underline">Back to Journal</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Back nav */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 md:px-12 py-6">
          <Breadcrumbs items={[{ label: "Journal", to: "/journal" }, { label: article.title }]} />
        </div>
      </div>

      {/* Cover */}
      {article.cover_image_url && (
        <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
          <img src={article.cover_image_url} alt={article.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
      )}

      <article className="container mx-auto px-6 md:px-12 max-w-3xl py-12 md:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              {article.tags.map((tag) => (
                <span key={tag} className="text-[10px] tracking-[0.2em] uppercase text-primary flex items-center gap-1" style={{ fontFamily: "var(--font-heading)" }}>
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-6 leading-[1.1]" style={{ fontFamily: "var(--font-display)" }}>
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-12 pb-8 border-b border-border" style={{ fontFamily: "var(--font-heading)" }}>
            <span className="tracking-[0.1em] uppercase">{authorName || "Unknown"}</span>
            <span className="flex items-center gap-1 tracking-[0.1em]">
              <Clock className="h-3 w-3" />
              {new Date(article.published_at || article.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Body — render paragraphs */}
          <div className="prose-custom space-y-6">
            {article.body.split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-sm md:text-base text-foreground/85 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Photo gallery */}
          {article.photo_gallery.length > 0 && (
            <div className="mt-16">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-px bg-primary" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  Photo Gallery
                </span>
              </div>
              <div className="columns-2 md:columns-3 gap-3 space-y-3">
                {article.photo_gallery.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`${article.title} gallery photo ${i + 1}`}
                    className="w-full object-cover break-inside-avoid cursor-pointer hover:brightness-75 transition-all duration-500"
                    loading="lazy"
                    onClick={() => setLightboxImg(url)}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </article>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-6 cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="Enlarged view" className="max-w-full max-h-[85vh] object-contain" />
        </div>
      )}
    </main>
  );
};

export default JournalArticle;
