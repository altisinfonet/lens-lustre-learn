import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, Trash2, Eye, EyeOff, FileText, Globe, Code, GripVertical, ExternalLink, Copy } from "lucide-react";
import type { User } from "@supabase/supabase-js";

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
  sort_order: number;
  show_in_nav: boolean;
  created_at: string;
  updated_at: string;
}

const emptyPage: Omit<ManagedPage, "id" | "created_at" | "updated_at"> = {
  title: "",
  slug: "",
  content: "",
  meta_title: "",
  meta_description: "",
  og_image: "",
  noindex: false,
  is_published: false,
  sort_order: 0,
  show_in_nav: false,
};

const headingFont = { fontFamily: "var(--font-heading)" } as const;
const bodyFont = { fontFamily: "var(--font-body)" } as const;
const displayFont = { fontFamily: "var(--font-display)" } as const;

const inputClass = "w-full bg-transparent border-b border-border focus:border-primary outline-none py-2.5 text-sm transition-colors duration-500";
const labelClass = "block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2";

export default function AdminPageManagement({ user }: { user: User | null }) {
  const [pages, setPages] = useState<ManagedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPage, setEditingPage] = useState<ManagedPage | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "managed_pages")
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      setPages(data.value as unknown as ManagedPage[]);
    }
    setLoading(false);
  };

  const savePages = async (updatedPages: ManagedPage[]) => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({
      key: "managed_pages",
      value: updatedPages as any,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      setPages(updatedPages);
      toast({ title: "Pages saved successfully" });
    }
  };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const addNewPage = () => {
    const newPage: ManagedPage = {
      ...emptyPage,
      id: crypto.randomUUID(),
      sort_order: pages.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEditingPage(newPage);
    setShowForm(true);
  };

  const editPage = (page: ManagedPage) => {
    setEditingPage({ ...page });
    setShowForm(true);
  };

  const deletePage = async (id: string) => {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    const updated = pages.filter((p) => p.id !== id);
    await savePages(updated);
  };

  const handleSavePage = async () => {
    if (!editingPage) return;
    if (!editingPage.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!editingPage.slug.trim()) {
      editingPage.slug = generateSlug(editingPage.title);
    }

    // Validate slug uniqueness
    const slugConflict = pages.find((p) => p.slug === editingPage.slug && p.id !== editingPage.id);
    if (slugConflict) {
      toast({ title: "Slug already exists", description: "Please use a unique URL slug.", variant: "destructive" });
      return;
    }

    editingPage.updated_at = new Date().toISOString();

    const existing = pages.find((p) => p.id === editingPage.id);
    const updated = existing
      ? pages.map((p) => (p.id === editingPage.id ? editingPage : p))
      : [...pages, editingPage];

    await savePages(updated);
    setShowForm(false);
    setEditingPage(null);
  };

  const togglePublish = async (page: ManagedPage) => {
    const updated = pages.map((p) =>
      p.id === page.id ? { ...p, is_published: !p.is_published, updated_at: new Date().toISOString() } : p
    );
    await savePages(updated);
  };

  const copyPageUrl = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/page/${slug}`);
    toast({ title: "Page URL copied to clipboard" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-px bg-primary" />
        <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={headingFont}>Management</span>
      </div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-light tracking-tight" style={displayFont}>
          Page <em className="italic text-primary">Management</em>
        </h2>
        <button
          onClick={addNewPage}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
          style={headingFont}
        >
          <Plus className="h-3.5 w-3.5" /> New Page
        </button>
      </div>

      {/* Page Editor Form */}
      {showForm && editingPage && (
        <div className="border border-border p-6 mb-8 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-[0.2em] uppercase text-primary" style={headingFont}>
              {pages.find((p) => p.id === editingPage.id) ? "Edit Page" : "New Page"}
            </span>
            <button onClick={() => { setShowForm(false); setEditingPage(null); }} className="text-muted-foreground hover:text-foreground text-xs" style={headingFont}>
              Cancel
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass} style={headingFont}>Page Title *</label>
              <input
                value={editingPage.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setEditingPage((p) => p ? ({
                    ...p,
                    title,
                    slug: p.slug || generateSlug(title),
                  }) : null);
                }}
                className={inputClass}
                style={bodyFont}
                placeholder="About Us"
              />
            </div>
            <div>
              <label className={labelClass} style={headingFont}>URL Slug *</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/page/</span>
                <input
                  value={editingPage.slug}
                  onChange={(e) => setEditingPage((p) => p ? ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }) : null)}
                  className={inputClass}
                  style={bodyFont}
                  placeholder="about-us"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className={labelClass} style={headingFont}>Page Content (HTML / Markdown)</label>
            <textarea
              value={editingPage.content}
              onChange={(e) => setEditingPage((p) => p ? ({ ...p, content: e.target.value }) : null)}
              className="w-full bg-muted/20 border border-border focus:border-primary outline-none p-4 text-sm font-mono transition-colors duration-500 rounded resize-y"
              rows={10}
              placeholder="Write your page content here..."
            />
          </div>

          {/* SEO / Meta Section */}
          <div className="border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-primary" style={headingFont}>SEO & Meta</span>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={headingFont}>Meta Title</label>
                <input
                  value={editingPage.meta_title}
                  onChange={(e) => setEditingPage((p) => p ? ({ ...p, meta_title: e.target.value }) : null)}
                  className={inputClass}
                  style={bodyFont}
                  placeholder="Custom meta title (defaults to page title)"
                />
                <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>
                  {(editingPage.meta_title || editingPage.title).length}/60 characters
                </p>
              </div>
              <div>
                <label className={labelClass} style={headingFont}>OG Image URL</label>
                <input
                  value={editingPage.og_image}
                  onChange={(e) => setEditingPage((p) => p ? ({ ...p, og_image: e.target.value }) : null)}
                  className={inputClass}
                  style={bodyFont}
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass} style={headingFont}>Meta Description</label>
                <textarea
                  value={editingPage.meta_description}
                  onChange={(e) => setEditingPage((p) => p ? ({ ...p, meta_description: e.target.value }) : null)}
                  className={`${inputClass} resize-none`}
                  rows={2}
                  style={bodyFont}
                  placeholder="A brief description for search engines..."
                />
                <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>
                  {editingPage.meta_description.length}/160 characters
                </p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="border-t border-border pt-5 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={editingPage.is_published}
                onChange={(e) => setEditingPage((p) => p ? ({ ...p, is_published: e.target.checked }) : null)}
                className="accent-primary"
              />
              <label className="text-xs text-foreground" style={bodyFont}>Publish page (make it live)</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={editingPage.show_in_nav}
                onChange={(e) => setEditingPage((p) => p ? ({ ...p, show_in_nav: e.target.checked }) : null)}
                className="accent-primary"
              />
              <label className="text-xs text-foreground" style={bodyFont}>Show in navigation menu</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={editingPage.noindex}
                onChange={(e) => setEditingPage((p) => p ? ({ ...p, noindex: e.target.checked }) : null)}
                className="accent-primary"
              />
              <label className="text-xs text-muted-foreground" style={bodyFont}>noindex (hide from search engines)</label>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSavePage}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
            style={headingFont}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Page
          </button>
        </div>
      )}

      {/* Pages List */}
      {pages.length === 0 && !showForm ? (
        <div className="text-center py-16 border border-dashed border-border">
          <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-2" style={bodyFont}>No pages created yet</p>
          <p className="text-xs text-muted-foreground/60 mb-6" style={bodyFont}>
            Create custom pages like About, Terms of Service, Privacy Policy, FAQ, and more.
          </p>
          <button
            onClick={addNewPage}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary text-primary text-xs tracking-[0.15em] uppercase hover:bg-primary/10 transition-all"
            style={headingFont}
          >
            <Plus className="h-3.5 w-3.5" /> Create Your First Page
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-4 border border-border p-4 hover:border-primary/30 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate" style={headingFont}>{page.title}</span>
                  <span className={`text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border ${
                    page.is_published
                      ? "text-green-500 border-green-500/40"
                      : "text-muted-foreground border-border"
                  }`} style={headingFont}>
                    {page.is_published ? "Live" : "Draft"}
                  </span>
                  {page.show_in_nav && (
                    <span className="text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border border-primary/30 text-primary" style={headingFont}>
                      Nav
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground" style={bodyFont}>/page/{page.slug}</span>
                  {page.meta_title && (
                    <span className="text-[9px] text-muted-foreground/60" style={bodyFont}>• Meta: {page.meta_title.substring(0, 30)}...</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => copyPageUrl(page.slug)}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors"
                  title="Copy URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => togglePublish(page)}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors"
                  title={page.is_published ? "Unpublish" : "Publish"}
                >
                  {page.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => editPage(page)}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors"
                  title="Edit"
                >
                  <FileText className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deletePage(page.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      <div className="mt-10 border border-dashed border-border p-6">
        <h3 className="text-xs tracking-[0.2em] uppercase text-primary mb-4" style={headingFont}>
          💡 Suggested Pages to Create
        </h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { title: "About Us", desc: "Tell your story and mission" },
            { title: "Terms of Service", desc: "Legal terms and conditions" },
            { title: "Privacy Policy", desc: "Data handling and privacy" },
            { title: "FAQ", desc: "Frequently asked questions" },
            { title: "Contact Us", desc: "Contact form and details" },
            { title: "Community Guidelines", desc: "Rules and conduct" },
          ].map((suggestion) => (
            <button
              key={suggestion.title}
              onClick={() => {
                const newPage: ManagedPage = {
                  ...emptyPage,
                  id: crypto.randomUUID(),
                  title: suggestion.title,
                  slug: generateSlug(suggestion.title),
                  sort_order: pages.length,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                setEditingPage(newPage);
                setShowForm(true);
              }}
              className="text-left p-3 border border-border hover:border-primary/50 hover:bg-muted/20 transition-all rounded-sm"
              disabled={pages.some((p) => p.slug === generateSlug(suggestion.title))}
            >
              <span className="text-xs font-medium block" style={headingFont}>{suggestion.title}</span>
              <span className="text-[10px] text-muted-foreground" style={bodyFont}>{suggestion.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
