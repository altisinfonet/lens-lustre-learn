import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

type ActionCategory = "auth" | "navigation" | "content" | "social" | "competition" | "course" | "admin";

interface LogPayload {
  action_type: string;
  action_category: ActionCategory;
  description?: string;
  metadata?: Record<string, unknown>;
  page_path?: string;
}

/** Fire-and-forget activity logger */
export const logActivity = async (userId: string, payload: LogPayload) => {
  try {
    await (supabase.from("activity_logs" as any).insert({
      user_id: userId,
      action_type: payload.action_type,
      action_category: payload.action_category,
      description: payload.description || null,
      metadata: payload.metadata || {},
      page_path: payload.page_path || window.location.pathname,
      user_agent: navigator.userAgent,
    } as any) as any);
  } catch {
    // Silent fail – logging should never break UX
  }
};

/** Hook that auto-logs page views and provides a log function */
export const useActivityLog = () => {
  const { user } = useAuth();
  const location = useLocation();
  const prevPath = useRef<string>("");

  const log = useCallback(
    (payload: Omit<LogPayload, "page_path">) => {
      if (!user) return;
      logActivity(user.id, { ...payload, page_path: window.location.pathname });
    },
    [user]
  );

  // Auto-log page views (navigation)
  useEffect(() => {
    if (!user) return;
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;

    logActivity(user.id, {
      action_type: "page_view",
      action_category: "navigation",
      description: `Visited ${location.pathname}`,
      page_path: location.pathname,
    });
  }, [user, location.pathname]);

  return { log };
};

/** Log auth events from outside React (called in AuthProvider) */
export const logAuthEvent = (userId: string, event: string) => {
  logActivity(userId, {
    action_type: event,
    action_category: "auth",
    description: `Auth event: ${event}`,
  });
};
