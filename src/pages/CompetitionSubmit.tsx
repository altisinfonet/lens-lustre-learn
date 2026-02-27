import { Link, useParams, useNavigate } from "react-router-dom";
import { Upload, X, Loader2, ImagePlus, Camera } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import T from "@/components/T";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/hooks/use-toast";
import { compressImageToFiles } from "@/lib/imageCompression";

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
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<{ url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("competitions")
        .select("title, max_photos_per_entry, status, entry_fee")
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
      }
      setLoading(false);
    };
    fetch();
  }, [id, navigate]);

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
        const baseName = crypto.randomUUID();
        const { webpFile, jpegFile } = await compressImageToFiles(file, baseName);
        const webpPath = `${user.id}/${id}/${baseName}.webp`;
        const jpegPath = `${user.id}/${id}/${baseName}.jpg`;

        const [webpRes, _jpegRes] = await Promise.all([
          supabase.storage.from("competition-photos").upload(webpPath, webpFile),
          supabase.storage.from("competition-photos").upload(jpegPath, jpegFile),
        ]);
        if (webpRes.error) {
          toast({ title: `Upload failed: ${file.name}`, description: webpRes.error.message, variant: "destructive" });
          continue;
        }
        const { data: urlData } = supabase.storage.from("competition-photos").getPublicUrl(webpPath);
        setPhotos((prev) => [...prev, { url: urlData.publicUrl, path: webpPath }]);
      } catch (err: any) {
        toast({ title: `Compression failed: ${file.name}`, variant: "destructive" });
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = async (index: number) => {
    const photo = photos[index];
    await supabase.storage.from("competition-photos").remove([photo.path]);
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

    if (entryFee > 0) {
      if (balance < entryFee) {
        toast({ title: "Insufficient wallet balance", description: `You need $${entryFee} but have $${Number(balance).toFixed(2)}. Add funds to your wallet first.`, variant: "destructive" });
        return;
      }
      try {
        await deductFunds(entryFee, "competition_fee", `Entry fee for "${compTitle}"`, id, "competition");
      } catch (err: any) {
        toast({ title: "Payment failed", description: err.message, variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    const { error } = await supabase.from("competition_entries").insert({
      competition_id: id,
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      photos: photos.map((p) => p.url),
    });
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

          {/* Photos */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4" style={{ fontFamily: "var(--font-heading)" }}>
              <T>Photos</T> * ({photos.length}/{maxPhotos})
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square overflow-hidden border border-border group">
                  <img src={photo.url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
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
              <T>Max 10MB per photo. JPG, PNG, or WebP.</T>
            </p>
          </div>

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
              disabled={submitting || photos.length === 0 || (entryFee > 0 && balance < entryFee)}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {entryFee > 0 ? <T>{`Pay $${entryFee} & Submit`}</T> : <T>Submit Entry</T>}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default CompetitionSubmit;
