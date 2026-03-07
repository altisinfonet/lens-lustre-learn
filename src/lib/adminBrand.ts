import { supabase } from "@/integrations/supabase/client";

export const BRAND_NAME = "50mm Retina World";

// Cache admin IDs in memory for the session
let adminIdsCache: Set<string> | null = null;
let cachePromise: Promise<Set<string>> | null = null;

/**
 * Fetch and cache admin user IDs. Uses a singleton promise to avoid duplicate requests.
 */
export async function getAdminIds(): Promise<Set<string>> {
  if (adminIdsCache) return adminIdsCache;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const ids = new Set((data || []).map((r) => r.user_id));
    adminIdsCache = ids;
    return ids;
  })();

  return cachePromise;
}

/**
 * Returns brand name if the user is an admin, otherwise the original name.
 */
export function resolveName(
  userId: string,
  originalName: string | null,
  adminIds: Set<string>
): string {
  if (adminIds.has(userId)) return BRAND_NAME;
  return originalName || "Photographer";
}

/**
 * Ensures admin users always have a "verified" badge in their badge list.
 */
export function resolveBadges(
  userId: string,
  originalBadges: string[],
  adminIds: Set<string>
): string[] {
  if (adminIds.has(userId)) {
    return originalBadges.includes("verified") ? originalBadges : ["verified", ...originalBadges];
  }
  return originalBadges;
}

/**
 * Check if a single user ID is admin (uses cached set).
 */
export function isAdminUser(userId: string, adminIds: Set<string>): boolean {
  return adminIds.has(userId);
}
