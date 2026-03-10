import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Megaphone, Plus, Trash2, Eye, EyeOff, Monitor, Smartphone, Tablet, Upload, Link, Image as ImageIcon, Crop as CropIcon, BarChart3, Globe, Clock, Beaker, Settings2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdImagePositioner, { PLACEMENT_DIMENSIONS } from "@/components/admin/AdImagePositioner";
import { storageUpload } from "@/lib/storageUpload";
import { compressImageToFiles } from "@/lib/imageCompression";
import type { User } from "@supabase/supabase-js";
import type { AdSource } from "@/lib/adSlots";

type Placement = "header" | "sidebar" | "in-content" | "between-entries" | "lightbox-overlay" | "above-journal" | "below-journal";
type Device = "desktop" | "mobile" | "tablet";
type AdImageSource = "upload" | "url" | "code";

interface AdSlot {
  id: string;
  name: string;
  placement: Placement;
  devices: Device[];
  ad_code: string;
  is_active: boolean;
  priority: number;
  start_date: string;
  end_date: string;
  notes: string;
  image_url?: string;
  image_source?: AdImageSource;
  click_url?: string;
  alt_text?: string;
  ad_source: AdSource;
  adsense_slot_id: string;
  adsense_format: string;
  ab_enabled: boolean;
  ab_adsense_pct: number;
  geo_targets: string[];
  schedule_hours_start: number;
  schedule_hours_end: number;
}

interface AdsenseConfig {
  publisher_id: string;
  enabled: boolean;
  auto_ads: boolean;
}

interface ImpressionRow {
  slot_id: string;
  placement: string;
  event_type: string;
  device: string;
  ad_source: string;
  created_at: string;
}

const placementOptions: { value: Placement; label: string }[] = [
  { value: "header", label: "Header (Leaderboard)" },
  { value: "above-journal", label: "Above Journal Section" },
  { value: "below-journal", label: "Below Journal Section" },
  { value: "sidebar", label: "Sidebar (Rectangle)" },
  { value: "in-content", label: "In-Content (Banner)" },
  { value: "between-entries", label: "Between Entries" },
  { value: "lightbox-overlay", label: "Lightbox Overlay" },
];

const deviceOptions: { value: Device; label: string; icon: typeof Monitor }[] = [
  { value: "desktop", label: "Desktop", icon: Monitor },
  { value: "mobile", label: "Mobile", icon: Smartphone },
  { value: "tablet", label: "Tablet", icon: Tablet },
];

const adsenseFormats = [
  { value: "auto", label: "Auto (Responsive)" },
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
  { value: "rectangle", label: "Rectangle" },
];

const emptySlot = (): AdSlot => ({
  id: crypto.randomUUID(),
  name: "",
  placement: "header",
  devices: ["desktop", "mobile", "tablet"],
  ad_code: "",
  is_active: true,
  priority: 0,
  start_date: "",
  end_date: "",
  notes: "",
  image_url: "",
  image_source: "upload",
  click_url: "",
  alt_text: "",
  ad_source: "internal",
  adsense_slot_id: "",
  adsense_format: "auto",
  ab_enabled: false,
  ab_adsense_pct: 50,
  geo_targets: [],
  schedule_hours_start: 0,
  schedule_hours_end: 24,
});

export default function AdminAdvertisements({ user }: { user: User | null }) {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("slots");
  const [editingSlot, setEditingSlot] = useState<AdSlot | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AdSense config
  const [adsenseConfig, setAdsenseConfig] = useState<AdsenseConfig>({ publisher_id: "", enabled: false, auto_ads: false });
  const [savingAdsense, setSavingAdsense] = useState(false);

  // Analytics
  const [impressions, setImpressions] = useState<ImpressionRow[]>([]);
  const [analyticsRange, setAnalyticsRange] = useState<"7d" | "30d" | "90d">("7d");
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [slotsRes, adsenseRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "ad_slots").maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "adsense_config").maybeSingle(),
      ]);
      if (slotsRes.data?.value && Array.isArray(slotsRes.data.value)) {
        setSlots(slotsRes.data.value as unknown as AdSlot[]);
      }
      if (adsenseRes.data?.value && typeof adsenseRes.data.value === "object") {
        const v = adsenseRes.data.value as Record<string, unknown>;
        setAdsenseConfig({
          publisher_id: (v.publisher_id as string) || "",
          enabled: v.enabled === true,
          auto_ads: v.auto_ads === true,
        });
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Fetch analytics when tab changes
  useEffect(() => {
    if (activeTab !== "analytics") return;
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
      const since = new Date();
      since.setDate(since.getDate() - daysMap[analyticsRange]);

      const { data } = await supabase
        .from("ad_impressions")
        .select("slot_id, placement, event_type, device, ad_source, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      setImpressions((data as ImpressionRow[]) || []);
      setLoadingAnalytics(false);
    };
    fetchAnalytics();
  }, [activeTab, analyticsRange]);

  const saveSlots = async (updatedSlots: AdSlot[]) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert(
      { key: "ad_slots", value: updatedSlots as any, updated_at: new Date().toISOString(), updated_by: user.id },
      { onConflict: "key" }
    );
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      setSlots(updatedSlots);
      toast({ title: "Ad slots saved" });
    }
  };

  const saveAdsenseConfig = async () => {
    if (!user) return;
    setSavingAdsense(true);
    const { error } = await supabase.from("site_settings").upsert(
      { key: "adsense_config", value: adsenseConfig as any, updated_at: new Date().toISOString(), updated_by: user.id },
      { onConflict: "key" }
    );
    setSavingAdsense(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "AdSense configuration saved" });
    }
  };

  const addSlot = () => setEditingSlot(emptySlot());
  const deleteSlot = (id: string) => saveSlots(slots.filter((s) => s.id !== id));
  const toggleSlot = (id: string) => saveSlots(slots.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s)));

  const saveEditingSlot = () => {
    if (!editingSlot) return;
    if (!editingSlot.name.trim()) {
      toast({ title: "Please enter a slot name", variant: "destructive" });
      return;
    }
    if (editingSlot.ad_source === "adsense" && !editingSlot.adsense_slot_id.trim()) {
      toast({ title: "Please enter AdSense slot ID", variant: "destructive" });
      return;
    }
    if (editingSlot.ad_source === "internal") {
      const source = editingSlot.image_source || "code";
      if (source === "code" && !editingSlot.ad_code.trim()) {
        toast({ title: "Please enter the ad code/HTML", variant: "destructive" });
        return;
      }
      if ((source === "upload" || source === "url") && !editingSlot.image_url?.trim()) {
        toast({ title: "Please provide an image", variant: "destructive" });
        return;
      }
    }
    const exists = slots.find((s) => s.id === editingSlot.id);
    const updated = exists ? slots.map((s) => (s.id === editingSlot.id ? editingSlot : s)) : [...slots, editingSlot];
    saveSlots(updated);
    setEditingSlot(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleCropComplete = async (croppedFile: File) => {
    setCropSrc(null);
    if (!editingSlot || !user) return;
    setUploading(true);
    try {
      const baseName = `ads/${editingSlot.id}-${Date.now()}`;
      const { webpFile } = await compressImageToFiles(croppedFile, baseName.split("/").pop(), { maxDimension: 1920, webpQuality: 0.8 });
      const path = `ads/${webpFile.name}`;
      const { url } = await storageUpload("journal-images", path, webpFile);
      setEditingSlot({ ...editingSlot, image_url: url, image_source: "upload" });
      toast({ title: "Image compressed & uploaded (WebP)" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const toggleDevice = (device: Device) => {
    if (!editingSlot) return;
    const devices = editingSlot.devices.includes(device) ? editingSlot.devices.filter((d) => d !== device) : [...editingSlot.devices, device];
    setEditingSlot({ ...editingSlot, devices });
  };

  // Analytics computed
  const analytics = useMemo(() => {
    const totalImpressions = impressions.filter((i) => i.event_type === "impression").length;
    const totalClicks = impressions.filter((i) => i.event_type === "click").length;
    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

    const bySlot = new Map<string, { impressions: number; clicks: number; name: string }>();
    impressions.forEach((i) => {
      const key = i.slot_id;
      if (!bySlot.has(key)) bySlot.set(key, { impressions: 0, clicks: 0, name: slots.find((s) => s.id === key)?.name || key.slice(0, 8) });
      const entry = bySlot.get(key)!;
      if (i.event_type === "impression") entry.impressions++;
      else if (i.event_type === "click") entry.clicks++;
    });

    const byPlacement = new Map<string, { impressions: number; clicks: number }>();
    impressions.forEach((i) => {
      if (!byPlacement.has(i.placement)) byPlacement.set(i.placement, { impressions: 0, clicks: 0 });
      const entry = byPlacement.get(i.placement)!;
      if (i.event_type === "impression") entry.impressions++;
      else if (i.event_type === "click") entry.clicks++;
    });

    const bySource = { internal: { impressions: 0, clicks: 0 }, adsense: { impressions: 0, clicks: 0 } };
    impressions.forEach((i) => {
      const src = i.ad_source === "adsense" ? "adsense" : "internal";
      if (i.event_type === "impression") bySource[src].impressions++;
      else if (i.event_type === "click") bySource[src].clicks++;
    });

    const byDevice = new Map<string, number>();
    impressions.forEach((i) => {
      if (i.event_type === "impression") byDevice.set(i.device, (byDevice.get(i.device) || 0) + 1);
    });

    return { totalImpressions, totalClicks, ctr, bySlot, byPlacement, bySource, byDevice };
  }, [impressions, slots]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const headingFont = { fontFamily: "var(--font-heading)" } as const;
  const bodyFont = { fontFamily: "var(--font-body)" } as const;
  const labelClass = "block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2";
  const inputClass = "w-full bg-transparent border-b border-border focus:border-primary outline-none py-2.5 text-sm transition-colors duration-500";

  const activeSlots = slots.filter((s) => s.is_active);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Megaphone className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>
          Advertisement <em className="italic text-primary">Manager</em>
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border mb-8 flex-wrap">
          <TabsTrigger value="slots" className="text-[10px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={headingFont}>
            <Megaphone className="h-3.5 w-3.5 mr-1.5" /> Ad Slots
          </TabsTrigger>
          <TabsTrigger value="adsense" className="text-[10px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={headingFont}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" /> AdSense Config
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-[10px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={headingFont}>
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="placements" className="text-[10px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={headingFont}>
            <Monitor className="h-3.5 w-3.5 mr-1.5" /> Placements
          </TabsTrigger>
        </TabsList>

        {/* ─── AD SLOTS TAB ─── */}
        <TabsContent value="slots">
          {editingSlot ? (
            <div className="border border-border p-6 space-y-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs tracking-[0.2em] uppercase text-primary" style={headingFont}>
                  {slots.find((s) => s.id === editingSlot.id) ? "Edit Ad Slot" : "New Ad Slot"}
                </span>
                <button onClick={() => setEditingSlot(null)} className="text-muted-foreground hover:text-foreground text-xs" style={headingFont}>Cancel</button>
              </div>

              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass} style={headingFont}>Slot Name *</label>
                  <input value={editingSlot.name} onChange={(e) => setEditingSlot({ ...editingSlot, name: e.target.value })} className={inputClass} style={bodyFont} placeholder="e.g. Homepage Top Banner" />
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Placement</label>
                  <select value={editingSlot.placement} onChange={(e) => setEditingSlot({ ...editingSlot, placement: e.target.value as Placement })} className={inputClass} style={bodyFont}>
                    {placementOptions.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Priority (0 = highest)</label>
                  <input type="number" value={editingSlot.priority} onChange={(e) => setEditingSlot({ ...editingSlot, priority: parseInt(e.target.value) || 0 })} className={inputClass} style={bodyFont} />
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Status</label>
                  <button type="button" onClick={() => setEditingSlot({ ...editingSlot, is_active: !editingSlot.is_active })} className={`flex items-center gap-2 py-2.5 text-sm ${editingSlot.is_active ? "text-primary" : "text-muted-foreground"}`} style={bodyFont}>
                    {editingSlot.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {editingSlot.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>

              {/* Ad Source Toggle */}
              <div>
                <label className={labelClass} style={headingFont}>Ad Source</label>
                <div className="flex gap-3">
                  {([
                    { value: "internal" as AdSource, label: "Internal Ad", icon: ImageIcon },
                    { value: "adsense" as AdSource, label: "Google AdSense", icon: Globe },
                  ]).map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setEditingSlot({ ...editingSlot, ad_source: value })}
                      className={`flex items-center gap-2 px-4 py-2.5 border text-xs tracking-[0.1em] uppercase transition-all ${editingSlot.ad_source === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}
                      style={headingFont}>
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AdSense-specific fields */}
              {editingSlot.ad_source === "adsense" && (
                <div className="border border-primary/20 rounded-sm bg-primary/5 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary" style={headingFont}>
                    <Globe className="h-3.5 w-3.5" /> Google AdSense Unit
                  </div>
                  {!adsenseConfig.publisher_id && (
                    <div className="text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded-sm px-3 py-2" style={bodyFont}>
                      ⚠ No Publisher ID configured. Go to the "AdSense Config" tab first.
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} style={headingFont}>Ad Slot ID *</label>
                      <input value={editingSlot.adsense_slot_id} onChange={(e) => setEditingSlot({ ...editingSlot, adsense_slot_id: e.target.value })} className={inputClass} style={bodyFont} placeholder="1234567890" />
                      <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>Find this in your AdSense dashboard → Ad units</p>
                    </div>
                    <div>
                      <label className={labelClass} style={headingFont}>Responsive Format</label>
                      <select value={editingSlot.adsense_format} onChange={(e) => setEditingSlot({ ...editingSlot, adsense_format: e.target.value })} className={inputClass} style={bodyFont}>
                        {adsenseFormats.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Internal ad creative — only show when internal */}
              {editingSlot.ad_source === "internal" && (
                <div>
                  <label className={labelClass} style={headingFont}>Ad Creative Type</label>
                  <div className="flex gap-3 mb-4">
                    {([
                      { value: "upload" as AdImageSource, label: "Upload Image", icon: Upload },
                      { value: "url" as AdImageSource, label: "Image URL", icon: Link },
                      { value: "code" as AdImageSource, label: "HTML / Code", icon: CropIcon },
                    ]).map(({ value, label, icon: Icon }) => (
                      <button key={value} type="button" onClick={() => setEditingSlot({ ...editingSlot, image_source: value })}
                        className={`flex items-center gap-2 px-4 py-2.5 border text-xs tracking-[0.1em] uppercase transition-all ${(editingSlot.image_source || "code") === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}
                        style={headingFont}>
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </button>
                    ))}
                  </div>

                  {(editingSlot.image_source === "upload" || !editingSlot.image_source) && editingSlot.image_source !== "code" && editingSlot.image_source !== "url" && (
                    <div className="space-y-4">
                      <div className="border border-dashed border-border rounded-sm p-5 bg-muted/10">
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-xs tracking-[0.15em] uppercase hover:border-primary hover:text-primary transition-all disabled:opacity-50" style={headingFont}>
                          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {uploading ? "Uploading…" : "Choose & Crop Image"}
                        </button>
                      </div>
                      {editingSlot.image_url && (
                        <div className="border border-border rounded-sm p-3">
                          <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={headingFont}>Preview</p>
                          <img src={editingSlot.image_url} alt="Ad preview" className="max-h-40 object-contain rounded-sm border border-border/50" />
                          <button type="button" onClick={() => setEditingSlot({ ...editingSlot, image_url: "" })} className="mt-2 text-[9px] tracking-wider uppercase text-destructive hover:underline" style={headingFont}>Remove</button>
                        </div>
                      )}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass} style={headingFont}>Click URL</label>
                          <input value={editingSlot.click_url || ""} onChange={(e) => setEditingSlot({ ...editingSlot, click_url: e.target.value })} className={inputClass} style={bodyFont} placeholder="https://..." />
                        </div>
                        <div>
                          <label className={labelClass} style={headingFont}>Alt Text</label>
                          <input value={editingSlot.alt_text || ""} onChange={(e) => setEditingSlot({ ...editingSlot, alt_text: e.target.value })} className={inputClass} style={bodyFont} placeholder="Description" />
                        </div>
                      </div>
                    </div>
                  )}

                  {editingSlot.image_source === "url" && (
                    <div className="space-y-4">
                      <div>
                        <label className={labelClass} style={headingFont}>Image URL *</label>
                        <input value={editingSlot.image_url || ""} onChange={(e) => setEditingSlot({ ...editingSlot, image_url: e.target.value })} className={inputClass} style={bodyFont} placeholder="https://..." />
                      </div>
                      {editingSlot.image_url && (
                        <img src={editingSlot.image_url} alt="Preview" className="max-h-40 object-contain rounded-sm border border-border/50" onError={(e) => (e.currentTarget.style.display = "none")} />
                      )}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass} style={headingFont}>Click URL</label>
                          <input value={editingSlot.click_url || ""} onChange={(e) => setEditingSlot({ ...editingSlot, click_url: e.target.value })} className={inputClass} style={bodyFont} placeholder="https://..." />
                        </div>
                        <div>
                          <label className={labelClass} style={headingFont}>Alt Text</label>
                          <input value={editingSlot.alt_text || ""} onChange={(e) => setEditingSlot({ ...editingSlot, alt_text: e.target.value })} className={inputClass} style={bodyFont} placeholder="Description" />
                        </div>
                      </div>
                    </div>
                  )}

                  {editingSlot.image_source === "code" && (
                    <div>
                      <label className={labelClass} style={headingFont}>Ad Code / HTML *</label>
                      <textarea value={editingSlot.ad_code} onChange={(e) => setEditingSlot({ ...editingSlot, ad_code: e.target.value })} className={`${inputClass} resize-none border border-border rounded-sm p-3 font-mono`} rows={6}
                        placeholder={'<!-- Paste your ad code here -->'} />
                    </div>
                  )}
                </div>
              )}

              {/* A/B Testing */}
              <div className="border border-border rounded-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Beaker className="h-4 w-4 text-primary" />
                  <span className="text-[10px] tracking-[0.2em] uppercase text-foreground" style={headingFont}>A/B Testing</span>
                  <button type="button" onClick={() => setEditingSlot({ ...editingSlot, ab_enabled: !editingSlot.ab_enabled })}
                    className={`ml-auto text-[9px] tracking-wider uppercase px-3 py-1 border transition-all ${editingSlot.ab_enabled ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`} style={headingFont}>
                    {editingSlot.ab_enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                {editingSlot.ab_enabled && (
                  <div>
                    <label className={labelClass} style={headingFont}>AdSense traffic % (rest goes to internal)</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min={0} max={100} value={editingSlot.ab_adsense_pct}
                        onChange={(e) => setEditingSlot({ ...editingSlot, ab_adsense_pct: parseInt(e.target.value) })}
                        className="flex-1 accent-primary" />
                      <span className="text-sm text-foreground w-16 text-center" style={bodyFont}>{editingSlot.ab_adsense_pct}% AdSense</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>
                      {100 - editingSlot.ab_adsense_pct}% internal · {editingSlot.ab_adsense_pct}% AdSense — split randomly per impression
                    </p>
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass} style={headingFont}>Start Date</label>
                  <input type="date" value={editingSlot.start_date} onChange={(e) => setEditingSlot({ ...editingSlot, start_date: e.target.value })} className={inputClass} style={bodyFont} />
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>End Date</label>
                  <input type="date" value={editingSlot.end_date} onChange={(e) => setEditingSlot({ ...editingSlot, end_date: e.target.value })} className={inputClass} style={bodyFont} />
                </div>
              </div>

              {/* Hour-of-day targeting */}
              <div className="border border-border rounded-sm p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-[10px] tracking-[0.2em] uppercase text-foreground" style={headingFont}>Hour-of-Day Targeting</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} style={headingFont}>Start Hour (0-23)</label>
                    <input type="number" min={0} max={23} value={editingSlot.schedule_hours_start} onChange={(e) => setEditingSlot({ ...editingSlot, schedule_hours_start: parseInt(e.target.value) || 0 })} className={inputClass} style={bodyFont} />
                  </div>
                  <div>
                    <label className={labelClass} style={headingFont}>End Hour (1-24)</label>
                    <input type="number" min={1} max={24} value={editingSlot.schedule_hours_end} onChange={(e) => setEditingSlot({ ...editingSlot, schedule_hours_end: parseInt(e.target.value) || 24 })} className={inputClass} style={bodyFont} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground" style={bodyFont}>0–24 = all day. Wrap-around supported (e.g. 22–6 = nighttime).</p>
              </div>

              {/* Geo Targeting */}
              <div className="border border-border rounded-sm p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="text-[10px] tracking-[0.2em] uppercase text-foreground" style={headingFont}>Geo Targeting (optional)</span>
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Country Codes (comma-separated, e.g. US,IN,GB)</label>
                  <input value={(editingSlot.geo_targets || []).join(",")} onChange={(e) => setEditingSlot({ ...editingSlot, geo_targets: e.target.value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean) })} className={inputClass} style={bodyFont} placeholder="Leave empty for all countries" />
                </div>
              </div>

              {/* Device Targeting */}
              <div>
                <label className={labelClass} style={headingFont}>Target Devices</label>
                <div className="flex gap-3">
                  {deviceOptions.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => toggleDevice(value)}
                      className={`flex items-center gap-2 px-4 py-2.5 border text-xs tracking-[0.1em] uppercase transition-all ${editingSlot.devices.includes(value) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}
                      style={headingFont}>
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelClass} style={headingFont}>Notes (optional)</label>
                <input value={editingSlot.notes} onChange={(e) => setEditingSlot({ ...editingSlot, notes: e.target.value })} className={inputClass} style={bodyFont} placeholder="Internal notes..." />
              </div>

              {/* Crop Modal */}
              {cropSrc && <ImageCropModal imageSrc={cropSrc} onCropComplete={handleCropComplete} onCancel={() => setCropSrc(null)} />}

              <div className="flex gap-3 pt-2">
                <button onClick={saveEditingSlot} disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50" style={headingFont}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Ad Slot
                </button>
                <button onClick={() => setEditingSlot(null)} className="px-5 py-2.5 border border-border text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors" style={headingFont}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={headingFont}>
                  {slots.length} slot{slots.length !== 1 ? "s" : ""} · {activeSlots.length} active
                </span>
                <button onClick={addSlot} className="inline-flex items-center gap-2 px-4 py-2 text-xs tracking-[0.15em] uppercase border border-border hover:border-primary hover:text-primary transition-all" style={headingFont}>
                  <Plus className="h-3.5 w-3.5" /> New Ad Slot
                </button>
              </div>

              {slots.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border">
                  <Megaphone className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground" style={bodyFont}>No ad slots created yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {slots.sort((a, b) => a.priority - b.priority).map((slot) => (
                    <div key={slot.id} className={`border p-4 flex items-center justify-between transition-colors ${slot.is_active ? "border-border" : "border-border/40 opacity-60"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium truncate" style={bodyFont}>{slot.name}</span>
                          <span className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border ${slot.is_active ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`} style={headingFont}>
                            {slot.is_active ? "Active" : "Inactive"}
                          </span>
                          <span className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border ${slot.ad_source === "adsense" ? "border-blue-400/40 text-blue-500" : "border-border text-muted-foreground"}`} style={headingFont}>
                            {slot.ad_source === "adsense" ? "AdSense" : "Internal"}
                          </span>
                          {slot.ab_enabled && (
                            <span className="text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border border-amber-400/40 text-amber-500" style={headingFont}>A/B</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap" style={bodyFont}>
                          <span className="uppercase tracking-wider">{placementOptions.find((p) => p.value === slot.placement)?.label}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            {slot.devices.map((d) => { const opt = deviceOptions.find((o) => o.value === d); return opt ? <opt.icon key={d} className="h-3 w-3" /> : null; })}
                          </span>
                          {slot.start_date && <span>· From {slot.start_date}</span>}
                          {slot.end_date && <span>to {slot.end_date}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button onClick={() => toggleSlot(slot.id)} className="text-muted-foreground hover:text-foreground transition-colors p-1" title={slot.is_active ? "Deactivate" : "Activate"}>
                          {slot.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setEditingSlot({ ...slot })} className="text-muted-foreground hover:text-primary transition-colors p-1" title="Edit">
                          <Megaphone className="h-4 w-4" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete "${slot.name}"?`)) deleteSlot(slot.id); }} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ─── ADSENSE CONFIG TAB ─── */}
        <TabsContent value="adsense">
          <div className="border border-border p-6 space-y-6 max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-xs tracking-[0.2em] uppercase text-foreground" style={headingFont}>Google AdSense Configuration</span>
            </div>

            <div className="border border-border/50 rounded-sm px-5 py-4 bg-muted/10">
              <p className="text-[11px] text-muted-foreground leading-relaxed" style={bodyFont}>
                Connect your Google AdSense account to monetize ad slots with responsive AdSense units.
                All ad sizes are <strong className="text-foreground">responsive</strong> and comply with AdSense policies automatically.
                You can use the same ad space for either AdSense or internal ads — toggle per slot.
              </p>
            </div>

            <div>
              <label className={labelClass} style={headingFont}>Publisher ID *</label>
              <input value={adsenseConfig.publisher_id} onChange={(e) => setAdsenseConfig({ ...adsenseConfig, publisher_id: e.target.value })} className={inputClass} style={bodyFont} placeholder="ca-pub-XXXXXXXXXXXXXXXX" />
              <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>Find this in AdSense → Account → Account information</p>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={adsenseConfig.enabled} onChange={(e) => setAdsenseConfig({ ...adsenseConfig, enabled: e.target.checked })} className="accent-primary w-4 h-4" />
                <span className="text-sm" style={bodyFont}>Enable AdSense</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={adsenseConfig.auto_ads} onChange={(e) => setAdsenseConfig({ ...adsenseConfig, auto_ads: e.target.checked })} className="accent-primary w-4 h-4" />
                <span className="text-sm" style={bodyFont}>Auto Ads (let Google place additional ads)</span>
              </label>
            </div>

            <div className="border border-primary/20 rounded-sm bg-primary/5 px-5 py-4">
              <p className="text-[10px] tracking-[0.2em] uppercase text-primary mb-2" style={headingFont}>Setup Steps</p>
              <ol className="text-[11px] text-muted-foreground leading-relaxed space-y-1 list-decimal list-inside" style={bodyFont}>
                <li>Sign up at <strong className="text-foreground">adsense.google.com</strong></li>
                <li>Add your site for verification</li>
                <li>Once approved, copy your Publisher ID (ca-pub-XXX) above</li>
                <li>Create responsive ad units in AdSense dashboard</li>
                <li>Copy each unit's Slot ID into the ad slots here</li>
                <li>Enable AdSense above and save</li>
              </ol>
            </div>

            <button onClick={saveAdsenseConfig} disabled={savingAdsense}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50" style={headingFont}>
              {savingAdsense ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save AdSense Config
            </button>
          </div>
        </TabsContent>

        {/* ─── ANALYTICS TAB ─── */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="text-xs tracking-[0.2em] uppercase text-foreground" style={headingFont}>Ad Performance Analytics</span>
              </div>
              <div className="flex gap-2">
                {(["7d", "30d", "90d"] as const).map((r) => (
                  <button key={r} onClick={() => setAnalyticsRange(r)}
                    className={`text-[9px] tracking-wider uppercase px-3 py-1.5 border transition-all ${analyticsRange === r ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`} style={headingFont}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Impressions", value: analytics.totalImpressions.toLocaleString() },
                    { label: "Clicks", value: analytics.totalClicks.toLocaleString() },
                    { label: "CTR", value: `${analytics.ctr}%` },
                    { label: "Active Slots", value: activeSlots.length.toString() },
                  ].map((card) => (
                    <div key={card.label} className="border border-border p-4">
                      <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1" style={headingFont}>{card.label}</p>
                      <p className="text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Source Comparison */}
                <div className="border border-border p-5">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-foreground mb-4" style={headingFont}>Source Comparison</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {(["internal", "adsense"] as const).map((src) => {
                      const d = analytics.bySource[src];
                      const srcCtr = d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : "0.00";
                      return (
                        <div key={src} className="border border-border/50 rounded-sm p-4">
                          <p className={`text-[10px] tracking-[0.15em] uppercase mb-2 ${src === "adsense" ? "text-blue-500" : "text-foreground"}`} style={headingFont}>
                            {src === "adsense" ? "Google AdSense" : "Internal Ads"}
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>{d.impressions}</p>
                              <p className="text-[9px] text-muted-foreground" style={headingFont}>Impr.</p>
                            </div>
                            <div>
                              <p className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>{d.clicks}</p>
                              <p className="text-[9px] text-muted-foreground" style={headingFont}>Clicks</p>
                            </div>
                            <div>
                              <p className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>{srcCtr}%</p>
                              <p className="text-[9px] text-muted-foreground" style={headingFont}>CTR</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Per-Slot Breakdown */}
                <div className="border border-border p-5">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-foreground mb-4" style={headingFont}>Per-Slot Performance</p>
                  {analytics.bySlot.size === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6" style={bodyFont}>No data yet for this period.</p>
                  ) : (
                    <div className="space-y-2">
                      {Array.from(analytics.bySlot.entries())
                        .sort(([, a], [, b]) => b.impressions - a.impressions)
                        .map(([slotId, d]) => {
                          const slotCtr = d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(1) : "0.0";
                          return (
                            <div key={slotId} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                              <span className="text-sm truncate flex-1 min-w-0" style={bodyFont}>{d.name}</span>
                              <div className="flex items-center gap-6 text-[11px] text-muted-foreground shrink-0" style={bodyFont}>
                                <span>{d.impressions} impr.</span>
                                <span>{d.clicks} clicks</span>
                                <span className="text-foreground font-medium">{slotCtr}% CTR</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* By Placement */}
                <div className="border border-border p-5">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-foreground mb-4" style={headingFont}>By Placement</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    {Array.from(analytics.byPlacement.entries()).map(([pl, d]) => {
                      const plCtr = d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(1) : "0.0";
                      return (
                        <div key={pl} className="border border-border/50 rounded-sm p-3 text-center">
                          <p className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1" style={headingFont}>{placementOptions.find(p => p.value === pl)?.label || pl}</p>
                          <p className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>{d.impressions}</p>
                          <p className="text-[10px] text-muted-foreground" style={bodyFont}>{d.clicks} clicks · {plCtr}% CTR</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* By Device */}
                <div className="border border-border p-5">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-foreground mb-4" style={headingFont}>By Device</p>
                  <div className="flex gap-6">
                    {Array.from(analytics.byDevice.entries()).map(([dev, count]) => {
                      const Icon = deviceOptions.find(d => d.value === dev)?.icon || Monitor;
                      return (
                        <div key={dev} className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="text-sm" style={bodyFont}>{dev}: <strong>{count}</strong></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ─── PLACEMENTS TAB ─── */}
        <TabsContent value="placements">
          <div className="border border-border p-6 space-y-5">
            <p className="text-sm text-muted-foreground mb-4" style={bodyFont}>
              Overview of ad slots by placement zone. All sizes are <strong className="text-foreground">responsive</strong> and adapt to the container automatically — fully compliant with Google AdSense policies.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {placementOptions.map((p) => {
                const pSlots = slots.filter((s) => s.placement === p.value);
                const pActive = pSlots.filter((s) => s.is_active);
                return (
                  <div key={p.value} className="border border-border p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs tracking-[0.15em] uppercase text-foreground" style={headingFont}>{p.label}</span>
                      <span className={`text-[9px] px-2 py-0.5 border ${pActive.length > 0 ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`} style={headingFont}>
                        {pActive.length} active
                      </span>
                    </div>
                    <div className="text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>{pSlots.length}</div>
                    <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>total slot{pSlots.length !== 1 ? "s" : ""}</p>
                    {pSlots.length > 0 && (
                      <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
                        {pSlots.map((s) => (
                          <div key={s.id} className="flex items-center justify-between text-[11px]" style={bodyFont}>
                            <span className={s.is_active ? "text-foreground" : "text-muted-foreground line-through"}>{s.name}</span>
                            <span className={`text-[9px] ${s.ad_source === "adsense" ? "text-blue-500" : "text-muted-foreground"}`}>
                              {s.ad_source === "adsense" ? "AdSense" : "Internal"} · P{s.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
