import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CourseRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  status: string;
  is_free: boolean;
  price: number | null;
  created_at: string;
  author_name: string | null;
}

const AdminCourses = () => {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, title, slug, category, difficulty, status, is_free, price, created_at, author_id")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const authorIds = [...new Set(data.map((c) => c.author_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
      const map = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
      setCourses(data.map((c) => ({ ...c, author_name: map.get(c.author_id) || null })));
    } else {
      setCourses([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, []);

  const deleteCourse = async (id: string) => {
    if (!confirm("Delete this course and all its lessons?")) return;
    // Delete lessons first
    await supabase.from("lessons").delete().eq("course_id", id);
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Course deleted" }); fetchCourses(); }
  };

  const updateStatus = async (id: string, status: string) => {
    const update: any = { status, updated_at: new Date().toISOString() };
    if (status === "published") update.published_at = new Date().toISOString();
    const { error } = await supabase.from("courses").update(update).eq("id", id);
    if (error) toast({ title: "Update failed", variant: "destructive" });
    else {
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      toast({ title: `Course ${status}` });
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
          {courses.length} course{courses.length !== 1 ? "s" : ""}
        </span>
        <button onClick={() => navigate("/courses/editor/new")}
          className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-500"
          style={{ fontFamily: "var(--font-heading)" }}>
          <Plus className="h-3.5 w-3.5" /> New Course
        </button>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              {["Title", "Author", "Category", "Difficulty", "Price", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-normal" style={{ fontFamily: "var(--font-heading)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {courses.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors duration-300">
                <td className="px-4 py-3 text-sm" style={{ fontFamily: "var(--font-body)" }}>{c.title}</td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground">{c.author_name || "Unknown"}</td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground">{c.category}</td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground">{c.difficulty}</td>
                <td className="px-4 py-3 text-[11px] text-muted-foreground">{c.is_free ? "Free" : `$${c.price}`}</td>
                <td className="px-4 py-3">
                  <select value={c.status} onChange={(e) => updateStatus(c.id, e.target.value)}
                    className={`text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 border bg-transparent outline-none cursor-pointer ${statusColor(c.status)}`}
                    style={{ fontFamily: "var(--font-heading)" }}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/courses/${c.slug}`)} className="p-1.5 hover:text-primary transition-colors" title="View"><Eye className="h-3.5 w-3.5" /></button>
                    <button onClick={() => navigate(`/courses/editor/${c.id}`)} className="p-1.5 hover:text-primary transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteCourse(c.id)} className="p-1.5 hover:text-destructive transition-colors" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No courses yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCourses;
