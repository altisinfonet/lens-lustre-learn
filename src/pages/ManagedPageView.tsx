import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useLanguage } from "@/hooks/useLanguage";

interface ManagedPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_title: string;
  meta_description: string;
  og_image: string;
  noindex: boolean;
  is_published: boolean;
  view_count: number;
  json_ld: string;
  translations: Record<string, { title: string; content: string; meta_title: string; meta_description: string }>;
}

const bodyFont = { fontFamily: "var(--font-body)" };

const ManagedPageView = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [page, setPage] = useState<ManagedPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "managed_pages")
        .maybeSingle();

      if (data?.value && Array.isArray(data.value)) {
        const pages = data.value as unknown as ManagedPage[];
        const found = pages.find((p) => p.slug === slug && p.is_published);
        if (found) {
          setPage(found);
          // Increment view count
          const updated = pages.map((p) =>
            p.id === found.id ? { ...p, view_count: (p.view_count || 0) + 1 } : p
          );
          await supabase.from("site_settings").upsert({
            key: "managed_pages",
            value: updated as any,
            updated_at: new Date().toISOString(),
          });
        }
      }
      setLoading(false);
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    navigate("/404", { replace: true });
    return null;
  }

  // Resolve language-specific content
  const trans = language !== "English" && page.translations?.[language];
  const title = (trans && trans.title) || page.title;
  const content = (trans && trans.content) || page.content;
  const metaTitle = (trans && trans.meta_title) || page.meta_title || title;
  const metaDesc = (trans && trans.meta_description) || page.meta_description;
  const canonical = `${window.location.origin}/page/${page.slug}`;

  // Validate JSON-LD
  let jsonLdScript: string | null = null;
  if (page.json_ld) {
    try {
      JSON.parse(page.json_ld);
      jsonLdScript = page.json_ld;
    } catch {
      // Invalid JSON-LD, skip
    }
  }

  return (
    <div className="py-10 md:py-16">
      <Helmet>
        <title>{metaTitle} — 50mm Retina World</title>
        {metaDesc && <meta name="description" content={metaDesc} />}
        <meta property="og:title" content={metaTitle} />
        {metaDesc && <meta property="og:description" content={metaDesc} />}
        {page.og_image && <meta property="og:image" content={page.og_image} />}
        <link rel="canonical" href={canonical} />
        {page.noindex && <meta name="robots" content="noindex, nofollow" />}
        {jsonLdScript && (
          <script type="application/ld+json">{jsonLdScript}</script>
        )}
      </Helmet>

      <Breadcrumbs items={[{ label: title }]} className="mb-8" />

      <article className="max-w-3xl">
        <div
          className="prose prose-sm md:prose-base max-w-none text-foreground
            [&_h1]:text-2xl [&_h1]:md:text-3xl [&_h1]:font-light [&_h1]:tracking-tight [&_h1]:mb-6
            [&_h2]:text-xl [&_h2]:font-light [&_h2]:mt-8 [&_h2]:mb-4
            [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-3
            [&_p]:text-sm [&_p]:md:text-base [&_p]:leading-relaxed [&_p]:mb-4 [&_p]:text-foreground/80
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
            [&_li]:text-sm [&_li]:md:text-base [&_li]:mb-1.5 [&_li]:text-foreground/80
            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
            [&_strong]:text-foreground [&_strong]:font-semibold
            [&_em]:italic
            [&_img]:max-w-full [&_img]:rounded-sm [&_img]:my-4
            [&_hr]:my-8 [&_hr]:border-border
            [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
          style={bodyFont}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </article>
    </div>
  );
};

export default ManagedPageView;
