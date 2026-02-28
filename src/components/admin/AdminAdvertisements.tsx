import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Megaphone, Plus, Trash2, Eye, EyeOff, Monitor, Smartphone, Tablet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { User } from "@supabase/supabase-js";

type Placement = "header" | "footer" | "sidebar" | "in-content" | "between-entries" | "lightbox-overlay";
type Device = "desktop" | "mobile" | "tablet";

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
}

const placementOptions: { value: Placement; label: string }[] = [
  { value: "header", label: "Header (Top Banner)" },
  { value: "footer", label: "Footer (Bottom Banner)" },
  { value: "sidebar", label: "Sidebar" },
  { value: "in-content", label: "In-Content (Between Sections)" },
  { value: "between-entries", label: "Between Entries / Cards" },
  { value: "lightbox-overlay", label: "Lightbox Overlay" },
];

const deviceOptions: { value: Device; label: string; icon: typeof Monitor }[] = [
  { value: "desktop", label: "Desktop", icon: Monitor },
  { value: "mobile", label: "Mobile", icon: Smartphone },
  { value: "tablet", label: "Tablet", icon: Tablet },
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
});

export default function AdminAdvertisements({ user }: { user: User | null }) {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("slots");
  const [editingSlot, setEditingSlot] = useState<AdSlot | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "ad_slots")
        .maybeSingle();
      if (data?.value && Array.isArray(data.value)) {
        setSlots(data.value as unknown as AdSlot[]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const saveSlots = async (updatedSlots: AdSlot[]) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert(
      {
        key: "ad_slots",
        value: updatedSlots as any,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
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

  const addSlot = () => {
    const newSlot = emptySlot();
    setEditingSlot(newSlot);
  };

  const deleteSlot = (id: string) => {
    const updated = slots.filter((s) => s.id !== id);
    saveSlots(updated);
  };

  const toggleSlot = (id: string) => {
    const updated = slots.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s));
    saveSlots(updated);
  };

  const saveEditingSlot = () => {
    if (!editingSlot) return;
    if (!editingSlot.name.trim()) {
      toast({ title: "Please enter a slot name", variant: "destructive" });
      return;
    }
    if (!editingSlot.ad_code.trim()) {
      toast({ title: "Please enter the ad code/HTML", variant: "destructive" });
      return;
    }

    const exists = slots.find((s) => s.id === editingSlot.id);
    const updated = exists
      ? slots.map((s) => (s.id === editingSlot.id ? editingSlot : s))
      : [...slots, editingSlot];

    saveSlots(updated);
    setEditingSlot(null);
  };

  const toggleDevice = (device: Device) => {
    if (!editingSlot) return;
    const devices = editingSlot.devices.includes(device)
      ? editingSlot.devices.filter((d) => d !== device)
      : [...editingSlot.devices, device];
    setEditingSlot({ ...editingSlot, devices });
  };

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
  const inactiveSlots = slots.filter((s) => !s.is_active);

  const placementStats = placementOptions.map((p) => ({
    ...p,
    count: slots.filter((s) => s.placement === p.value).length,
    active: slots.filter((s) => s.placement === p.value && s.is_active).length,
  }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Megaphone className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-light" style={{ fontFamily: "var(--font-display)" }}>
          Advertisement <em className="italic text-primary">Manager</em>
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border mb-8">
          <TabsTrigger value="slots" className="text-[10px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={headingFont}>
            <Megaphone className="h-3.5 w-3.5 mr-1.5" /> Ad Slots
          </TabsTrigger>
          <TabsTrigger value="placements" className="text-[10px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={headingFont}>
            <Monitor className="h-3.5 w-3.5 mr-1.5" /> Placement Rules
          </TabsTrigger>
          <TabsTrigger value="devices" className="text-[10px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={headingFont}>
            <Smartphone className="h-3.5 w-3.5 mr-1.5" /> Device Targeting
          </TabsTrigger>
        </TabsList>

        {/* Ad Slots Tab */}
        <TabsContent value="slots">
          {editingSlot ? (
            <div className="border border-border p-6 space-y-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs tracking-[0.2em] uppercase text-primary" style={headingFont}>
                  {slots.find((s) => s.id === editingSlot.id) ? "Edit Ad Slot" : "New Ad Slot"}
                </span>
                <button onClick={() => setEditingSlot(null)} className="text-muted-foreground hover:text-foreground text-xs" style={headingFont}>
                  Cancel
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass} style={headingFont}>Slot Name *</label>
                  <input
                    value={editingSlot.name}
                    onChange={(e) => setEditingSlot({ ...editingSlot, name: e.target.value })}
                    className={inputClass}
                    style={bodyFont}
                    placeholder="e.g. Homepage Top Banner"
                  />
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Placement</label>
                  <select
                    value={editingSlot.placement}
                    onChange={(e) => setEditingSlot({ ...editingSlot, placement: e.target.value as Placement })}
                    className={inputClass}
                    style={bodyFont}
                  >
                    {placementOptions.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Priority (0 = highest)</label>
                  <input
                    type="number"
                    value={editingSlot.priority}
                    onChange={(e) => setEditingSlot({ ...editingSlot, priority: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                    style={bodyFont}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Status</label>
                  <button
                    type="button"
                    onClick={() => setEditingSlot({ ...editingSlot, is_active: !editingSlot.is_active })}
                    className={`flex items-center gap-2 py-2.5 text-sm ${editingSlot.is_active ? "text-primary" : "text-muted-foreground"}`}
                    style={bodyFont}
                  >
                    {editingSlot.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {editingSlot.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>Start Date (optional)</label>
                  <input
                    type="date"
                    value={editingSlot.start_date}
                    onChange={(e) => setEditingSlot({ ...editingSlot, start_date: e.target.value })}
                    className={inputClass}
                    style={bodyFont}
                  />
                </div>
                <div>
                  <label className={labelClass} style={headingFont}>End Date (optional)</label>
                  <input
                    type="date"
                    value={editingSlot.end_date}
                    onChange={(e) => setEditingSlot({ ...editingSlot, end_date: e.target.value })}
                    className={inputClass}
                    style={bodyFont}
                  />
                </div>
              </div>

              {/* Device Targeting */}
              <div>
                <label className={labelClass} style={headingFont}>Target Devices</label>
                <div className="flex gap-3">
                  {deviceOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDevice(value)}
                      className={`flex items-center gap-2 px-4 py-2.5 border text-xs tracking-[0.1em] uppercase transition-all ${
                        editingSlot.devices.includes(value)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                      style={headingFont}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ad Code */}
              <div>
                <label className={labelClass} style={headingFont}>Ad Code / HTML *</label>
                <textarea
                  value={editingSlot.ad_code}
                  onChange={(e) => setEditingSlot({ ...editingSlot, ad_code: e.target.value })}
                  className={`${inputClass} resize-none border border-border rounded-sm p-3 font-mono`}
                  rows={6}
                  placeholder={'<!-- Paste your ad code here -->\n<div class="ad-banner">\n  <a href="https://...">\n    <img src="https://..." alt="Ad" />\n  </a>\n</div>'}
                />
              </div>

              {/* Notes */}
              <div>
                <label className={labelClass} style={headingFont}>Notes (optional)</label>
                <input
                  value={editingSlot.notes}
                  onChange={(e) => setEditingSlot({ ...editingSlot, notes: e.target.value })}
                  className={inputClass}
                  style={bodyFont}
                  placeholder="Internal notes about this ad slot..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveEditingSlot}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={headingFont}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Ad Slot
                </button>
                <button
                  onClick={() => setEditingSlot(null)}
                  className="px-5 py-2.5 border border-border text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                  style={headingFont}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={headingFont}>
                  {slots.length} ad slot{slots.length !== 1 ? "s" : ""} · {activeSlots.length} active
                </span>
                <button
                  onClick={addSlot}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs tracking-[0.15em] uppercase border border-border hover:border-primary hover:text-primary transition-all"
                  style={headingFont}
                >
                  <Plus className="h-3.5 w-3.5" /> New Ad Slot
                </button>
              </div>

              {slots.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border">
                  <Megaphone className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground" style={bodyFont}>No ad slots created yet. Create one to start displaying advertisements.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {slots
                    .sort((a, b) => a.priority - b.priority)
                    .map((slot) => (
                      <div
                        key={slot.id}
                        className={`border p-4 flex items-center justify-between transition-colors ${
                          slot.is_active ? "border-border" : "border-border/40 opacity-60"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate" style={bodyFont}>{slot.name}</span>
                            <span className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border ${slot.is_active ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`} style={headingFont}>
                              {slot.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground" style={bodyFont}>
                            <span className="uppercase tracking-wider">{placementOptions.find((p) => p.value === slot.placement)?.label}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              {slot.devices.map((d) => {
                                const opt = deviceOptions.find((o) => o.value === d);
                                return opt ? <opt.icon key={d} className="h-3 w-3" /> : null;
                              })}
                            </span>
                            {slot.start_date && <span>· From {slot.start_date}</span>}
                            {slot.end_date && <span>to {slot.end_date}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => toggleSlot(slot.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            title={slot.is_active ? "Deactivate" : "Activate"}
                          >
                            {slot.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setEditingSlot({ ...slot })}
                            className="text-muted-foreground hover:text-primary transition-colors p-1"
                            title="Edit"
                          >
                            <Megaphone className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ad slot "${slot.name}"?`)) deleteSlot(slot.id);
                            }}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            title="Delete"
                          >
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

        {/* Placement Rules Tab */}
        <TabsContent value="placements">
          <div className="border border-border p-6 space-y-5">
            <p className="text-sm text-muted-foreground mb-4" style={bodyFont}>
              Overview of how ad slots are distributed across different placement zones. Click on a placement to filter slots.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {placementStats.map((p) => (
                <div key={p.value} className="border border-border p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs tracking-[0.15em] uppercase text-foreground" style={headingFont}>{p.label}</span>
                    <span className={`text-[9px] px-2 py-0.5 border ${p.active > 0 ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`} style={headingFont}>
                      {p.active} active
                    </span>
                  </div>
                  <div className="text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>{p.count}</div>
                  <p className="text-[10px] text-muted-foreground mt-1" style={bodyFont}>total slot{p.count !== 1 ? "s" : ""}</p>

                  {/* List slots in this placement */}
                  {slots.filter((s) => s.placement === p.value).length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
                      {slots.filter((s) => s.placement === p.value).map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-[11px]" style={bodyFont}>
                          <span className={s.is_active ? "text-foreground" : "text-muted-foreground line-through"}>{s.name}</span>
                          <span className={`text-[9px] ${s.is_active ? "text-primary" : "text-muted-foreground"}`}>
                            P{s.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border border-border/50 rounded-sm px-5 py-4 bg-muted/20 mt-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed" style={bodyFont}>
                <strong className="text-foreground">Priority:</strong> Lower numbers have higher priority. When multiple ads target the same placement, the one with the lowest priority number is shown first. Use priority 0 for your most important ads.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Device Targeting Tab */}
        <TabsContent value="devices">
          <div className="border border-border p-6 space-y-6">
            <p className="text-sm text-muted-foreground mb-4" style={bodyFont}>
              View how your ad slots are targeted across devices. Each slot can target one or more device types.
            </p>

            {deviceOptions.map(({ value, label, icon: Icon }) => {
              const deviceSlots = slots.filter((s) => s.devices.includes(value));
              const activeDeviceSlots = deviceSlots.filter((s) => s.is_active);

              return (
                <div key={value} className="border border-border overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-card/50">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-xs tracking-[0.15em] uppercase font-medium" style={headingFont}>{label}</span>
                    <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground ml-auto" style={headingFont}>
                      {activeDeviceSlots.length} active / {deviceSlots.length} total
                    </span>
                  </div>

                  {deviceSlots.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <p className="text-xs text-muted-foreground" style={bodyFont}>No ads targeting {label.toLowerCase()}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {deviceSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`px-5 py-3 flex items-center justify-between ${!slot.is_active ? "opacity-50" : ""}`}
                        >
                          <div>
                            <span className="text-sm" style={bodyFont}>{slot.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-2" style={bodyFont}>
                              ({placementOptions.find((p) => p.value === slot.placement)?.label})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {slot.devices.map((d) => {
                              const opt = deviceOptions.find((o) => o.value === d);
                              return opt ? (
                                <span key={d} className={`text-[9px] tracking-wider uppercase px-1.5 py-0.5 border ${d === value ? "border-primary text-primary" : "border-border/50 text-muted-foreground"}`} style={headingFont}>
                                  {opt.label}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="border border-border/50 rounded-sm px-5 py-4 bg-muted/20">
              <p className="text-[11px] text-muted-foreground leading-relaxed" style={bodyFont}>
                <strong className="text-foreground">Tip:</strong> Target all three devices for maximum reach, or create separate ad slots with different creatives optimized for each device type.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
