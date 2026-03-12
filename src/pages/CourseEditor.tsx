import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Save, Eye, Plus, Trash2, GripVertical, Upload, X, XCircle,
  Loader2, Image as ImageIcon, ZoomIn, ZoomOut, Move, RotateCcw,
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { storageUpload } from "@/lib/storageUpload";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImageToFiles } from "@/lib/imageCompression";
import { scanFileWithToast } from "@/lib/fileSecurityScanner";
import { toast } from "@/hooks/use-toast";
import EmailRichTextToolbar from "@/components/admin/EmailRichTextToolbar";
import ImageCropModal from "@/components/admin/ImageCropModal";

const labelClass = "block text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5";
const inputClass = "w-full h-9 border border-input bg-background px-3 text-sm rounded-sm focus:ring-1 focus:ring-ring";

// ========== Image Viewer with Zoom/Pan ==========
function ImageViewer({ src, label, onUpload, onRemove, uploading }: {
  src: string;
  label: string;
  onUpload: () => void;
  onRemove: () => void;
  uploading: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  };
  const handleMouseUp = () => setDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(4, Math.max(0.25, z + delta)));
  };

  return (
    <div className="space-y-2">
      <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>{label}</label>
      {src ? (
        <div className="border border-border rounded-sm overflow-hidden">
          <div
            className="relative h-48 bg-muted/20 overflow-hidden select-none"
            style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <img
              src={src}
              alt={label}
              className="absolute top-1/2 left-1/2 max-w-none transition-transform duration-100"
              style={{
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                maxHeight: "100%",
                maxWidth: "100%",
                objectFit: "contain",
              }}
              draggable={false}
            />
          </div>
          <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border bg-card/50">
            <button type="button" onClick={handleZoomOut} className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" title="Zoom Out">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[9px] text-muted-foreground w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={handleZoomIn} className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" title="Zoom In">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            {zoom > 1 && (
              <span className="text-[8px] text-muted-foreground/50 flex items-center gap-0.5 ml-1">
                <Move className="h-2.5 w-2.5" /> drag to pan
              </span>
            )}
            <button type="button" onClick={handleReset} className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors ml-auto" title="Reset View">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={onUpload} disabled={uploading} className="p-1 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Replace Image">
              <Upload className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={onRemove} className="p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Remove Image">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onUpload}
          disabled={uploading}
          className="w-full h-32 border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          {uploading ? (
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <ImageIcon className="h-6 w-6" />
          )}
          <span className="text-[9px] tracking-[0.15em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
            {uploading ? "Uploading…" : "Click to upload"}
          </span>
        </button>
      )}
    </div>
  );
}

// ========== Live Preview ==========
function LivePreview({ title, description, coverUrl, category, difficulty, isFree, price, lessons }: {
  title: string;
  description: string;
  coverUrl: string;
  category: string;
  difficulty: string;
  isFree: boolean;
  price: string;
  lessons: LessonDraft[];
}) {
  return (
    <div className="border border-border rounded-sm overflow-hidden bg-background">
      <div className="px-3 py-2 border-b border-border bg-card/50">
        <span className="text-[9px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
          Live Preview
        </span>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {coverUrl && (
          <div className="relative h-40 overflow-hidden">
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          </div>
        )}
        <div className="p-5 space-y-4">
          {/* Meta badges */}
          <div className="flex flex-wrap gap-2">
            <span className="text-[9px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              {category}
            </span>
            <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              · {difficulty}
            </span>
            <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              · {isFree ? "Free" : `$${price}`}
            </span>
          </div>

          <h2 className="text-2xl font-light tracking-tight leading-tight" style={{ fontFamily: "var(--font-display)" }}>
            {title || "Untitled Course"}
          </h2>

          {description && (
            <div
              className="prose-sm max-w-none text-foreground/85"
              style={{ fontFamily: "var(--font-body)" }}
              dangerouslySetInnerHTML={{ __html: description || '<p class="text-muted-foreground text-xs">Description will appear here…</p>' }}
            />
          )}

          {/* Lessons preview */}
          {lessons.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-[9px] tracking-[0.2em] uppercase text-primary block" style={{ fontFamily: "var(--font-heading)" }}>
                {lessons.length} Lesson{lessons.length !== 1 ? "s" : ""}
              </span>
              {lessons.map((l, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5">
                  <span className="text-[10px] text-primary font-mono mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ fontFamily: "var(--font-body)" }}>{l.title || `Lesson ${i + 1}`}</p>
                    {l.content && (
                      <div
                        className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2"
                        style={{ fontFamily: "var(--font-body)" }}
                        dangerouslySetInnerHTML={{ __html: l.content.slice(0, 200) }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [canAccess, setCanAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [courseId, setCourseId] = useState<string | null>(id === "new" ? null : id || null);
  const [showPreview, setShowPreview] = useState(true);

  // Rich text editor for description
  const descEditorRef = useRef<HTMLDivElement>(null);
  const [descEditorMode, setDescEditorMode] = useState<"visual" | "html">("visual");

  // Lesson editor tracking
  const [activeLessonEditor, setActiveLessonEditor] = useState<number | null>(null);
  const lessonEditorRef = useRef<HTMLDivElement>(null);
  const [lessonEditorMode, setLessonEditorMode] = useState<"visual" | "html">("visual");

  // Image upload
  const coverInputRef = useRef<HTMLInputElement>(null);
  const lessonImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLessonImage, setUploadingLessonImage] = useState<number | null>(null);

  // Crop modal
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<{ type: "cover" } | { type: "lesson"; index: number }>({ type: "cover" });

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

  // Sync description editor
  useEffect(() => {
    if (descEditorMode === "visual" && descEditorRef.current) {
      descEditorRef.current.innerHTML = description;
    }
  }, [descEditorMode]);

  // Sync lesson editor
  useEffect(() => {
    if (activeLessonEditor !== null && lessonEditorMode === "visual" && lessonEditorRef.current) {
      lessonEditorRef.current.innerHTML = lessons[activeLessonEditor]?.content || "";
    }
  }, [activeLessonEditor, lessonEditorMode]);

  if (checkingAccess) return <main className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground text-sm">Loading…</p></main>;
  if (!canAccess) return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">You don't have permission to create courses.</p>
      <Link to="/courses" className="text-primary text-sm underline">Back to Courses</Link>
    </main>
  );

  const generateSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + "-" + Date.now().toString(36);

  // ========== Image Upload ==========
  const handleFileSelect = (file: File, target: { type: "cover" } | { type: "lesson"; index: number }) => {
    if (!file.type.startsWith("image/")) { toast({ title: "Only images allowed", variant: "destructive" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: "Max 10MB", variant: "destructive" }); return; }
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropTarget(target);
  };

  const handleCropComplete = async (croppedFile: File) => {
    setCropSrc(null);
    const isLesson = cropTarget.type === "lesson";
    const lessonIdx = isLesson ? (cropTarget as any).index : -1;

    if (isLesson) setUploadingLessonImage(lessonIdx); else setUploadingCover(true);

    try {
      const safe = await scanFileWithToast(croppedFile, toast, { allowedTypes: "image" });
      if (!safe) {
        if (isLesson) setUploadingLessonImage(null); else setUploadingCover(false);
        return;
      }
      const baseName = `course-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { webpFile } = await compressImageToFiles(croppedFile, baseName);
      const path = `courses/${baseName}.webp`;
      const result = await storageUpload("course-images", path, webpFile, { fileName: `${baseName}.webp` });

      if (isLesson) {
        updateLesson(lessonIdx, "image_url", result.url);
      } else {
        setCoverUrl(result.url);
      }
      toast({ title: "Image uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    if (isLesson) setUploadingLessonImage(null); else setUploadingCover(false);
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleDescEditorInput = () => {
    if (descEditorRef.current) {
      setDescription(descEditorRef.current.innerHTML);
    }
  };

  const handleLessonEditorInput = () => {
    if (lessonEditorRef.current && activeLessonEditor !== null) {
      updateLesson(activeLessonEditor, "content", lessonEditorRef.current.innerHTML);
    }
  };

  const addLesson = () => {
    setLessons((prev) => [...prev, { title: "", content: "", video_url: "", image_url: "", sort_order: prev.length }]);
  };

  const updateLesson = (index: number, field: keyof LessonDraft, value: string | number) => {
    setLessons((prev) => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const removeLesson = (index: number) => {
    if (activeLessonEditor === index) setActiveLessonEditor(null);
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
      {/* Hidden file inputs */}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, { type: "cover" }); e.target.value = ""; }} />
      <input ref={lessonImageInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f && activeLessonEditor !== null) handleFileSelect(f, { type: "lesson", index: activeLessonEditor });
          e.target.value = "";
        }} />

      {/* Top bar */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Breadcrumbs items={[{ label: "Courses", to: "/courses" }, { label: courseId ? "Edit Course" : "New Course" }]} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border rounded-sm transition-colors ${
                showPreview ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <Eye className="h-3 w-3 inline mr-1" /> Preview
            </button>
            <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={saving} className="text-xs tracking-[0.1em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> Save Draft
            </Button>
            <Button size="sm" onClick={() => handleSave("published")} disabled={saving} className="text-xs tracking-[0.1em] uppercase bg-primary text-primary-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Publish
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-10 md:py-16">
        <div className={`grid ${showPreview ? "lg:grid-cols-2" : ""} gap-8`}>
          {/* ===== Editor Column ===== */}
          <div className="space-y-6">
            {/* Cover Image */}
            <ImageViewer
              src={coverUrl}
              label="Cover Image"
              onUpload={() => coverInputRef.current?.click()}
              onRemove={() => setCoverUrl("")}
              uploading={uploadingCover}
            />

            {/* Title */}
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title…" className="text-2xl font-light bg-transparent border-none px-0 focus-visible:ring-0" style={{ fontFamily: "var(--font-display)" }} maxLength={200} />
            </div>

            {/* Description - Rich Text Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Description</label>
                <button
                  type="button"
                  onClick={() => {
                    if (descEditorMode === "visual" && descEditorRef.current) {
                      setDescription(descEditorRef.current.innerHTML);
                    }
                    setDescEditorMode(descEditorMode === "visual" ? "html" : "visual");
                  }}
                  className={`text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 border rounded-sm transition-colors ${
                    descEditorMode === "html" ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {descEditorMode === "visual" ? "HTML" : "Visual"}
                </button>
              </div>
              {descEditorMode === "visual" ? (
                <div>
                  <EmailRichTextToolbar editorRef={descEditorRef} onInput={handleDescEditorInput} />
                  <div
                    ref={descEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleDescEditorInput}
                    className="min-h-[150px] border border-border border-t-0 rounded-b-sm bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring prose-sm max-w-none"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
              ) : (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  className="w-full border border-input bg-background px-3 py-2 text-sm rounded-sm focus:ring-1 focus:ring-ring font-mono"
                  placeholder="<p>Write your HTML content here...</p>"
                />
              )}
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Category</label>
                <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-transparent border-b border-border py-2 text-sm outline-none" style={{ fontFamily: "var(--font-body)" }}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Pricing</label>
                <select value={isFree ? "free" : "paid"} onChange={(e) => setIsFree(e.target.value === "free")} className="w-full bg-transparent border-b border-border py-2 text-sm outline-none" style={{ fontFamily: "var(--font-body)" }}>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              {!isFree && (
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Price ($)</label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
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
                  <div key={i} className="border border-border p-5 space-y-4 rounded-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                        <span className="text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Lesson {i + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (activeLessonEditor === i) {
                              setActiveLessonEditor(null);
                            } else {
                              setActiveLessonEditor(i);
                              setLessonEditorMode("visual");
                            }
                          }}
                          className={`text-[9px] tracking-[0.15em] uppercase px-2 py-1 border rounded-sm transition-colors ${
                            activeLessonEditor === i ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {activeLessonEditor === i ? "Collapse" : "Expand Editor"}
                        </button>
                        <button onClick={() => removeLesson(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>

                    <Input value={lesson.title} onChange={(e) => updateLesson(i, "title", e.target.value)} placeholder="Lesson title" className="bg-transparent" maxLength={200} />

                    {/* Lesson Image */}
                    <ImageViewer
                      src={lesson.image_url}
                      label="Lesson Image"
                      onUpload={() => { setActiveLessonEditor(i); lessonImageInputRef.current?.click(); }}
                      onRemove={() => updateLesson(i, "image_url", "")}
                      uploading={uploadingLessonImage === i}
                    />

                    {/* Lesson Content - Rich Text Editor */}
                    {activeLessonEditor === i ? (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={labelClass} style={{ fontFamily: "var(--font-heading)" }}>Lesson Content</label>
                          <button
                            type="button"
                            onClick={() => {
                              if (lessonEditorMode === "visual" && lessonEditorRef.current) {
                                updateLesson(i, "content", lessonEditorRef.current.innerHTML);
                              }
                              setLessonEditorMode(lessonEditorMode === "visual" ? "html" : "visual");
                            }}
                            className={`text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 border rounded-sm transition-colors ${
                              lessonEditorMode === "html" ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {lessonEditorMode === "visual" ? "HTML" : "Visual"}
                          </button>
                        </div>
                        {lessonEditorMode === "visual" ? (
                          <div>
                            <EmailRichTextToolbar editorRef={lessonEditorRef} onInput={handleLessonEditorInput} />
                            <div
                              ref={lessonEditorRef}
                              contentEditable
                              suppressContentEditableWarning
                              onInput={handleLessonEditorInput}
                              className="min-h-[200px] border border-border border-t-0 rounded-b-sm bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring prose-sm max-w-none"
                              style={{ fontFamily: "var(--font-body)" }}
                            />
                          </div>
                        ) : (
                          <textarea
                            value={lesson.content}
                            onChange={(e) => updateLesson(i, "content", e.target.value)}
                            rows={10}
                            className="w-full border border-input bg-background px-3 py-2 text-sm rounded-sm focus:ring-1 focus:ring-ring font-mono"
                            placeholder="<p>Write HTML content here...</p>"
                          />
                        )}
                      </div>
                    ) : (
                      <div
                        className="text-xs text-muted-foreground border border-border rounded-sm p-3 cursor-pointer hover:border-primary/30 transition-colors min-h-[60px]"
                        onClick={() => { setActiveLessonEditor(i); setLessonEditorMode("visual"); }}
                        dangerouslySetInnerHTML={{ __html: lesson.content || '<span class="italic">Click to edit content…</span>' }}
                      />
                    )}

                    {/* Video URL */}
                    <div>
                      <label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground block mb-1" style={{ fontFamily: "var(--font-heading)" }}>Video URL</label>
                      <Input value={lesson.video_url} onChange={(e) => updateLesson(i, "video_url", e.target.value)} placeholder="https://youtube.com/embed/..." className="bg-transparent text-xs" />
                    </div>
                  </div>
                ))}
              </div>

              {lessons.length === 0 && (
                <div className="border-2 border-dashed border-border p-10 text-center rounded-sm">
                  <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>No lessons yet. Add your first lesson to get started.</p>
                  <button onClick={addLesson} className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                    <Plus className="h-3.5 w-3.5" /> Add Lesson
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ===== Preview Column ===== */}
          {showPreview && (
            <div className="sticky top-24 self-start">
              <LivePreview
                title={title}
                description={description}
                coverUrl={coverUrl}
                category={category}
                difficulty={difficulty}
                isFree={isFree}
                price={price}
                lessons={lessons}
              />
            </div>
          )}
        </div>
      </div>

      {/* Crop Modal */}
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </main>
  );
};

export default CourseEditor;
