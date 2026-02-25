import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Clock, DollarSign, GraduationCap, PenLine, LogOut } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import GlobalSearch from "@/components/GlobalSearch";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  category: string;
  difficulty: string;
  price: number | null;
  is_free: boolean;
  published_at: string | null;
  author_name?: string | null;
  lesson_count?: number;
}

const difficultyColor = (d: string) => {
  switch (d) {
    case "Beginner": return "text-primary border-primary";
    case "Intermediate": return "text-yellow-500 border-yellow-500";
    case "Advanced": return "text-accent border-accent";
    default: return "text-muted-foreground border-border";
  }
};

const Courses = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user) return setCanEdit(false);
      if (isAdmin) return setCanEdit(true);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "content_editor")
        .maybeSingle();
      setCanEdit(!!data);
    };
    check();
  }, [user, isAdmin]);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, slug, description, cover_image_url, category, difficulty, price, is_free, published_at, author_id")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (data) {
        const authorIds = [...new Set(data.map((c: any) => c.author_id))];
        const [{ data: profiles }, { data: lessons }] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", authorIds),
          supabase.from("lessons").select("id, course_id"),
        ]);

        const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
        const lessonCounts = new Map<string, number>();
        lessons?.forEach((l) => {
          lessonCounts.set(l.course_id, (lessonCounts.get(l.course_id) || 0) + 1);
        });

        setCourses(
          data.map((c: any) => ({
            ...c,
            author_name: profileMap.get(c.author_id),
            lesson_count: lessonCounts.get(c.id) || 0,
          }))
        );
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const categories = [...new Set(courses.map((c) => c.category))];
  const filtered = selectedCategory ? courses.filter((c) => c.category === selectedCategory) : courses;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <Breadcrumbs items={[{ label: "Courses" }]} />
          <div className="flex items-center gap-4" style={{ fontFamily: "var(--font-heading)" }}>
            <GlobalSearch />
            {canEdit && (
              <Link to="/courses/new" className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                <PenLine className="h-3.5 w-3.5" /> New Course
              </Link>
            )}
            {user && (
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-3 w-3" /> Logout
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-px bg-primary" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Learning</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-6" style={{ fontFamily: "var(--font-display)" }}>
            Photography <em className="italic">Courses</em>
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg leading-relaxed mb-12" style={{ fontFamily: "var(--font-body)" }}>
            Master your craft with structured courses from experienced photographers. Track your progress lesson by lesson.
          </p>
        </motion.div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-12">
            <button onClick={() => setSelectedCategory(null)} className={`text-[10px] tracking-[0.15em] uppercase px-4 py-2 border transition-all duration-300 ${!selectedCategory ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"}`} style={{ fontFamily: "var(--font-heading)" }}>All</button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`text-[10px] tracking-[0.15em] uppercase px-4 py-2 border transition-all duration-300 ${selectedCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"}`} style={{ fontFamily: "var(--font-heading)" }}>{cat}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-muted mb-4" />
                <div className="h-4 bg-muted w-3/4 mb-2" />
                <div className="h-3 bg-muted w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm" style={{ fontFamily: "var(--font-body)" }}>No courses published yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((course, i) => (
              <motion.article key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.8 }}>
                <Link to={`/courses/${course.slug}`} className="group block">
                  <div className="relative overflow-hidden mb-4">
                    {course.cover_image_url ? (
                      <img src={course.cover_image_url} alt={course.title} className="w-full h-48 object-cover transition-transform duration-[1.5s] group-hover:scale-[1.03]" loading="lazy" />
                    ) : (
                      <div className="w-full h-48 bg-muted flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                    {!course.is_free && (
                      <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-3 py-1 text-xs text-primary flex items-center gap-1" style={{ fontFamily: "var(--font-heading)" }}>
                        <DollarSign className="h-3 w-3" />
                        {course.price}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 border ${difficultyColor(course.difficulty)}`} style={{ fontFamily: "var(--font-heading)" }}>{course.difficulty}</span>
                    <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>{course.category}</span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-light mb-2 group-hover:text-primary transition-colors duration-500" style={{ fontFamily: "var(--font-display)" }}>{course.title}</h2>

                  {course.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2" style={{ fontFamily: "var(--font-body)" }}>{course.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    <span>{course.author_name || "Unknown"}</span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {course.lesson_count} lesson{course.lesson_count !== 1 ? "s" : ""}
                    </span>
                    {course.is_free && <span className="text-primary">Free</span>}
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Courses;
