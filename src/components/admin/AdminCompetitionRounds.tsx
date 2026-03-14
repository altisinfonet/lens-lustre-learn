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
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchRounds = async () => {
    const { data } = await supabase
      .from("judging_rounds" as any)
      .select("id, round_number, name, description, status")
      .eq("competition_id", competitionId)
      .order("round_number", { ascending: true });
    setRounds((data as any as Round[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRounds();
  }, [competitionId]);

  const addRound = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const nextNum = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round_number)) + 1 : 1;
    const { error } = await supabase.from("judging_rounds" as any).insert({
      competition_id: competitionId,
      round_number: nextNum,
      name: newName.trim(),
      description: newDesc.trim() || null,
    } as any);
    setAdding(false);
    if (error) {
      toast({ title: "Failed to add round", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Round added" });
      setNewName("");
      setNewDesc("");
      fetchRounds();
    }
  };

  const deleteRound = async (id: string) => {
    if (!confirm("Delete this judging round?")) return;
    await supabase.from("judging_rounds" as any).delete().eq("id", id);
    toast({ title: "Round deleted" });
    fetchRounds();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("judging_rounds" as any).update({ status } as any).eq("id", id);
    setRounds((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast({ title: `Round marked as ${status}` });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-xs">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading rounds...
      </div>
    );
  }

  return (
    <div className="border border-border/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Judging Rounds ({rounds.length})
        </span>
      </div>

      {/* Existing rounds */}
      {rounds.length > 0 && (
        <div className="space-y-2">
          {rounds.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border border-border px-4 py-3">
              <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-semibold w-6" style={{ fontFamily: "var(--font-heading)" }}>
                R{r.round_number}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm block" style={{ fontFamily: "var(--font-body)" }}>{r.name}</span>
                {r.description && (
                  <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{r.description}</span>
                )}
              </div>
              <select
                value={r.status}
                onChange={(e) => updateStatus(r.id, e.target.value)}
                className={`text-[9px] tracking-[0.15em] uppercase px-2 py-1 border bg-transparent outline-none cursor-pointer ${
                  r.status === "active" ? "text-primary border-primary" :
                  r.status === "completed" ? "text-muted-foreground border-muted-foreground/40" :
                  "text-yellow-500 border-yellow-500"
                }`}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {ROUND_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => deleteRound(r.id)} className="p-1 hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new round */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Round name (e.g. Shortlisting)"
          className="flex-1 bg-transparent border border-border focus:border-primary outline-none py-2 px-3 text-sm transition-colors duration-500"
          style={{ fontFamily: "var(--font-body)" }}
          maxLength={100}
        />
        <input
          type="text"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Description (optional)"
          className="flex-1 bg-transparent border border-border focus:border-primary outline-none py-2 px-3 text-sm transition-colors duration-500"
          style={{ fontFamily: "var(--font-body)" }}
          maxLength={200}
        />
        <button
          onClick={addRound}
          disabled={!newName.trim() || adding}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-[10px] tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Add Round
        </button>
      </div>
    </div>
  );
};

export default AdminCompetitionRounds;
