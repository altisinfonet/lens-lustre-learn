import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, XCircle, Loader2, Award } from "lucide-react";
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
  const [form, setForm] = useState({ title: "", description: "", type: "course_completion", user_email: "" });
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [resolvedUserName, setResolvedUserName] = useState("");

  const fetchCerts = async () => {
    const { data } = await supabase
      .from("certificates")
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
    setForm({ title: "", description: "", type: "course_completion", user_email: "" });
    setEditingId(null);
    setResolvedUserId(null);
    setResolvedUserName("");
    setShowForm(false);
  };

  const lookupUser = async () => {
    if (!form.user_email.trim()) return;
    // Try to find by email via edge function or by name
    const { data } = await supabase.from("profiles").select("id, full_name").ilike("full_name", `%${form.user_email.trim()}%`).limit(1);
    if (data && data.length > 0) {
      setResolvedUserId(data[0].id);
      setResolvedUserName(data[0].full_name || "User");
      toast({ title: `Found: ${data[0].full_name}` });
    } else {
      toast({ title: "User not found. Try a different name.", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setSaving(true);

    if (editingId) {
      const { error } = await supabase.from("certificates").update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
      }).eq("id", editingId);
      if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
      else { toast({ title: "Certificate updated" }); resetForm(); fetchCerts(); }
    } else {
      if (!resolvedUserId) { toast({ title: "Please look up a user first", variant: "destructive" }); setSaving(false); return; }
      const { error } = await supabase.from("certificates").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        user_id: resolvedUserId,
      });
      if (error) toast({ title: "Create failed", description: error.message, variant: "destructive" });
      else { toast({ title: "Certificate issued" }); resetForm(); fetchCerts(); }
    }
    setSaving(false);
  };

  const deleteCert = async (id: string) => {
    if (!confirm("Delete this certificate?")) return;
    const { error } = await supabase.from("certificates").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Certificate deleted" }); fetchCerts(); }
  };

  const openEdit = (c: CertRow) => {
    setEditingId(c.id);
    setForm({ title: c.title, description: c.description || "", type: c.type, user_email: "" });
    setResolvedUserId(c.user_id);
    setResolvedUserName(c.user_name || "");
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {certs.length} certificate{certs.length !== 1 ? "s" : ""}
        </span>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-500"
          style={{ fontFamily: "var(--font-heading)" }}>
          <Plus className="h-3.5 w-3.5" /> Issue Certificate
        </button>
      </div>

      {showForm && (
        <div className="border border-border p-6 mb-8 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              {editingId ? "Edit Certificate" : "Issue New Certificate"}
            </span>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>

          {!editingId && (
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Recipient (search by name)</label>
              <div className="flex gap-2">
                <input value={form.user_email} onChange={(e) => setForm((f) => ({ ...f, user_email: e.target.value }))} placeholder="Type user name..."
                  className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm" style={{ fontFamily: "var(--font-body)" }} />
                <button onClick={lookupUser} className="px-4 py-2 text-xs tracking-[0.15em] uppercase border border-border hover:border-primary transition-colors" style={{ fontFamily: "var(--font-heading)" }}>
                  Find
                </button>
              </div>
              {resolvedUserName && <p className="text-xs text-primary mt-2">✓ {resolvedUserName}</p>}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Title *</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Certificate title"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm" style={{ fontFamily: "var(--font-body)" }} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm" style={{ fontFamily: "var(--font-body)" }}>
                <option value="course_completion">Course Completion</option>
                <option value="competition_winner">Competition Winner</option>
                <option value="achievement">Achievement</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Certificate description..."
              className="w-full bg-transparent border border-border focus:border-primary outline-none p-4 text-sm resize-none" style={{ fontFamily: "var(--font-body)" }} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editingId ? "Update" : "Issue"}
            </button>
            <button onClick={resetForm} className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground" style={{ fontFamily: "var(--font-heading)" }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              {["Title", "Recipient", "Type", "Issued", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-normal" style={{ fontFamily: "var(--font-heading)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {certs.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors duration-300">
                <td className="px-4 py-3 text-sm" style={{ fontFamily: "var(--font-body)" }}>{c.title}</td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground">{c.user_name || "Unknown"}</td>
                <td className="px-4 py-3">
                  <span className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 border border-border text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    {c.type.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground">
                  {new Date(c.issued_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:text-primary transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteCert(c.id)} className="p-1.5 hover:text-destructive transition-colors" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {certs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No certificates yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCertificates;
