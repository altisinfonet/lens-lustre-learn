import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Save, Eye, Plus, Trash2, GripVertical, Upload, X } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { compressImageToFiles } from "@/lib/imageCompression";
import { scanFileWithToast } from "@/lib/fileSecurityScanner";
import { toast } from "@/hooks/use-toast";


interface LessonDraft {
  id?: string;
  title: string;
  content: string;
  video_url: string;
  image_url: string;
  sort_order: number;
}

const CourseEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [price, setPrice] = useState("0");
  const [isFree, setIsFree] = useState(true);
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [lessons, setLessons] = useState<LessonDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [courseId, setCourseId] = useState<string | null>(id === "new" ? null : id || null);

  useEffect(() => {
    const check = async () => {
      if (!user) { setCheckingAccess(false); return; }
      if (isAdmin) { setCanAccess(true); setCheckingAccess(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "content_editor").maybeSingle();
      setCanAccess(!!data);
      setCheckingAccess(false);
    };
    check();
  }, [user, isAdmin]);

  useEffect(() => {
    if (isNew || !user) return;
    const load = async () => {
      const { data: course } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
      if (course) {
        setTitle(course.title);
        setDescription(course.description || "");
        setCategory(course.category);
        setDifficulty(course.difficulty);
        setPrice(String(course.price || 0));
        setIsFree(course.is_free);
        setCoverUrl(course.cover_image_url || "");
        setStatus(course.status as any);
        setCourseId(course.id);
      }
      const { data: lessonData } = await supabase.from("lessons").select("*").eq("course_id", id!).order("sort_order");
      if (lessonData) {
        setLessons(lessonData.map((l) => ({
          id: l.id,
          title: l.title,
          content: l.content,
          video_url: l.video_url || "",
          image_url: l.image_url || "",
          sort_order: l.sort_order,
        })));
      }
    };
    load();
  }, [id, isNew, user]);

  if (checkingAccess) return <main className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground text-sm">Loading…</p></main>;
  if (!canAccess) return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">You don't have permission to create courses.</p>
      <Link to="/courses" className="text-primary text-sm underline">Back to Courses</Link>
    </main>
  );

  const generateSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + "-" + Date.now().toString(36);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const safe = await scanFileWithToast(file, toast, { allowedTypes: "image" });
      if (!safe) return null;
      const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { webpFile, jpegFile } = await compressImageToFiles(file, baseName);
      const webpPath = `covers/${baseName}.webp`;
      const jpegPath = `covers/${baseName}.jpg`;
      const [webpRes] = await Promise.all([
        supabase.storage.from("course-images").upload(webpPath, webpFile),
        supabase.storage.from("course-images").upload(jpegPath, jpegFile),
      ]);
      if (webpRes.error) { toast({ title: "Upload failed", description: webpRes.error.message, variant: "destructive" }); return null; }
      return supabase.storage.from("course-images").getPublicUrl(webpPath).data.publicUrl;
    } catch (err: any) {
      toast({ title: "Compression failed", variant: "destructive" }); return null;
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) { toast({ title: "Only images allowed", variant: "destructive" }); return; }
    setUploading(true);
    const url = await uploadImage(file);
    if (url) setCoverUrl(url);
    setUploading(false);
  };

  const addLesson = () => {
    setLessons((prev) => [...prev, { title: "", content: "", video_url: "", image_url: "", sort_order: prev.length }]);
  };

  const updateLesson = (index: number, field: keyof LessonDraft, value: string | number) => {
    setLessons((prev) => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const removeLesson = (index: number) => {
    setLessons((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, sort_order: i })));
  };

  const handleSave = async (publishStatus: "draft" | "published") => {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!user) return;

    setSaving(true);
    const coursePayload = {
      title: title.trim().slice(0, 200),
      slug: isNew ? generateSlug(title) : undefined,
      description: description.trim() || null,
      cover_image_url: coverUrl || null,
      category,
      difficulty,
      price: parseFloat(price) || 0,
      is_free: isFree,
      status: publishStatus,
      published_at: publishStatus === "published" ? new Date().toISOString() : null,
      author_id: user.id,
    };

    let savedCourseId = courseId;
    if (isNew) {
      const { data, error } = await supabase.from("courses").insert(coursePayload).select("id").single();
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
      savedCourseId = data.id;
      setCourseId(data.id);
    } else {
      const { slug: _, ...updatePayload } = coursePayload;
      const { error } = await supabase.from("courses").update(updatePayload).eq("id", courseId!);
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }

    // Save lessons
    for (const [i, lesson] of lessons.entries()) {
      const lessonPayload = {
        course_id: savedCourseId!,
        title: lesson.title.trim() || `Lesson ${i + 1}`,
        content: lesson.content,
        video_url: lesson.video_url || null,
        image_url: lesson.image_url || null,
        sort_order: i,
      };
      if (lesson.id) {
        await supabase.from("lessons").update(lessonPayload).eq("id", lesson.id);
      } else {
        const { data } = await supabase.from("lessons").insert(lessonPayload).select("id").single();
        if (data) lesson.id = data.id;
      }
    }

    toast({ title: publishStatus === "published" ? "Course published!" : "Draft saved" });
    navigate("/courses");
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Breadcrumbs items={[{ label: "Courses", to: "/courses" }, { label: courseId ? "Edit Course" : "New Course" }]} />
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={saving} className="text-xs tracking-[0.1em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> Save Draft
            </Button>
            <Button size="sm" onClick={() => handleSave("published")} disabled={saving} className="text-xs tracking-[0.1em] uppercase bg-primary text-primary-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Publish
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 max-w-3xl py-10 md:py-16 space-y-8">
        {/* Cover */}
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Cover Image</label>
          {coverUrl ? (
            <div className="relative group">
              <img src={coverUrl} alt="Cover" className="w-full h-48 object-cover" />
              <button onClick={() => setCoverUrl("")} className="absolute top-2 right-2 p-1.5 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center h-48 border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-6 w-6" />
                <span className="text-xs" style={{ fontFamily: "var(--font-heading)" }}>{uploading ? "Uploading…" : "Upload cover image"}</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploading} />
            </label>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title…" className="text-2xl font-light bg-transparent border-none px-0 focus-visible:ring-0" style={{ fontFamily: "var(--font-display)" }} maxLength={200} />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will students learn?" className="bg-transparent min-h-[120px]" />
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Category</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} className="bg-transparent" />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-transparent border-b border-border py-2 text-sm outline-none" style={{ fontFamily: "var(--font-body)" }}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Pricing</label>
            <select value={isFree ? "free" : "paid"} onChange={(e) => setIsFree(e.target.value === "free")} className="w-full bg-transparent border-b border-border py-2 text-sm outline-none" style={{ fontFamily: "var(--font-body)" }}>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          {!isFree && (
            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2" style={{ fontFamily: "var(--font-heading)" }}>Price ($)</label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-transparent" />
            </div>
          )}
        </div>

        {/* Lessons */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>Lessons ({lessons.length})</label>
            <button onClick={addLesson} className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-primary hover:opacity-80 transition-opacity" style={{ fontFamily: "var(--font-heading)" }}>
              <Plus className="h-3.5 w-3.5" /> Add Lesson
            </button>
          </div>

          <div className="space-y-4">
            {lessons.map((lesson, i) => (
              <div key={i} className="border border-border p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                    <span className="text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Lesson {i + 1}</span>
                  </div>
                  <button onClick={() => removeLesson(i)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <Input value={lesson.title} onChange={(e) => updateLesson(i, "title", e.target.value)} placeholder="Lesson title" className="bg-transparent" maxLength={200} />
                <Textarea value={lesson.content} onChange={(e) => updateLesson(i, "content", e.target.value)} placeholder="Lesson content… Use double line breaks for paragraphs." className="bg-transparent min-h-[150px]" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>Video URL</label>
                    <Input value={lesson.video_url} onChange={(e) => updateLesson(i, "video_url", e.target.value)} placeholder="https://youtube.com/embed/..." className="bg-transparent text-xs" />
                  </div>
                  <div>
                    <label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>Image URL</label>
                    <Input value={lesson.image_url} onChange={(e) => updateLesson(i, "image_url", e.target.value)} placeholder="https://..." className="bg-transparent text-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {lessons.length === 0 && (
            <div className="border-2 border-dashed border-border p-10 text-center">
              <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>No lessons yet. Add your first lesson to get started.</p>
              <button onClick={addLesson} className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                <Plus className="h-3.5 w-3.5" /> Add Lesson
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default CourseEditor;
