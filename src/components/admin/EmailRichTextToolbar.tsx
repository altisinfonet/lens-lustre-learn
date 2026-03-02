import { Bold, Italic, Underline, Strikethrough, Link, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Type, Heading1, Heading2, Heading3, Palette, Undo, Redo, RemoveFormatting } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface Props {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onInput: () => void;
}

const btnClass =
  "p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors";
const activeClass = "text-primary bg-primary/10";
const sepClass = "w-px h-5 bg-border mx-0.5";

export default function EmailRichTextToolbar({ editorRef, onInput }: Props) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const savedSelection = useRef<Range | null>(null);

  const exec = useCallback(
    (cmd: string, value?: string) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, value);
      onInput();
    },
    [editorRef, onInput]
  );

  const handleLink = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
    }
    setShowLinkInput(true);
    setLinkUrl("https://");
  };

  const applyLink = () => {
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelection.current);
    }
    if (linkUrl.trim()) {
      document.execCommand("createLink", false, linkUrl.trim());
    }
    setShowLinkInput(false);
    setLinkUrl("");
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
    <div className="border border-border rounded-t-sm bg-card/60 px-2 py-1.5 flex flex-wrap items-center gap-0.5">
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
    </div>
  );
}
