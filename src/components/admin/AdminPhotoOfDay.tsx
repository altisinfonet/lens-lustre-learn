import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye, EyeOff, Upload, Star, Loader2, XCircle } from "lucide-react";
import { compressImageToFiles } from "@/lib/imageCompression";
import { scanFileWithToast } from "@/lib/fileSecurityScanner";
import { User } from "@supabase/supabase-js";

interface POTD {
  id: string;
  image_url: string;
  title: string;
  photographer_name: string | null;
  source_type: string;
  description: string | null;
  is_active: boolean;
  featured_date: string;
  created_at: string;
}

export default function AdminPhotoOfDay({ user }: { user: User | null }) {
  const [items, setItems] = useState<POTD[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    photographer_name: "",
    description: "",
    image_url: "",
    featured_date: new Date().toISOString().slice(0, 10),
  });

  const fetchAll = async () => {
    const { data } = await supabase
      .from("photo_of_the_day")
      .select("*")
      .order("featured_date", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const safe = await scanFileWithToast(file, toast, { allowedTypes: "image" });
      if (!safe) { setUploading(false); return; }
      const baseName = `potd-${Date.now()}`;
      const { webpFile, jpegFile } = await compressImageToFiles(file, baseName);
      const webpPath = `potd/${baseName}.webp`;
      const jpegPath = `potd/${baseName}.jpg`;
      const [webpRes] = await Promise.all([
        supabase.storage.from("portfolio-images").upload(webpPath, webpFile),
        supabase.storage.from("portfolio-images").upload(jpegPath, jpegFile),
      ]);
      if (webpRes.error) {
        toast({ title: "Upload failed", description: webpRes.error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("portfolio-images").getPublicUrl(webpPath);
      setForm(f => ({ ...f, image_url: urlData.publicUrl }));
    } catch {
      toast({ title: "Compression failed", variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.image_url.trim()) {
      toast({ title: "Title and image are required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("photo_of_the_day").insert({
      title: form.title.trim(),
      photographer_name: form.photographer_name.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim(),
      featured_date: form.featured_date,
      source_type: "custom",
      created_by: user.id,
      is_active: true,
    } as any);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Photo of the Day added!" });
      setForm({ title: "", photographer_name: "", description: "", image_url: "", featured_date: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      fetchAll();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("photo_of_the_day").update({ is_active: !current } as any).eq("id", id);
    setItems(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this Photo of the Day?")) return;
    await supabase.from("photo_of_the_day").delete().eq("id", id);
    setItems(prev => prev.filter(p => p.id !== id));
    toast({ title: "Removed" });
  };

  if (loading) return <div className="text-xs text-muted-foreground animate-pulse py-8 text-center">Loading...</div>;

  const activeCount = items.filter(i => i.is_active).length;
  const MAX_ACTIVE = 20;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {items.length} photo(s) of the day · {activeCount}/{MAX_ACTIVE} active
        </span>
        <button
          onClick={() => {
            if (activeCount >= MAX_ACTIVE && !showForm) {
              toast({ title: `Maximum ${MAX_ACTIVE} active photos allowed`, description: "Deactivate some photos first.", variant: "destructive" });
              return;
            }
            setShowForm(!showForm);
          }}
          className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-500"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <Plus className="h-3.5 w-3.5" /> Upload New
        </button>
      </div>

      {showForm && (
        <div className="border border-border p-6 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>New Photo of the Day</span>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Photo title"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" style={{ fontFamily: "var(--font-body)" }} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Photographer</label>
              <input value={form.photographer_name} onChange={e => setForm(f => ({ ...f, photographer_name: e.target.value }))} placeholder="Name"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" style={{ fontFamily: "var(--font-body)" }} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Featured Date</label>
              <input type="date" value={form.featured_date} onChange={e => setForm(f => ({ ...f, featured_date: e.target.value }))}
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" style={{ fontFamily: "var(--font-body)" }} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" style={{ fontFamily: "var(--font-body)" }} />
            </div>
          </div>

          {/* Image upload or URL */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Image *</label>
            {form.image_url ? (
              <div className="relative w-full h-40 border border-border overflow-hidden mb-2">
                <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm(f => ({ ...f, image_url: "" }))} className="absolute top-2 right-2 bg-background/80 p-1 rounded-sm"><XCircle className="h-3 w-3" /></button>
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <label className="cursor-pointer inline-flex items-center gap-2 text-xs px-4 py-2 border border-border hover:border-primary transition-colors">
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                </label>
                <span className="text-[9px] text-muted-foreground">or</span>
                <input placeholder="Paste image URL" onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" style={{ fontFamily: "var(--font-body)" }} />
              </div>
            )}
          </div>

          <button onClick={handleSave}
            className="text-xs tracking-[0.15em] uppercase px-6 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            style={{ fontFamily: "var(--font-heading)" }}>
            Save Photo of the Day
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-4 border border-border p-3 group">
            <div className="w-20 h-14 bg-muted overflow-hidden shrink-0">
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {item.is_active && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                <span className="text-sm font-light truncate" style={{ fontFamily: "var(--font-display)" }}>{item.title}</span>
              </div>
              <div className="flex items-center gap-3 text-[9px] text-muted-foreground mt-0.5">
                {item.photographer_name && <span>{item.photographer_name}</span>}
                <span>{item.featured_date}</span>
                <span className="uppercase">{item.source_type}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => toggleActive(item.id, item.is_active)} className="p-1.5 hover:bg-muted rounded-sm" title={item.is_active ? "Deactivate" : "Activate"}>
                {item.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => remove(item.id)} className="p-1.5 hover:bg-destructive/10 rounded-sm text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-[10px] text-muted-foreground py-8" style={{ fontFamily: "var(--font-body)" }}>No Photo of the Day entries yet.</p>
        )}
      </div>
    </div>
  );
}
