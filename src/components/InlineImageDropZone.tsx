import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  onImageInserted: (url: string) => void;
}

const InlineImageDropZone = ({ onImageInserted }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const uploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Only images allowed", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `inline/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("journal-images").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("journal-images").getPublicUrl(path);
    onImageInserted(data.publicUrl);
    setUploading(false);
    setExpanded(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 py-1.5 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors group"
        title="Insert image here"
      >
        <div className="flex-1 h-px bg-border/50 group-hover:bg-border transition-colors" />
        <Plus className="h-3.5 w-3.5" />
        <span className="text-[9px] tracking-[0.15em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
          Image
        </span>
        <div className="flex-1 h-px bg-border/50 group-hover:bg-border transition-colors" />
      </button>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors ${
        isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {uploading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Uploading…</span>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center gap-2">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Drop image here or click to upload
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </label>
      )}
      <button
        onClick={() => setExpanded(false)}
        className="mt-2 text-[9px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        Cancel
      </button>
    </div>
  );
};

export default InlineImageDropZone;
