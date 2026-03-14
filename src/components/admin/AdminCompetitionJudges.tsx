import { useEffect, useState } from "react";
import { Users, Plus, X, Loader2, Gavel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Judge {
  id: string;
  judge_id: string;
  assigned_at: string;
  full_name: string | null;
}

interface JuryUser {
  user_id: string;
  full_name: string | null;
}

interface Props {
  competitionId: string;
  adminId: string;
}

const AdminCompetitionJudges = ({ competitionId, adminId }: Props) => {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [juryUsers, setJuryUsers] = useState<JuryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedJudge, setSelectedJudge] = useState("");

  const fetchJudges = async () => {
    const { data } = await supabase
      .from("competition_judges" as any)
      .select("id, judge_id, assigned_at")
      .eq("competition_id", competitionId);

    if (data && (data as any[]).length > 0) {
      const judgeIds = (data as any[]).map((d: any) => d.judge_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", judgeIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
      setJudges(
        (data as any[]).map((d: any) => ({
          ...d,
          full_name: profileMap.get(d.judge_id) || null,
        }))
      );
    } else {
      setJudges([]);
    }
  };

  const fetchJuryUsers = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "judge");

    if (data && data.length > 0) {
      const userIds = data.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      setJuryUsers(
        data.map((r) => ({
          user_id: r.user_id,
          full_name: profiles?.find((p) => p.id === r.user_id)?.full_name || null,
        }))
      );
    } else {
      setJuryUsers([]);
    }
  };

  useEffect(() => {
    Promise.all([fetchJudges(), fetchJuryUsers()]).then(() => setLoading(false));
  }, [competitionId]);

  const assignJudge = async () => {
    if (!selectedJudge) return;
    setAdding(true);
    const { error } = await supabase.from("competition_judges" as any).insert({
      competition_id: competitionId,
      judge_id: selectedJudge,
      assigned_by: adminId,
    } as any);
    setAdding(false);
    if (error) {
      if (error.message.includes("duplicate")) {
        toast({ title: "Judge already assigned", variant: "destructive" });
      } else {
        toast({ title: "Failed to assign", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Judge assigned" });
      setSelectedJudge("");
      fetchJudges();
    }
  };

  const removeJudge = async (id: string) => {
    const { error } = await supabase.from("competition_judges" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Remove failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Judge removed" });
      fetchJudges();
    }
  };

  const availableJury = juryUsers.filter(
    (j) => !judges.some((assigned) => assigned.judge_id === j.user_id)
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-xs">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading judges...
      </div>
    );
  }

  return (
    <div className="border border-border/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="h-4 w-4 text-primary" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Assigned Judges ({judges.length})
        </span>
      </div>

      {/* Assigned judges list */}
      {judges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {judges.map((j) => (
            <div
              key={j.id}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 border border-primary/30 bg-primary/5 text-primary"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <Users className="h-3 w-3" />
              {j.full_name || "Unknown"}
              <button
                onClick={() => removeJudge(j.id)}
                className="hover:text-destructive transition-colors"
                title="Remove judge"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add judge */}
      <div className="flex items-center gap-2">
        <select
          value={selectedJudge}
          onChange={(e) => setSelectedJudge(e.target.value)}
          className="flex-1 bg-transparent border border-border focus:border-primary outline-none py-2 px-3 text-sm transition-colors duration-500"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <option value="">Select a jury member...</option>
          {availableJury.map((j) => (
            <option key={j.user_id} value={j.user_id}>
              {j.full_name || j.user_id}
            </option>
          ))}
        </select>
        <button
          onClick={assignJudge}
          disabled={!selectedJudge || adding}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-[10px] tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Assign
        </button>
      </div>

      {availableJury.length === 0 && juryUsers.length === 0 && (
        <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
          No users with the Jury role found. Assign the Judge role to users first.
        </p>
      )}
    </div>
  );
};

export default AdminCompetitionJudges;
