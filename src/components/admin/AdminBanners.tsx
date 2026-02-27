import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, EyeOff, XCircle, Loader2, Upload, Image, GripVertical, Globe } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Banner {
  id: string;
  title: string;
  category: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

const MAX_BANNERS = 20;

const AdminBanners = ({ user }: { user: User | null }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", category: "General", image_url: "" });

  const activeBanners = banners.filter((b) => b.is_active);
  const inactiveBanners = banners.filter((b) => !b.is_active);

  const fetchBanners = async () => {
    const { data } = await supabase.from("hero_banners").select("*").order("sort_order", { ascending: true });
    setBanners(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const resetForm = () => { setForm({ title: "", category: "General", image_url: "" }); setEditingId(null); setShowForm(false); };

  const handleImageUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB per banner image", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `banners/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("portfolio-images").upload(filePath, file);
    if (error) { toast({ title: "Upload failed", variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("portfolio-images").getPublicUrl(filePath);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.image_url.trim()) { toast({ title: "Title and image required", variant: "destructive" }); return; }
    if (!editingId && banners.length >= MAX_BANNERS) {
      toast({ title: `Maximum ${MAX_BANNERS} banners reached`, description: "Delete an existing banner before adding a new one.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const maxOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.sort_order)) : 0;
    if (editingId) {
      const { error } = await supabase.from("hero_banners").update({ title: form.title.trim(), category: form.category.trim(), image_url: form.image_url.trim(), updated_at: new Date().toISOString() }).eq("id", editingId);
      if (error) toast({ title: "Update failed", variant: "destructive" });
      else { toast({ title: "Banner updated" }); resetForm(); fetchBanners(); }
    } else {
      const { error } = await supabase.from("hero_banners").insert({ title: form.title.trim(), category: form.category.trim(), image_url: form.image_url.trim(), sort_order: maxOrder + 1 });
      if (error) toast({ title: "Create failed", variant: "destructive" });
      else { toast({ title: "Banner created" }); resetForm(); fetchBanners(); }
    }
    setSaving(false);
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await supabase.from("hero_banners").delete().eq("id", id);
    toast({ title: "Banner deleted" });
    fetchBanners();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("hero_banners").update({ is_active: !current, updated_at: new Date().toISOString() }).eq("id", id);
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, is_active: !current } : b)));
    toast({ title: !current ? "Banner is now LIVE on homepage" : "Banner removed from homepage" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            {banners.length}/{MAX_BANNERS} banners
          </span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Globe className="h-2.5 w-2.5" /> {activeBanners.length} Live
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
              <EyeOff className="h-2.5 w-2.5" /> {inactiveBanners.length} Hidden
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            if (banners.length >= MAX_BANNERS) {
              toast({ title: `Maximum ${MAX_BANNERS} banners reached`, variant: "destructive" });
              return;
            }
            resetForm(); setShowForm(true);
          }}
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity rounded-sm"
          style={{ fontFamily: "var(--font-heading)" }}>
          <Plus className="h-3 w-3" /> New Banner
        </button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <div className="border border-border p-4 rounded-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium" style={{ fontFamily: "var(--font-heading)" }}>
              {editingId ? "Edit Banner" : "New Banner"}
            </span>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center gap-2">
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title *"
              className="flex-1 bg-transparent border border-border rounded-sm px-3 py-1.5 text-xs outline-none focus:border-primary" />
            <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Category"
              className="w-32 bg-transparent border border-border rounded-sm px-3 py-1.5 text-xs outline-none focus:border-primary" />
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-[10px] px-3 py-1.5 border border-border cursor-pointer hover:border-primary transition-colors rounded-sm shrink-0">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Upload
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
            </label>
            <input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="Or paste image URL"
              className="flex-1 bg-transparent border border-border rounded-sm px-3 py-1.5 text-xs outline-none focus:border-primary" />
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 text-[10px] tracking-wider uppercase bg-primary text-primary-foreground hover:opacity-90 rounded-sm disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : editingId ? "Update" : "Create"}
            </button>
          </div>
          {form.image_url && <img src={form.image_url} alt="Preview" className="h-20 object-cover border border-border rounded-sm" />}
        </div>
      )}

      {/* LIVE Banners Section */}
      {activeBanners.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3 text-primary" />
            <span className="text-[9px] tracking-[0.3em] uppercase text-primary font-medium" style={{ fontFamily: "var(--font-heading)" }}>
              Live on Homepage ({activeBanners.length})
            </span>
            <div className="flex-1 h-px bg-primary/20" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {activeBanners.map((b) => (
              <div key={b.id} className="group relative aspect-[16/9] overflow-hidden border-2 border-primary/30 rounded-sm shadow-sm shadow-primary/10">
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                {/* LIVE badge */}
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-primary text-primary-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
                  <span className="text-[7px] tracking-[0.2em] uppercase font-bold" style={{ fontFamily: "var(--font-heading)" }}>Live</span>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1">
                  <span className="text-[10px] tracking-wider uppercase font-medium" style={{ fontFamily: "var(--font-heading)" }}>{b.title}</span>
                  <span className="text-[8px] text-muted-foreground">{b.category} · Order: {b.sort_order}</span>
                  <div className="flex gap-1.5 mt-1">
                    <button onClick={() => toggleActive(b.id, b.is_active)} className="p-1 rounded-sm text-destructive bg-destructive/10 hover:bg-destructive/20" title="Remove from homepage">
                      <EyeOff className="h-3 w-3" />
                    </button>
                    <button onClick={() => { setEditingId(b.id); setForm({ title: b.title, category: b.category, image_url: b.image_url }); setShowForm(true); }} className="p-1 text-foreground hover:text-primary rounded-sm hover:bg-primary/10">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => deleteBanner(b.id)} className="p-1 text-destructive rounded-sm hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden Banners Section */}
      {inactiveBanners.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <EyeOff className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Hidden ({inactiveBanners.length})
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {inactiveBanners.map((b) => (
              <div key={b.id} className="group relative aspect-[16/9] overflow-hidden border border-border rounded-sm opacity-50 hover:opacity-100 transition-opacity">
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1">
                  <span className="text-[10px] tracking-wider uppercase font-medium" style={{ fontFamily: "var(--font-heading)" }}>{b.title}</span>
                  <span className="text-[8px] text-muted-foreground">{b.category}</span>
                  <div className="flex gap-1.5 mt-1">
                    <button onClick={() => toggleActive(b.id, b.is_active)} className="p-1 rounded-sm text-primary bg-primary/10 hover:bg-primary/20" title="Make LIVE on homepage">
                      <Eye className="h-3 w-3" />
                    </button>
                    <button onClick={() => { setEditingId(b.id); setForm({ title: b.title, category: b.category, image_url: b.image_url }); setShowForm(true); }} className="p-1 text-foreground hover:text-primary rounded-sm hover:bg-primary/10">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => deleteBanner(b.id)} className="p-1 text-destructive rounded-sm hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {banners.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-sm">
          <Image className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-1">No banners yet</p>
          <p className="text-[9px] text-muted-foreground/60">Upload up to {MAX_BANNERS} banners and toggle which ones appear on the homepage</p>
        </div>
      )}
    </div>
  );
};

export default AdminBanners;
