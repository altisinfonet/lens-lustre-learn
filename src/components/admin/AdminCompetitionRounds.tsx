import { useEffect, useState } from "react";
import { Layers, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Round {
  id: string;
  round_number: number;
  name: string;
  description: string | null;
  status: string;
}

interface Props {
  competitionId: string;
}

const ROUND_STATUSES = ["pending", "active", "completed"];

const AdminCompetitionRounds = ({ competitionId }: Props) => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchRounds = async () => {
    const { data } = await supabase
      .from("judging_rounds")
      .select("id, round_number, name, description, status")
      .eq("competition_id", competitionId)
      .order("round_number", { ascending: true });
    setRounds((data as Round[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRounds();
  }, [competitionId]);

  const addRound = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const nextNum = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round_number)) + 1 : 1;
    const { error } = await supabase.from("judging_rounds").insert({
      competition_id: competitionId,
      round_number: nextNum,
      name: newName.trim(),
    });
    setAdding(false);
    if (error) {
      toast({ title: "Failed to add round", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Round added" });
      setNewName("");
      fetchRounds();
    }
  };

  const deleteRound = async (id: string) => {
    if (!confirm("Delete this judging round?")) return;
    await supabase.from("judging_rounds").delete().eq("id", id);
    toast({ title: "Round deleted" });
    fetchRounds();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("judging_rounds").update({ status }).eq("id", id);
    setRounds((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast({ title: `Round → ${status}` });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-foreground text-xs">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading rounds...
      </div>
    );
  }

  return (
    <div className="border border-border/50 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Layers className="h-3 w-3 text-primary" />
        <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Rounds ({rounds.length})
        </span>
      </div>

      {/* Compact rounds list */}
      {rounds.length > 0 && (
        <div className="space-y-1">
          {rounds.map((r) => (
            <div key={r.id} className="flex items-center gap-2 border border-border px-2 py-1.5 text-xs">
              <span className="text-[9px] tracking-[0.1em] uppercase text-primary font-semibold w-5 shrink-0" style={{ fontFamily: "var(--font-heading)" }}>
                R{r.round_number}
              </span>
              <span className="flex-1 min-w-0 truncate text-xs" style={{ fontFamily: "var(--font-body)" }}>{r.name}</span>
              <select
                value={r.status}
                onChange={(e) => updateStatus(r.id, e.target.value)}
                className={`text-[8px] tracking-[0.1em] uppercase px-1.5 py-0.5 border bg-transparent outline-none cursor-pointer ${
                  r.status === "active" ? "text-primary border-primary" :
                  r.status === "completed" ? "text-muted-foreground border-muted-foreground/40" :
                  "text-yellow-500 border-yellow-500"
                }`}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {ROUND_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => deleteRound(r.id)} className="p-0.5 hover:text-destructive transition-colors shrink-0">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Compact add round */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Round name…"
          className="flex-1 bg-transparent border border-border focus:border-primary outline-none py-1 px-2 text-xs transition-colors"
          style={{ fontFamily: "var(--font-body)" }}
          maxLength={100}
          onKeyDown={(e) => e.key === "Enter" && addRound()}
        />
        <button
          onClick={addRound}
          disabled={!newName.trim() || adding}
          className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-[9px] tracking-[0.1em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {adding ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Plus className="h-2.5 w-2.5" />}
          Add
        </button>
      </div>
    </div>
  );
};

export default AdminCompetitionRounds;
