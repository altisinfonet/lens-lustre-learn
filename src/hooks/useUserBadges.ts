import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches badges for a set of user IDs in one query.
 * Returns a Map<userId, badgeType[]>.
 */
export const useUserBadgesBatch = (userIds: string[]) => {
  const [badgeMap, setBadgeMap] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    if (userIds.length === 0) {
      setBadgeMap(new Map());
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("user_id, badge_type")
        .in("user_id", userIds);

      const map = new Map<string, string[]>();
      (data as any[] || []).forEach((b) => {
        const existing = map.get(b.user_id) || [];
        existing.push(b.badge_type);
        map.set(b.user_id, existing);
      });
      setBadgeMap(map);
    };
    fetch();
  }, [userIds.join(",")]);

  return badgeMap;
};

/**
 * Fetches badges for a single user.
 */
export const useUserBadges = (userId: string | undefined) => {
  const [badges, setBadges] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("badge_type")
        .eq("user_id", userId);
      setBadges((data as any[] || []).map((b) => b.badge_type));
    };
    fetch();
  }, [userId]);

  return badges;
};
