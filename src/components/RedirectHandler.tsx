import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  type: "301" | "302" | "404";
  is_active: boolean;
  hit_count: number;
}

/**
 * Checks URL redirects stored in site_settings and navigates accordingly.
 * Place inside <BrowserRouter> but outside <Routes>.
 */
const RedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [redirects, setRedirects] = useState<Redirect[] | null>(null);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "url_redirects")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          setRedirects(data.value as unknown as Redirect[]);
        } else {
          setRedirects([]);
        }
      });
  }, []);

  useEffect(() => {
    if (!redirects) return;
    const match = redirects.find((r) => r.is_active && r.from_path === location.pathname);
    if (!match) return;

    // Increment hit count in background
    const updated = redirects.map((r) =>
      r.id === match.id ? { ...r, hit_count: (r.hit_count || 0) + 1 } : r
    );
    supabase.from("site_settings").upsert({
      key: "url_redirects",
      value: updated as any,
      updated_at: new Date().toISOString(),
    });

    // Navigate
    navigate(match.to_path, { replace: true });
  }, [location.pathname, redirects, navigate]);

  return null;
};

export default RedirectHandler;
