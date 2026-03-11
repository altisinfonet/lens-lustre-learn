import { Link, useParams, useNavigate } from "react-router-dom";
import { Upload, X, Loader2, ImagePlus, Camera, AlertTriangle, ShieldCheck, ScanEye } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import T from "@/components/T";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { storageUploadImagePair, storageRemove } from "@/lib/storageUpload";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/hooks/use-toast";
import { compressImageToFiles } from "@/lib/imageCompression";
import { scanFileWithToast } from "@/lib/fileSecurityScanner";

interface PhotoEntry {
  url: string;
  path: string;
  aiDetection: { is_likely_ai: boolean; confidence: number; reasons: string[]; summary: string } | null;
  detecting: boolean;
}

interface ExifData {
  camera_make: string;
  camera_model: string;
  lens: string;
  focal_length: string;
  aperture: string;
  shutter_speed: string;
  iso: string;
  date_taken: string;
}

const emptyExif: ExifData = {
  camera_make: "", camera_model: "", lens: "", focal_length: "",
  aperture: "", shutter_speed: "", iso: "", date_taken: "",
};

const CompetitionSubmit = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { hasRole, loading: rolesLoading } = useUserRoles();
  const { balance, deductFunds, loading: walletLoading, toINR } = useWallet();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [compTitle, setCompTitle] = useState("");
  const [maxPhotos, setMaxPhotos] = useState(5);
  const [entryFee, setEntryFee] = useState(0);
  const [aiImagesAllowed, setAiImagesAllowed] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [userOverrideOriginal, setUserOverrideOriginal] = useState(false);
  const [exifData, setExifData] = useState<ExifData>(emptyExif);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Derived: any photo flagged as AI by detection
  const aiDetectedPhotos = photos.filter((p) => p.aiDetection?.is_likely_ai);
  const anyDetecting = photos.some((p) => p.detecting);
  const hasAiWarning = aiDetectedPhotos.length > 0;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!id) return;
    const fetchComp = async () => {
      const { data } = await supabase
        .from("competitions")
        .select("title, max_photos_per_entry, status, entry_fee, ai_images_allowed")
        .eq("id", id)
        .single();
      if (data) {
        if (data.status !== "open") {
          toast({ title: "Competition is not open for submissions", variant: "destructive" });
          navigate(`/competitions/${id}`);
          return;
        }
        setCompTitle(data.title);
        setMaxPhotos(data.max_photos_per_entry || 5);
        setEntryFee((data as any).entry_fee || 0);
        setAiImagesAllowed((data as any).ai_images_allowed !== false);
      }
      setLoading(false);
    };
    fetchComp();
  }, [id, navigate]);

  const detectAiImage = async (imageUrl: string, photoIndex: number) => {
    setPhotos((prev) =>
      prev.map((p, i) => (i === photoIndex ? { ...p, detecting: true } : p))
    );
    try {
      const { data, error } = await supabase.functions.invoke("detect-ai-image", {
        body: { image_url: imageUrl },
      });
      if (error) {
        console.error("AI detection failed:", error);
        setPhotos((prev) =>
          prev.map((p, i) => (i === photoIndex ? { ...p, detecting: false } : p))
        );
        return;
      }
      setPhotos((prev) =>
        prev.map((p, i) =>
          i === photoIndex
            ? { ...p, detecting: false, aiDetection: data }
            : p
        )
      );

      if (data?.is_likely_ai) {
        toast({
          title: "⚠️ AI-generated image detected",
          description: `Photo ${photoIndex + 1}: ${data.summary}`,
          variant: "destructive",
        });
      }
    } catch {
      setPhotos((prev) =>
        prev.map((p, i) => (i === photoIndex ? { ...p, detecting: false } : p))
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user || !id) return;

    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      toast({ title: `Maximum ${maxPhotos} photos allowed`, variant: "destructive" });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    for (const file of filesToUpload) {
      if (!file.type.startsWith("image/")) continue;

      try {
        const safe = await scanFileWithToast(file, toast, { allowedTypes: "image" });
        if (!safe) continue;
        const baseName = crypto.randomUUID();
        const { webpFile, jpegFile } = await compressImageToFiles(file, baseName);
        const webpPath = `${user.id}/${id}/${baseName}.webp`;
        const jpegPath = `${user.id}/${id}/${baseName}.jpg`;

        const uploadResult = await storageUploadImagePair(
          "competition-photos", webpPath, jpegPath, webpFile, jpegFile
        );
        const newIndex = photos.length;
        setPhotos((prev) => [
          ...prev,
          { url: uploadResult.url, path: uploadResult.path, aiDetection: null, detecting: false },
        ]);
        // Trigger AI detection after upload
        detectAiImage(uploadResult.url, newIndex);
      } catch (err: any) {
        toast({ title: `Compression failed: ${file.name}`, variant: "destructive" });
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = async (index: number) => {
    const photo = photos[index];
    await storageRemove("competition-photos", [photo.path]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (photos.length === 0) {
      toast({ title: "Please upload at least one photo", variant: "destructive" });
      return;
    }
    if (anyDetecting) {
      toast({ title: "Please wait for AI detection to complete", variant: "destructive" });
      return;
    }

    const finalIsAi = isAiGenerated || (hasAiWarning && !userOverrideOriginal);

    if (!aiImagesAllowed && finalIsAi) {
      toast({ title: "AI-generated images are not allowed in this competition", variant: "destructive" });
      return;
    }

    // If user overrides AI detection and marks as original, EXIF is required
    if (hasAiWarning && userOverrideOriginal && !isAiGenerated) {
      if (!exifData.camera_make.trim() || !exifData.camera_model.trim()) {
        toast({
          title: "EXIF data required",
          description: "Since AI was detected but you marked as original, please fill in camera make and model at minimum.",
          variant: "destructive",
        });
        return;
      }
    }

    if (entryFee > 0) {
      if (balance < entryFee) {
        toast({ title: "Insufficient wallet balance", description: `You need $${entryFee} but have $${Number(balance).toFixed(2)}. Add funds to your wallet first.`, variant: "destructive" });
        return;
      }
      try {
        await deductFunds(entryFee, "competition_fee", `Entry fee for "${compTitle}"`, id, "competition");
        supabase.rpc("process_referral_reward" as any, { _referred_user_id: user.id, _activity_type: "competition entry", _txn_amount: entryFee }).then(() => {});
      } catch (err: any) {
        toast({ title: "Payment failed", description: err.message, variant: "destructive" });
        return;
      }
    }

    // Build AI detection results for storage
    const detectionResults = photos.map((p, i) => ({
      photo_index: i,
      url: p.url,
      detection: p.aiDetection,
    }));

    // Build exif payload
    const exifPayload = (hasAiWarning && userOverrideOriginal && !isAiGenerated)
      ? exifData
      : null;

    setSubmitting(true);
    const { error } = await supabase.from("competition_entries").insert({
      competition_id: id,
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      photos: photos.map((p) => p.url),
      is_ai_generated: finalIsAi,
      ai_detection_result: detectionResults,
      exif_data: exifPayload,
    } as any);
    setSubmitting(false);

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entry submitted! It will appear after review." });
      navigate(`/competitions/${id}`);
    }
  };

  if (authLoading || loading || rolesLoading || walletLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}><T>Loading...</T></div>
      </main>
    );
  }

  if (!hasRole("registered_photographer") && !hasRole("student") && !hasRole("admin")) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-6 md:px-12 py-12 md:py-20 max-w-2xl">
          <Breadcrumbs items={[{ label: "Competitions", to: "/competitions" }]} className="mb-10" />
          <div className="border border-border p-10 text-center">
            <Camera className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-light mb-3" style={{ fontFamily: "var(--font-display)" }}><T>Verified Members Only</T></h2>
            <p className="text-sm text-muted-foreground mb-6" style={{ fontFamily: "var(--font-body)" }}>
              <T>You need to be a Registered Photographer or Student to submit to competitions. Go to your dashboard to verify your profile with social media links, or enroll in a course.</T>
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <T>Go to Dashboard</T>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const finalIsAi = isAiGenerated || (hasAiWarning && !userOverrideOriginal);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20 max-w-2xl">
        <Breadcrumbs items={[{ label: "Competitions", to: "/competitions" }, { label: compTitle || "Competition", to: `/competitions/${id}` }, { label: "Submit" }]} className="mb-10" />

        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-px bg-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}><T>Submit Entry</T></span>
        </div>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-12" style={{ fontFamily: "var(--font-display)" }}>
          {compTitle}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Title */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}><T>Entry Title</T> *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              placeholder="Name your submission"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}><T>Description</T></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              className="w-full bg-transparent border border-border focus:border-primary outline-none p-4 text-sm transition-colors duration-500 resize-none"
              placeholder="Tell the story behind your photos..."
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>

          {/* Photos with AI Detection */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4" style={{ fontFamily: "var(--font-heading)" }}>
              <T>Photos</T> * ({photos.length}/{maxPhotos})
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square overflow-hidden border border-border group">
                  <img src={photo.url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                  {/* AI detection overlay */}
                  {photo.detecting && (
                    <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-1">
                      <ScanEye className="h-5 w-5 text-primary animate-pulse" />
                      <span className="text-[8px] tracking-[0.15em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Scanning...</span>
                    </div>
                  )}
                  {!photo.detecting && photo.aiDetection && (
                    <div className={`absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[8px] tracking-[0.1em] uppercase ${
                      photo.aiDetection.is_likely_ai
                        ? "bg-destructive/90 text-destructive-foreground"
                        : "bg-green-600/90 text-white"
                    }`} style={{ fontFamily: "var(--font-heading)" }}>
                      {photo.aiDetection.is_likely_ai
                        ? `⚠ AI Detected (${photo.aiDetection.confidence}%)`
                        : `✓ Likely Original (${100 - (photo.aiDetection.confidence || 0)}%)`}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-2 right-2 w-6 h-6 bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {photos.length < maxPhotos && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square border border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors duration-500 disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}><T>Add Photo</T></span>
                    </>
                  )}
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-[10px] text-muted-foreground mt-2" style={{ fontFamily: "var(--font-body)" }}>
              <T>Max 10MB per photo. JPG, PNG, or WebP. Each photo is auto-scanned for AI generation.</T>
            </p>
          </div>

          {/* AI Detection Warning Banner */}
          {hasAiWarning && (
            <div className="p-4 border-2 border-destructive/60 bg-destructive/5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-destructive block" style={{ fontFamily: "var(--font-heading)" }}>
                    <T>AI-Generated Image(s) Detected</T>
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <T>Our system has detected that {aiDetectedPhotos.length} of your photo(s) may be AI-generated. This information will be visible to judges.</T>
                  </p>
                  <ul className="mt-2 space-y-1">
                    {aiDetectedPhotos.map((p, i) => (
                      <li key={i} className="text-[10px] text-destructive" style={{ fontFamily: "var(--font-body)" }}>
                        • Photo {photos.indexOf(p) + 1}: {p.aiDetection?.summary}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Override option */}
              <div className="ml-8 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={userOverrideOriginal}
                    onChange={(e) => {
                      setUserOverrideOriginal(e.target.checked);
                      if (e.target.checked) setIsAiGenerated(false);
                    }}
                    className="h-4 w-4 accent-primary mt-0.5"
                    id="override-original"
                  />
                  <label htmlFor="override-original" className="cursor-pointer">
                    <span className="text-xs font-medium block" style={{ fontFamily: "var(--font-heading)" }}>
                      <ShieldCheck className="h-3.5 w-3.5 inline mr-1" />
                      <T>I confirm these are original camera/mobile captures</T>
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
                      <T>If you believe the detection is incorrect, you can override it. However, you MUST provide EXIF/camera data to verify authenticity. Judges will review this information.</T>
                    </p>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* EXIF Data Form - Required when overriding AI detection */}
          {hasAiWarning && userOverrideOriginal && !isAiGenerated && (
            <div className="p-5 border border-primary/30 bg-primary/5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Camera className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                  <T>EXIF / Camera Data</T> *
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                <T>Since EXIF data is lost during upload compression, please manually provide your camera details. This helps judges verify the photo is original. Camera Make and Model are required.</T>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>Camera Make *</label>
                  <input
                    type="text"
                    value={exifData.camera_make}
                    onChange={(e) => setExifData((d) => ({ ...d, camera_make: e.target.value }))}
                    placeholder="e.g. Canon, Nikon, Sony"
                    className="w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-xs transition-colors duration-500"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>Camera Model *</label>
                  <input
                    type="text"
                    value={exifData.camera_model}
                    onChange={(e) => setExifData((d) => ({ ...d, camera_model: e.target.value }))}
                    placeholder="e.g. EOS R5, Z9, A7IV"
                    className="w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-xs transition-colors duration-500"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>Lens</label>
                  <input
                    type="text"
                    value={exifData.lens}
                    onChange={(e) => setExifData((d) => ({ ...d, lens: e.target.value }))}
                    placeholder="e.g. 24-70mm f/2.8"
                    className="w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-xs transition-colors duration-500"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>Focal Length</label>
                  <input
                    type="text"
                    value={exifData.focal_length}
                    onChange={(e) => setExifData((d) => ({ ...d, focal_length: e.target.value }))}
                    placeholder="e.g. 50mm"
                    className="w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-xs transition-colors duration-500"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>Aperture</label>
                  <input
                    type="text"
                    value={exifData.aperture}
                    onChange={(e) => setExifData((d) => ({ ...d, aperture: e.target.value }))}
                    placeholder="e.g. f/2.8"
                    className="w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-xs transition-colors duration-500"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>Shutter Speed</label>
                  <input
                    type="text"
                    value={exifData.shutter_speed}
                    onChange={(e) => setExifData((d) => ({ ...d, shutter_speed: e.target.value }))}
                    placeholder="e.g. 1/250"
                    className="w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-xs transition-colors duration-500"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>ISO</label>
                  <input
                    type="text"
                    value={exifData.iso}
                    onChange={(e) => setExifData((d) => ({ ...d, iso: e.target.value }))}
                    placeholder="e.g. 400"
                    className="w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-xs transition-colors duration-500"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>Date Taken</label>
                  <input
                    type="date"
                    value={exifData.date_taken}
                    onChange={(e) => setExifData((d) => ({ ...d, date_taken: e.target.value }))}
                    className="w-full bg-transparent border border-border focus:border-primary outline-none px-3 py-2 text-xs transition-colors duration-500"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Manual AI Declaration (when no auto-detection warning) */}
          {!hasAiWarning && (
            <div className={`p-4 border space-y-3 ${!aiImagesAllowed ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-muted/20'}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isAiGenerated}
                  onChange={(e) => setIsAiGenerated(e.target.checked)}
                  className="h-4 w-4 accent-primary mt-0.5"
                  id="ai-declaration"
                />
                <label htmlFor="ai-declaration" className="cursor-pointer">
                  <span className="text-xs font-medium block" style={{ fontFamily: "var(--font-heading)" }}>
                    <T>This submission contains AI-generated image(s)</T>
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <T>Check this box if any of your photos were created or significantly modified using AI tools.</T>
                  </p>
                </label>
              </div>
              {!aiImagesAllowed && isAiGenerated && (
                <div className="text-[10px] text-destructive font-medium px-7" style={{ fontFamily: "var(--font-heading)" }}>
                  ⚠ <T>AI-generated images are NOT allowed in this competition.</T>
                </div>
              )}
            </div>
          )}

          {/* Entry Fee & Wallet Balance */}
          {entryFee > 0 && (
            <div className="p-4 border border-border bg-muted/30 space-y-2">
              <p className="text-xs" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Entry Fee:</T> <strong>${entryFee}</strong> (≈ ₹{toINR(entryFee).toLocaleString("en-IN", { minimumFractionDigits: 2 })})
              </p>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                <T>Wallet Balance:</T> ${Number(balance).toFixed(2)}
                {balance < entryFee && (
                  <> — <Link to="/wallet" className="text-primary underline"><T>Add funds</T></Link></>
                )}
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="pt-4 border-t border-border">
            <button
              type="submit"
              disabled={submitting || photos.length === 0 || anyDetecting || (entryFee > 0 && balance < entryFee) || (!aiImagesAllowed && finalIsAi)}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {entryFee > 0 ? <T>{`Pay $${entryFee} & Submit`}</T> : <T>Submit Entry</T>}
            </button>
            {anyDetecting && (
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1" style={{ fontFamily: "var(--font-body)" }}>
                <ScanEye className="h-3 w-3 animate-pulse" /> <T>AI scan in progress, please wait...</T>
              </p>
            )}
          </div>
        </form>
      </div>
    </main>
  );
};

export default CompetitionSubmit;
