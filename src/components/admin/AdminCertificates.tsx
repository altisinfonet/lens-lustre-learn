import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, XCircle, Loader2, Award, Search } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface CertRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  issued_at: string;
  user_id: string;
  user_name: string | null;
}

const AdminCertificates = ({ user }: { user: User | null }) => {
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "course_completion", user_search: "" });
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [resolvedUserName, setResolvedUserName] = useState("");

  const fetchCerts = async () => {
    const { data } = await supabase.from("certificates")
      .select("id, title, description, type, issued_at, user_id")
      .order("issued_at", { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const map = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
      setCerts(data.map((c) => ({ ...c, user_name: map.get(c.user_id) || null })));
    } else {
      setCerts([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCerts(); }, []);

  const resetForm = () => {
    setForm({ title: "", description: "", type: "course_completion", user_search: "" });
    setEditingId(null);
    setResolvedUserId(null);
    setResolvedUserName("");
    setShowForm(false);
  };

  const lookupUser = async () => {
    if (!form.user_search.trim()) return;
    const { data } = await supabase.from("profiles").select("id, full_name").ilike("full_name", `%${form.user_search.trim()}%`).limit(1);
    if (data && data.length > 0) {
      setResolvedUserId(data[0].id);
      setResolvedUserName(data[0].full_name || "User");
      toast({ title: `Found: ${data[0].full_name}` });
    } else {
      toast({ title: "User not found", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from("certificates").update({
        title: form.title.trim(), description: form.description.trim() || null, type: form.type,
      }).eq("id", editingId);
      if (error) toast({ title: "Update failed", variant: "destructive" });
      else { toast({ title: "Updated" }); resetForm(); fetchCerts(); }
    } else {
      if (!resolvedUserId) { toast({ title: "Look up a user first", variant: "destructive" }); setSaving(false); return; }
      const { error } = await supabase.from("certificates").insert({
        title: form.title.trim(), description: form.description.trim() || null, type: form.type, user_id: resolvedUserId,
      });
      if (error) toast({ title: "Create failed", variant: "destructive" });
      else { toast({ title: "Certificate issued" }); resetForm(); fetchCerts(); }
    }
    setSaving(false);
  };

  const deleteCert = async (id: string) => {
    if (!confirm("Delete this certificate?")) return;
    await supabase.from("certificates").delete().eq("id", id);
    toast({ title: "Deleted" });
    fetchCerts();
  };

  const openEdit = (c: CertRow) => {
    setEditingId(c.id);
    setForm({ title: c.title, description: c.description || "", type: c.type, user_search: "" });
    setResolvedUserId(c.user_id);
    setResolvedUserName(c.user_name || "");
    setShowForm(true);
  };

  const typeStyle = (t: string) => {
    if (t === "competition_winner") return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
    if (t === "course_completion") return "bg-primary/10 text-primary border-primary/30";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {certs.length} certificate{certs.length !== 1 ? "s" : ""}
        </span>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity rounded-sm"
          style={{ fontFamily: "var(--font-heading)" }}>
          <Plus className="h-3 w-3" /> Issue Certificate
        </button>
      </div>

      {showForm && (
        <div className="border border-border p-4 rounded-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium" style={{ fontFamily: "var(--font-heading)" }}>
              {editingId ? "Edit Certificate" : "Issue New"}
            </span>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          {!editingId && (
            <div className="flex items-center gap-2">
              <input value={form.user_search} onChange={(e) => setForm((f) => ({ ...f, user_search: e.target.value }))} placeholder="Search user by name..."
                className="flex-1 bg-transparent border border-border rounded-sm px-3 py-1.5 text-xs outline-none focus:border-primary" />
              <button onClick={lookupUser} className="px-3 py-1.5 text-[10px] uppercase border border-border hover:border-primary rounded-sm" style={{ fontFamily: "var(--font-heading)" }}>Find</button>
              {resolvedUserName && <span className="text-xs text-primary">✓ {resolvedUserName}</span>}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Certificate title *"
              className="flex-1 bg-transparent border border-border rounded-sm px-3 py-1.5 text-xs outline-none focus:border-primary" />
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="bg-transparent border border-border rounded-sm px-2 py-1.5 text-xs outline-none cursor-pointer">
              <option value="course_completion">Course</option>
              <option value="competition_winner">Winner</option>
              <option value="achievement">Achievement</option>
              <option value="custom">Custom</option>
            </select>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 text-[10px] tracking-wider uppercase bg-primary text-primary-foreground hover:opacity-90 rounded-sm disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : editingId ? "Update" : "Issue"}
            </button>
          </div>
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description (optional)"
            className="w-full bg-transparent border border-border rounded-sm px-3 py-1.5 text-xs outline-none focus:border-primary" />
        </div>
      )}

      {certs.length > 0 ? (
        <div className="border border-border rounded-sm overflow-hidden divide-y divide-border">
          {certs.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors group">
              <Award className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-body)" }}>{c.title}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 border rounded-sm uppercase tracking-wider shrink-0 ${typeStyle(c.type)}`}>
                    {c.type.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span>{c.user_name || "Unknown"}</span>
                  <span>·</span>
                  <span>{new Date(c.issued_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(c)} className="p-1.5 hover:text-primary transition-colors rounded-sm hover:bg-primary/10" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => deleteCert(c.id)} className="p-1.5 hover:text-destructive transition-colors rounded-sm hover:bg-destructive/10" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-sm">
          <Award className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No certificates yet</p>
        </div>
      )}
    </div>
  );
};

export default AdminCertificates;
