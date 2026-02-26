import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, Trophy, Users, CheckCircle, XCircle, Loader2, Briefcase, MessageSquare, Image, Upload, Wallet, Gift, ArrowDownLeft, IndianRupee, Banknote, LayoutDashboard, BookOpen, Newspaper, Award, UserCog, Vote, AlertTriangle, Star } from "lucide-react";
import AdminGiftCredit from "@/components/AdminGiftCredit";
import AdminBanners from "@/components/admin/AdminBanners";
import AdminVoteRewards from "@/components/admin/AdminVoteRewards";
import AdminCommentReports from "@/components/admin/AdminCommentReports";
import AdminCourses from "@/components/admin/AdminCourses";
import AdminJournal from "@/components/admin/AdminJournal";
import AdminCertificates from "@/components/admin/AdminCertificates";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminPhotoOfDay from "@/components/admin/AdminPhotoOfDay";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "@/hooks/use-toast";

interface Competition {
  id: string;
  title: string;
  category: string;
  status: string;
  entry_fee: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

interface EntryRow {
  id: string;
  title: string;
  status: string;
  photos: string[];
  created_at: string;
  user_id: string;
  competition_id: string;
  profiles: { full_name: string | null } | null;
  competition_title?: string;
}

interface RoleApp {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  reason: string | null;
  portfolio_url: string | null;
  experience: string | null;
  admin_message: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

interface PortfolioRow {
  id: string;
  title: string;
  category: string;
  image_url: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

interface AdminComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  article_id: string | null;
  entry_id: string | null;
  parent_id: string | null;
  profile_name: string | null;
  context_title: string | null;
}

type Tab = "competitions" | "entries" | "applications" | "portfolio" | "comments" | "wallet" | "gifts" | "vote_rewards" | "reports" | "banners" | "courses" | "journal" | "certificates" | "users" | "potd";

const statusOptions = ["upcoming", "open", "judging", "closed"];
const entryStatusOptions = ["submitted", "approved", "rejected", "winner"];

const AdminPanel = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("banners");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [roleApps, setRoleApps] = useState<RoleApp[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioRow[]>([]);
  const [adminComments, setAdminComments] = useState<AdminComment[]>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "General",
    cover_image_url: "",
    entry_fee: "0",
    prize_info: "",
    status: "upcoming",
    max_entries_per_user: "1",
    max_photos_per_entry: "5",
    starts_at: "",
    ends_at: "",
    paypal_email: "",
    bank_details: "",
    upi_id: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchCompetitions = async () => {
    const { data } = await supabase
      .from("competitions")
      .select("id, title, category, status, entry_fee, starts_at, ends_at, created_at")
      .order("created_at", { ascending: false });
    setCompetitions(data || []);
  };

  const fetchEntries = async () => {
    const { data } = await supabase
      .from("competition_entries")
      .select("id, title, status, photos, created_at, user_id, competition_id")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((e) => e.user_id))];
      const compIds = [...new Set(data.map((e) => e.competition_id))];

      const [{ data: profiles }, { data: comps }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", userIds),
        supabase.from("competitions").select("id, title").in("id", compIds),
      ]);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      const compMap = new Map(comps?.map((c) => [c.id, c.title]) || []);

      setEntries(
        data.map((e) => ({
          ...e,
          profiles: profileMap.get(e.user_id) || null,
          competition_title: compMap.get(e.competition_id) || "Unknown",
        }))
      );
    } else {
      setEntries([]);
    }
  };
  const fetchRoleApps = async () => {
    const { data } = await supabase
      .from("role_applications")
      .select("id, user_id, requested_role, status, reason, portfolio_url, experience, admin_message, created_at")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((a) => a.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      setRoleApps(data.map((a) => ({ ...a, profiles: profileMap.get(a.user_id) || null })));
    } else {
      setRoleApps([]);
    }
  };

  const fetchPortfolio = async () => {
    const { data } = await supabase
      .from("portfolio_images")
      .select("id, title, category, image_url, sort_order, is_visible, created_at")
      .order("sort_order", { ascending: true });
    setPortfolioImages(data || []);
  };

  const fetchAdminComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("id, user_id, content, created_at, article_id, entry_id, parent_id")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const articleIds = [...new Set(data.filter((c) => c.article_id).map((c) => c.article_id!))];
      const entryIds = [...new Set(data.filter((c) => c.entry_id).map((c) => c.entry_id!))];

      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map<string, string | null>(profiles?.map((p: any) => [p.id, p.full_name]) || []);

      let articleMap = new Map<string, string>();
      if (articleIds.length > 0) {
        const { data: articles } = await supabase.from("journal_articles").select("id, title").in("id", articleIds);
        articleMap = new Map(articles?.map((a: any) => [a.id, a.title]) || []);
      }

      let entryMap = new Map<string, string>();
      if (entryIds.length > 0) {
        const { data: entries } = await supabase.from("competition_entries").select("id, title").in("id", entryIds);
        entryMap = new Map(entries?.map((e: any) => [e.id, e.title]) || []);
      }

      setAdminComments(
        data.map((c) => ({
          ...c,
          profile_name: profileMap.get(c.user_id) ?? null,
          context_title: c.article_id
            ? articleMap.get(c.article_id) || "Article"
            : c.entry_id
            ? entryMap.get(c.entry_id) || "Entry"
            : null,
        }))
      );
    } else {
      setAdminComments([]);
    }
  };

  const deleteAdminComment = async (commentId: string) => {
    if (!confirm("Delete this comment? This cannot be undone.")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Comment deleted" });
      setAdminComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  const handlePortfolioUpload = async (files: FileList) => {
    if (!user || files.length === 0) return;
    setPortfolioUploading(true);
    const currentMax = portfolioImages.length > 0 ? Math.max(...portfolioImages.map(p => p.sort_order)) : 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop();
      const filePath = `${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolio-images")
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: `Upload failed: ${file.name}`, description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("portfolio-images").getPublicUrl(filePath);

      await supabase.from("portfolio_images").insert({
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        category: "General",
        image_url: urlData.publicUrl,
        sort_order: currentMax + i + 1,
        uploaded_by: user.id,
      });
    }

    setPortfolioUploading(false);
    toast({ title: `${files.length} image(s) uploaded` });
    fetchPortfolio();
  };

  const deletePortfolioImage = async (id: string, imageUrl: string) => {
    // Extract file path from URL
    const urlParts = imageUrl.split("/portfolio-images/");
    const filePath = urlParts.length > 1 ? urlParts[urlParts.length - 1] : null;

    if (filePath) {
      await supabase.storage.from("portfolio-images").remove([filePath]);
    }
    await supabase.from("portfolio_images").delete().eq("id", id);
    toast({ title: "Image deleted" });
    fetchPortfolio();
  };

  const togglePortfolioVisibility = async (id: string, currentVisible: boolean) => {
    await supabase.from("portfolio_images").update({ is_visible: !currentVisible }).eq("id", id);
    setPortfolioImages(prev => prev.map(p => p.id === id ? { ...p, is_visible: !currentVisible } : p));
  };

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([fetchCompetitions(), fetchEntries(), fetchRoleApps(), fetchPortfolio(), fetchAdminComments()]).then(() => setLoading(false));
  }, [isAdmin]);

  const resetForm = () => {
    setForm({
      title: "", description: "", category: "General", cover_image_url: "",
      entry_fee: "0", prize_info: "", status: "upcoming",
      max_entries_per_user: "1", max_photos_per_entry: "5", starts_at: "", ends_at: "",
      paypal_email: "", bank_details: "", upi_id: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (comp: Competition) => {
    setEditingId(comp.id);
    // Need to fetch full data
    supabase.from("competitions").select("*").eq("id", comp.id).single().then(({ data }) => {
      if (data) {
        setForm({
          title: data.title || "",
          description: data.description || "",
          category: data.category || "General",
          cover_image_url: data.cover_image_url || "",
          entry_fee: String(data.entry_fee || 0),
          prize_info: data.prize_info || "",
          status: data.status || "upcoming",
          max_entries_per_user: String(data.max_entries_per_user || 1),
          max_photos_per_entry: String(data.max_photos_per_entry || 5),
          starts_at: data.starts_at ? data.starts_at.slice(0, 16) : "",
          ends_at: data.ends_at ? data.ends_at.slice(0, 16) : "",
          paypal_email: (data.payment_details as any)?.paypal_email || "",
          bank_details: (data.payment_details as any)?.bank_details || "",
          upi_id: (data.payment_details as any)?.upi_id || "",
        });
        setShowForm(true);
      }
    });
  };

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.starts_at || !form.ends_at) {
      toast({ title: "Please fill in required fields (title, dates)", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      cover_image_url: form.cover_image_url.trim() || null,
      entry_fee: parseFloat(form.entry_fee) || 0,
      prize_info: form.prize_info.trim() || null,
      status: form.status,
      max_entries_per_user: parseInt(form.max_entries_per_user) || 1,
      max_photos_per_entry: parseInt(form.max_photos_per_entry) || 5,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      updated_at: new Date().toISOString(),
      payment_details: (form.paypal_email.trim() || form.bank_details.trim() || form.upi_id.trim())
        ? {
            paypal_email: form.paypal_email.trim() || null,
            bank_details: form.bank_details.trim() || null,
            upi_id: form.upi_id.trim() || null,
          }
        : null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("competitions").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("competitions").insert({ ...payload, created_by: user.id }));
    }
    setSaving(false);

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Competition updated" : "Competition created" });
      resetForm();
      fetchCompetitions();
    }
  };

  const deleteCompetition = async (id: string) => {
    if (!confirm("Delete this competition and all its entries?")) return;
    const { error } = await supabase.from("competitions").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Competition deleted" });
      fetchCompetitions();
      fetchEntries();
    }
  };

  const updateEntryStatus = async (entryId: string, newStatus: string) => {
    const { error } = await supabase.from("competition_entries").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", entryId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      const entry = entries.find((e) => e.id === entryId);
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, status: newStatus } : e)));
      toast({ title: `Entry ${newStatus}` });

      // Auto-issue competition winner certificate
      if (newStatus === "winner" && entry) {
        const compTitle = entry.competition_title || "Competition";
        const { error: certError } = await supabase.from("certificates").insert({
          user_id: entry.user_id,
          title: `${compTitle} — Winner Certificate`,
          description: `Awarded for the winning entry "${entry.title}" in the "${compTitle}" competition.`,
          type: "competition_winner",
          reference_id: entry.competition_id,
        });
        if (certError) {
          toast({ title: "Certificate could not be issued", description: certError.message, variant: "destructive" });
        } else {
          toast({ title: "🏆 Winner certificate issued!", description: `Certificate awarded to ${entry.profiles?.full_name || "the photographer"}.` });
        }
      }
    }
  };

  const [adminMsg, setAdminMsg] = useState<Record<string, string>>({});

  const handleRoleAppDecision = async (appId: string, decision: "approved" | "rejected") => {
    const app = roleApps.find((a) => a.id === appId);
    if (!app || !user) return;

    const { error } = await supabase
      .from("role_applications")
      .update({
        status: decision,
        admin_message: adminMsg[appId]?.trim() || null,
        reviewed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appId);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }

    // If approved, assign the role
    if (decision === "approved") {
      await supabase.from("user_roles").insert({
        user_id: app.user_id,
        role: app.requested_role as any,
      });
    }

    toast({ title: `Application ${decision}` });
    fetchRoleApps();
  };

  if (adminLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>Loading...</div>
      </main>
    );
  }

  if (!isAdmin) return null;

  const statusColor = (s: string) => {
    switch (s) {
      case "open": return "text-primary border-primary";
      case "upcoming": return "text-muted-foreground border-muted-foreground/40";
      case "judging": return "text-yellow-500 border-yellow-500";
      case "closed": return "text-foreground/40 border-foreground/20";
      case "approved": return "text-primary border-primary";
      case "rejected": return "text-destructive border-destructive";
      case "winner": return "text-yellow-500 border-yellow-500";
      default: return "text-muted-foreground border-border";
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 md:px-12 py-12 md:py-16">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Admin Panel" }]} className="mb-8" />

        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-px bg-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Administration</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-light tracking-tight mb-10" style={{ fontFamily: "var(--font-display)" }}>
          Admin <em className="italic text-primary">Panel</em>
        </h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {([["banners", "Banners", LayoutDashboard], ["potd", "Photo of Day", Star], ["portfolio", "Gallery", Image], ["courses", "Courses", BookOpen], ["journal", "Journal", Newspaper], ["certificates", "Certificates", Award], ["users", "Users", UserCog], ["competitions", "Competitions", Trophy], ["entries", "Entries", Users], ["applications", "Applications", Briefcase], ["comments", "Comments", MessageSquare], ["reports", "Reports", AlertTriangle], ["wallet", "Wallet", Wallet], ["gifts", "Gift Credits", Gift], ["vote_rewards", "Vote Rewards", Vote]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border transition-all duration-500 ${
                tab === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/50"
              }`}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Banners Tab */}
        {tab === "banners" && <AdminBanners user={user} />}

        {/* Photo of the Day Tab */}
        {tab === "potd" && <AdminPhotoOfDay user={user} />}

        {/* Courses Tab */}
        {tab === "courses" && <AdminCourses />}

        {/* Journal Tab */}
        {tab === "journal" && <AdminJournal />}

        {/* Certificates Tab */}
        {tab === "certificates" && <AdminCertificates user={user} />}

        {/* Users Tab */}
        {tab === "users" && <AdminUsers user={user} />}

        {/* Competitions Tab */}
        {tab === "competitions" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                {competitions.length} competition{competitions.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <Plus className="h-3.5 w-3.5" /> New Competition
              </button>
            </div>

            {/* Form */}
            {showForm && (
              <div className="border border-border p-6 md:p-8 mb-8 space-y-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                    {editingId ? "Edit Competition" : "New Competition"}
                  </span>
                  <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <FormField label="Title *" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Competition title" />
                  <FormField label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} placeholder="e.g. Wildlife, Street" />
                  <FormField label="Cover Image URL" value={form.cover_image_url} onChange={(v) => setForm((f) => ({ ...f, cover_image_url: v }))} placeholder="https://..." />
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <FormField label="Entry Fee ($)" value={form.entry_fee} onChange={(v) => setForm((f) => ({ ...f, entry_fee: v }))} placeholder="0" type="number" />
                  <FormField label="Prize Info" value={form.prize_info} onChange={(v) => setForm((f) => ({ ...f, prize_info: v }))} placeholder="e.g. $500 grand prize" />
                  <FormField label="Max Entries/User" value={form.max_entries_per_user} onChange={(v) => setForm((f) => ({ ...f, max_entries_per_user: v }))} type="number" />
                  <FormField label="Max Photos/Entry" value={form.max_photos_per_entry} onChange={(v) => setForm((f) => ({ ...f, max_photos_per_entry: v }))} type="number" />
                  <FormField label="Starts At *" value={form.starts_at} onChange={(v) => setForm((f) => ({ ...f, starts_at: v }))} type="datetime-local" />
                  <FormField label="Ends At *" value={form.ends_at} onChange={(v) => setForm((f) => ({ ...f, ends_at: v }))} type="datetime-local" />
                </div>

                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-transparent border border-border focus:border-primary outline-none p-4 text-sm transition-colors duration-500 resize-none"
                    placeholder="Describe this competition..."
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>

                {/* Payment Details (shown when entry_fee > 0) */}
                {parseFloat(form.entry_fee) > 0 && (
                  <div className="border border-border/50 p-5 space-y-4">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                      Payment Details (shown to participants)
                    </span>
                    <div className="grid md:grid-cols-2 gap-5">
                      <FormField label="PayPal Email" value={form.paypal_email} onChange={(v) => setForm((f) => ({ ...f, paypal_email: v }))} placeholder="payments@example.com" />
                      <FormField label="UPI ID" value={form.upi_id} onChange={(v) => setForm((f) => ({ ...f, upi_id: v }))} placeholder="name@upi" />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Bank Details</label>
                      <textarea
                        value={form.bank_details}
                        onChange={(e) => setForm((f) => ({ ...f, bank_details: e.target.value }))}
                        rows={2}
                        className="w-full bg-transparent border border-border focus:border-primary outline-none p-4 text-sm transition-colors duration-500 resize-none"
                        placeholder="Bank name, Account number, IFSC, etc."
                        style={{ fontFamily: "var(--font-body)" }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingId ? "Update" : "Create"}
                  </button>
                  <button onClick={resetForm} className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground" style={{ fontFamily: "var(--font-heading)" }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="border border-border overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    {["Title", "Category", "Status", "Fee", "Dates", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-normal" style={{ fontFamily: "var(--font-heading)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {competitions.map((comp) => (
                    <tr key={comp.id} className="hover:bg-muted/30 transition-colors duration-300">
                      <td className="px-4 py-3 text-sm" style={{ fontFamily: "var(--font-body)" }}>{comp.title}</td>
                      <td className="px-4 py-3 text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{comp.category}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 border ${statusColor(comp.status)}`} style={{ fontFamily: "var(--font-heading)" }}>
                          {comp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>${comp.entry_fee}</td>
                      <td className="px-4 py-3 text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                        {new Date(comp.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(comp.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/competitions/${comp.id}`)} className="p-1.5 hover:text-primary transition-colors" title="View"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={() => openEdit(comp)} className="p-1.5 hover:text-primary transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deleteCompetition(comp.id)} className="p-1.5 hover:text-destructive transition-colors" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {competitions.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>No competitions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Entries Tab */}
        {tab === "entries" && (
          <div>
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
            </span>

            <div className="border border-border overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    {["Entry", "Competition", "Photographer", "Photos", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-normal" style={{ fontFamily: "var(--font-heading)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors duration-300">
                      <td className="px-4 py-3 text-sm" style={{ fontFamily: "var(--font-body)" }}>{entry.title}</td>
                      <td className="px-4 py-3 text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{entry.competition_title}</td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{entry.profiles?.full_name || "Unknown"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {entry.photos.slice(0, 3).map((p, i) => (
                            <img key={i} src={p} alt="" className="w-8 h-8 object-cover border border-border" />
                          ))}
                          {entry.photos.length > 3 && <span className="text-[9px] text-muted-foreground self-center ml-1">+{entry.photos.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={entry.status}
                          onChange={(e) => updateEntryStatus(entry.id, e.target.value)}
                          className={`text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 border bg-transparent outline-none cursor-pointer ${statusColor(entry.status)}`}
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {entryStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateEntryStatus(entry.id, "approved")} className="p-1.5 hover:text-primary transition-colors" title="Approve"><CheckCircle className="h-3.5 w-3.5" /></button>
                          <button onClick={() => updateEntryStatus(entry.id, "rejected")} className="p-1.5 hover:text-destructive transition-colors" title="Reject"><XCircle className="h-3.5 w-3.5" /></button>
                          <button
                            onClick={() => updateEntryStatus(entry.id, "winner")}
                            className={`p-1.5 transition-colors ${entry.status === "winner" ? "text-yellow-500" : "hover:text-yellow-500"}`}
                            title="Mark as Winner"
                          >
                            <Trophy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>No entries yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {tab === "applications" && (
          <div>
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              {roleApps.length} application{roleApps.length !== 1 ? "s" : ""}
            </span>

            <div className="space-y-4">
              {roleApps.map((app) => (
                <div key={app.id} className="border border-border p-5 md:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-light" style={{ fontFamily: "var(--font-heading)" }}>
                        {app.profiles?.full_name || "Unknown User"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
                        Requesting: <span className="text-primary uppercase tracking-[0.1em]">{app.requested_role === "content_editor" ? "Content Editor" : "Judge"}</span>
                      </p>
                    </div>
                    <span className={`text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 border ${
                      app.status === "approved" ? "text-primary border-primary" :
                      app.status === "rejected" ? "text-destructive border-destructive" :
                      "text-yellow-500 border-yellow-500"
                    }`} style={{ fontFamily: "var(--font-heading)" }}>
                      {app.status}
                    </span>
                  </div>

                  {app.reason && (
                    <div className="mb-3">
                      <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>Reason</span>
                      <p className="text-xs text-foreground/80 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{app.reason}</p>
                    </div>
                  )}
                  {app.portfolio_url && (
                    <div className="mb-3">
                      <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>Portfolio</span>
                      <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline" style={{ fontFamily: "var(--font-body)" }}>{app.portfolio_url}</a>
                    </div>
                  )}
                  {app.experience && (
                    <div className="mb-3">
                      <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>Experience</span>
                      <p className="text-xs text-foreground/80 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{app.experience}</p>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>
                    Applied {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>

                  {app.status === "pending" && (
                    <div className="border-t border-border pt-4 space-y-3">
                      <div>
                        <label className="block text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                          Admin Message (optional)
                        </label>
                        <input
                          type="text"
                          value={adminMsg[app.id] || ""}
                          onChange={(e) => setAdminMsg((prev) => ({ ...prev, [app.id]: e.target.value }))}
                          placeholder="Optional feedback to the applicant..."
                          className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-2 text-xs transition-colors duration-500"
                          style={{ fontFamily: "var(--font-body)" }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRoleAppDecision(app.id, "approved")}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.15em] uppercase bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          <CheckCircle className="h-3 w-3" /> Approve
                        </button>
                        <button
                          onClick={() => handleRoleAppDecision(app.id, "rejected")}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.15em] uppercase border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {app.admin_message && app.status !== "pending" && (
                    <div className="border-t border-border pt-3 mt-3">
                      <p className="text-[10px] text-muted-foreground flex items-start gap-1.5" style={{ fontFamily: "var(--font-body)" }}>
                        <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                        {app.admin_message}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {roleApps.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10" style={{ fontFamily: "var(--font-body)" }}>No role applications yet</p>
              )}
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {tab === "portfolio" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                {portfolioImages.length} image{portfolioImages.length !== 1 ? "s" : ""}
              </span>
              <label className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-500 cursor-pointer" style={{ fontFamily: "var(--font-heading)" }}>
                {portfolioUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload Images
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files && handlePortfolioUpload(e.target.files)}
                  disabled={portfolioUploading}
                />
              </label>
            </div>

            <p className="text-xs text-muted-foreground mb-6" style={{ fontFamily: "var(--font-body)" }}>
              Upload multiple images at once. They will appear in the Portfolio section on the homepage. You can toggle visibility or delete images.
            </p>

            {portfolioImages.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {portfolioImages.map((img) => (
                  <div key={img.id} className={`group relative aspect-square overflow-hidden rounded-sm border ${img.is_visible ? "border-border" : "border-destructive/40 opacity-50"}`}>
                    <img src={img.image_url} alt={img.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5">
                      <span className="text-[8px] tracking-wider uppercase text-foreground truncate max-w-full px-1" style={{ fontFamily: "var(--font-heading)" }}>{img.category}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => togglePortfolioVisibility(img.id, img.is_visible)}
                          className={`p-1 rounded ${img.is_visible ? "text-primary" : "text-muted-foreground"}`}
                          title={img.is_visible ? "Hide" : "Show"}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deletePortfolioImage(img.id, img.image_url)}
                          className="p-1 rounded text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-border rounded">
                <Image className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>No portfolio images yet. Upload your first batch above.</p>
              </div>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {tab === "comments" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                {adminComments.length} comment{adminComments.length !== 1 ? "s" : ""}
              </span>
            </div>

            {adminComments.length > 0 ? (
              <div className="space-y-0 divide-y divide-border border border-border">
                {adminComments.map((c) => (
                  <div key={c.id} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                          {c.profile_name || "Anonymous"}
                        </span>
                        {c.parent_id && (
                          <span className="text-[9px] tracking-[0.1em] uppercase text-muted-foreground px-1.5 py-0.5 border border-border" style={{ fontFamily: "var(--font-heading)" }}>
                            Reply
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/85 leading-relaxed mb-1.5 line-clamp-3" style={{ fontFamily: "var(--font-body)" }}>
                        {c.content}
                      </p>
                      {c.context_title && (
                        <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                          On: <em>{c.context_title}</em> ({c.article_id ? "Journal" : "Competition Entry"})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteAdminComment(c.id)}
                      className="shrink-0 inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-destructive hover:text-destructive/70 transition-colors"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-border rounded">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>No comments yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Wallet Admin Tab */}
        {tab === "wallet" && <AdminWalletTab user={user} />}

        {/* Gift Credits Tab */}
        {tab === "gifts" && <AdminGiftCredit user={user} />}

        {/* Vote Rewards Tab */}
        {tab === "vote_rewards" && <AdminVoteRewards user={user} />}

        {/* Comment Reports Tab */}
        {tab === "reports" && <AdminCommentReports user={user} />}
      </div>
    </main>
  );
};

const FormField = ({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) => (
  <div>
    <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
      style={{ fontFamily: "var(--font-body)" }}
    />
  </div>
);

export default AdminPanel;

/* ─── Admin Wallet Tab ─── */
import type { User } from "@supabase/supabase-js";

const AdminWalletTab = ({ user }: { user: User | null }) => {
  const [targetEmail, setTargetEmail] = useState("");
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetName, setTargetName] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditType, setCreditType] = useState("prize_winning");
  const [creditDesc, setCreditDesc] = useState("");
  const [processing, setProcessing] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState("83.5");
  const [autoFetch, setAutoFetch] = useState(true);

  const fetchWithdrawals = async () => {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((w: any) => w.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const map = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);
      setWithdrawals(data.map((w: any) => ({ ...w, user_name: map.get(w.user_id) || "Unknown" })));
    } else {
      setWithdrawals([]);
    }
  };

  const fetchRate = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "usd_to_inr_rate").maybeSingle();
    if (data?.value) {
      const v = data.value as any;
      setExchangeRate(String(v.rate || 83.5));
      setAutoFetch(v.auto_fetch ?? true);
    }
  };

  useState(() => { fetchWithdrawals(); fetchRate(); });

  const lookupUser = async () => {
    if (!targetEmail.trim()) return;
    const { data } = await supabase.from("profiles").select("id, full_name").ilike("full_name", `%${targetEmail.trim()}%`).limit(1);
    if (data && data.length > 0) {
      setTargetUserId(data[0].id);
      setTargetName(data[0].full_name || "User");
      toast({ title: `Found: ${data[0].full_name}` });
    } else {
      toast({ title: "User not found", variant: "destructive" });
    }
  };

  const creditWallet = async () => {
    if (!user || !targetUserId) return;
    const amt = parseFloat(creditAmount);
    if (!amt || amt <= 0) { toast({ title: "Enter valid amount", variant: "destructive" }); return; }
    setProcessing(true);
    const { error } = await supabase.rpc("admin_wallet_credit", {
      _admin_id: user.id,
      _target_user_id: targetUserId,
      _amount: amt,
      _type: creditType,
      _description: creditDesc.trim() || `${creditType} credit by admin`,
    });
    if (error) {
      toast({ title: "Credit failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `$${amt} credited to ${targetName}` });
      setCreditAmount("");
      setCreditDesc("");
      setTargetUserId(null);
      setTargetEmail("");
    }
    setProcessing(false);
  };

  const updateWithdrawal = async (id: string, status: string, note: string) => {
    const w = withdrawals.find((w: any) => w.id === id);
    const { error } = await supabase.from("withdrawal_requests")
      .update({ status, admin_note: note || null, reviewed_by: user?.id, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      // If approved, deduct from wallet
      if (status === "approved" && w && user) {
        await supabase.rpc("admin_wallet_credit", {
          _admin_id: user.id,
          _target_user_id: w.user_id,
          _amount: -w.amount,
          _type: "withdrawal",
          _description: `Withdrawal approved - $${w.amount}`,
        });
      }
      toast({ title: `Withdrawal ${status}` });
      fetchWithdrawals();
    }
  };

  const saveRate = async () => {
    const rate = parseFloat(exchangeRate);
    if (!rate || rate <= 0) return;
    await supabase.from("site_settings").upsert({
      key: "usd_to_inr_rate",
      value: { rate, source: "manual", auto_fetch: autoFetch },
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    });
    toast({ title: `Exchange rate set to ₹${rate}` });
  };

  const [wNotes, setWNotes] = useState<Record<string, string>>({});

  return (
    <div className="space-y-10">
      {/* Exchange Rate */}
      <div className="border border-border p-6 space-y-4">
        <span className="text-xs tracking-[0.2em] uppercase text-primary block" style={{ fontFamily: "var(--font-heading)" }}>
          <IndianRupee className="h-3.5 w-3.5 inline mr-2" />Exchange Rate Settings
        </span>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>1 USD = ₹</label>
            <input type="number" min="1" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)}
              className="w-32 bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" style={{ fontFamily: "var(--font-body)" }} />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer" style={{ fontFamily: "var(--font-body)" }}>
            <input type="checkbox" checked={autoFetch} onChange={e => setAutoFetch(e.target.checked)} className="accent-primary" />
            Auto-fetch live rate (fallback)
          </label>
          <button onClick={saveRate}
            className="px-5 py-2 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
            style={{ fontFamily: "var(--font-heading)" }}>Save Rate</button>
        </div>
      </div>

      {/* Credit User Wallet */}
      <div className="border border-border p-6 space-y-4">
        <span className="text-xs tracking-[0.2em] uppercase text-primary block" style={{ fontFamily: "var(--font-heading)" }}>
          <Gift className="h-3.5 w-3.5 inline mr-2" />Credit User Wallet
        </span>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Search by Name</label>
            <div className="flex gap-2">
              <input type="text" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="User's name"
                className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" style={{ fontFamily: "var(--font-body)" }} />
              <button onClick={lookupUser} className="px-4 py-2 border border-border text-xs tracking-[0.15em] uppercase hover:border-primary/50 transition-all" style={{ fontFamily: "var(--font-heading)" }}>Find</button>
            </div>
            {targetUserId && <p className="text-xs text-primary mt-1" style={{ fontFamily: "var(--font-body)" }}>✓ {targetName}</p>}
          </div>
        </div>
        {targetUserId && (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Amount ($)</label>
              <input type="number" min="0.01" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)}
                className="w-32 bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" style={{ fontFamily: "var(--font-body)" }} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Type</label>
              <select value={creditType} onChange={e => setCreditType(e.target.value)}
                className="bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" style={{ fontFamily: "var(--font-body)" }}>
                <option value="prize_winning">Prize Winnings</option>
                <option value="gift">Gift</option>
                <option value="refund">Refund</option>
                <option value="honorarium">Honorarium</option>
                <option value="promo_credit">Promo Credit</option>
                <option value="referral_earning">Referral Earning</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Description</label>
              <input type="text" value={creditDesc} onChange={e => setCreditDesc(e.target.value)} placeholder="e.g. Competition prize"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm" style={{ fontFamily: "var(--font-body)" }} />
            </div>
            <button onClick={creditWallet} disabled={processing}
              className="px-5 py-2 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}>
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Credit"}
            </button>
          </div>
        )}
      </div>

      {/* Withdrawal Requests */}
      <div>
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
          <Banknote className="h-3.5 w-3.5 inline mr-2" />Withdrawal Requests ({withdrawals.length})
        </span>
        {withdrawals.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border">
            <Banknote className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>No withdrawal requests.</p>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ fontFamily: "var(--font-heading)" }}>{w.user_name} — ${Number(w.amount).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                      {new Date(w.created_at).toLocaleDateString()} · Bank: {w.bank_details?.details || "N/A"}
                    </p>
                  </div>
                  <span className={`text-[9px] tracking-[0.2em] uppercase px-3 py-1 border ${
                    w.status === "pending" ? "text-yellow-500 border-yellow-500" :
                    w.status === "approved" ? "text-primary border-primary" :
                    "text-destructive border-destructive"
                  }`} style={{ fontFamily: "var(--font-heading)" }}>{w.status}</span>
                </div>
                {w.status === "pending" && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <input type="text" placeholder="Admin note (optional)" value={wNotes[w.id] || ""} onChange={e => setWNotes(p => ({ ...p, [w.id]: e.target.value }))}
                      className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none py-2 text-xs" style={{ fontFamily: "var(--font-body)" }} />
                    <button onClick={() => updateWithdrawal(w.id, "approved", wNotes[w.id] || "")}
                      className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-primary hover:opacity-70"
                      style={{ fontFamily: "var(--font-heading)" }}>
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={() => updateWithdrawal(w.id, "rejected", wNotes[w.id] || "")}
                      className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-destructive hover:opacity-70"
                      style={{ fontFamily: "var(--font-heading)" }}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
