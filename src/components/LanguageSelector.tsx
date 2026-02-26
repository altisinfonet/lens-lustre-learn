import { useLanguage, SUPPORTED_LANGUAGES } from "@/hooks/useLanguage";
import { Languages } from "lucide-react";

interface Props {
  compact?: boolean;
  className?: string;
}

const LanguageSelector = ({ compact = false, className = "" }: Props) => {
  const { language, setLanguage, isTranslating } = useLanguage();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {!compact && <Languages className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="bg-transparent border border-border rounded px-2 py-1 text-xs tracking-[0.1em] uppercase text-foreground focus:border-primary outline-none cursor-pointer appearance-none pr-6"
        style={{ fontFamily: "var(--font-heading)" }}
        disabled={isTranslating}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang} className="bg-background text-foreground">
            {lang}
          </option>
        ))}
      </select>
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="h-3 w-3 text-muted-foreground" viewBox="0 0 12 12" fill="none">
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

export default LanguageSelector;
