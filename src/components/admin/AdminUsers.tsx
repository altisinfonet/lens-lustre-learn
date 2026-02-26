import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, Ban, ShieldCheck, Trash2, Pencil, XCircle, Loader2, Mail, User, Calendar, Shield } from "lucide-react";
import type { User as AuthUser } from "@supabase/supabase-js";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_suspended: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  created_at: string;
  roles: string[];
}

const AdminUsers = ({ user }: { user: AuthUser | null }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchBy, setSearchBy] = useState<"name" | "email">("email");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [suspendTarget, setSuspendTarget] = useState<UserRow | null>(null);
  const [suspendType, setSuspendType] = useState<"permanent" | "temporary">("temporary");
  const [suspendDays, setSuspendDays] = useState("7");
  const [suspendReason, setSuspendReason] = useState("");

  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");

  const fetchUsers = async (query = "", by = searchBy) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_search_users", {
      search_query: query,
      search_by: by,
    });

    if (error) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const userIds = data.map((u: any) => u.id);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      const roleMap = new Map<string, string[]>();
      roles?.forEach((r) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });
      setUsers(data.map((u: any) => ({ ...u, roles: roleMap.get(u.id) || [] })));
    } else {
      setUsers([]);
      if (query) toast({ title: "No users found" });
    }
    setLoading(false);
  };

  const suspendUser = async () => {
    if (!suspendTarget) return;
    setActionLoading(suspendTarget.id);
    const update: any = {
      is_suspended: true,
      suspension_reason: suspendReason.trim() || "Suspended by admin",
      suspended_until: suspendType === "permanent" ? null : new Date(Date.now() + parseInt(suspendDays) * 86400000).toISOString(),
    };
    const { error } = await supabase.from("profiles").update(update).eq("id", suspendTarget.id);
    if (error) toast({ title: "Suspend failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: `${suspendTarget.full_name || "User"} suspended` });
      setUsers((prev) => prev.map((u) => (u.id === suspendTarget.id ? { ...u, ...update } : u)));
    }
    setSuspendTarget(null);
    setSuspendReason("");
    setActionLoading(null);
  };

  const revokeSuspension = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase.from("profiles").update({
      is_suspended: false, suspended_until: null, suspension_reason: null,
    }).eq("id", userId);
    if (error) toast({ title: "Revoke failed", variant: "destructive" });
    else {
      toast({ title: "Suspension revoked" });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_suspended: false, suspended_until: null, suspension_reason: null } : u)));
    }
    setActionLoading(null);
  };

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`Permanently delete ${u.full_name || u.email || "this user"}?`)) return;
    setActionLoading(u.id);
    await Promise.all([
      supabase.from("user_roles").delete().eq("user_id", u.id),
      supabase.from("certificates").delete().eq("user_id", u.id),
      supabase.from("wallet_transactions").delete().eq("user_id", u.id),
      supabase.from("wallets").delete().eq("user_id", u.id),
      supabase.from("comments").delete().eq("user_id", u.id),
      supabase.from("lesson_progress").delete().eq("user_id", u.id),
      supabase.from("course_enrollments").delete().eq("user_id", u.id),
      supabase.from("competition_votes").delete().eq("user_id", u.id),
    ]);
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "User deleted" }); setUsers((prev) => prev.filter((x) => x.id !== u.id)); }
    setActionLoading(null);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setActionLoading(editTarget.id);
    const { error } = await supabase.from("profiles").update({
      full_name: editName.trim() || null,
      bio: editBio.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", editTarget.id);
    if (error) toast({ title: "Update failed", variant: "destructive" });
    else {
      toast({ title: "Profile updated" });
      setUsers((prev) => prev.map((u) => (u.id === editTarget.id ? { ...u, full_name: editName.trim() || null, bio: editBio.trim() || null } : u)));
    }
    setEditTarget(null);
    setActionLoading(null);
  };

  const roleColor = (r: string) => {
    if (r === "admin") return "bg-destructive/10 text-destructive border-destructive/30";
    if (r === "judge") return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
    if (r === "content_editor") return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-border rounded-sm overflow-hidden">
          <button
            onClick={() => setSearchBy("email")}
            className={`px-3 py-2 text-[10px] tracking-wider uppercase transition-colors ${searchBy === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <Mail className="h-3 w-3" />
          </button>
          <button
            onClick={() => setSearchBy("name")}
            className={`px-3 py-2 text-[10px] tracking-wider uppercase transition-colors ${searchBy === "name" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <User className="h-3 w-3" />
          </button>
        </div>
        <div className="flex-1 flex items-center gap-2 border border-border rounded-sm px-3">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers(searchQuery.trim())}
            placeholder={searchBy === "email" ? "Search by email address..." : "Search by name..."}
            className="flex-1 bg-transparent outline-none py-2 text-sm"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <button onClick={() => fetchUsers(searchQuery.trim())} disabled={loading}
          className="px-4 py-2 text-[10px] tracking-[0.15em] uppercase bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 rounded-sm"
          style={{ fontFamily: "var(--font-heading)" }}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
        </button>
        <button onClick={() => fetchUsers("", searchBy)} disabled={loading}
          className="px-4 py-2 text-[10px] tracking-[0.15em] uppercase border border-border hover:border-primary transition-colors rounded-sm"
          style={{ fontFamily: "var(--font-heading)" }}>
          All
        </button>
      </div>

      {/* Suspend Modal */}
      {suspendTarget && (
        <div className="border border-destructive/40 bg-destructive/5 p-4 rounded-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] uppercase text-destructive font-medium" style={{ fontFamily: "var(--font-heading)" }}>
              Suspend: {suspendTarget.full_name || suspendTarget.email}
            </span>
            <button onClick={() => setSuspendTarget(null)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="radio" checked={suspendType === "temporary"} onChange={() => setSuspendType("temporary")} className="accent-primary" /> Temporary
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="radio" checked={suspendType === "permanent"} onChange={() => setSuspendType("permanent")} className="accent-destructive" /> Permanent
            </label>
            {suspendType === "temporary" && (
              <input type="number" value={suspendDays} onChange={(e) => setSuspendDays(e.target.value)} min="1"
                className="w-20 bg-transparent border border-border rounded-sm px-2 py-1 text-xs outline-none focus:border-primary" placeholder="Days" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Reason..."
              className="flex-1 bg-transparent border border-border rounded-sm px-3 py-1.5 text-xs outline-none focus:border-primary" />
            <button onClick={suspendUser}
              className="px-4 py-1.5 text-[10px] tracking-wider uppercase bg-destructive text-destructive-foreground hover:opacity-90 rounded-sm"
              style={{ fontFamily: "var(--font-heading)" }}>
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="border border-border p-4 rounded-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium" style={{ fontFamily: "var(--font-heading)" }}>
              Edit: {editTarget.full_name || editTarget.email}
            </span>
            <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center gap-3">
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name"
              className="flex-1 bg-transparent border border-border rounded-sm px-3 py-1.5 text-xs outline-none focus:border-primary" />
            <input value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Bio"
              className="flex-1 bg-transparent border border-border rounded-sm px-3 py-1.5 text-xs outline-none focus:border-primary" />
            <button onClick={saveEdit}
              className="px-4 py-1.5 text-[10px] tracking-wider uppercase bg-primary text-primary-foreground hover:opacity-90 rounded-sm"
              style={{ fontFamily: "var(--font-heading)" }}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Users Grid */}
      {users.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            {users.length} user{users.length !== 1 ? "s" : ""} found
          </div>
          <div className="border border-border rounded-sm overflow-hidden divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className={`flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors group ${u.is_suspended ? "opacity-60 bg-destructive/5" : ""}`}>
                {/* Avatar */}
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground shrink-0 border border-border">
                    {(u.full_name || u.email || "?")[0]?.toUpperCase()}
                  </div>
                )}

                {/* Name + Email */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-body)" }}>
                      {u.full_name || "No Name"}
                    </span>
                    {u.is_suspended && (
                      <span className="text-[8px] px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/30 rounded-sm uppercase tracking-wider shrink-0"
                        style={{ fontFamily: "var(--font-heading)" }}>
                        {u.suspended_until ? `Until ${new Date(u.suspended_until).toLocaleDateString()}` : "Permanent"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-2.5 w-2.5 shrink-0" /> {u.email || "—"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 shrink-0">
                      <Calendar className="h-2.5 w-2.5" /> {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Roles */}
                <div className="flex gap-1 shrink-0">
                  {u.roles.map((r) => (
                    <span key={r} className={`text-[8px] px-1.5 py-0.5 border rounded-sm uppercase tracking-wider ${roleColor(r)}`}>
                      {r.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditTarget(u); setEditName(u.full_name || ""); setEditBio(u.bio || ""); }}
                    className="p-1.5 hover:text-primary transition-colors rounded-sm hover:bg-primary/10" title="Edit" disabled={actionLoading === u.id}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {u.is_suspended ? (
                    <button onClick={() => revokeSuspension(u.id)}
                      className="p-1.5 hover:text-primary transition-colors rounded-sm hover:bg-primary/10" title="Revoke" disabled={actionLoading === u.id}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => setSuspendTarget(u)}
                      className="p-1.5 hover:text-yellow-500 transition-colors rounded-sm hover:bg-yellow-500/10" title="Suspend" disabled={actionLoading === u.id}>
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => deleteUser(u)}
                    className="p-1.5 hover:text-destructive transition-colors rounded-sm hover:bg-destructive/10" title="Delete" disabled={actionLoading === u.id}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {users.length === 0 && !loading && (
        <div className="text-center py-12 border border-dashed border-border rounded-sm">
          <Search className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>Search by email or name, or click "All" to browse.</p>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
