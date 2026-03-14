import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import T from "@/components/T";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LogOut, Shield, Scale, Wallet, LayoutDashboard, User, ImageIcon,
  Users, MessageSquare, Compass, Rss, UserPlus, HelpCircle, Settings,
  Trophy, Edit2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserMenuProps {
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
}

interface MenuSection {
  title: string;
  items: { icon: React.ElementType; label: string; to: string; show: boolean; tooltip?: string; extra?: React.ReactNode }[];
}

const UserMenu = ({ onNavigate, variant = "desktop" }: UserMenuProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { hasRole } = useUserRoles();
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle().then(({ data }) => setWalletBalance(data?.balance ?? 0));
    }
    supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [user, isAdmin]);

  if (!user) return null;

  const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "U";
  const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const roleBadge = hasRole("admin") ? (
    <Badge variant="default" className="text-[9px] px-1.5 py-0">Admin</Badge>
  ) : hasRole("registered_photographer") ? (
    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Photographer</Badge>
  ) : hasRole("student") ? (
    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Student</Badge>
  ) : (
    <Badge variant="outline" className="text-[9px] px-1.5 py-0">Guest</Badge>
  );

  const handleNav = (to: string) => { setOpen(false); onNavigate?.(); navigate(to); };
  const handleLogout = async () => { setOpen(false); onNavigate?.(); await signOut(); navigate("/"); };

  const sections: MenuSection[] = isAdmin ? [
    {
      title: "Admin",
      items: [
        { icon: Shield, label: "Admin Panel", to: "/admin", show: true, tooltip: "Manage the platform" },
        { icon: Scale, label: "Judge Panel", to: "/judge", show: true, tooltip: "Review entries" },
      ],
    },
  ] : [
    {
      title: "Main",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard", show: true, tooltip: "Your home base" },
        { icon: Rss, label: "Feed", to: "/feed", show: true, tooltip: "Latest updates" },
        { icon: Compass, label: "Discover", to: "/discover", show: true, tooltip: "Find photographers" },
      ],
    },
    {
      title: "My Content",
      items: [
        { icon: ImageIcon, label: "My Submissions", to: "/dashboard?tab=submissions", show: true, tooltip: "Competition entries" },
        { icon: MessageSquare, label: "My Wall", to: `/profile/${user.id}`, show: true, tooltip: "Your posts & updates" },
        { icon: Trophy, label: "Competitions", to: "/competitions", show: true, tooltip: "Browse & enter" },
      ],
    },
    {
      title: "Social",
      items: [
        { icon: Users, label: "Friends", to: "/friends", show: true, tooltip: "Manage connections" },
        { icon: UserPlus, label: "Referrals", to: "/referrals", show: true, tooltip: "Invite & earn" },
      ],
    },
    {
      title: "Account",
      items: [
        { icon: User, label: "Profile", to: "/profile", show: true, tooltip: "View your profile" },
        { icon: Edit2, label: "Edit Profile", to: "/edit-profile", show: true, tooltip: "Update your info" },
        {
          icon: Wallet, label: "Wallet", to: "/wallet", show: true, tooltip: "Balance & transactions",
          extra: walletBalance !== null ? (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-primary/15 text-primary rounded-full" style={{ fontFamily: "var(--font-heading)" }}>
              ${Number(walletBalance).toFixed(2)}
            </span>
          ) : null,
        },
        { icon: Settings, label: "Settings", to: "/dashboard?tab=settings", show: true, tooltip: "Account settings" },
        { icon: Scale, label: "Judge Panel", to: "/judge", show: hasRole("judge"), tooltip: "Review entries" },
        { icon: HelpCircle, label: "Help & Support", to: "/help-support", show: true, tooltip: "Get assistance" },
      ],
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-border hover:border-primary transition-all duration-300 p-0.5 pr-3 cursor-pointer" aria-label="User menu">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl || user.user_metadata?.avatar_url} alt={fullName} />
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-[11px] tracking-[0.12em] uppercase font-medium hidden sm:inline" style={{ fontFamily: "var(--font-heading)" }}>{initials}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-0 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl || user.user_metadata?.avatar_url} alt={fullName} />
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold tracking-wide truncate" style={{ fontFamily: "var(--font-heading)" }}>{fullName}</p>
              <div className="mt-0.5">{roleBadge}</div>
            </div>
          </div>
        </div>

        {/* Menu sections */}
        <TooltipProvider delayDuration={400}>
          <div className="py-1">
            {sections.map((section, sIdx) => (
              <div key={section.title}>
                {sIdx > 0 && <div className="my-1 mx-3 border-t border-border" />}
                <div className="px-3 pt-1.5 pb-0.5">
                  <span className="text-[8px] tracking-[0.25em] uppercase text-muted-foreground/60" style={{ fontFamily: "var(--font-heading)" }}>{section.title}</span>
                </div>
                {section.items.filter(i => i.show).map((item) => (
                  <Tooltip key={item.to + item.label}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleNav(item.to)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left group"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-[10px] tracking-[0.1em] uppercase flex-1"><T>{item.label}</T></span>
                        {item.extra}
                      </button>
                    </TooltipTrigger>
                    {item.tooltip && (
                      <TooltipContent side="left" className="text-[10px]"><T>{item.tooltip}</T></TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Logout */}
        <div className="border-t border-border py-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-destructive/10 transition-colors text-left text-destructive"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="text-[10px] tracking-[0.1em] uppercase"><T>Logout</T></span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UserMenu;
