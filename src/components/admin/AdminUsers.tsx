import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, Ban, ShieldCheck, Trash2, Pencil, XCircle, Loader2, UserPlus } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface UserRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_suspended: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  created_at: string;
  roles: string[];
}

const AdminUsers = ({ user }: { user: User | null }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Suspend modal
  const [suspendTarget, setSuspendTarget] = useState<UserRow | null>(null);
  const [suspendType, setSuspendType] = useState<"permanent" | "temporary">("temporary");
  const [suspendDays, setSuspendDays] = useState("7");
  const [suspendReason, setSuspendReason] = useState("");

  // Edit modal
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, bio, is_suspended, suspended_until, suspension_reason, created_at")
      .ilike("full_name", `%${searchQuery.trim()}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const userIds = data.map((u) => u.id);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      const roleMap = new Map<string, string[]>();
      roles?.forEach((r) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });
      setUsers(data.map((u) => ({ ...u, roles: roleMap.get(u.id) || [] })));
    } else {
      setUsers([]);
      toast({ title: "No users found" });
    }
    setLoading(false);
  };

  const loadAllUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, bio, is_suspended, suspended_until, suspension_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data && data.length > 0) {
      const userIds = data.map((u) => u.id);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      const roleMap = new Map<string, string[]>();
      roles?.forEach((r) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });
      setUsers(data.map((u) => ({ ...u, roles: roleMap.get(u.id) || [] })));
    } else {
      setUsers([]);
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
      is_suspended: false,
      suspended_until: null,
      suspension_reason: null,
    }).eq("id", userId);
    if (error) toast({ title: "Revoke failed", variant: "destructive" });
    else {
      toast({ title: "Suspension revoked" });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_suspended: false, suspended_until: null, suspension_reason: null } : u)));
    }
    setActionLoading(null);
  };

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`Permanently delete ${u.full_name || "this user"} and all their data? This cannot be undone.`)) return;
    setActionLoading(u.id);
    // Delete related data
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
    else {
      toast({ title: "User deleted" });
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    }
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
            placeholder="Search users by name..."
            className="flex-1 bg-transparent outline-none py-3 text-sm"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
        <button onClick={searchUsers} disabled={loading}
          className="px-5 py-2.5 text-xs tracking-[0.15em] uppercase bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ fontFamily: "var(--font-heading)" }}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
        </button>
        <button onClick={loadAllUsers} disabled={loading}
          className="px-5 py-2.5 text-xs tracking-[0.15em] uppercase border border-border hover:border-primary transition-colors"
          style={{ fontFamily: "var(--font-heading)" }}>
          All Users
        </button>
      </div>

      {/* Suspend Modal */}
      {suspendTarget && (
        <div className="border border-destructive/50 bg-destructive/5 p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-[0.2em] uppercase text-destructive" style={{ fontFamily: "var(--font-heading)" }}>
              Suspend: {suspendTarget.full_name}
            </span>
            <button onClick={() => setSuspendTarget(null)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={suspendType === "temporary"} onChange={() => setSuspendType("temporary")} /> Temporary
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={suspendType === "permanent"} onChange={() => setSuspendType("permanent")} /> Permanent
            </label>
          </div>
          {suspendType === "temporary" && (
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Duration (days)</label>
              <input type="number" value={suspendDays} onChange={(e) => setSuspendDays(e.target.value)} min="1"
                className="w-32 bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" />
            </div>
          )}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Reason</label>
            <input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Reason for suspension..."
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" style={{ fontFamily: "var(--font-body)" }} />
          </div>
          <button onClick={suspendUser}
            className="px-5 py-2.5 text-xs tracking-[0.15em] uppercase bg-destructive text-destructive-foreground hover:opacity-90"
            style={{ fontFamily: "var(--font-heading)" }}>
            Confirm Suspend
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="border border-border p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              Edit: {editTarget.full_name}
            </span>
            <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Full Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm" style={{ fontFamily: "var(--font-body)" }} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Bio</label>
              <input value={editBio} onChange={(e) => setEditBio(e.target.value)}
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm" style={{ fontFamily: "var(--font-body)" }} />
            </div>
          </div>
          <button onClick={saveEdit}
            className="px-5 py-2.5 text-xs tracking-[0.15em] uppercase bg-primary text-primary-foreground hover:opacity-90"
            style={{ fontFamily: "var(--font-heading)" }}>
            Save Changes
          </button>
        </div>
      )}

      {/* Users Table */}
      {users.length > 0 && (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                {["User", "Roles", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-normal" style={{ fontFamily: "var(--font-heading)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-muted/30 transition-colors duration-300 ${u.is_suspended ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                          {(u.full_name || "?")[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm" style={{ fontFamily: "var(--font-body)" }}>{u.full_name || "No Name"}</p>
                        <p className="text-[9px] text-muted-foreground font-mono">{u.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.map((r) => (
                        <span key={r} className="text-[8px] px-1.5 py-0.5 border border-border text-muted-foreground uppercase tracking-wider">{r.replace(/_/g, " ")}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_suspended ? (
                      <div>
                        <span className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 border border-destructive text-destructive" style={{ fontFamily: "var(--font-heading)" }}>
                          Suspended
                        </span>
                        {u.suspended_until && (
                          <p className="text-[9px] text-muted-foreground mt-1">Until: {new Date(u.suspended_until).toLocaleDateString()}</p>
                        )}
                        {!u.suspended_until && <p className="text-[9px] text-muted-foreground mt-1">Permanent</p>}
                        {u.suspension_reason && <p className="text-[9px] text-muted-foreground mt-0.5 italic">{u.suspension_reason}</p>}
                      </div>
                    ) : (
                      <span className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 border border-primary text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setEditTarget(u); setEditName(u.full_name || ""); setEditBio(u.bio || ""); }}
                        className="p-1.5 hover:text-primary transition-colors" title="Edit"
                        disabled={actionLoading === u.id}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {u.is_suspended ? (
                        <button onClick={() => revokeSuspension(u.id)} className="p-1.5 hover:text-primary transition-colors" title="Revoke Suspension" disabled={actionLoading === u.id}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => setSuspendTarget(u)} className="p-1.5 hover:text-yellow-500 transition-colors" title="Suspend" disabled={actionLoading === u.id}>
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteUser(u)} className="p-1.5 hover:text-destructive transition-colors" title="Delete User" disabled={actionLoading === u.id}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {users.length === 0 && !loading && (
        <div className="text-center py-16 border border-dashed border-border">
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>Search for users by name or click "All Users" to browse.</p>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
