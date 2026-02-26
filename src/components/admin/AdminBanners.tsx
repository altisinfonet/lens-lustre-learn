import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, XCircle, Loader2, Upload, GripVertical } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Banner {
  id: string;
  title: string;
  category: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

const AdminBanners = ({ user }: { user: User | null }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", category: "General", image_url: "" });

  const fetchBanners = async () => {
    const { data } = await supabase
      .from("hero_banners")
      .select("*")
      .order("sort_order", { ascending: true });
    setBanners(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const resetForm = () => {
    setForm({ title: "", category: "General", image_url: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `banners/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("portfolio-images").upload(filePath, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("portfolio-images").getPublicUrl(filePath);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.image_url.trim()) {
      toast({ title: "Title and image are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const maxOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.sort_order)) : 0;

    if (editingId) {
      const { error } = await supabase.from("hero_banners").update({
        title: form.title.trim(),
        category: form.category.trim(),
        image_url: form.image_url.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", editingId);
      if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
      else { toast({ title: "Banner updated" }); resetForm(); fetchBanners(); }
    } else {
      const { error } = await supabase.from("hero_banners").insert({
        title: form.title.trim(),
        category: form.category.trim(),
        image_url: form.image_url.trim(),
        sort_order: maxOrder + 1,
      });
      if (error) toast({ title: "Create failed", description: error.message, variant: "destructive" });
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
    await supabase.from("hero_banners").update({ is_active: !current }).eq("id", id);
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, is_active: !current } : b)));
  };

  const openEdit = (b: Banner) => {
    setEditingId(b.id);
    setForm({ title: b.title, category: b.category, image_url: b.image_url });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {banners.length} banner{banners.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-500"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <Plus className="h-3.5 w-3.5" /> New Banner
        </button>
      </div>

      {showForm && (
        <div className="border border-border p-6 mb-8 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              {editingId ? "Edit Banner" : "New Banner"}
            </span>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Title *</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Banner title"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Category</label>
              <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Portrait, Wildlife"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Image</label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs px-4 py-2 border border-border cursor-pointer hover:border-primary transition-colors" style={{ fontFamily: "var(--font-heading)" }}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
              </label>
              <span className="text-xs text-muted-foreground">or</span>
              <input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="Paste image URL"
                className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }} />
            </div>
            {form.image_url && <img src={form.image_url} alt="Preview" className="mt-3 h-32 object-cover border border-border" />}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editingId ? "Update" : "Create"}
            </button>
            <button onClick={resetForm} className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground" style={{ fontFamily: "var(--font-heading)" }}>Cancel</button>
          </div>
        </div>
      )}

      {banners.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {banners.map((b) => (
            <div key={b.id} className={`group relative aspect-[16/9] overflow-hidden border ${b.is_active ? "border-border" : "border-destructive/40 opacity-50"}`}>
              <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                <span className="text-[10px] tracking-wider uppercase text-foreground" style={{ fontFamily: "var(--font-heading)" }}>{b.title}</span>
                <span className="text-[8px] text-muted-foreground">{b.category}</span>
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(b.id, b.is_active)} className={`p-1 ${b.is_active ? "text-primary" : "text-muted-foreground"}`} title={b.is_active ? "Deactivate" : "Activate"}>
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openEdit(b)} className="p-1 text-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => deleteBanner(b.id)} className="p-1 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-border">
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>No banners yet. Add your first homepage banner above.</p>
        </div>
      )}
    </div>
  );
};

export default AdminBanners;
