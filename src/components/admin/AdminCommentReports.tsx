import { useState, useEffect } from "react";
import { AlertTriangle, Check, Trash2, Ban, MessageSquare, Loader2, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
}

interface Report {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_action: string | null;
  created_at: string;
  comment_content: string | null;
  comment_user_id: string | null;
  comment_user_name: string | null;
  reporter_name: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
}

interface FlaggedComment {
  id: string;
  content: string;
  flag_reason: string | null;
  user_id: string;
  image_type: string;
  image_id: string;
  created_at: string;
  user_name: string | null;
}

const AdminCommentReports = ({ user }: Props) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [flagged, setFlagged] = useState<FlaggedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"reports" | "flagged">("reports");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [reportsRes, flaggedRes] = await Promise.all([
      supabase.from("comment_reports").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("image_comments").select("id, content, flag_reason, user_id, image_type, image_id, created_at").eq("is_flagged", true).order("created_at", { ascending: false }).limit(50),
    ]);

    // Enrich reports with comment data
    let enrichedReports: Report[] = [];
    if (reportsRes.data && reportsRes.data.length > 0) {
      const commentIds = [...new Set(reportsRes.data.map(r => r.comment_id))];
      const reporterIds = [...new Set(reportsRes.data.map(r => r.reporter_id))];

      const commentsRes = await supabase.from("image_comments").select("id, content, user_id, is_flagged, flag_reason").in("id", commentIds);

      const allUserIds = [...new Set([...reporterIds, ...(commentsRes.data?.map((c: any) => c.user_id) || [])])];
      const { data: allProfiles } = await supabase.from("profiles").select("id, full_name").in("id", allUserIds);
      const profileMap = new Map(allProfiles?.map(p => [p.id, p.full_name]) || []);
      const commentMap = new Map(commentsRes.data?.map((c: any) => [c.id, c]) || []);

      enrichedReports = reportsRes.data.map(r => {
        const comment = commentMap.get(r.comment_id) as any;
        return {
          ...r,
          comment_content: comment?.content || "[deleted]",
          comment_user_id: comment?.user_id || null,
          comment_user_name: comment?.user_id ? profileMap.get(comment.user_id) || null : null,
          reporter_name: profileMap.get(r.reporter_id) || null,
          is_flagged: comment?.is_flagged || false,
          flag_reason: comment?.flag_reason || null,
        };
      });
    }

    // Enrich flagged comments
    let enrichedFlagged: FlaggedComment[] = [];
    if (flaggedRes.data && flaggedRes.data.length > 0) {
      const userIds = [...new Set(flaggedRes.data.map((f: any) => f.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      enrichedFlagged = flaggedRes.data.map((f: any) => ({ ...f, user_name: profileMap.get(f.user_id) || null }));
    }

    setReports(enrichedReports);
    setFlagged(enrichedFlagged);
    setLoading(false);
  };

  const handleAction = async (reportId: string, action: string, commentId: string, commentUserId: string | null) => {
    if (!user) return;
    setProcessing(reportId);

    try {
      if (action === "remove_comment") {
        await supabase.from("image_comments").delete().eq("id", commentId);
        toast({ title: "Comment removed" });
      } else if (action === "remove_thread") {
        // Delete comment and all replies
        await supabase.from("image_comments").delete().eq("parent_id", commentId);
        await supabase.from("image_comments").delete().eq("id", commentId);
        toast({ title: "Thread removed" });
      } else if (action === "ban_user" && commentUserId) {
        await supabase.from("profiles").update({
          is_suspended: true,
          suspension_reason: "Banned for inappropriate comments",
        }).eq("id", commentUserId);
        // Also remove the comment
        await supabase.from("image_comments").delete().eq("id", commentId);
        toast({ title: "User banned & comment removed" });
      } else if (action === "dismiss") {
        toast({ title: "Report dismissed" });
      }

      // Update report status
      await supabase.from("comment_reports").update({
        status: "reviewed",
        admin_action: action,
        reviewed_by: user.id,
        updated_at: new Date().toISOString(),
      }).eq("id", reportId);

      fetchAll();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
    setProcessing(null);
  };

  const handleFlaggedAction = async (commentId: string, action: "approve" | "delete" | "ban", userId: string) => {
    setProcessing(commentId);
    try {
      if (action === "approve") {
        await supabase.from("image_comments").update({ is_flagged: false, flag_reason: null }).eq("id", commentId);
        toast({ title: "Comment approved" });
      } else if (action === "delete") {
        await supabase.from("image_comments").delete().eq("id", commentId);
        toast({ title: "Comment deleted" });
      } else if (action === "ban") {
        await supabase.from("profiles").update({ is_suspended: true, suspension_reason: "Banned for flagged content" }).eq("id", userId);
        await supabase.from("image_comments").delete().eq("id", commentId);
        toast({ title: "User banned & comment deleted" });
      }
      fetchAll();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setProcessing(null);
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground py-8"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>;
  }

  const pendingReports = reports.filter(r => r.status === "pending");

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("reports")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.15em] uppercase border rounded-sm transition-all ${tab === "reports" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          style={{ fontFamily: "var(--font-heading)" }}>
          <AlertTriangle className="h-3 w-3" /> Reports {pendingReports.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-destructive text-destructive-foreground text-[8px] rounded-full">{pendingReports.length}</span>}
        </button>
        <button onClick={() => setTab("flagged")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.15em] uppercase border rounded-sm transition-all ${tab === "flagged" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          style={{ fontFamily: "var(--font-heading)" }}>
          <Eye className="h-3 w-3" /> AI Flagged {flagged.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-destructive text-destructive-foreground text-[8px] rounded-full">{flagged.length}</span>}
        </button>
      </div>

      {/* User Reports */}
      {tab === "reports" && (
        <div>
          {pendingReports.length === 0 && reports.length === 0 ? (
            <div className="border border-border p-8 text-center">
              <Check className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No reports to review</p>
            </div>
          ) : (
            <div className="border border-border rounded-sm divide-y divide-border">
              {reports.map(r => (
                <div key={r.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[8px] px-1.5 py-0.5 border rounded-sm uppercase tracking-wider ${
                          r.status === "pending" ? "border-destructive/40 text-destructive" : "border-primary/40 text-primary"
                        }`}>{r.status}</span>
                        <span className="text-[9px] text-muted-foreground">Reported by: {r.reporter_name || "Unknown"}</span>
                        <span className="text-[9px] text-muted-foreground">· {new Date(r.created_at).toLocaleDateString()}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded-sm">{r.reason}</span>
                      </div>
                      <div className="mt-1.5 p-2 bg-muted/30 border border-border/50 rounded-sm">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Comment by <strong>{r.comment_user_name || "Unknown"}</strong>:</p>
                        <p className="text-xs" style={{ fontFamily: "var(--font-body)" }}>{r.comment_content}</p>
                      </div>
                      {r.is_flagged && r.flag_reason && (
                        <p className="text-[9px] text-destructive mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> AI also flagged: {r.flag_reason}
                        </p>
                      )}
                      {r.admin_action && (
                        <p className="text-[9px] text-primary mt-1">Action taken: {r.admin_action.replace(/_/g, " ")}</p>
                      )}
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button onClick={() => handleAction(r.id, "remove_comment", r.comment_id, r.comment_user_id)} disabled={processing === r.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-wider border border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-sm transition-all"
                        style={{ fontFamily: "var(--font-heading)" }}>
                        <Trash2 className="h-2.5 w-2.5" /> Remove Comment
                      </button>
                      <button onClick={() => handleAction(r.id, "remove_thread", r.comment_id, r.comment_user_id)} disabled={processing === r.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-wider border border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-sm transition-all"
                        style={{ fontFamily: "var(--font-heading)" }}>
                        <MessageSquare className="h-2.5 w-2.5" /> Remove Thread
                      </button>
                      <button onClick={() => handleAction(r.id, "ban_user", r.comment_id, r.comment_user_id)} disabled={processing === r.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-wider border border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-sm transition-all"
                        style={{ fontFamily: "var(--font-heading)" }}>
                        <Ban className="h-2.5 w-2.5" /> Ban User
                      </button>
                      <button onClick={() => handleAction(r.id, "dismiss", r.comment_id, r.comment_user_id)} disabled={processing === r.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-wider border border-border text-muted-foreground hover:border-foreground/50 rounded-sm transition-all"
                        style={{ fontFamily: "var(--font-heading)" }}>
                        <XCircle className="h-2.5 w-2.5" /> Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Flagged Comments */}
      {tab === "flagged" && (
        <div>
          {flagged.length === 0 ? (
            <div className="border border-border p-8 text-center">
              <Check className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No AI-flagged comments</p>
            </div>
          ) : (
            <div className="border border-border rounded-sm divide-y divide-border">
              {flagged.map(f => (
                <div key={f.id} className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[8px] px-1.5 py-0.5 border border-destructive/40 text-destructive rounded-sm uppercase tracking-wider">flagged</span>
                    <span className="text-[9px] text-muted-foreground">By: {f.user_name || "Unknown"}</span>
                    <span className="text-[9px] text-muted-foreground">· {f.image_type}</span>
                    <span className="text-[9px] text-muted-foreground">· {new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="p-2 bg-muted/30 border border-border/50 rounded-sm">
                    <p className="text-xs" style={{ fontFamily: "var(--font-body)" }}>{f.content}</p>
                  </div>
                  {f.flag_reason && <p className="text-[9px] text-destructive">{f.flag_reason}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleFlaggedAction(f.id, "approve", f.user_id)} disabled={processing === f.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-wider border border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground rounded-sm transition-all"
                      style={{ fontFamily: "var(--font-heading)" }}>
                      <Check className="h-2.5 w-2.5" /> Approve
                    </button>
                    <button onClick={() => handleFlaggedAction(f.id, "delete", f.user_id)} disabled={processing === f.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-wider border border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-sm transition-all"
                      style={{ fontFamily: "var(--font-heading)" }}>
                      <Trash2 className="h-2.5 w-2.5" /> Delete
                    </button>
                    <button onClick={() => handleFlaggedAction(f.id, "ban", f.user_id)} disabled={processing === f.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-wider border border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-sm transition-all"
                      style={{ fontFamily: "var(--font-heading)" }}>
                      <Ban className="h-2.5 w-2.5" /> Ban User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCommentReports;
