import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const SUPPORTED_LANGUAGES = [
  "English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Urdu",
  "Kannada", "Malayalam", "Punjabi", "Odia", "Assamese",
  "Spanish", "French", "German", "Portuguese", "Italian", "Dutch", "Russian",
  "Arabic", "Chinese", "Japanese", "Korean", "Thai", "Vietnamese", "Indonesian",
  "Turkish", "Polish", "Swedish", "Norwegian", "Danish", "Finnish",
  "Czech", "Romanian", "Hungarian", "Greek", "Hebrew", "Persian",
  "Swahili", "Filipino", "Malay", "Nepali", "Sinhala", "Burmese", "Khmer", "Lao",
];

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: (text: string) => string;
  translateBatch: (texts: string[]) => Promise<string[]>;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "English",
  setLanguage: async () => {},
  t: (text) => text,
  translateBatch: async (texts) => texts,
  isTranslating: false,
});

// In-memory + localStorage cache keyed by `lang:text`
const translationCache = new Map<string, string>();

function loadCacheFromStorage() {
  try {
    const stored = localStorage.getItem("translation_cache");
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string>;
      Object.entries(parsed).forEach(([k, v]) => translationCache.set(k, v));
    }
  } catch { /* ignore */ }
}

function saveCacheToStorage() {
  try {
    const obj: Record<string, string> = {};
    // Only persist last 500 entries
    const entries = Array.from(translationCache.entries()).slice(-500);
    entries.forEach(([k, v]) => { obj[k] = v; });
    localStorage.setItem("translation_cache", JSON.stringify(obj));
  } catch { /* ignore */ }
}

loadCacheFromStorage();

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [language, setLanguageState] = useState("English");
  const [isTranslating, setIsTranslating] = useState(false);
  const [pendingTexts, setPendingTexts] = useState<Set<string>>(new Set());

  // Load user's preferred language
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Check localStorage for guest language
      const stored = localStorage.getItem("preferred_language");
      if (stored) setLanguageState(stored);
      return;
    }
    supabase
      .from("profiles")
      .select("preferred_language")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if ((data as any)?.preferred_language) {
          setLanguageState((data as any).preferred_language);
          localStorage.setItem("preferred_language", (data as any).preferred_language);
        }
      });
  }, [user, authLoading]);

  const translateBatch = useCallback(async (texts: string[]): Promise<string[]> => {
    if (language === "English") return texts;

    const uncached = texts.filter((t) => !translationCache.has(`${language}:${t}`));
    if (uncached.length > 0) {
      setIsTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke("translate", {
          body: { texts: uncached, targetLanguage: language },
        });
        if (!error && data?.translations) {
          uncached.forEach((t, i) => {
            if (data.translations[i]) {
              translationCache.set(`${language}:${t}`, data.translations[i]);
            }
          });
          saveCacheToStorage();
        }
      } catch (e) {
        console.error("Translation error:", e);
      }
      setIsTranslating(false);
    }

    return texts.map((t) => translationCache.get(`${language}:${t}`) || t);
  }, [language]);

  const t = useCallback((text: string): string => {
    if (language === "English" || !text) return text;
    const cached = translationCache.get(`${language}:${text}`);
    if (cached) return cached;

    // Queue for translation if not already pending
    if (!pendingTexts.has(text)) {
      setPendingTexts((prev) => {
        const next = new Set(prev);
        next.add(text);
        return next;
      });
    }
    return text; // Return original while translation is pending
  }, [language, pendingTexts]);

  // Batch translate pending texts
  useEffect(() => {
    if (pendingTexts.size === 0 || language === "English") return;
    const timeout = setTimeout(async () => {
      const batch = Array.from(pendingTexts);
      setPendingTexts(new Set());
      await translateBatch(batch);
      // Force re-render by updating a version
      setLanguageState((prev) => prev); // trigger re-render
    }, 100); // debounce 100ms
    return () => clearTimeout(timeout);
  }, [pendingTexts, language, translateBatch]);

  const setLanguage = useCallback(async (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem("preferred_language", lang);

    if (user) {
      await supabase
        .from("profiles")
        .update({ preferred_language: lang } as any)
        .eq("id", user.id);
    }
  }, [user]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateBatch, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
