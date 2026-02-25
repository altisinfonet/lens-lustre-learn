import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle, Circle } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import GlobalSearch from "@/components/GlobalSearch";

interface Lesson {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  image_url: string | null;
  sort_order: number;
  course_id: string;
}

interface CourseInfo {
  slug: string;
  title: string;
}

const LessonView = () => {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [allLessons, setAllLessons] = useState<{ id: string; title: string; sort_order: number }[]>([]);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .maybeSingle();

      if (!lessonData) { setLoading(false); return; }
      setLesson(lessonData);

      const [{ data: courseData }, { data: siblings }] = await Promise.all([
        supabase.from("courses").select("slug, title").eq("id", lessonData.course_id).maybeSingle(),
        supabase.from("lessons").select("id, title, sort_order").eq("course_id", lessonData.course_id).order("sort_order"),
      ]);

      setCourse(courseData);
      setAllLessons(siblings || []);

      if (user) {
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("completed")
          .eq("user_id", user.id)
          .eq("lesson_id", lessonData.id)
          .maybeSingle();
        setCompleted(progress?.completed || false);
      }
      setLoading(false);
    };
    fetch();
  }, [lessonId, user]);

  const toggleComplete = async () => {
    if (!user || !lesson) return;
    const newVal = !completed;

    const { data: existing } = await supabase
      .from("lesson_progress")
      .select("id")
      .eq("user_id", user.id)
      .eq("lesson_id", lesson.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("lesson_progress").update({
        completed: newVal,
        completed_at: newVal ? new Date().toISOString() : null,
      }).eq("id", existing.id);
    } else {
      await supabase.from("lesson_progress").insert({
        user_id: user.id,
        lesson_id: lesson.id,
        completed: newVal,
        completed_at: newVal ? new Date().toISOString() : null,
      });
    }

    setCompleted(newVal);
    toast({ title: newVal ? "Lesson marked complete!" : "Lesson unmarked" });
  };

  if (loading) {
    return <main className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground text-sm">Loading…</div></main>;
  }

  if (!lesson || !course) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Lesson not found.</p>
        <Link to="/courses" className="text-primary text-sm underline">Back to Courses</Link>
      </main>
    );
  }

  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <Breadcrumbs items={[{ label: "Courses", to: "/courses" }, { label: course.title, to: `/courses/${slug}` }, { label: lesson.title }]} />
          <span className="text-[10px] text-muted-foreground flex items-center gap-3" style={{ fontFamily: "var(--font-heading)" }}>
            <GlobalSearch />
            {currentIndex + 1} / {allLessons.length}
          </span>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 max-w-3xl py-12 md:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <span className="text-[10px] tracking-[0.2em] uppercase text-primary block mb-4" style={{ fontFamily: "var(--font-heading)" }}>
            Lesson {currentIndex + 1}
          </span>
          <h1 className="text-3xl md:text-5xl font-light tracking-tight mb-8 leading-[1.1]" style={{ fontFamily: "var(--font-display)" }}>{lesson.title}</h1>

          {/* Video */}
          {lesson.video_url && (
            <div className="mb-10 aspect-video bg-muted overflow-hidden">
              <iframe
                src={lesson.video_url}
                title={lesson.title}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}

          {/* Image */}
          {lesson.image_url && !lesson.video_url && (
            <div className="mb-10">
              <img src={lesson.image_url} alt={lesson.title} className="w-full object-cover max-h-[500px]" />
            </div>
          )}

          {/* Content */}
          <div className="space-y-6 mb-12">
            {lesson.content.split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-sm md:text-base text-foreground/85 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{paragraph}</p>
            ))}
          </div>

          {/* Mark complete */}
          {user && (
            <div className="border-t border-border pt-8 mb-12">
              <Button
                onClick={toggleComplete}
                variant={completed ? "default" : "outline"}
                className={`text-xs tracking-[0.1em] uppercase ${completed ? "bg-primary text-primary-foreground" : ""}`}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {completed ? <CheckCircle className="h-4 w-4 mr-2" /> : <Circle className="h-4 w-4 mr-2" />}
                {completed ? "Completed" : "Mark as Complete"}
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-border pt-8">
            {prevLesson ? (
              <button onClick={() => navigate(`/courses/${slug}/lessons/${prevLesson.id}`)} className="flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: "var(--font-heading)" }}>
                <ArrowLeft className="h-3.5 w-3.5" /> Previous
              </button>
            ) : <div />}
            {nextLesson ? (
              <button onClick={() => navigate(`/courses/${slug}/lessons/${nextLesson.id}`)} className="flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: "var(--font-heading)" }}>
                Next <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <Link to={`/courses/${slug}`} className="text-xs tracking-[0.15em] uppercase text-primary hover:opacity-80 transition-opacity" style={{ fontFamily: "var(--font-heading)" }}>
                Back to Course
              </Link>
            )}
          </div>

          {/* Sidebar lessons list */}
          <div className="mt-12 border border-border">
            <div className="p-4 border-b border-border">
              <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>All Lessons</span>
            </div>
            {allLessons.map((l, i) => (
              <button
                key={l.id}
                onClick={() => navigate(`/courses/${slug}/lessons/${l.id}`)}
                className={`w-full flex items-center gap-3 p-4 text-left text-sm border-b border-border last:border-b-0 transition-colors ${l.id === lesson.id ? "bg-muted/50 text-primary" : "hover:bg-muted/30"}`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                <span className="text-[10px] text-muted-foreground w-5 text-center" style={{ fontFamily: "var(--font-heading)" }}>{String(i + 1).padStart(2, "0")}</span>
                {l.title}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default LessonView;
