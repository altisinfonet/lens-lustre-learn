import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MenuItem {
  id: string;
  label: string;
  /** Internal path like /competitions, or external URL */
  path: string;
  /** lucide icon name */
  icon: string;
  /** Description shown in mega menu */
  description: string;
  /** "system" = built-in route, "managed" = from page management, "external" = custom URL */
  type: "system" | "managed" | "external";
  /** Parent menu item id, null = top-level */
  parent_id: string | null;
  /** Sort position */
  sort_order: number;
  /** Visibility: "all" | "guest" | "authenticated" | "admin" */
  visibility: "all" | "guest" | "authenticated" | "admin";
  /** SEO overrides for system pages */
  meta_title: string;
  meta_description: string;
  og_image: string;
  noindex: boolean;
  /** Whether to show in nav */
  show_in_nav: boolean;
  /** Open in new tab (for external links) */
  open_new_tab: boolean;
}

export interface MenuTree extends MenuItem {
  children: MenuTree[];
}

/** Default system pages */
export const SYSTEM_PAGES: Omit<MenuItem, "id" | "sort_order">[] = [
  { label: "Home", path: "/", icon: "Home", description: "Landing page", type: "system", parent_id: null, visibility: "all", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: false, open_new_tab: false },
  { label: "Competitions", path: "/competitions", icon: "Trophy", description: "Photography competitions", type: "system", parent_id: null, visibility: "all", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: true, open_new_tab: false },
  { label: "Journal", path: "/journal", icon: "Newspaper", description: "Photography journal & articles", type: "system", parent_id: null, visibility: "all", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: true, open_new_tab: false },
  { label: "Courses", path: "/courses", icon: "BookOpen", description: "Learn photography skills", type: "system", parent_id: null, visibility: "all", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: true, open_new_tab: false },
  { label: "Winners", path: "/winners", icon: "Award", description: "Competition winners showcase", type: "system", parent_id: null, visibility: "all", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: true, open_new_tab: false },
  { label: "Certificates", path: "/certificates", icon: "FileCheck", description: "Verify & view certificates", type: "system", parent_id: null, visibility: "all", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: false, open_new_tab: false },
  { label: "Discover", path: "/discover", icon: "Compass", description: "Discover photographers & portfolios", type: "system", parent_id: null, visibility: "all", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: false, open_new_tab: false },
  { label: "Feed", path: "/feed", icon: "Rss", description: "Community news feed", type: "system", parent_id: null, visibility: "authenticated", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: false, open_new_tab: false },
  { label: "Friends", path: "/friends", icon: "Users", description: "Friends & network", type: "system", parent_id: null, visibility: "authenticated", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: false, open_new_tab: false },
  { label: "Referrals", path: "/referrals", icon: "UserPlus", description: "Referral program", type: "system", parent_id: null, visibility: "authenticated", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: false, open_new_tab: false },
  { label: "Help & Support", path: "/help-support", icon: "HelpCircle", description: "Get help & support", type: "system", parent_id: null, visibility: "all", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: false, open_new_tab: false },
  { label: "Login", path: "/login", icon: "LogIn", description: "Sign in to your account", type: "system", parent_id: null, visibility: "guest", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: false, open_new_tab: false },
  { label: "Sign Up", path: "/signup", icon: "UserPlus", description: "Create an account", type: "system", parent_id: null, visibility: "guest", meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: false, open_new_tab: false },
];

/** Build tree structure from flat list */
export function buildMenuTree(items: MenuItem[]): MenuTree[] {
  const map = new Map<string, MenuTree>();
  const roots: MenuTree[] = [];

  // Create tree nodes
  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  // Build hierarchy
  items.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort
  const sortFn = (a: MenuTree, b: MenuTree) => a.sort_order - b.sort_order;
  roots.sort(sortFn);
  roots.forEach((r) => r.children.sort(sortFn));

  return roots;
}

export function useNavigationMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMenu = useCallback(async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "navigation_menu")
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      setMenuItems(data.value as unknown as MenuItem[]);
    } else {
      // Initialize with system pages
      const initial: MenuItem[] = SYSTEM_PAGES.map((sp, i) => ({
        ...sp,
        id: crypto.randomUUID(),
        sort_order: i,
      }));
      setMenuItems(initial);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const saveMenu = useCallback(async (items: MenuItem[], userId?: string) => {
    const { error } = await supabase.from("site_settings").upsert({
      key: "navigation_menu",
      value: items as any,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    });
    if (!error) setMenuItems(items);
    return error;
  }, []);

  const menuTree = buildMenuTree(menuItems);

  return { menuItems, menuTree, loading, saveMenu, refetch: fetchMenu };
}
