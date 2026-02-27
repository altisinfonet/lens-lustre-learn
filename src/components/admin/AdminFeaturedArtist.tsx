import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, EyeOff, XCircle, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface FeaturedArtistRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  artist_name: string | null;
  artist_bio: string | null;
  artist_avatar_url: string | null;
  tags: string[];
  is_active: boolean;
  published_at: string | null;
  created_at: string;
}

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  cover_image_url: "",
  artist_name: "",
  artist_bio: "",
  artist_avatar_url: "",
  tags: "",
  is_active: true,
};

export default function AdminFeaturedArtist({ user }: { user: User | null }) {
  const [items, setItems] = useState<FeaturedArtistRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const { data } = await supabase
      .from("featured_artists")
      .select("*")
      .order("published_at", { ascending: false });
    setItems((data as any) || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (item: FeaturedArtistRow) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || "",
      body: item.body,
      cover_image_url: item.cover_image_url || "",
      artist_name: item.artist_name || "",
      artist_bio: item.artist_bio || "",
      artist_avatar_url: item.artist_avatar_url || "",
      tags: (item.tags || []).join(", "),
      is_active: item.is_active,
    });
    setShowForm(true);
  };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async () => {
    if (!user || !form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = form.slug.trim() || generateSlug(form.title);
    const payload = {
      title: form.title.trim(),
      slug,
      excerpt: form.excerpt.trim() || null,
      body: form.body,
      cover_image_url: form.cover_image_url.trim() || null,
      artist_name: form.artist_name.trim() || null,
      artist_bio: form.artist_bio.trim() || null,
      artist_avatar_url: form.artist_avatar_url.trim() || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("featured_artists").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("featured_artists").insert({ ...payload, created_by: user.id }));
    }
    setSaving(false);

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Updated" : "Created" });
      resetForm();
      fetchAll();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("featured_artists").update({ is_active: !current }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: !current } : i)));
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this featured artist article?")) return;
    await supabase.from("featured_artists").delete().eq("id", id);
    toast({ title: "Deleted" });
    fetchAll();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {items.length} featured artist{items.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-500"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <Plus className="h-3.5 w-3.5" /> New Article
        </button>
      </div>

      {showForm && (
        <div className="border border-border p-6 md:p-8 mb-8 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              {editingId ? "Edit Article" : "New Featured Artist"}
            </span>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || generateSlug(e.target.value) })}
                className="w-full h-9 border border-input bg-background px-3 text-sm rounded-sm focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full h-9 border border-input bg-background px-3 text-sm rounded-sm focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>Artist Name</label>
              <input
                value={form.artist_name}
                onChange={(e) => setForm({ ...form, artist_name: e.target.value })}
                className="w-full h-9 border border-input bg-background px-3 text-sm rounded-sm focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>Artist Avatar URL</label>
              <input
                value={form.artist_avatar_url}
                onChange={(e) => setForm({ ...form, artist_avatar_url: e.target.value })}
                className="w-full h-9 border border-input bg-background px-3 text-sm rounded-sm focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>Cover Image URL</label>
              <input
                value={form.cover_image_url}
                onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                className="w-full h-9 border border-input bg-background px-3 text-sm rounded-sm focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>Excerpt (short intro)</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-sm focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>Artist Bio</label>
              <textarea
                value={form.artist_bio}
                onChange={(e) => setForm({ ...form, artist_bio: e.target.value })}
                rows={2}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-sm focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>Body (use [img:URL] for inline images)</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={10}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-sm focus:ring-1 focus:ring-ring font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>Tags (comma-separated)</label>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full h-9 border border-input bg-background px-3 text-sm rounded-sm focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>Active</label>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-6 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {editingId ? "Update" : "Create"}
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="group flex items-center gap-4 p-4 border border-border hover:border-primary/30 transition-colors">
            {item.cover_image_url && (
              <img src={item.cover_image_url} alt={item.title} className="h-12 w-12 object-cover rounded-sm shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-[10px] text-muted-foreground">{item.artist_name || "No artist"} · {item.is_active ? "Active" : "Hidden"}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => toggleActive(item.id, item.is_active)} className="p-1.5 hover:text-primary">
                {item.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => openEdit(item)} className="p-1.5 hover:text-primary">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => deleteItem(item.id)} className="p-1.5 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No featured artist articles yet.</p>
        )}
      </div>
    </div>
  );
}
