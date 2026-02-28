import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

interface Announcement {
  id: string;
  message: string;
  link_url: string;
  link_text: string;
  bg_color: string;
  text_color: string;
  is_active: boolean;
  is_dismissible: boolean;
  priority: number;
  starts_at: string;
  expires_at: string;
}

const AnnouncementBar = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("dismissed-announcements");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "announcements")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          const now = new Date();
          const active = (data.value as unknown as Announcement[])
            .filter((a) => {
              if (!a.is_active) return false;
              if (a.starts_at && new Date(a.starts_at) > now) return false;
              if (a.expires_at && new Date(a.expires_at) < now) return false;
              return true;
            })
            .sort((a, b) => a.priority - b.priority);
          setAnnouncements(active);
        }
      });
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissed-announcements", JSON.stringify([...next]));
  };

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="w-full z-50">
      {visible.map((a) => (
        <div
          key={a.id}
          className="relative flex items-center justify-center gap-3 px-4 py-2 text-sm text-center"
          style={{ backgroundColor: a.bg_color, color: a.text_color }}
        >
          <span>{a.message}</span>
          {a.link_url && (
            a.link_url.startsWith("/") ? (
              <Link to={a.link_url} className="underline font-medium whitespace-nowrap" style={{ color: a.text_color }}>
                {a.link_text || "Learn More"}
              </Link>
            ) : (
              <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="underline font-medium whitespace-nowrap" style={{ color: a.text_color }}>
                {a.link_text || "Learn More"}
              </a>
            )
          )}
          {a.is_dismissible && (
            <button
              onClick={() => dismiss(a.id)}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" style={{ color: a.text_color }} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default AnnouncementBar;
