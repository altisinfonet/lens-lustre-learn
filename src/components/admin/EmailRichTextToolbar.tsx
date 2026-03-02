import {
  Bold, Italic, Underline, Strikethrough, Link, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Type, Heading1, Heading2, Heading3,
  Palette, Undo, Redo, RemoveFormatting, ImagePlus, Link2, Minus,
  Table, Maximize2, Minimize2, Upload
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onInput: () => void;
}

const btnClass =
  "p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors";
const activeClass = "text-primary bg-primary/10";
const sepClass = "w-px h-5 bg-border mx-0.5";
const popoverClass =
  "absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-sm shadow-lg p-3 min-w-[280px]";

export default function EmailRichTextToolbar({ editorRef, onInput }: Props) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageWidth, setImageWidth] = useState("100");
  const [imageAlign, setImageAlign] = useState<"left" | "center" | "right">("center");
  const [uploading, setUploading] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableRows, setTableRows] = useState("2");
  const [tableCols, setTableCols] = useState("2");
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const savedSelection = useRef<Range | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exec = useCallback(
    (cmd: string, value?: string) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, value);
      onInput();
    },
    [editorRef, onInput]
  );

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelection.current);
    }
  };

  // ---------- Link ----------
  const handleLink = () => {
    saveSelection();
    setShowLinkInput(true);
    setShowImageMenu(false);
    setShowTableMenu(false);
    setLinkUrl("https://");
  };

  const applyLink = () => {
    restoreSelection();
    if (linkUrl.trim()) {
      document.execCommand("createLink", false, linkUrl.trim());
    }
    setShowLinkInput(false);
    setLinkUrl("");
    onInput();
  };

  // ---------- Image Upload ----------
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Only images allowed", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Max 5MB for email images", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const baseName = `email-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const ext = file.name.split(".").pop() || "png";
      const path = `email-templates/${baseName}.${ext}`;
      const { error } = await supabase.storage.from("journal-images").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data } = supabase.storage.from("journal-images").getPublicUrl(path);
      insertImageHtml(data.publicUrl);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
  };

  const insertImageHtml = (url: string) => {
    const widthPct = Math.min(100, Math.max(10, parseInt(imageWidth) || 100));
    const alignStyle =
      imageAlign === "center"
        ? "display:block;margin:0 auto;"
        : imageAlign === "right"
        ? "display:block;margin-left:auto;"
        : "";

    const imgTag = `<img src="${url}" alt="Email image" style="max-width:${widthPct}%;height:auto;border-radius:4px;${alignStyle}" />`;

    restoreSelection();
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, imgTag);
    onInput();
    setShowImageMenu(false);
    setImageUrl("");
  };

  const handleImageMenuOpen = () => {
    saveSelection();
    setShowImageMenu(true);
    setShowLinkInput(false);
    setShowTableMenu(false);
  };

  // ---------- Image Resize (selected image) ----------
  const checkSelectedImage = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const node = sel.anchorNode;
      const el =
        node instanceof HTMLImageElement
          ? node
          : node?.parentElement?.querySelector?.("img:focus, img[data-selected]") ?? null;
      if (el instanceof HTMLImageElement) {
        setSelectedImage(el);
        return;
      }
    }
    setSelectedImage(null);
  };

  const resizeSelectedImage = (delta: number) => {
    if (!selectedImage) return;
    const current = parseInt(selectedImage.style.maxWidth || "100");
    const next = Math.min(100, Math.max(10, current + delta));
    selectedImage.style.maxWidth = `${next}%`;
    onInput();
  };

  // ---------- Table ----------
  const handleTableMenuOpen = () => {
    saveSelection();
    setShowTableMenu(true);
    setShowImageMenu(false);
    setShowLinkInput(false);
  };

  const insertTable = () => {
    const rows = Math.min(10, Math.max(1, parseInt(tableRows) || 2));
    const cols = Math.min(6, Math.max(1, parseInt(tableCols) || 2));
    let html = '<table style="width:100%;border-collapse:collapse;margin:12px 0;" border="1" cellpadding="8">';
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        const tag = r === 0 ? "th" : "td";
        const style = r === 0 ? 'style="background:#f4f4f5;font-weight:600;text-align:left;border:1px solid #e4e4e7;padding:8px"' : 'style="border:1px solid #e4e4e7;padding:8px"';
        html += `<${tag} ${style}>${r === 0 ? `Header ${c + 1}` : ""}</${tag}>`;
      }
      html += "</tr>";
    }
    html += "</table><p></p>";

    restoreSelection();
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    onInput();
    setShowTableMenu(false);
  };

  // ---------- Horizontal Rule ----------
  const insertHr = () => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, '<hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0" />');
    onInput();
  };

  const setFontSize = (size: string) => {
    editorRef.current?.focus();
    document.execCommand("fontSize", false, size);
    onInput();
  };

  const setColor = (color: string) => {
    editorRef.current?.focus();
    document.execCommand("foreColor", false, color);
    onInput();
  };

  return (
    <div
      className="border border-border rounded-t-sm bg-card/60 px-2 py-1.5 flex flex-wrap items-center gap-0.5 relative"
      onClick={checkSelectedImage}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload(f);
          e.target.value = "";
        }}
      />

      {/* Undo / Redo */}
      <button type="button" className={btnClass} onClick={() => exec("undo")} title="Undo"><Undo className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("redo")} title="Redo"><Redo className="h-3.5 w-3.5" /></button>
      <div className={sepClass} />

      {/* Headings */}
      <button type="button" className={btnClass} onClick={() => exec("formatBlock", "h1")} title="Heading 1"><Heading1 className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("formatBlock", "h2")} title="Heading 2"><Heading2 className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("formatBlock", "h3")} title="Heading 3"><Heading3 className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("formatBlock", "p")} title="Paragraph"><Type className="h-3.5 w-3.5" /></button>
      <div className={sepClass} />

      {/* Inline */}
      <button type="button" className={btnClass} onClick={() => exec("bold")} title="Bold"><Bold className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("italic")} title="Italic"><Italic className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("underline")} title="Underline"><Underline className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("strikeThrough")} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></button>
      <div className={sepClass} />

      {/* Lists */}
      <button type="button" className={btnClass} onClick={() => exec("insertUnorderedList")} title="Bullet List"><List className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("insertOrderedList")} title="Numbered List"><ListOrdered className="h-3.5 w-3.5" /></button>
      <div className={sepClass} />

      {/* Alignment */}
      <button type="button" className={btnClass} onClick={() => exec("justifyLeft")} title="Align Left"><AlignLeft className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("justifyCenter")} title="Align Center"><AlignCenter className="h-3.5 w-3.5" /></button>
      <button type="button" className={btnClass} onClick={() => exec("justifyRight")} title="Align Right"><AlignRight className="h-3.5 w-3.5" /></button>
      <div className={sepClass} />

      {/* Link */}
      <button type="button" className={btnClass} onClick={handleLink} title="Insert Link"><Link className="h-3.5 w-3.5" /></button>

      {/* Image */}
      <button type="button" className={`${btnClass} ${showImageMenu ? activeClass : ""}`} onClick={handleImageMenuOpen} title="Insert Image">
        <ImagePlus className="h-3.5 w-3.5" />
      </button>

      {/* Table */}
      <button type="button" className={`${btnClass} ${showTableMenu ? activeClass : ""}`} onClick={handleTableMenuOpen} title="Insert Table">
        <Table className="h-3.5 w-3.5" />
      </button>

      {/* Horizontal Rule */}
      <button type="button" className={btnClass} onClick={insertHr} title="Horizontal Line">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <div className={sepClass} />

      {/* Font size */}
      <select
        className="bg-background border border-border text-[10px] px-1.5 py-1 rounded-sm text-muted-foreground hover:text-foreground"
        onChange={e => { if (e.target.value) setFontSize(e.target.value); e.target.value = ""; }}
        defaultValue=""
      >
        <option value="" disabled>Size</option>
        <option value="1">Small</option>
        <option value="3">Normal</option>
        <option value="5">Large</option>
        <option value="7">Huge</option>
      </select>

      {/* Text color */}
      <label className={btnClass + " relative cursor-pointer"} title="Text Color">
        <Palette className="h-3.5 w-3.5" />
        <input
          type="color"
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          onChange={e => setColor(e.target.value)}
          defaultValue="#333333"
        />
      </label>

      {/* Clear formatting */}
      <button type="button" className={btnClass} onClick={() => exec("removeFormat")} title="Clear Formatting"><RemoveFormatting className="h-3.5 w-3.5" /></button>

      {/* Selected image resize controls */}
      {selectedImage && (
        <>
          <div className={sepClass} />
          <button type="button" className={btnClass} onClick={() => resizeSelectedImage(-10)} title="Shrink Image">
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={btnClass} onClick={() => resizeSelectedImage(10)} title="Enlarge Image">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <span className="text-[9px] text-muted-foreground font-mono">{selectedImage.style.maxWidth || "100%"}</span>
        </>
      )}

      {/* Link input popover */}
      {showLinkInput && (
        <div className="flex items-center gap-1.5 ml-2 border border-border rounded-sm px-2 py-1 bg-background">
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applyLink()}
            className="text-xs bg-transparent border-none outline-none w-40"
            placeholder="https://..."
            autoFocus
          />
          <button type="button" onClick={applyLink} className="text-[9px] uppercase tracking-wider text-primary hover:underline">Apply</button>
          <button type="button" onClick={() => setShowLinkInput(false)} className="text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}

      {/* Image popover */}
      {showImageMenu && (
        <div className={popoverClass}>
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            Insert Image
          </p>

          {/* Upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center gap-2 px-3 py-2.5 border border-dashed border-border rounded-sm text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors mb-3"
          >
            {uploading ? (
              <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? "Uploading…" : "Upload from device"}
          </button>

          {/* URL */}
          <div className="flex items-center gap-1.5 mb-3">
            <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="flex-1 text-xs bg-background border border-border rounded-sm px-2 py-1.5 focus:outline-none focus:border-primary"
              placeholder="Or paste image URL…"
            />
          </div>

          {/* Size & Alignment */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">Width %</label>
              <input
                type="number"
                min="10"
                max="100"
                value={imageWidth}
                onChange={e => setImageWidth(e.target.value)}
                className="w-full text-xs bg-background border border-border rounded-sm px-2 py-1.5 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">Align</label>
              <select
                value={imageAlign}
                onChange={e => setImageAlign(e.target.value as any)}
                className="w-full text-xs bg-background border border-border rounded-sm px-2 py-1.5"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (imageUrl.trim()) insertImageHtml(imageUrl.trim());
              }}
              disabled={!imageUrl.trim()}
              className="text-[9px] uppercase tracking-wider px-3 py-1.5 bg-primary text-primary-foreground rounded-sm disabled:opacity-40"
            >
              Insert URL
            </button>
            <button
              type="button"
              onClick={() => setShowImageMenu(false)}
              className="text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table popover */}
      {showTableMenu && (
        <div className={popoverClass} style={{ minWidth: 220 }}>
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            Insert Table
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">Rows</label>
              <input
                type="number" min="1" max="10"
                value={tableRows}
                onChange={e => setTableRows(e.target.value)}
                className="w-full text-xs bg-background border border-border rounded-sm px-2 py-1.5 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">Columns</label>
              <input
                type="number" min="1" max="6"
                value={tableCols}
                onChange={e => setTableCols(e.target.value)}
                className="w-full text-xs bg-background border border-border rounded-sm px-2 py-1.5 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={insertTable} className="text-[9px] uppercase tracking-wider px-3 py-1.5 bg-primary text-primary-foreground rounded-sm">
              Insert
            </button>
            <button type="button" onClick={() => setShowTableMenu(false)} className="text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground px-3 py-1.5">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
