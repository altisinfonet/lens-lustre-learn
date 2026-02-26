import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, XCircle, Loader2, Upload, Image } from "lucide-react";
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
    const { data } = await supabase.from("hero_banners").select("*").order("sort_order", { ascending: true });
    setBanners(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const resetForm = () => { setForm({ title: "", category: "General", image_url: "" }); setEditingId(null); setShowForm(false); };

  const handleImageUpload = async (file: File) => {
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
    setSaving(true);
    const maxOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.sort_order)) : 0;
    if (editingId) {
      const { error } = await supabase.from("hero_banners").update({ title: form.title.trim(), category: form.category.trim(), image_url: form.image_url.trim(), updated_at: new Date().toISOString() }).eq("id", editingId);
      if (error) toast({ title: "Update failed", variant: "destructive" });
      else { toast({ title: "Updated" }); resetForm(); fetchBanners(); }
    } else {
      const { error } = await supabase.from("hero_banners").insert({ title: form.title.trim(), category: form.category.trim(), image_url: form.image_url.trim(), sort_order: maxOrder + 1 });
      if (error) toast({ title: "Create failed", variant: "destructive" });
      else { toast({ title: "Created" }); resetForm(); fetchBanners(); }
    }
    setSaving(false);
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await supabase.from("hero_banners").delete().eq("id", id);
    toast({ title: "Deleted" });
    fetchBanners();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("hero_banners").update({ is_active: !current }).eq("id", id);
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, is_active: !current } : b)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {banners.length} banner{banners.length !== 1 ? "s" : ""}
        </span>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity rounded-sm"
          style={{ fontFamily: "var(--font-heading)" }}>
          <Plus className="h-3 w-3" /> New Banner
        </button>
      </div>

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

      {banners.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {banners.map((b) => (
            <div key={b.id} className={`group relative aspect-[16/9] overflow-hidden border rounded-sm ${b.is_active ? "border-border" : "border-destructive/40 opacity-40"}`}>
              <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] tracking-wider uppercase font-medium" style={{ fontFamily: "var(--font-heading)" }}>{b.title}</span>
                <span className="text-[8px] text-muted-foreground">{b.category}</span>
                <div className="flex gap-1.5 mt-1">
                  <button onClick={() => toggleActive(b.id, b.is_active)} className={`p-1 rounded-sm ${b.is_active ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`} title={b.is_active ? "Deactivate" : "Activate"}>
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
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-sm">
          <Image className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No banners yet</p>
        </div>
      )}
    </div>
  );
};

export default AdminBanners;
