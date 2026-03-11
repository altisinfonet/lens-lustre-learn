import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Save, Plus, Trash2, Eye, EyeOff, FileText, Globe, GripVertical,
  Copy, Calendar, BarChart3, Layout, Type, Clock, ChevronDown, Bold, Italic,
  Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link,
  ImagePlus, Code, Heading1, Heading2, Minus, Undo, Redo
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { User } from "@supabase/supabase-js";

/* ── Types ── */
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
  template: string;
  scheduled_at: string | null;
  view_count: number;
  json_ld: string;
  translations: Record<string, { title: string; content: string; meta_title: string; meta_description: string }>;
  created_at: string;
  updated_at: string;
}

const emptyPage: Omit<ManagedPage, "id" | "created_at" | "updated_at"> = {
  title: "", slug: "", content: "", meta_title: "", meta_description: "",
  og_image: "", noindex: false, is_published: false, sort_order: 0,
  show_in_nav: false, template: "blank", scheduled_at: null, view_count: 0,
  json_ld: "", translations: {},
};

/* ── Page Templates ── */
const PAGE_TEMPLATES: { key: string; label: string; description: string; content: string }[] = [
  {
    key: "blank", label: "Blank Page", description: "Start from scratch",
    content: "",
  },
  {
    key: "about", label: "About Us", description: "Company story & mission",
    content: `<h1>About Us</h1>
<p>Welcome to <strong>50mm Retina World</strong> — the ultimate platform for photographers worldwide.</p>
<h2>Our Mission</h2>
<p>We believe every photographer has a unique perspective worth sharing. Our platform brings together competing visions, educational paths, and storytelling — creating a space where the art of photography thrives in all its forms.</p>
<h2>What We Offer</h2>
<ul>
<li><strong>Global Competitions</strong> — Enter themed challenges judged by industry professionals</li>
<li><strong>Expert Courses</strong> — Master your craft with structured learning paths</li>
<li><strong>Photography Journal</strong> — Read and contribute inspiring stories</li>
<li><strong>Community</strong> — Connect with fellow photographers worldwide</li>
</ul>
<h2>Our Team</h2>
<p>We are a passionate team of photographers, developers, and educators dedicated to building the best photography platform on the planet.</p>`,
  },
  {
    key: "terms", label: "Terms of Service", description: "Legal terms & conditions",
    content: `<h1>Terms of Service</h1>
<p><em>Last updated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</em></p>
<h2>1. Acceptance of Terms</h2>
<p>By accessing and using 50mm Retina World ("the Platform"), you accept and agree to be bound by these Terms of Service.</p>
<h2>2. User Accounts</h2>
<p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
<h2>3. Content Ownership</h2>
<p>You retain ownership of all photographs and content you upload. By uploading, you grant us a non-exclusive license to display your content on the Platform.</p>
<h2>4. Prohibited Conduct</h2>
<ul>
<li>Uploading content that infringes on others' intellectual property</li>
<li>Using automated tools to access the Platform</li>
<li>Harassment or abuse of other users</li>
</ul>
<h2>5. Competition Rules</h2>
<p>Each competition may have specific rules. Participants must comply with all applicable competition rules in addition to these Terms.</p>
<h2>6. Limitation of Liability</h2>
<p>The Platform is provided "as is" without warranties of any kind, either express or implied.</p>`,
  },
  {
    key: "privacy", label: "Privacy Policy", description: "Data handling & privacy",
    content: `<h1>Privacy Policy</h1>
<p><em>Last updated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</em></p>
<h2>Information We Collect</h2>
<p>We collect information you provide when creating an account, including your name, email address, and profile details.</p>
<h2>How We Use Your Information</h2>
<ul>
<li>To provide and maintain our services</li>
<li>To notify you about changes to our platform</li>
<li>To provide customer support</li>
<li>To detect and prevent fraud</li>
</ul>
<h2>Data Security</h2>
<p>We implement appropriate technical and organizational measures to protect your personal data.</p>
<h2>Your Rights</h2>
<p>You have the right to access, update, or delete your personal information at any time through your account settings.</p>`,
  },
  {
    key: "faq", label: "FAQ", description: "Frequently asked questions",
    content: `<h1>Frequently Asked Questions</h1>
<h2>Getting Started</h2>
<h3>How do I create an account?</h3>
<p>Click the "Sign Up" button and fill in your details. You'll receive a verification email to confirm your account.</p>
<h3>Is the platform free to use?</h3>
<p>Yes! Creating an account and browsing is completely free. Some competitions may have entry fees, and premium courses may require payment.</p>
<h2>Competitions</h2>
<h3>How do competitions work?</h3>
<p>Browse open competitions, submit your best photographs, and get judged by professionals. Winners receive prizes and recognition.</p>
<h3>Can I submit AI-generated images?</h3>
<p>This depends on the specific competition rules. Each competition clearly states whether AI-generated images are allowed.</p>
<h2>Courses</h2>
<h3>Are certificates provided?</h3>
<p>Yes! Upon completing a course, you receive a verifiable digital certificate that you can share on your profile and social media.</p>`,
  },
  {
    key: "contact", label: "Contact Us", description: "Contact form & details",
    content: `<h1>Contact Us</h1>
<p>We'd love to hear from you! Whether you have a question, feedback, or a partnership inquiry, feel free to reach out.</p>
<h2>Get In Touch</h2>
<p>📧 <strong>Email:</strong> support@50mmretinaworld.com</p>
<p>📱 <strong>Social Media:</strong> Follow us on Instagram, Facebook, and Twitter</p>
<h2>Support</h2>
<p>For technical support or account-related issues, please use our <a href="/help-support">Help & Support</a> portal for faster resolution.</p>
<h2>Partnership Inquiries</h2>
<p>Interested in collaborating? We're open to partnerships with photography brands, educators, and creative organizations. Email us with your proposal.</p>`,
  },
  {
    key: "guidelines", label: "Community Guidelines", description: "Rules & conduct",
    content: `<h1>Community Guidelines</h1>
<p>Our community thrives when everyone feels welcome, respected, and inspired. These guidelines help maintain that environment.</p>
<h2>Be Respectful</h2>
<p>Treat fellow photographers with courtesy. Constructive criticism is welcome; personal attacks are not.</p>
<h2>Original Work Only</h2>
<p>Only upload photographs that you have taken yourself or have explicit permission to share.</p>
<h2>No Spam or Self-Promotion</h2>
<p>Avoid excessive self-promotion, spam, or irrelevant content in comments and posts.</p>
<h2>Report Violations</h2>
<p>If you encounter content that violates these guidelines, please report it using the flag icon. Our moderation team reviews all reports.</p>`,
  },
];

/* ── Styles ── */
const headingFont = { fontFamily: "var(--font-heading)" } as const;
const bodyFont = { fontFamily: "var(--font-body)" } as const;
const displayFont = { fontFamily: "var(--font-display)" } as const;
const inputClass = "w-full bg-transparent border-b border-border focus:border-primary outline-none py-2.5 text-sm transition-colors duration-500";
const labelClass = "block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2";

/* ── Mini Rich Text Toolbar ── */
const RichTextToolbar = ({ editorRef, onInput }: { editorRef: React.RefObject<HTMLDivElement | null>; onInput: () => void }) => {
  const exec = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    onInput();
  }, [editorRef, onInput]);

  const btnClass = "p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border pb-2 mb-2">
      <button type="button" className={btnClass} onClick={() => exec("bold")} title="Bold"><Bold className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("italic")} title="Italic"><Italic className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("underline")} title="Underline"><Underline className="h-3.5 w-3.5" /></button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button type="button" className={btnClass} onClick={() => exec("formatBlock", "<h1>")} title="Heading 1"><Heading1 className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("formatBlock", "<h2>")} title="Heading 2"><Heading2 className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("formatBlock", "<p>")} title="Paragraph"><Type className="h-3.5 w-3.5" /></button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button type="button" className={btnClass} onClick={() => exec("insertUnorderedList")} title="Bullet List"><List className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("insertOrderedList")} title="Numbered List"><ListOrdered className="h-3.5 w-3.5" /></button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button type="button" className={btnClass} onClick={() => exec("justifyLeft")} title="Align Left"><AlignLeft className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("justifyCenter")} title="Align Center"><AlignCenter className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("justifyRight")} title="Align Right"><AlignRight className="h-3.5 w-3.5" /></button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button type="button" className={btnClass} onClick={() => {
        const url = prompt("Enter URL:");
        if (url) exec("createLink", url);
      }} title="Insert Link"><Link className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => {
        const url = prompt("Enter image URL:");
        if (url) exec("insertImage", url);
      }} title="Insert Image"><ImagePlus className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("insertHorizontalRule")} title="Horizontal Rule"><Minus className="h-3.5 w-3.5" /></button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button type="button" className={btnClass} onClick={() => exec("undo")} title="Undo"><Undo className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("redo")} title="Redo"><Redo className="h-3.5 w-3.5" /></button>
    </div>
  );
};

/* ── Main Component ── */
export default function AdminPageManagement({ user }: { user: User | null }) {
  const [pages, setPages] = useState<ManagedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPage, setEditingPage] = useState<ManagedPage | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editorMode, setEditorMode] = useState<"visual" | "code">("visual");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchPages(); }, []);

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
    setSelectedTemplate("blank");
    const newPage: ManagedPage = {
      ...emptyPage,
      id: crypto.randomUUID(),
      sort_order: pages.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEditingPage(newPage);
    setEditorMode("visual");
    setShowForm(true);
  };

  const applyTemplate = (templateKey: string) => {
    const tmpl = PAGE_TEMPLATES.find((t) => t.key === templateKey);
    if (!tmpl || !editingPage) return;
    setSelectedTemplate(templateKey);
    const updated = {
      ...editingPage,
      content: tmpl.content,
      template: templateKey,
      title: editingPage.title || tmpl.label,
      slug: editingPage.slug || generateSlug(tmpl.label),
    };
    setEditingPage(updated);
    if (editorRef.current && editorMode === "visual") {
      editorRef.current.innerHTML = tmpl.content;
    }
  };

  const editPage = (page: ManagedPage) => {
    setEditingPage({ ...page });
    setSelectedTemplate(page.template || "blank");
    setEditorMode("visual");
    setShowForm(true);
  };

  const deletePage = async (id: string) => {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    await savePages(pages.filter((p) => p.id !== id));
  };

  const syncEditorToState = () => {
    if (editorRef.current && editingPage) {
      setEditingPage((p) => p ? ({ ...p, content: editorRef.current?.innerHTML || "" }) : null);
    }
  };

  const handleSavePage = async () => {
    if (!editingPage) return;
    if (editorMode === "visual" && editorRef.current) {
      editingPage.content = editorRef.current.innerHTML;
    }
    if (!editingPage.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!editingPage.slug.trim()) editingPage.slug = generateSlug(editingPage.title);

    const slugConflict = pages.find((p) => p.slug === editingPage.slug && p.id !== editingPage.id);
    if (slugConflict) {
      toast({ title: "Slug already exists", variant: "destructive" });
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

  // Initialize editor content when switching to visual mode or opening form
  useEffect(() => {
    if (showForm && editingPage && editorMode === "visual" && editorRef.current) {
      editorRef.current.innerHTML = editingPage.content;
    }
  }, [showForm, editorMode]);

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
        <button onClick={addNewPage} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity" style={headingFont}>
          <Plus className="h-3.5 w-3.5" /> New Page
        </button>
      </div>

      {/* ── Page Analytics Summary ── */}
      {pages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="border border-border p-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={headingFont}>Total Pages</span>
            <span className="text-2xl font-light" style={displayFont}>{pages.length}</span>
          </div>
          <div className="border border-border p-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={headingFont}>Published</span>
            <span className="text-2xl font-light text-green-500" style={displayFont}>{pages.filter((p) => p.is_published).length}</span>
          </div>
          <div className="border border-border p-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={headingFont}>Drafts</span>
            <span className="text-2xl font-light text-yellow-500" style={displayFont}>{pages.filter((p) => !p.is_published).length}</span>
          </div>
          <div className="border border-border p-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={headingFont}>Total Views</span>
            <span className="text-2xl font-light" style={displayFont}>{pages.reduce((sum, p) => sum + (p.view_count || 0), 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* ── Page Editor Form ── */}
      {showForm && editingPage && (
        <div className="border border-border p-6 mb-8 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-[0.2em] uppercase text-primary" style={headingFont}>
              {pages.find((p) => p.id === editingPage.id) ? "Edit Page" : "New Page"}
            </span>
            <button onClick={() => { setShowForm(false); setEditingPage(null); }} className="text-muted-foreground hover:text-foreground text-xs" style={headingFont}>Cancel</button>
          </div>

          {/* Template Selector (only for new pages) */}
          {!pages.find((p) => p.id === editingPage.id) && (
            <div>
              <label className={labelClass} style={headingFont}>
                <Layout className="h-3 w-3 inline mr-1" /> Choose Template
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PAGE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.key}
                    onClick={() => applyTemplate(tmpl.key)}
                    className={`text-left p-3 border rounded-sm transition-all ${
                      selectedTemplate === tmpl.key
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-xs font-medium block" style={headingFont}>{tmpl.label}</span>
                    <span className="text-[9px] text-muted-foreground" style={bodyFont}>{tmpl.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass} style={headingFont}>Page Title *</label>
              <input
                value={editingPage.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setEditingPage((p) => p ? ({ ...p, title, slug: p.slug || generateSlug(title) }) : null);
                }}
                className={inputClass} style={bodyFont} placeholder="About Us"
              />
            </div>
            <div>
              <label className={labelClass} style={headingFont}>URL Slug *</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/page/</span>
                <input
                  value={editingPage.slug}
                  onChange={(e) => setEditingPage((p) => p ? ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }) : null)}
                  className={inputClass} style={bodyFont} placeholder="about-us"
                />
              </div>
            </div>
          </div>

          {/* Content Editor with Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass} style={headingFont}>Page Content</label>
              <div className="flex border border-border rounded-sm overflow-hidden">
                <button
                  onClick={() => {
                    if (editorMode === "code" && editorRef.current && editingPage) {
                      // switching from code to visual
                      editorRef.current.innerHTML = editingPage.content;
                    }
                    setEditorMode("visual");
                  }}
                  className={`px-3 py-1 text-[9px] tracking-[0.15em] uppercase transition-colors ${editorMode === "visual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={headingFont}
                >
                  <Type className="h-3 w-3 inline mr-1" /> Visual
                </button>
                <button
                  onClick={() => {
                    if (editorMode === "visual" && editorRef.current) {
                      syncEditorToState();
                    }
                    setEditorMode("code");
                  }}
                  className={`px-3 py-1 text-[9px] tracking-[0.15em] uppercase transition-colors ${editorMode === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={headingFont}
                >
                  <Code className="h-3 w-3 inline mr-1" /> HTML
                </button>
              </div>
            </div>

            {editorMode === "visual" ? (
              <div className="border border-border rounded-sm">
                <div className="p-2 bg-muted/20">
                  <RichTextToolbar editorRef={editorRef} onInput={syncEditorToState} />
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[300px] p-4 outline-none prose prose-sm max-w-none text-foreground
                    [&_h1]:text-xl [&_h1]:font-light [&_h1]:mb-3
                    [&_h2]:text-lg [&_h2]:font-light [&_h2]:mb-2
                    [&_h3]:text-base [&_h3]:font-medium [&_h3]:mb-2
                    [&_p]:mb-2 [&_p]:text-sm
                    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2
                    [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2
                    [&_li]:text-sm [&_li]:mb-1
                    [&_a]:text-primary [&_a]:underline
                    [&_img]:max-w-full [&_img]:rounded-sm [&_img]:my-3
                    [&_hr]:my-4 [&_hr]:border-border"
                  onInput={syncEditorToState}
                  style={bodyFont}
                />
              </div>
            ) : (
              <textarea
                value={editingPage.content}
                onChange={(e) => setEditingPage((p) => p ? ({ ...p, content: e.target.value }) : null)}
                className="w-full bg-muted/20 border border-border focus:border-primary outline-none p-4 text-sm font-mono transition-colors duration-500 rounded resize-y"
                rows={14}
                placeholder="<h1>Page Title</h1><p>Your content here...</p>"
              />
            )}
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
                <input value={editingPage.meta_title} onChange={(e) => setEditingPage((p) => p ? ({ ...p, meta_title: e.target.value }) : null)} className={inputClass} style={bodyFont} placeholder="Custom meta title" />
                <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>{(editingPage.meta_title || editingPage.title).length}/60 characters</p>
              </div>
              <div>
                <label className={labelClass} style={headingFont}>OG Image URL</label>
                <input value={editingPage.og_image} onChange={(e) => setEditingPage((p) => p ? ({ ...p, og_image: e.target.value }) : null)} className={inputClass} style={bodyFont} placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass} style={headingFont}>Meta Description</label>
                <textarea value={editingPage.meta_description} onChange={(e) => setEditingPage((p) => p ? ({ ...p, meta_description: e.target.value }) : null)} className={`${inputClass} resize-none`} rows={2} style={bodyFont} placeholder="A brief description for search engines..." />
                <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>{editingPage.meta_description.length}/160 characters</p>
              </div>
            </div>
          </div>

          {/* JSON-LD Structured Data */}
          <div className="border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-4">
              <Code className="h-4 w-4 text-primary" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-primary" style={headingFont}>Structured Data / JSON-LD</span>
            </div>
            <textarea
              value={editingPage.json_ld || ""}
              onChange={(e) => setEditingPage((p) => p ? ({ ...p, json_ld: e.target.value }) : null)}
              className="w-full bg-muted/20 border border-border focus:border-primary outline-none p-4 text-sm font-mono transition-colors duration-500 rounded resize-y"
              rows={6}
              placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "${editingPage.title || "Page Title"}"\n}`}
            />
            <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>
              Paste valid JSON-LD for enhanced search results (rich snippets). Leave empty to skip.
            </p>
          </div>

          {/* Multi-Language Versions */}
          <div className="border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-primary" style={headingFont}>Multi-Language Versions</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3" style={bodyFont}>
              Add translated versions of this page. These tie into the platform's language system — visitors see the version matching their selected language.
            </p>
            {Object.entries(editingPage.translations || {}).map(([lang, trans]) => (
              <div key={lang} className="border border-border rounded-sm p-4 mb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary" style={headingFont}>{lang}</span>
                  <button
                    onClick={() => {
                      const updated = { ...editingPage.translations };
                      delete updated[lang];
                      setEditingPage((p) => p ? ({ ...p, translations: updated }) : null);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Title</label>
                  <input
                    value={trans.title}
                    onChange={(e) => {
                      const updated = { ...editingPage.translations, [lang]: { ...trans, title: e.target.value } };
                      setEditingPage((p) => p ? ({ ...p, translations: updated }) : null);
                    }}
                    className={inputClass} style={bodyFont}
                  />
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Meta Title</label>
                  <input
                    value={trans.meta_title}
                    onChange={(e) => {
                      const updated = { ...editingPage.translations, [lang]: { ...trans, meta_title: e.target.value } };
                      setEditingPage((p) => p ? ({ ...p, translations: updated }) : null);
                    }}
                    className={inputClass} style={bodyFont}
                  />
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Meta Description</label>
                  <input
                    value={trans.meta_description}
                    onChange={(e) => {
                      const updated = { ...editingPage.translations, [lang]: { ...trans, meta_description: e.target.value } };
                      setEditingPage((p) => p ? ({ ...p, translations: updated }) : null);
                    }}
                    className={inputClass} style={bodyFont}
                  />
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Content (HTML)</label>
                  <textarea
                    value={trans.content}
                    onChange={(e) => {
                      const updated = { ...editingPage.translations, [lang]: { ...trans, content: e.target.value } };
                      setEditingPage((p) => p ? ({ ...p, translations: updated }) : null);
                    }}
                    className="w-full bg-muted/20 border border-border focus:border-primary outline-none p-3 text-sm font-mono transition-colors rounded resize-y"
                    rows={6}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <select
                id="add-lang-select"
                className="bg-transparent border border-border rounded px-2 py-1.5 text-xs"
                style={bodyFont}
                defaultValue=""
              >
                <option value="" disabled>Select language…</option>
                {["Hindi", "Bengali", "Tamil", "Telugu", "Spanish", "French", "German", "Portuguese", "Arabic", "Chinese", "Japanese", "Korean", "Russian", "Italian", "Dutch", "Turkish"]
                  .filter((l) => !editingPage.translations?.[l])
                  .map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button
                onClick={() => {
                  const sel = (document.getElementById("add-lang-select") as HTMLSelectElement)?.value;
                  if (!sel) return;
                  const updated = {
                    ...editingPage.translations,
                    [sel]: { title: "", content: "", meta_title: "", meta_description: "" },
                  };
                  setEditingPage((p) => p ? ({ ...p, translations: updated }) : null);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-border hover:border-primary hover:text-primary transition-all rounded-sm"
                style={headingFont}
              >
                <Plus className="h-3 w-3" /> Add Language
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-primary" style={headingFont}>Publishing Options</span>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} style={headingFont}>Schedule Publish Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn("w-full text-left flex items-center gap-2", inputClass)} style={bodyFont}>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {editingPage.scheduled_at
                        ? format(new Date(editingPage.scheduled_at), "PPP 'at' h:mm a")
                        : <span className="text-muted-foreground">No schedule (publish immediately)</span>
                      }
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarWidget
                      mode="single"
                      selected={editingPage.scheduled_at ? new Date(editingPage.scheduled_at) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Set time to current time on selected date
                          const now = new Date();
                          date.setHours(now.getHours(), now.getMinutes());
                          setEditingPage((p) => p ? ({ ...p, scheduled_at: date.toISOString() }) : null);
                        } else {
                          setEditingPage((p) => p ? ({ ...p, scheduled_at: null }) : null);
                        }
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                    <div className="px-3 pb-3 flex items-center justify-between">
                      {editingPage.scheduled_at && (
                        <input
                          type="time"
                          value={editingPage.scheduled_at ? format(new Date(editingPage.scheduled_at), "HH:mm") : ""}
                          onChange={(e) => {
                            const [h, m] = e.target.value.split(":").map(Number);
                            const d = new Date(editingPage.scheduled_at!);
                            d.setHours(h, m);
                            setEditingPage((p) => p ? ({ ...p, scheduled_at: d.toISOString() }) : null);
                          }}
                          className="border border-border rounded px-2 py-1 text-xs"
                        />
                      )}
                      <button
                        onClick={() => setEditingPage((p) => p ? ({ ...p, scheduled_at: null }) : null)}
                        className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground hover:text-destructive"
                        style={headingFont}
                      >
                        Clear
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
                {editingPage.scheduled_at && (
                  <p className="text-[10px] text-primary mt-1" style={bodyFont}>
                    ⏰ Will auto-publish on {format(new Date(editingPage.scheduled_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={editingPage.is_published} onChange={(e) => setEditingPage((p) => p ? ({ ...p, is_published: e.target.checked }) : null)} className="accent-primary" />
                  <label className="text-xs text-foreground" style={bodyFont}>Publish now (make it live)</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={editingPage.show_in_nav} onChange={(e) => setEditingPage((p) => p ? ({ ...p, show_in_nav: e.target.checked }) : null)} className="accent-primary" />
                  <label className="text-xs text-foreground" style={bodyFont}>Show in navigation menu</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={editingPage.noindex} onChange={(e) => setEditingPage((p) => p ? ({ ...p, noindex: e.target.checked }) : null)} className="accent-primary" />
                  <label className="text-xs text-muted-foreground" style={bodyFont}>noindex (hide from search engines)</label>
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSavePage} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50" style={headingFont}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Page
          </button>
        </div>
      )}

      {/* ── Pages List ── */}
      {pages.length === 0 && !showForm ? (
        <div className="text-center py-16 border border-dashed border-border">
          <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-2" style={bodyFont}>No pages created yet</p>
          <p className="text-xs text-muted-foreground/60 mb-6" style={bodyFont}>Create custom pages like About, Terms, Privacy, FAQ, and more.</p>
          <button onClick={addNewPage} className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary text-primary text-xs tracking-[0.15em] uppercase hover:bg-primary/10 transition-all" style={headingFont}>
            <Plus className="h-3.5 w-3.5" /> Create Your First Page
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <div key={page.id} className="flex items-center gap-4 border border-border p-4 hover:border-primary/30 transition-colors">
              <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium truncate" style={headingFont}>{page.title}</span>
                  <span className={`text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border ${page.is_published ? "text-green-500 border-green-500/40" : "text-muted-foreground border-border"}`} style={headingFont}>
                    {page.is_published ? "Live" : "Draft"}
                  </span>
                  {page.show_in_nav && (
                    <span className="text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border border-primary/30 text-primary" style={headingFont}>Nav</span>
                  )}
                  {page.scheduled_at && !page.is_published && (
                    <span className="text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border border-yellow-500/40 text-yellow-500" style={headingFont}>
                      <Clock className="h-2.5 w-2.5 inline mr-0.5" /> Scheduled
                    </span>
                  )}
                  {page.template && page.template !== "blank" && (
                    <span className="text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground" style={headingFont}>
                      {page.template}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground" style={bodyFont}>
                  <span>/page/{page.slug}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><BarChart3 className="h-2.5 w-2.5" /> {(page.view_count || 0).toLocaleString()} views</span>
                  {page.scheduled_at && !page.is_published && (
                    <>
                      <span>•</span>
                      <span>Publishes {format(new Date(page.scheduled_at), "MMM d, yyyy")}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => copyPageUrl(page.slug)} className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Copy URL"><Copy className="h-3.5 w-3.5" /></button>
                <button onClick={() => togglePublish(page)} className="p-2 text-muted-foreground hover:text-primary transition-colors" title={page.is_published ? "Unpublish" : "Publish"}>
                  {page.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => editPage(page)} className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Edit"><FileText className="h-3.5 w-3.5" /></button>
                <button onClick={() => deletePage(page.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Create Suggestions */}
      {!showForm && (
        <div className="mt-10 border border-dashed border-border p-6">
          <h3 className="text-xs tracking-[0.2em] uppercase text-primary mb-4" style={headingFont}>
            💡 Quick Create from Template
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {PAGE_TEMPLATES.filter((t) => t.key !== "blank").map((tmpl) => {
              const exists = pages.some((p) => p.slug === generateSlug(tmpl.label));
              return (
                <button
                  key={tmpl.key}
                  disabled={exists}
                  onClick={() => {
                    const newPage: ManagedPage = {
                      ...emptyPage,
                      id: crypto.randomUUID(),
                      title: tmpl.label,
                      slug: generateSlug(tmpl.label),
                      content: tmpl.content,
                      template: tmpl.key,
                      sort_order: pages.length,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    };
                    setEditingPage(newPage);
                    setSelectedTemplate(tmpl.key);
                    setEditorMode("visual");
                    setShowForm(true);
                  }}
                  className={`text-left p-3 border rounded-sm transition-all ${exists ? "opacity-40 cursor-not-allowed border-border" : "border-border hover:border-primary/50 hover:bg-muted/20"}`}
                >
                  <span className="text-xs font-medium block" style={headingFont}>{tmpl.label}</span>
                  <span className="text-[10px] text-muted-foreground" style={bodyFont}>{tmpl.description}</span>
                  {exists && <span className="text-[8px] text-primary block mt-1" style={headingFont}>Already created</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
