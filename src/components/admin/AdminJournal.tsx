import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  tags: string[];
  published_at: string | null;
  created_at: string;
  author_name: string | null;
}

const AdminJournal = () => {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchArticles = async () => {
    const { data } = await supabase
      .from("journal_articles")
      .select("id, title, slug, status, tags, published_at, created_at, author_id")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const authorIds = [...new Set(data.map((a) => a.author_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
      const map = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
      setArticles(data.map((a) => ({ ...a, author_name: map.get(a.author_id) || null })));
    } else {
      setArticles([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, []);

  const deleteArticle = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    const { error } = await supabase.from("journal_articles").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Article deleted" }); fetchArticles(); }
  };

  const updateStatus = async (id: string, status: string) => {
    const update: any = { status, updated_at: new Date().toISOString() };
    if (status === "published") update.published_at = new Date().toISOString();
    const { error } = await supabase.from("journal_articles").update(update).eq("id", id);
    if (error) toast({ title: "Update failed", variant: "destructive" });
    else {
      setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast({ title: `Article ${status}` });
    }
  };

  const statusColor = (s: string) => {
    if (s === "published") return "text-primary border-primary";
    if (s === "archived") return "text-foreground/40 border-foreground/20";
    return "text-yellow-500 border-yellow-500";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {articles.length} article{articles.length !== 1 ? "s" : ""}
        </span>
        <button onClick={() => navigate("/journal/editor/new")}
          className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-500"
          style={{ fontFamily: "var(--font-heading)" }}>
          <Plus className="h-3.5 w-3.5" /> New Article
        </button>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              {["Title", "Author", "Tags", "Status", "Published", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-normal" style={{ fontFamily: "var(--font-heading)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {articles.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors duration-300">
                <td className="px-4 py-3 text-sm" style={{ fontFamily: "var(--font-body)" }}>{a.title}</td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground">{a.author_name || "Unknown"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {a.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[8px] px-1.5 py-0.5 border border-border text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)}
                    className={`text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 border bg-transparent outline-none cursor-pointer ${statusColor(a.status)}`}
                    style={{ fontFamily: "var(--font-heading)" }}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground">
                  {a.published_at ? new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/journal/${a.slug}`)} className="p-1.5 hover:text-primary transition-colors" title="View"><Eye className="h-3.5 w-3.5" /></button>
                    <button onClick={() => navigate(`/journal/editor/${a.id}`)} className="p-1.5 hover:text-primary transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteArticle(a.id)} className="p-1.5 hover:text-destructive transition-colors" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No articles yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminJournal;
