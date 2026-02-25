import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Trophy, BookOpen, Newspaper, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  title: string;
  type: "competition" | "course" | "article";
  url: string;
  subtitle?: string;
}

const typeConfig = {
  competition: { icon: Trophy, label: "Competition", color: "text-primary" },
  course: { icon: BookOpen, label: "Course", color: "text-accent" },
  article: { icon: Newspaper, label: "Journal", color: "text-secondary-foreground" },
};

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const searchTerm = `%${q.trim()}%`;

    const [comps, courses, articles] = await Promise.all([
      supabase
        .from("competitions")
        .select("id, title, category, status")
        .ilike("title", searchTerm)
        .limit(5),
      supabase
        .from("courses")
        .select("id, title, slug, category, difficulty")
        .eq("status", "published")
        .ilike("title", searchTerm)
        .limit(5),
      supabase
        .from("journal_articles")
        .select("id, title, slug, excerpt")
        .eq("status", "published")
        .ilike("title", searchTerm)
        .limit(5),
    ]);

    const mapped: SearchResult[] = [
      ...(comps.data || []).map((c) => ({
        id: c.id,
        title: c.title,
        type: "competition" as const,
        url: `/competitions/${c.id}`,
        subtitle: `${c.category} · ${c.status}`,
      })),
      ...(courses.data || []).map((c) => ({
        id: c.id,
        title: c.title,
        type: "course" as const,
        url: `/courses/${c.slug}`,
        subtitle: `${c.category} · ${c.difficulty}`,
      })),
      ...(articles.data || []).map((a) => ({
        id: a.id,
        title: a.title,
        type: "article" as const,
        url: `/journal/${a.slug}`,
        subtitle: a.excerpt?.slice(0, 60) || undefined,
      })),
    ];

    setResults(mapped);
    setSelectedIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 300);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    navigate(result.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-500"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline text-[10px] tracking-[0.15em] uppercase border border-border px-2 py-0.5 rounded text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          ⌘K
        </span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setQuery(""); setResults([]); } }}>
        <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden border-border bg-background/95 backdrop-blur-xl [&>button]:hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search competitions, courses, articles…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              style={{ fontFamily: "var(--font-body)" }}
            />
            {query && (
              <button onClick={() => { setQuery(""); setResults([]); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="px-5 py-8 text-center">
                <span className="text-xs text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>Searching…</span>
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  No results found for "<span className="text-foreground">{query}</span>"
                </p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <ul className="py-2">
                {results.map((result, index) => {
                  const config = typeConfig[result.type];
                  const Icon = config.icon;
                  // Highlight matched text
                  const highlightTitle = (title: string) => {
                    const q = query.trim();
                    if (!q) return title;
                    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
                    const parts = title.split(regex);
                    return parts.map((part, i) =>
                      regex.test(part) ? <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">{part}</mark> : part
                    );
                  };
                  return (
                    <li key={`${result.type}-${result.id}`}>
                      <button
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full flex items-start gap-4 px-5 py-3 text-left transition-colors duration-200 ${
                          index === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className={`mt-0.5 ${config.color}`}>
                          <Icon className="h-4 w-4" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-light truncate" style={{ fontFamily: "var(--font-heading)" }}>
                            {highlightTitle(result.title)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                              {config.label}
                            </span>
                            {result.subtitle && (
                              <>
                                <span className="text-muted-foreground/30">·</span>
                                <span className="text-[10px] text-muted-foreground truncate" style={{ fontFamily: "var(--font-body)" }}>
                                  {result.subtitle}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {!loading && query.length < 2 && (
              <div className="px-5 py-8 text-center">
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  Type at least 2 characters to search
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-5 py-2.5 flex items-center gap-4 text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 border border-border rounded text-[9px]">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 border border-border rounded text-[9px]">↵</kbd> Select</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 border border-border rounded text-[9px]">Esc</kbd> Close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSearch;
