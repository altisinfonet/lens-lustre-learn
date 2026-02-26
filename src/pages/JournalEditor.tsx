import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Save, Eye, Upload, X, Image as ImageIcon, GripVertical } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import InlineImageDropZone from "@/components/InlineImageDropZone";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

// Body is stored as plain text. Inline images use [img:URL] blocks separated by \n\n

interface BodyBlock {
  id: string;
  type: "text" | "image";
  content: string;
}

function parseBodyToBlocks(body: string): BodyBlock[] {
  if (!body.trim()) return [{ id: crypto.randomUUID(), type: "text", content: "" }];
  const parts = body.split("\n\n");
  return parts.map((part) => {
    const trimmed = part.trim();
    const imgMatch = trimmed.match(/^\[img:(.*?)\]$/);
    if (imgMatch) {
      return { id: crypto.randomUUID(), type: "image" as const, content: imgMatch[1] };
    }
    return { id: crypto.randomUUID(), type: "text" as const, content: trimmed };
  });
}

function blocksToBody(blocks: BodyBlock[]): string {
  return blocks
    .map((b) => (b.type === "image" ? `[img:${b.content}]` : b.content))
    .filter((s) => s.trim() || s.startsWith("[img:"))
    .join("\n\n");
}

const JournalEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [blocks, setBlocks] = useState<BodyBlock[]>([{ id: crypto.randomUUID(), type: "text", content: "" }]);
  const [tagsInput, setTagsInput] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Check access
  useEffect(() => {
    const check = async () => {
      if (!user) { setCheckingAccess(false); return; }
      if (isAdmin) { setCanAccess(true); setCheckingAccess(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "content_editor")
        .maybeSingle();
      setCanAccess(!!data);
      setCheckingAccess(false);
    };
    check();
  }, [user, isAdmin]);

  // Load existing article
  useEffect(() => {
    if (isNew || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("journal_articles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setTitle(data.title);
        setExcerpt(data.excerpt || "");
        setBlocks(parseBodyToBlocks(data.body));
        setTagsInput(data.tags.join(", "));
        setCoverUrl(data.cover_image_url || "");
        setGallery(data.photo_gallery);
        setStatus(data.status as "draft" | "published");
      }
    };
    load();
  }, [id, isNew, user]);

  const updateBlock = useCallback((blockId: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, content } : b)));
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    setBlocks((prev) => {
      const filtered = prev.filter((b) => b.id !== blockId);
      return filtered.length > 0 ? filtered : [{ id: crypto.randomUUID(), type: "text", content: "" }];
    });
  }, []);

  const insertImageAfter = useCallback((afterIdx: number, imageUrl: string) => {
    setBlocks((prev) => {
      const newBlocks = [...prev];
      newBlocks.splice(afterIdx + 1, 0, { id: crypto.randomUUID(), type: "image", content: imageUrl });
      // Ensure there's a text block after the image
      if (afterIdx + 2 >= newBlocks.length || newBlocks[afterIdx + 2]?.type !== "text") {
        newBlocks.splice(afterIdx + 2, 0, { id: crypto.randomUUID(), type: "text", content: "" });
      }
      return newBlocks;
    });
  }, []);

  if (checkingAccess) {
    return <main className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground text-sm">Loading…</p></main>;
  }

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">You don't have permission to edit articles.</p>
        <Link to="/journal" className="text-primary text-sm underline">Back to Journal</Link>
      </main>
    );
  }

  const generateSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) +
    "-" + Date.now().toString(36);

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("journal-images").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("journal-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const url = await uploadImage(file, "covers");
    if (url) setCoverUrl(url);
    setUploading(false);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) continue;
      const url = await uploadImage(file, "gallery");
      if (url) urls.push(url);
    }
    setGallery((prev) => [...prev, ...urls]);
    setUploading(false);
  };

  const handleSave = async (publishStatus: "draft" | "published") => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const body = blocksToBody(blocks);
    if (!body.trim()) {
      toast({ title: "Body is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      title: title.trim().slice(0, 200),
      slug: isNew ? generateSlug(title) : undefined,
      excerpt: excerpt.trim().slice(0, 500) || null,
      body,
      cover_image_url: coverUrl || null,
      tags,
      photo_gallery: gallery,
      status: publishStatus,
      published_at: publishStatus === "published" ? new Date().toISOString() : null,
      author_id: user!.id,
    };

    let error;
    if (isNew) {
      const res = await supabase.from("journal_articles").insert(payload);
      error = res.error;
    } else {
      const { slug: _, ...updatePayload } = payload;
      const res = await supabase.from("journal_articles").update(updatePayload).eq("id", id);
      error = res.error;
    }

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: publishStatus === "published" ? "Article published!" : "Draft saved" });
      navigate("/journal");
    }
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Breadcrumbs items={[{ label: "Journal", to: "/journal" }, { label: id ? "Edit Article" : "New Article" }]} />
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={saving}
              className="text-xs tracking-[0.1em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> Save Draft
            </Button>
            <Button size="sm" onClick={() => handleSave("published")} disabled={saving}
              className="text-xs tracking-[0.1em] uppercase bg-primary text-primary-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Publish
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 max-w-3xl py-10 md:py-16 space-y-8">
        {/* Cover image */}
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Cover Image
          </label>
          {coverUrl ? (
            <div className="relative group">
              <img src={coverUrl} alt="Cover" className="w-full h-48 object-cover" />
              <button onClick={() => setCoverUrl("")}
                className="absolute top-2 right-2 p-1.5 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center h-48 border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-6 w-6" />
                <span className="text-xs" style={{ fontFamily: "var(--font-heading)" }}>
                  {uploading ? "Uploading…" : "Upload cover image"}
                </span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploading} />
            </label>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title…"
            className="text-2xl font-light bg-transparent border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40"
            style={{ fontFamily: "var(--font-display)" }} maxLength={200} />
        </div>

        {/* Excerpt */}
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Excerpt</label>
          <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="A short summary…"
            className="bg-transparent" maxLength={500} />
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Tags (comma-separated)</label>
          <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Wildlife, Tutorial, Behind the Scenes" className="bg-transparent" />
        </div>

        {/* Body with inline image drop zones */}
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Body <span className="text-muted-foreground/50 normal-case tracking-normal">— click + between paragraphs to insert images</span>
          </label>
          <div className="space-y-1">
            {blocks.map((block, idx) => (
              <div key={block.id}>
                {block.type === "text" ? (
                  <Textarea
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, e.target.value)}
                    placeholder={idx === 0 ? "Start writing your article…" : "Continue writing…"}
                    className="min-h-[120px] bg-transparent leading-relaxed resize-y"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                ) : (
                  <div className="relative group my-2">
                    <img src={block.content} alt={`Inline image ${idx + 1}`} className="w-full max-h-80 object-cover rounded-sm" />
                    <button
                      onClick={() => removeBlock(block.id)}
                      className="absolute top-2 right-2 p-1.5 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/70 rounded-sm text-[9px] tracking-wider uppercase text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: "var(--font-heading)" }}>
                      Inline Image
                    </div>
                  </div>
                )}
                {/* Drop zone between blocks */}
                <InlineImageDropZone onImageInserted={(url) => insertImageAfter(idx, url)} />
              </div>
            ))}
          </div>
        </div>

        {/* Photo gallery */}
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Photo Gallery</label>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-3">
            {gallery.map((url, i) => (
              <div key={i} className="relative group aspect-square">
                <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                <button onClick={() => setGallery((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex items-center justify-center aspect-square border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
                <span className="text-[9px]" style={{ fontFamily: "var(--font-heading)" }}>{uploading ? "…" : "Add"}</span>
              </div>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>
    </main>
  );
};

export default JournalEditor;
