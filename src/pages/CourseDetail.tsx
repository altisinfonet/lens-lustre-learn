import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, BookOpen, CheckCircle, Circle, DollarSign, GraduationCap, Lock, Play } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import GlobalSearch from "@/components/GlobalSearch";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

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
  author_id: string;
}

interface Lesson {
  id: string;
  title: string;
  sort_order: number;
}

const CourseDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [issuingCert, setIssuingCert] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (!courseData) { setLoading(false); return; }
      setCourse(courseData);

      const [{ data: lessonData }, { data: profile }] = await Promise.all([
        supabase.from("lessons").select("id, title, sort_order").eq("course_id", courseData.id).order("sort_order"),
        supabase.from("profiles").select("full_name").eq("id", courseData.author_id).maybeSingle(),
      ]);

      setLessons(lessonData || []);
      setAuthorName(profile?.full_name || null);

      if (user) {
        const [{ data: enrollment }, { data: progress }, { data: certData }] = await Promise.all([
          supabase.from("course_enrollments").select("id").eq("user_id", user.id).eq("course_id", courseData.id).maybeSingle(),
          supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id).eq("completed", true),
          supabase.from("certificates").select("id").eq("user_id", user.id).eq("reference_id", courseData.id).eq("type", "course_completion").maybeSingle(),
        ]);
        setEnrolled(!!enrollment);
        setHasCertificate(!!certData);
        const lessonIds = new Set((lessonData || []).map((l) => l.id));
        setCompletedLessons(new Set(progress?.filter((p) => lessonIds.has(p.lesson_id)).map((p) => p.lesson_id) || []));
      }
      setLoading(false);
    };
    fetch();
  }, [slug, user]);

  const handleEnroll = async () => {
    if (!user) { navigate("/login"); return; }
    if (!course) return;
    setEnrolling(true);
    const { error } = await supabase.from("course_enrollments").insert({ user_id: user.id, course_id: course.id });
    if (error) {
      toast({ title: "Enrollment failed", description: error.message, variant: "destructive" });
    } else {
      setEnrolled(true);
      toast({ title: "Enrolled successfully!" });
    }
    setEnrolling(false);
  };

  if (loading) {
    return <main className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground text-sm">Loading…</div></main>;
  }

  if (!course) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Course not found.</p>
        <Link to="/courses" className="text-primary text-sm underline">Back to Courses</Link>
      </main>
    );
  }

  const progressPercent = lessons.length > 0 ? Math.round((completedLessons.size / lessons.length) * 100) : 0;
  const courseComplete = progressPercent === 100 && lessons.length > 0;

  const handleClaimCertificate = async () => {
    if (!user || !course || !courseComplete || hasCertificate) return;
    setIssuingCert(true);
    const { error } = await supabase.from("certificates").insert({
      user_id: user.id,
      title: `${course.title} — Completion Certificate`,
      description: `Successfully completed all ${lessons.length} lessons in "${course.title}".`,
      type: "course_completion",
      reference_id: course.id,
    });
    if (error) {
      toast({ title: "Failed to issue certificate", description: error.message, variant: "destructive" });
    } else {
      setHasCertificate(true);
      toast({ title: "🎉 Certificate earned!", description: "View it in your certificates page." });
    }
    setIssuingCert(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <Breadcrumbs items={[{ label: "Courses", to: "/courses" }, { label: course.title }]} />
          <GlobalSearch />
        </div>
      </div>

      {course.cover_image_url && (
        <div className="relative h-[35vh] md:h-[45vh] overflow-hidden">
          <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
      )}

      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20">
        <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">
          {/* Main */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 border ${course.difficulty === "Beginner" ? "text-primary border-primary" : course.difficulty === "Intermediate" ? "text-yellow-500 border-yellow-500" : "text-accent border-accent"}`} style={{ fontFamily: "var(--font-heading)" }}>{course.difficulty}</span>
              <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>{course.category}</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-6 leading-[1.1]" style={{ fontFamily: "var(--font-display)" }}>{course.title}</h1>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-8" style={{ fontFamily: "var(--font-heading)" }}>
              <span className="tracking-[0.1em] uppercase">{authorName || "Unknown"}</span>
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{lessons.length} lessons</span>
              {course.is_free ? <span className="text-primary">Free</span> : <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{course.price}</span>}
            </div>

            {course.description && (
              <div className="border-t border-border pt-8 mb-12">
                <div className="space-y-4">
                  {course.description.split("\n\n").map((p, i) => (
                    <p key={i} className="text-sm text-foreground/85 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{p}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Lessons list */}
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-px bg-primary" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Curriculum</span>
              </div>

              <div className="border border-border divide-y divide-border">
                {lessons.map((lesson, i) => {
                  const completed = completedLessons.has(lesson.id);
                  const canAccess = enrolled || course.is_free;
                  return (
                    <div key={lesson.id} className={`flex items-center gap-4 p-5 ${canAccess ? "hover:bg-muted/30 cursor-pointer" : ""} transition-colors duration-300`}
                      onClick={() => canAccess && navigate(`/courses/${course.slug}/lessons/${lesson.id}`)}
                    >
                      <span className="text-[10px] text-muted-foreground w-6 text-center" style={{ fontFamily: "var(--font-heading)" }}>{String(i + 1).padStart(2, "0")}</span>
                      {completed ? (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      ) : canAccess ? (
                        <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                      )}
                      <span className="text-sm flex-1" style={{ fontFamily: "var(--font-body)" }}>{lesson.title}</span>
                      {canAccess && <Play className="h-3.5 w-3.5 text-muted-foreground/40" />}
                    </div>
                  );
                })}
                {lessons.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>No lessons yet</div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 1 }}>
            <div className="border border-border p-6 md:p-8 sticky top-8">
              {enrolled && lessons.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>Progress</span>
                    <span className="text-xs text-primary" style={{ fontFamily: "var(--font-heading)" }}>{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-2" style={{ fontFamily: "var(--font-body)" }}>
                    {completedLessons.size} of {lessons.length} lessons completed
                  </p>
                  {courseComplete && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2 text-primary">
                        <GraduationCap className="h-4 w-4" />
                        <span className="text-xs" style={{ fontFamily: "var(--font-heading)" }}>Course Complete!</span>
                      </div>
                      {hasCertificate ? (
                        <Link
                          to="/certificates"
                          className="flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-primary hover:opacity-80 transition-opacity"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          <Award className="h-3.5 w-3.5" /> View Certificate
                        </Link>
                      ) : (
                        <button
                          onClick={handleClaimCertificate}
                          disabled={issuingCert}
                          className="flex items-center gap-2 text-xs tracking-[0.1em] uppercase px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          <Award className="h-3.5 w-3.5" />
                          {issuingCert ? "Issuing…" : "Claim Certificate"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!course.is_free && (
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-light" style={{ fontFamily: "var(--font-display)" }}>${course.price}</span>
                  <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>one-time</span>
                </div>
              )}

              {!enrolled ? (
                <Button onClick={handleEnroll} disabled={enrolling} className="w-full bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase py-6" style={{ fontFamily: "var(--font-heading)" }}>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  {enrolling ? "Enrolling…" : course.is_free ? "Enroll for Free" : "Enroll Now"}
                </Button>
              ) : (
                <div className="text-center">
                  <span className="text-xs text-primary flex items-center justify-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                    <CheckCircle className="h-4 w-4" /> Enrolled
                  </span>
                  {lessons.length > 0 && (
                    <Button onClick={() => {
                      const nextLesson = lessons.find((l) => !completedLessons.has(l.id)) || lessons[0];
                      navigate(`/courses/${course.slug}/lessons/${nextLesson.id}`);
                    }} variant="outline" className="w-full mt-3 text-xs tracking-[0.15em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                      <Play className="h-3.5 w-3.5 mr-2" />
                      {completedLessons.size === 0 ? "Start Learning" : "Continue"}
                    </Button>
                  )}
                </div>
              )}

              <div className="mt-6 space-y-3 border-t border-border pt-6">
                <div className="flex justify-between text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  <span>Lessons</span><span>{lessons.length}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  <span>Difficulty</span><span>{course.difficulty}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  <span>Category</span><span>{course.category}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

export default CourseDetail;
