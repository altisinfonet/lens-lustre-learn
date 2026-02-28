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
  LogOut,
  Shield,
  Scale,
  Wallet,
  LayoutDashboard,
  User,
  ImageIcon,
  Bell,
  Users,
  MessageSquare,
  Compass,
  Rss,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserMenuProps {
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
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
    // Fetch wallet balance
    if (!isAdmin) {
      supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => setWalletBalance(data?.balance ?? 0));
    }
    // Fetch profile avatar
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [user, isAdmin]);

  if (!user) return null;

  const fullName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "U";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleBadge = hasRole("admin") ? (
    <Badge variant="default" className="text-[9px] px-1.5 py-0">Admin</Badge>
  ) : hasRole("registered_photographer") ? (
    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Photographer</Badge>
  ) : hasRole("student") ? (
    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Student</Badge>
  ) : (
    <Badge variant="outline" className="text-[9px] px-1.5 py-0">Guest</Badge>
  );

  const handleNav = (to: string) => {
    setOpen(false);
    onNavigate?.();
    navigate(to);
  };

  const handleLogout = async () => {
    setOpen(false);
    onNavigate?.();
    await signOut();
    navigate("/");
  };

  const menuItems = [
    { icon: User, label: "Profile", to: "/profile", show: true },
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard", show: true },
    { icon: Rss, label: "Feed", to: "/feed", show: true },
    { icon: Users, label: "Friends & Network", to: "/friends", show: true },
    { icon: Compass, label: "Discover Photographers", to: "/discover", show: true },
    { icon: MessageSquare, label: "My Wall", to: `/profile/${user.id}`, show: true },
    {
      icon: Wallet,
      label: "Wallet",
      to: "/wallet",
      show: !isAdmin,
      extra: walletBalance !== null ? (
        <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-primary/15 text-primary rounded-full" style={{ fontFamily: "var(--font-heading)" }}>
          ${Number(walletBalance).toFixed(2)}
        </span>
      ) : null,
    },
    { icon: ImageIcon, label: "My Submissions", to: "/dashboard?tab=submissions", show: true },
    { icon: Shield, label: "Admin Panel", to: "/admin", show: isAdmin },
    { icon: Scale, label: "Judge Panel", to: "/judge", show: hasRole("judge") || isAdmin },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border border-border hover:border-primary transition-all duration-300 p-0.5 pr-3 cursor-pointer"
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl || user.user_metadata?.avatar_url} alt={fullName} />
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            className="text-[11px] tracking-[0.12em] uppercase font-medium hidden sm:inline"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {initials}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl || user.user_metadata?.avatar_url} alt={fullName} />
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold tracking-wide truncate"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {fullName}
              </p>
              <div className="mt-0.5">{roleBadge}</div>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="py-1.5">
          {menuItems
            .filter((item) => item.show)
            .map((item) => (
              <button
                key={item.to}
                onClick={() => handleNav(item.to)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs tracking-[0.1em] uppercase">
                  <T>{item.label}</T>
                </span>
                {"extra" in item && item.extra}
              </button>
            ))}
        </div>

        {/* Logout */}
        <div className="border-t border-border py-1.5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-destructive/10 transition-colors text-left text-destructive"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs tracking-[0.1em] uppercase">
              <T>Logout</T>
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UserMenu;
