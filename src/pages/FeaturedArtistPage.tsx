import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Tag, Download, Share2, Check, Palette } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import T from "@/components/T";
import { supabase } from "@/integrations/supabase/client";
import { generateArticlePdf } from "@/lib/generateArticlePdf";
import { toast } from "@/hooks/use-toast";

interface FeaturedArtistData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  photo_gallery: string[];
  artist_name: string | null;
  artist_bio: string | null;
  artist_avatar_url: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
}

interface BodyBlock {
  type: "text" | "image";
  content: string;
}

function parseBodyBlocks(body: string): BodyBlock[] {
  return body.split("\n\n").map((part) => {
    const trimmed = part.trim();
    if (!trimmed) return null;
    const imgMatch = trimmed.match(/^\[img:(.*?)\]$/);
    if (imgMatch) return { type: "image" as const, content: imgMatch[1] };
    return { type: "text" as const, content: trimmed };
  }).filter(Boolean) as BodyBlock[];
}

const FeaturedArtistPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<FeaturedArtistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("featured_artists")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (data) setArticle(data as any);
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  const handleDownloadPdf = async () => {
    if (!article) return;
    setGeneratingPdf(true);
    try {
      await generateArticlePdf({
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        cover_image_url: article.cover_image_url,
        tags: article.tags,
        published_at: article.published_at,
        created_at: article.created_at,
        author_name: article.artist_name,
      });
      toast({ title: "PDF downloaded!" });
    } catch {
      toast({ title: "PDF generation failed", variant: "destructive" });
    }
    setGeneratingPdf(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: article?.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm"><T>Loading…</T></div>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground"><T>Article not found.</T></p>
        <Link to="/" className="text-primary text-sm underline"><T>Back to Home</T></Link>
      </main>
    );
  }

  const bodyBlocks = parseBodyBlocks(article.body);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header bar */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <Breadcrumbs items={[{ label: "Featured Artists", to: "/" }, { label: article.title }]} />
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-3 py-2 border border-border hover:border-foreground/30 transition-colors rounded-sm"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? <T>Copied</T> : <T>Share</T>}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-3 py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity rounded-sm disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <Download className="h-3.5 w-3.5" />
              {generatingPdf ? <T>Generating…</T> : "PDF"}
            </button>
          </div>
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

          <div className="flex items-center gap-3 mb-4">
            <Palette className="h-4 w-4 text-primary" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              <T>Featured Artist</T>
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-6 leading-[1.1]" style={{ fontFamily: "var(--font-display)" }}>
            {article.title}
          </h1>

          {/* Artist info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-12 pb-8 border-b border-border" style={{ fontFamily: "var(--font-heading)" }}>
            {article.artist_avatar_url && (
              <img src={article.artist_avatar_url} alt={article.artist_name || ""} className="h-10 w-10 rounded-full object-cover border border-border" />
            )}
            <div>
              <span className="tracking-[0.1em] uppercase block">{article.artist_name || <T>Unknown</T>}</span>
              <span className="flex items-center gap-1 tracking-[0.1em] text-muted-foreground/60">
                <Clock className="h-3 w-3" />
                {new Date(article.published_at || article.created_at).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Artist Bio */}
          {article.artist_bio && (
            <div className="bg-card border border-border p-6 rounded-sm mb-10">
              <span className="text-[9px] tracking-[0.2em] uppercase text-primary block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                <T>About the Artist</T>
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                {article.artist_bio}
              </p>
            </div>
          )}

          {/* Body */}
          <div className="prose-custom space-y-6">
            {bodyBlocks.map((block, i) =>
              block.type === "image" ? (
                <div key={i} className="my-8">
                  <img
                    src={block.content}
                    alt={`Article image ${i + 1}`}
                    className="w-full object-cover rounded-sm cursor-pointer hover:brightness-90 transition-all duration-500"
                    loading="lazy"
                    onClick={() => setLightboxImg(block.content)}
                  />
                </div>
              ) : (
                <p key={i} className="text-sm md:text-base text-foreground/85 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                  {block.content}
                </p>
              )
            )}
          </div>

          {/* Photo gallery */}
          {article.photo_gallery.length > 0 && (
            <div className="mt-16">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-px bg-primary" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  <T>Gallery</T>
                </span>
              </div>
              <div className="columns-2 md:columns-3 gap-3 space-y-3">
                {article.photo_gallery.map((url, i) => (
                  <img key={i} src={url} alt={`Gallery photo ${i + 1}`}
                    className="w-full object-cover break-inside-avoid cursor-pointer hover:brightness-75 transition-all duration-500"
                    loading="lazy" onClick={() => setLightboxImg(url)} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </article>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-6 cursor-pointer"
          onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Enlarged view" className="max-w-full max-h-[85vh] object-contain" />
        </div>
      )}
    </main>
  );
};

export default FeaturedArtistPage;
