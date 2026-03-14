import { useEffect, useState } from "react";
import { Tag, Plus, Trash2, Loader2, GripVertical, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import JudgingStampBadge, { STAMP_ICONS } from "@/components/JudgingStampBadge";

interface JudgingTag {
  id: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  icon: string;
}

interface Props {
  adminId: string;
}

const AdminJudgingTags = ({ adminId }: Props) => {
  const [tags, setTags] = useState<JudgingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#d4a017");
  const [newIcon, setNewIcon] = useState("award");
  const [adding, setAdding] = useState(false);

  const fetchTags = async () => {
    const { data } = await supabase
      .from("judging_tags" as any)
      .select("id, label, color, sort_order, is_active")
      .order("sort_order", { ascending: true });
    setTags((data as any as JudgingTag[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const addTag = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    const maxOrder = tags.length > 0 ? Math.max(...tags.map((t) => t.sort_order)) : 0;
    const { error } = await supabase.from("judging_tags" as any).insert({
      label: newLabel.trim(),
      color: newColor,
      sort_order: maxOrder + 1,
      created_by: adminId,
    } as any);
    setAdding(false);
    if (error) {
      toast({ title: "Failed to add tag", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tag created" });
      setNewLabel("");
      setNewColor("#6366f1");
      fetchTags();
    }
  };

  const deleteTag = async (id: string) => {
    if (!confirm("Delete this judging tag?")) return;
    const { error } = await supabase.from("judging_tags" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tag deleted" });
      fetchTags();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("judging_tags" as any).update({ is_active: !current } as any).eq("id", id);
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: !current } : t)));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-xs">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading tags...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-px bg-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Configuration</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Judging <em className="italic text-primary">Tags</em>
        </h2>
        <p className="text-xs text-muted-foreground mt-2 max-w-md" style={{ fontFamily: "var(--font-body)" }}>
          Create tags that judges can assign to competition entries. These are reusable across all competitions.
        </p>
      </div>

      {/* Add new tag */}
      <div className="flex items-center gap-3 border border-border p-4">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="w-8 h-8 cursor-pointer border border-border bg-transparent"
          title="Tag color"
        />
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New tag name (e.g. Best Composition)"
          className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm transition-colors duration-500"
          style={{ fontFamily: "var(--font-body)" }}
          maxLength={100}
          onKeyDown={(e) => e.key === "Enter" && addTag()}
        />
        <button
          onClick={addTag}
          disabled={!newLabel.trim() || adding}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-[10px] tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Add Tag
        </button>
      </div>

      {/* Tag list */}
      <div className="border border-border divide-y divide-border">
        {tags.map((tag) => (
          <div key={tag.id} className={`flex items-center gap-3 px-4 py-3 ${!tag.is_active ? "opacity-50" : ""}`}>
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
            <div
              className="w-4 h-4 rounded-full shrink-0 border border-border"
              style={{ backgroundColor: tag.color }}
            />
            <span className="flex-1 text-sm" style={{ fontFamily: "var(--font-body)" }}>
              {tag.label}
            </span>
            <button
              onClick={() => toggleActive(tag.id, tag.is_active)}
              className="p-1.5 hover:text-primary transition-colors"
              title={tag.is_active ? "Deactivate" : "Activate"}
            >
              {tag.is_active ? (
                <ToggleRight className="h-4 w-4 text-primary" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => deleteTag(tag.id)}
              className="p-1.5 hover:text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {tags.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            No judging tags created yet
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminJudgingTags;
