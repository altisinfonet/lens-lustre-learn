import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, Ban, ShieldCheck, Trash2, Pencil, XCircle, Loader2, Mail, User, Calendar, Shield, Plus, X, CheckSquare, Square, Award } from "lucide-react";
import type { User as AuthUser } from "@supabase/supabase-js";
import { BADGES, BADGE_TYPES, type BadgeType } from "@/lib/badgeConfig";

const ALL_ROLES = ["user", "admin", "judge", "content_editor", "registered_photographer", "student"] as const;
const ROLE_LABELS: Record<string, string> = {
  user: "User",
  admin: "Admin",
  judge: "Jury",
  content_editor: "Contributor",
  registered_photographer: "Photographer",
  student: "Student",
};

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
  badges: string[];
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
  const [roleTarget, setRoleTarget] = useState<UserRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [badgeTarget, setBadgeTarget] = useState<UserRow | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selectedIds.size === users.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(users.map((u) => u.id)));
  };

  const bulkAssignRole = async () => {
    if (!bulkRole || selectedIds.size === 0) return;
    setBulkLoading(true);
    let success = 0;
    for (const uid of selectedIds) {
      const u = users.find((x) => x.id === uid);
      if (u?.roles.includes(bulkRole)) continue;
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: bulkRole as any });
      if (!error) {
        success++;
        setUsers((prev) => prev.map((x) => x.id === uid ? { ...x, roles: [...x.roles, bulkRole] } : x));
      }
    }
    toast({ title: `${ROLE_LABELS[bulkRole]} assigned to ${success} user(s)` });
    setSelectedIds(new Set());
    setBulkRole("");
    setBulkLoading(false);
  };

  const bulkRemoveRole = async () => {
    if (!bulkRole || bulkRole === "user" || selectedIds.size === 0) return;
    if (!confirm(`Remove "${ROLE_LABELS[bulkRole]}" from ${selectedIds.size} user(s)?`)) return;
    setBulkLoading(true);
    let success = 0;
    for (const uid of selectedIds) {
      const u = users.find((x) => x.id === uid);
      if (!u?.roles.includes(bulkRole)) continue;
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", bulkRole as any);
      if (!error) {
        success++;
        setUsers((prev) => prev.map((x) => x.id === uid ? { ...x, roles: x.roles.filter((r) => r !== bulkRole) } : x));
      }
    }
    toast({ title: `${ROLE_LABELS[bulkRole]} removed from ${success} user(s)` });
    setSelectedIds(new Set());
    setBulkRole("");
    setBulkLoading(false);
  };

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
      const [rolesRes, badgesRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
        supabase.from("user_badges").select("user_id, badge_type").in("user_id", userIds),
      ]);
      const roleMap = new Map<string, string[]>();
      rolesRes.data?.forEach((r) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });
      const badgeMap = new Map<string, string[]>();
      (badgesRes.data as any[])?.forEach((b: any) => {
        const existing = badgeMap.get(b.user_id) || [];
        existing.push(b.badge_type);
        badgeMap.set(b.user_id, existing);
      });
      setUsers(data.map((u: any) => ({ ...u, roles: roleMap.get(u.id) || [], badges: badgeMap.get(u.id) || [] })));
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

  const assignRole = async (userId: string, role: string) => {
    setActionLoading(userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) {
      if (error.code === "23505") toast({ title: "Role already assigned" });
      else toast({ title: "Assign failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${ROLE_LABELS[role] || role} role assigned` });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, roles: [...u.roles, role] } : u));
    }
    setActionLoading(null);
  };

  const removeRole = async (userId: string, role: string) => {
    if (role === "user") { toast({ title: "Cannot remove base user role" }); return; }
    if (!confirm(`Remove "${ROLE_LABELS[role]}" role?`)) return;
    setActionLoading(userId);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) toast({ title: "Remove failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: `${ROLE_LABELS[role] || role} role removed` });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, roles: u.roles.filter((r) => r !== role) } : u));
    }
    setActionLoading(null);
  };

  const assignBadge = async (userId: string, badgeType: string) => {
    setActionLoading(userId);
    const { error } = await supabase.from("user_badges").insert({ user_id: userId, badge_type: badgeType, assigned_by: user?.id } as any);
    if (error) {
      if (error.code === "23505") toast({ title: "Badge already assigned" });
      else toast({ title: "Assign failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${BADGES[badgeType as BadgeType]?.label || badgeType} badge assigned` });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, badges: [...u.badges, badgeType] } : u));
      if (badgeTarget?.id === userId) setBadgeTarget({ ...badgeTarget, badges: [...badgeTarget.badges, badgeType] });
    }
    setActionLoading(null);
  };

  const removeBadge = async (userId: string, badgeType: string) => {
    if (!confirm(`Remove "${BADGES[badgeType as BadgeType]?.label}" badge?`)) return;
    setActionLoading(userId);
    const { error } = await supabase.from("user_badges").delete().eq("user_id", userId).eq("badge_type", badgeType);
    if (error) toast({ title: "Remove failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: `${BADGES[badgeType as BadgeType]?.label || badgeType} badge removed` });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, badges: u.badges.filter((b) => b !== badgeType) } : u));
      if (badgeTarget?.id === userId) setBadgeTarget({ ...badgeTarget, badges: badgeTarget.badges.filter((b) => b !== badgeType) });
    }
    setActionLoading(null);
  };

  const roleColor = (r: string) => {
    if (r === "admin") return "bg-destructive/10 text-destructive border-destructive/30";
    if (r === "judge") return "bg-accent/50 text-accent-foreground border-accent";
    if (r === "content_editor") return "bg-primary/10 text-primary border-primary/30";
    if (r === "registered_photographer") return "bg-secondary text-secondary-foreground border-secondary";
    if (r === "student") return "bg-muted text-muted-foreground border-border";
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

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border border-primary/30 bg-primary/5 p-3 rounded-sm">
          <span className="text-[10px] tracking-[0.15em] uppercase text-primary font-medium shrink-0" style={{ fontFamily: "var(--font-heading)" }}>
            <CheckSquare className="h-3.5 w-3.5 inline mr-1" />
            {selectedIds.size} selected
          </span>
          <select
            value={bulkRole}
            onChange={(e) => setBulkRole(e.target.value)}
            className="bg-transparent border border-border rounded-sm px-2 py-1.5 text-xs outline-none focus:border-primary"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <option value="">Select role...</option>
            {ALL_ROLES.filter((r) => r !== "user").map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <button onClick={bulkAssignRole} disabled={!bulkRole || bulkLoading}
            className="px-3 py-1.5 text-[10px] tracking-wider uppercase bg-primary text-primary-foreground hover:opacity-90 rounded-sm disabled:opacity-50 flex items-center gap-1"
            style={{ fontFamily: "var(--font-heading)" }}>
            {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Assign
          </button>
          <button onClick={bulkRemoveRole} disabled={!bulkRole || bulkRole === "user" || bulkLoading}
            className="px-3 py-1.5 text-[10px] tracking-wider uppercase border border-destructive/40 text-destructive hover:bg-destructive/10 rounded-sm disabled:opacity-50 flex items-center gap-1"
            style={{ fontFamily: "var(--font-heading)" }}>
            {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            Remove
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: "var(--font-heading)" }}>
            Clear
          </button>
        </div>
      )}

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

      {/* Role Management Panel */}
      {roleTarget && (
        <div className="border border-primary/30 bg-primary/5 p-4 rounded-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium" style={{ fontFamily: "var(--font-heading)" }}>
              <Shield className="h-3.5 w-3.5 inline mr-1.5" />
              Manage Roles: {roleTarget.full_name || roleTarget.email}
            </span>
            <button onClick={() => setRoleTarget(null)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((role) => {
              const has = roleTarget.roles.includes(role);
              return (
                <button
                  key={role}
                  onClick={() => {
                    if (has) {
                      removeRole(roleTarget.id, role);
                      setRoleTarget({ ...roleTarget, roles: roleTarget.roles.filter((r) => r !== role) });
                    } else {
                      assignRole(roleTarget.id, role);
                      setRoleTarget({ ...roleTarget, roles: [...roleTarget.roles, role] });
                    }
                  }}
                  disabled={actionLoading === roleTarget.id || (role === "user" && has)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-wider uppercase border rounded-sm transition-all ${
                    has
                      ? `${roleColor(role)} font-medium`
                      : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {has ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {ROLE_LABELS[role]}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">Click a role to assign it. Click an assigned role to remove it.</p>
        </div>
      )}

      {/* Badge Management Panel */}
      {badgeTarget && (
        <div className="border border-amber-500/30 bg-amber-500/5 p-4 rounded-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] uppercase text-amber-600 font-medium" style={{ fontFamily: "var(--font-heading)" }}>
              <Award className="h-3.5 w-3.5 inline mr-1.5" />
              Manage Badges: {badgeTarget.full_name || badgeTarget.email}
            </span>
            <button onClick={() => setBadgeTarget(null)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {BADGE_TYPES.map((badge) => {
              const cfg = BADGES[badge];
              const has = badgeTarget.badges.includes(badge);
              return (
                <button
                  key={badge}
                  onClick={() => {
                    if (has) {
                      removeBadge(badgeTarget.id, badge);
                    } else {
                      assignBadge(badgeTarget.id, badge);
                    }
                  }}
                  disabled={actionLoading === badgeTarget.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-wider uppercase border rounded-sm transition-all ${
                    has
                      ? `${cfg.badgeClass} font-medium`
                      : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-amber-500 hover:text-amber-600"
                  }`}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {has ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {cfg.icon} {cfg.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">Click a badge to assign it. Click an assigned badge to remove it.</p>
        </div>
      )}
      {users.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            <button onClick={selectAll} className="hover:text-primary transition-colors" title="Select all">
              {selectedIds.size === users.length && users.length > 0 ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            </button>
            {users.length} user{users.length !== 1 ? "s" : ""} found
          </div>
          <div className="border border-border rounded-sm overflow-hidden divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className={`flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors group ${u.is_suspended ? "opacity-60 bg-destructive/5" : ""} ${selectedIds.has(u.id) ? "bg-primary/5" : ""}`}>
                {/* Checkbox */}
                <button onClick={() => toggleSelect(u.id)} className="shrink-0 hover:text-primary transition-colors">
                  {selectedIds.has(u.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                </button>
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

                {/* Roles + Badges */}
                <div className="flex gap-1 shrink-0 flex-wrap max-w-[280px] justify-end">
                  {u.badges.map((b) => {
                    const cfg = BADGES[b as BadgeType];
                    if (!cfg) return null;
                    return (
                      <span key={b} className={`text-[8px] px-1.5 py-0.5 border rounded-sm uppercase tracking-wider ${cfg.badgeClass}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    );
                  })}
                  {u.roles.map((r) => (
                    <span key={r} className={`text-[8px] px-1.5 py-0.5 border rounded-sm uppercase tracking-wider ${roleColor(r)}`}>
                      {ROLE_LABELS[r] || r.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setRoleTarget(u)}
                    className="p-1.5 hover:text-primary transition-colors rounded-sm hover:bg-primary/10" title="Manage Roles" disabled={actionLoading === u.id}>
                    <Shield className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setBadgeTarget(u)}
                    className="p-1.5 hover:text-amber-600 transition-colors rounded-sm hover:bg-amber-500/10" title="Manage Badges" disabled={actionLoading === u.id}>
                    <Award className="h-3.5 w-3.5" />
                  </button>
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
                      className="p-1.5 hover:text-destructive/70 transition-colors rounded-sm hover:bg-destructive/10" title="Suspend" disabled={actionLoading === u.id}>
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
