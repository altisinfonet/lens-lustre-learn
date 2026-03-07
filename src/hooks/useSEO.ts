import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface PageSEO {
  path: string;
  title: string;
  description: string;
  og_image: string;
  noindex: boolean;
}

interface GlobalSEO {
  title_template: string;
  default_title: string;
  default_description: string;
  default_og_image: string;
  site_name: string;
  twitter_handle: string;
  canonical_base: string;
  google_verification: string;
  bing_verification: string;
}

interface SEOMeta {
  title: string;
  description: string;
  ogImage: string;
  noindex: boolean;
  siteName: string;
  twitterHandle: string;
  canonicalUrl: string;
  googleVerification: string;
  bingVerification: string;
}

const defaultMeta: SEOMeta = {
  title: "50mm Retina World — Competitions, Education & Journal for Photographers",
  description: "Join 50mm Retina World — the ultimate platform for photographers.",
  ogImage: "",
  noindex: false,
  siteName: "50mm Retina World",
  twitterHandle: "",
  canonicalUrl: "",
  googleVerification: "",
  bingVerification: "",
};

let cachedGlobal: GlobalSEO | null = null;
let cachedPages: PageSEO[] | null = null;
let fetchPromise: Promise<void> | null = null;

async function loadSEOSettings() {
  if (cachedGlobal && cachedPages) return;
  if (fetchPromise) { await fetchPromise; return; }

  fetchPromise = (async () => {
    const [{ data: globalData }, { data: pagesData }] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "seo_global").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "seo_pages").maybeSingle(),
    ]);
    if (globalData?.value) cachedGlobal = globalData.value as unknown as GlobalSEO;
    if (pagesData?.value && Array.isArray(pagesData.value)) cachedPages = pagesData.value as unknown as PageSEO[];
  })();

  await fetchPromise;
}

/**
 * Returns SEO metadata for the current page.
 * Merges global defaults with per-page overrides from admin settings.
 * Optionally accepts a page-specific title override (e.g. article titles).
 */
export function useSEO(pageTitle?: string) {
  const { pathname } = useLocation();
  const [meta, setMeta] = useState<SEOMeta>(defaultMeta);

  useEffect(() => {
    let cancelled = false;

    loadSEOSettings().then(() => {
      if (cancelled) return;

      const global = cachedGlobal;
      const pages = cachedPages || [];
      const pageOverride = pages.find((p) => p.path === pathname);

      const base: SEOMeta = {
        title: global?.default_title || defaultMeta.title,
        description: global?.default_description || defaultMeta.description,
        ogImage: global?.default_og_image || defaultMeta.ogImage,
        noindex: false,
        siteName: global?.site_name || defaultMeta.siteName,
        twitterHandle: global?.twitter_handle || "",
        canonicalUrl: global?.canonical_base ? `${global.canonical_base}${pathname}` : "",
        googleVerification: global?.google_verification || "",
        bingVerification: global?.bing_verification || "",
      };

      // Apply page-level overrides
      if (pageOverride) {
        if (pageOverride.title) base.title = pageOverride.title;
        if (pageOverride.description) base.description = pageOverride.description;
        if (pageOverride.og_image) base.ogImage = pageOverride.og_image;
        if (pageOverride.noindex) base.noindex = true;
      }

      // Apply dynamic page title (e.g. article name)
      if (pageTitle) {
        const template = global?.title_template || "%s";
        base.title = template.replace("%s", pageTitle);
      }

      setMeta(base);
    });

    return () => { cancelled = true; };
  }, [pathname, pageTitle]);

  return meta;
}
