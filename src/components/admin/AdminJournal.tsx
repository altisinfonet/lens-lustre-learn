import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Newspaper } from "lucide-react";
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

  const statusStyle = (s: string) => {
    if (s === "published") return "bg-primary/10 text-primary border-primary/30";
    if (s === "archived") return "bg-muted text-muted-foreground border-border";
    return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {articles.length} article{articles.length !== 1 ? "s" : ""}
        </span>
        <button onClick={() => navigate("/journal/editor/new")}
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity rounded-sm"
          style={{ fontFamily: "var(--font-heading)" }}>
          <Plus className="h-3 w-3" /> New Article
        </button>
      </div>

      {articles.length > 0 ? (
        <div className="border border-border rounded-sm overflow-hidden divide-y divide-border">
          {articles.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors group">
              <Newspaper className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-body)" }}>{a.title}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 border rounded-sm uppercase tracking-wider shrink-0 ${statusStyle(a.status)}`}>
                    {a.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{a.author_name || "Unknown"}</span>
                  {a.published_at && (
                    <>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                      </span>
                    </>
                  )}
                  {a.tags.length > 0 && (
                    <>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <div className="flex gap-1">
                        {a.tags.slice(0, 2).map((t) => (
                          <span key={t} className="text-[8px] px-1 py-0.5 bg-muted text-muted-foreground rounded-sm">{t}</span>
                        ))}
                        {a.tags.length > 2 && <span className="text-[8px] text-muted-foreground">+{a.tags.length - 2}</span>}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <select value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)}
                className="text-[9px] tracking-wider uppercase px-2 py-1 border border-border bg-transparent outline-none cursor-pointer rounded-sm"
                style={{ fontFamily: "var(--font-heading)" }}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => navigate(`/journal/${a.slug}`)} className="p-1.5 hover:text-primary transition-colors rounded-sm hover:bg-primary/10" title="View"><Eye className="h-3.5 w-3.5" /></button>
                <button onClick={() => navigate(`/journal/editor/${a.id}`)} className="p-1.5 hover:text-primary transition-colors rounded-sm hover:bg-primary/10" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => deleteArticle(a.id)} className="p-1.5 hover:text-destructive transition-colors rounded-sm hover:bg-destructive/10" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-sm">
          <Newspaper className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No articles yet</p>
        </div>
      )}
    </div>
  );
};

export default AdminJournal;
