import { useCallback, useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, Check, RotateCcw, Crop as CropIcon } from "lucide-react";

interface Props {
  /** Object URL or data URL of the image to crop */
  imageSrc: string;
  /** Called with the cropped File when user confirms */
  onCropComplete: (croppedFile: File) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

const ASPECT_OPTIONS = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
];

export default function ImageCropModal({ imageSrc, onCropComplete, onCancel }: Props) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(() => {
    // Set a default crop centered at 80%
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const size = Math.min(width, height) * 0.8;
      const x = (width - size) / 2;
      const y = (height - size) / 2;
      const defaultCrop: Crop = {
        unit: "px",
        x,
        y,
        width: aspect ? size : size,
        height: aspect ? size / aspect : size,
      };
      setCrop(defaultCrop);
    }
  }, [aspect]);

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) {
      // No crop selected — use original
      const resp = await fetch(imageSrc);
      const blob = await resp.blob();
      onCropComplete(new File([blob], `cropped-${Date.now()}.png`, { type: blob.type }));
      return;
    }

    setProcessing(true);
    try {
      const canvas = document.createElement("canvas");
      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      ctx.drawImage(
        img,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
          "image/png",
          0.92
        );
      });

      onCropComplete(new File([blob], `cropped-${Date.now()}.png`, { type: "image/png" }));
    } catch {
      // Fallback: use original
      const resp = await fetch(imageSrc);
      const blob = await resp.blob();
      onCropComplete(new File([blob], `cropped-${Date.now()}.png`, { type: blob.type }));
    }
    setProcessing(false);
  };

  const resetCrop = () => {
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-sm shadow-2xl max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden w-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
          <div className="flex items-center gap-2">
            <CropIcon className="h-4 w-4 text-primary" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Crop Image
            </span>
          </div>
          <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Aspect ratio selector */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-muted/20">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground mr-2" style={{ fontFamily: "var(--font-heading)" }}>
            Aspect:
          </span>
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                setAspect(opt.value);
                setCrop(undefined);
                setCompletedCrop(undefined);
              }}
              className={`text-[9px] px-2 py-1 rounded-sm border transition-colors ${
                aspect === opt.value
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={resetCrop}
            className="ml-auto text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        {/* Crop area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/10 min-h-[300px]">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            className="max-h-[60vh]"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-h-[60vh] max-w-full object-contain"
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/50">
          <span className="text-[9px] text-muted-foreground">
            {completedCrop
              ? `${Math.round(completedCrop.width)} × ${Math.round(completedCrop.height)}px selected`
              : "Drag to select crop area, or insert as-is"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-[10px] tracking-[0.15em] uppercase px-4 py-2 border border-border text-muted-foreground hover:text-foreground transition-colors rounded-sm"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={processing}
              className="text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity rounded-sm disabled:opacity-50 flex items-center gap-1.5"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {processing ? (
                <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              {processing ? "Processing…" : "Crop & Insert"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
