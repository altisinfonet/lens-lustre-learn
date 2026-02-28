import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, FileText, Map, Bot, Plus, Trash2, RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { User } from "@supabase/supabase-js";

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

const defaultGlobalSEO: GlobalSEO = {
  title_template: "%s — 50mm Retina",
  default_title: "50mm Retina — Competitions, Education & Journal for Photographers",
  default_description: "Join 50mm Retina — the ultimate platform for photographers. Enter global competitions, master your craft through expert courses, and explore our photography journal.",
  default_og_image: "",
  site_name: "50mm Retina",
  twitter_handle: "",
  canonical_base: "https://lens-lustre-learn.lovable.app",
  google_verification: "",
  bing_verification: "",
};

const knownRoutes = [
  "/", "/login", "/signup", "/competitions", "/journal", "/courses",
  "/winners", "/certificates", "/discover", "/feed", "/friends",
  "/dashboard", "/profile", "/wallet", "/forgot-password",
];

const defaultRobotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /edit-profile
Disallow: /dashboard
Disallow: /wallet
Disallow: /judge
Disallow: /reset-password
Disallow: /forgot-password

Sitemap: https://lens-lustre-learn.lovable.app/sitemap.xml`;

export default function AdminSEO({ user }: { user: User | null }) {
  const [globalSEO, setGlobalSEO] = useState<GlobalSEO>(defaultGlobalSEO);
  const [pageSEOList, setPageSEOList] = useState<PageSEO[]>([]);
  const [robotsTxt, setRobotsTxt] = useState(defaultRobotsTxt);
  const [sitemapPreview, setSitemapPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("global");

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: globalData }, { data: pagesData }, { data: robotsData }] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "seo_global").maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "seo_pages").maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "seo_robots").maybeSingle(),
      ]);
      if (globalData?.value) setGlobalSEO({ ...defaultGlobalSEO, ...(globalData.value as any) });
      if (pagesData?.value && Array.isArray(pagesData.value)) setPageSEOList(pagesData.value as unknown as PageSEO[]);
      if (robotsData?.value) setRobotsTxt((robotsData.value as any).content || defaultRobotsTxt);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const saveGlobal = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({
      key: "seo_global",
      value: globalSEO as any,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    });
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Global SEO settings saved" });
  };

  const savePages = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({
      key: "seo_pages",
      value: pageSEOList as any,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    });
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Page SEO settings saved" });
  };

  const saveRobots = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({
      key: "seo_robots",
      value: { content: robotsTxt } as any,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    });
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Robots.txt saved" });
  };

  const addPageSEO = () => {
    setPageSEOList((prev) => [...prev, { path: "/", title: "", description: "", og_image: "", noindex: false }]);
  };

  const removePageSEO = (idx: number) => {
    setPageSEOList((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePageSEO = (idx: number, field: keyof PageSEO, value: any) => {
    setPageSEOList((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const generateSitemap = async () => {
    const base = globalSEO.canonical_base || "https://lens-lustre-learn.lovable.app";

    // Fetch dynamic slugs
    const [{ data: articles }, { data: courses }, { data: comps }, { data: artists }] = await Promise.all([
      supabase.from("journal_articles").select("slug, updated_at").eq("status", "published").order("updated_at", { ascending: false }),
      supabase.from("courses").select("slug, updated_at").eq("status", "published").order("updated_at", { ascending: false }),
      supabase.from("competitions").select("id, updated_at").order("updated_at", { ascending: false }),
      supabase.from("featured_artists").select("slug, updated_at").eq("is_active", true),
    ]);

    const urls: { loc: string; lastmod: string; priority: string }[] = [];

    // Static routes
    const staticRoutes = [
      { path: "/", priority: "1.0" },
      { path: "/competitions", priority: "0.9" },
      { path: "/journal", priority: "0.9" },
      { path: "/courses", priority: "0.9" },
      { path: "/winners", priority: "0.8" },
      { path: "/certificates", priority: "0.6" },
      { path: "/discover", priority: "0.7" },
      { path: "/login", priority: "0.3" },
      { path: "/signup", priority: "0.4" },
    ];

    staticRoutes.forEach((r) => urls.push({ loc: `${base}${r.path}`, lastmod: new Date().toISOString().split("T")[0], priority: r.priority }));

    // Dynamic journal articles
    (articles || []).forEach((a) => urls.push({
      loc: `${base}/journal/${a.slug}`,
      lastmod: (a.updated_at || new Date().toISOString()).split("T")[0],
      priority: "0.7",
    }));

    // Dynamic courses
    (courses || []).forEach((c) => urls.push({
      loc: `${base}/courses/${c.slug}`,
      lastmod: (c.updated_at || new Date().toISOString()).split("T")[0],
      priority: "0.7",
    }));

    // Dynamic competitions
    (comps || []).forEach((c) => urls.push({
      loc: `${base}/competitions/${c.id}`,
      lastmod: (c.updated_at || new Date().toISOString()).split("T")[0],
      priority: "0.6",
    }));

    // Featured artists
    (artists || []).forEach((a) => urls.push({
      loc: `${base}/featured-artist/${a.slug}`,
      lastmod: (a.updated_at || new Date().toISOString()).split("T")[0],
      priority: "0.6",
    }));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

    setSitemapPreview(xml);
    toast({ title: `Sitemap generated with ${urls.length} URLs` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inputClass = "w-full bg-transparent border-b border-border focus:border-primary outline-none py-2.5 text-sm transition-colors duration-500";
  const labelClass = "block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2";
  const headingFont = { fontFamily: "var(--font-heading)" } as const;
  const bodyFont = { fontFamily: "var(--font-body)" } as const;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Globe className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>
          SEO <em className="italic text-primary">Settings</em>
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border mb-8">
          <TabsTrigger value="global" className="text-[10px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={headingFont}>
            <Globe className="h-3.5 w-3.5 mr-1.5" /> Global SEO
          </TabsTrigger>
          <TabsTrigger value="pages" className="text-[10px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={headingFont}>
            <FileText className="h-3.5 w-3.5 mr-1.5" /> Page-Level
          </TabsTrigger>
          <TabsTrigger value="sitemap" className="text-[10px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={headingFont}>
            <Map className="h-3.5 w-3.5 mr-1.5" /> Sitemap
          </TabsTrigger>
          <TabsTrigger value="robots" className="text-[10px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={headingFont}>
            <Bot className="h-3.5 w-3.5 mr-1.5" /> Robots.txt
          </TabsTrigger>
        </TabsList>

        {/* Global SEO */}
        <TabsContent value="global">
          <div className="border border-border p-6 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={headingFont}>Title Template</label>
                <input value={globalSEO.title_template} onChange={(e) => setGlobalSEO((p) => ({ ...p, title_template: e.target.value }))} className={inputClass} style={bodyFont} placeholder="%s — 50mm Retina" />
                <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>Use %s as page title placeholder</p>
              </div>
              <div>
                <label className={labelClass} style={headingFont}>Default Title</label>
                <input value={globalSEO.default_title} onChange={(e) => setGlobalSEO((p) => ({ ...p, default_title: e.target.value }))} className={inputClass} style={bodyFont} placeholder="50mm Retina" />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass} style={headingFont}>Default Description</label>
                <textarea value={globalSEO.default_description} onChange={(e) => setGlobalSEO((p) => ({ ...p, default_description: e.target.value }))} className={`${inputClass} resize-none`} rows={3} style={bodyFont} placeholder="Site description for search engines..." />
                <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>{globalSEO.default_description.length}/160 characters</p>
              </div>
              <div>
                <label className={labelClass} style={headingFont}>Default OG Image URL</label>
                <input value={globalSEO.default_og_image} onChange={(e) => setGlobalSEO((p) => ({ ...p, default_og_image: e.target.value }))} className={inputClass} style={bodyFont} placeholder="https://..." />
              </div>
              <div>
                <label className={labelClass} style={headingFont}>Site Name</label>
                <input value={globalSEO.site_name} onChange={(e) => setGlobalSEO((p) => ({ ...p, site_name: e.target.value }))} className={inputClass} style={bodyFont} />
              </div>
              <div>
                <label className={labelClass} style={headingFont}>Twitter Handle</label>
                <input value={globalSEO.twitter_handle} onChange={(e) => setGlobalSEO((p) => ({ ...p, twitter_handle: e.target.value }))} className={inputClass} style={bodyFont} placeholder="@yourhandle" />
              </div>
              <div>
                <label className={labelClass} style={headingFont}>Canonical Base URL</label>
                <input value={globalSEO.canonical_base} onChange={(e) => setGlobalSEO((p) => ({ ...p, canonical_base: e.target.value }))} className={inputClass} style={bodyFont} placeholder="https://yourdomain.com" />
              </div>
              <div>
                <label className={labelClass} style={headingFont}>Google Verification Code</label>
                <input value={globalSEO.google_verification} onChange={(e) => setGlobalSEO((p) => ({ ...p, google_verification: e.target.value }))} className={inputClass} style={bodyFont} placeholder="google-site-verification=..." />
              </div>
              <div>
                <label className={labelClass} style={headingFont}>Bing Verification Code</label>
                <input value={globalSEO.bing_verification} onChange={(e) => setGlobalSEO((p) => ({ ...p, bing_verification: e.target.value }))} className={inputClass} style={bodyFont} placeholder="msvalidate.01=..." />
              </div>
            </div>
            <button onClick={saveGlobal} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50" style={headingFont}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Global SEO
            </button>
          </div>
        </TabsContent>

        {/* Page-Level SEO */}
        <TabsContent value="pages">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={headingFont}>
                {pageSEOList.length} page override{pageSEOList.length !== 1 ? "s" : ""}
              </span>
              <button onClick={addPageSEO} className="inline-flex items-center gap-2 px-4 py-2 text-xs tracking-[0.15em] uppercase border border-border hover:border-primary hover:text-primary transition-all" style={headingFont}>
                <Plus className="h-3.5 w-3.5" /> Add Page
              </button>
            </div>

            {pageSEOList.map((page, idx) => (
              <div key={idx} className="border border-border p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary" style={headingFont}>Page #{idx + 1}</span>
                  <button onClick={() => removePageSEO(idx)} className="text-destructive hover:opacity-70"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} style={headingFont}>Path</label>
                    <select value={page.path} onChange={(e) => updatePageSEO(idx, "path", e.target.value)} className={inputClass} style={bodyFont}>
                      {knownRoutes.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} style={headingFont}>Custom Title</label>
                    <input value={page.title} onChange={(e) => updatePageSEO(idx, "title", e.target.value)} className={inputClass} style={bodyFont} placeholder="Page title..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass} style={headingFont}>Meta Description</label>
                    <textarea value={page.description} onChange={(e) => updatePageSEO(idx, "description", e.target.value)} className={`${inputClass} resize-none`} rows={2} style={bodyFont} placeholder="Page description..." />
                  </div>
                  <div>
                    <label className={labelClass} style={headingFont}>OG Image Override</label>
                    <input value={page.og_image} onChange={(e) => updatePageSEO(idx, "og_image", e.target.value)} className={inputClass} style={bodyFont} placeholder="https://..." />
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <input type="checkbox" checked={page.noindex} onChange={(e) => updatePageSEO(idx, "noindex", e.target.checked)} className="accent-primary" />
                    <label className="text-xs text-muted-foreground" style={bodyFont}>noindex (hide from search engines)</label>
                  </div>
                </div>
              </div>
            ))}

            {pageSEOList.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border">
                <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground" style={bodyFont}>No page-level SEO overrides yet. Add one to customize individual pages.</p>
              </div>
            )}

            {pageSEOList.length > 0 && (
              <button onClick={savePages} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50" style={headingFont}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Page SEO
              </button>
            )}
          </div>
        </TabsContent>

        {/* Sitemap Generator */}
        <TabsContent value="sitemap">
          <div className="space-y-6">
            <div className="border border-border p-6">
              <p className="text-sm text-muted-foreground mb-4" style={bodyFont}>
                Generate an XML sitemap based on all published content. This includes static pages, journal articles, courses, competitions, and featured artists.
              </p>
              <button onClick={generateSitemap} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity" style={headingFont}>
                <RefreshCw className="h-3.5 w-3.5" /> Generate Sitemap
              </button>
            </div>

            {sitemapPreview && (
              <div className="border border-border p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs tracking-[0.2em] uppercase text-primary" style={headingFont}>Sitemap Preview</span>
                  <button onClick={() => {
                    navigator.clipboard.writeText(sitemapPreview);
                    toast({ title: "Sitemap XML copied to clipboard" });
                  }} className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-primary transition-colors" style={headingFont}>
                    Copy XML
                  </button>
                </div>
                <pre className="bg-muted/30 p-4 rounded text-[11px] text-foreground/80 overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre" style={bodyFont}>
                  {sitemapPreview}
                </pre>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Robots.txt Editor */}
        <TabsContent value="robots">
          <div className="border border-border p-6 space-y-5">
            <p className="text-sm text-muted-foreground" style={bodyFont}>
              Edit your robots.txt directives. This controls which pages search engine crawlers can access.
            </p>
            <div>
              <label className={labelClass} style={headingFont}>Robots.txt Content</label>
              <textarea
                value={robotsTxt}
                onChange={(e) => setRobotsTxt(e.target.value)}
                className="w-full bg-muted/20 border border-border focus:border-primary outline-none p-4 text-sm font-mono transition-colors duration-500 rounded resize-y"
                rows={12}
                style={bodyFont}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={saveRobots} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50" style={headingFont}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Robots.txt
              </button>
              <button onClick={() => setRobotsTxt(defaultRobotsTxt)} className="px-5 py-2.5 text-xs tracking-[0.15em] uppercase border border-border hover:border-primary hover:text-primary transition-all" style={headingFont}>
                Reset to Default
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}