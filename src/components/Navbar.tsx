import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import T from "@/components/T";
import { Menu, X, Sun, Moon, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import GlobalSearch from "@/components/GlobalSearch";
import LanguageSelector from "@/components/LanguageSelector";
import { useTheme } from "@/hooks/useTheme";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import { useNavigationMenu, type MenuTree } from "@/hooks/useNavigationMenu";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import * as LucideIcons from "lucide-react";

interface NavbarProps {
  transparent?: boolean;
}

/** Dynamically resolve a lucide icon by name */
const DynIcon = ({ name, className }: { name: string; className?: string }) => {
  const Icon = (LucideIcons as any)[name];
  return Icon ? <Icon className={className} /> : null;
};

/** Check visibility rule */
const isVisible = (
  visibility: string,
  user: any,
  isAdmin: boolean
): boolean => {
  if (visibility === "all") return true;
  if (visibility === "guest") return !user;
  if (visibility === "authenticated") return !!user;
  if (visibility === "admin") return isAdmin;
  return true;
};

const Navbar = ({ transparent = false }: NavbarProps) => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { menuTree, loading } = useNavigationMenu();
  const [openMegaId, setOpenMegaId] = useState<string | null>(null);
  const megaTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Filter nav items
  const navItems = menuTree.filter(
    (item) => item.show_in_nav && isVisible(item.visibility, user, isAdmin)
  );

  // Fallback while loading
  const fallbackLinks = [
    { to: "/competitions", label: "Competitions" },
    { to: "/journal", label: "Journal" },
    { to: "/courses", label: "Courses" },
    { to: "/winners", label: "Winners" },
  ];

  const handleMegaEnter = (id: string) => {
    clearTimeout(megaTimeout.current);
    setOpenMegaId(id);
  };

  const handleMegaLeave = () => {
    megaTimeout.current = setTimeout(() => setOpenMegaId(null), 200);
  };

  // Close mega menu on route change
  useEffect(() => {
    setOpenMegaId(null);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const renderDesktopItem = (item: MenuTree) => {
    const hasChildren = item.children.filter((c) => isVisible(c.visibility, user, isAdmin)).length > 0;
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");

    if (!hasChildren) {
      const linkProps = item.type === "external" && item.open_new_tab
        ? { target: "_blank" as const, rel: "noopener noreferrer" }
        : {};

      return (
        <Link
          key={item.id}
          to={item.path}
          className={`hover:opacity-60 transition-opacity duration-500 flex items-center gap-1.5 ${isActive ? "text-primary" : ""}`}
          {...linkProps}
        >
          {item.icon && <DynIcon name={item.icon} className="h-3 w-3" />}
          <T>{item.label}</T>
        </Link>
      );
    }

    // Mega menu parent
    return (
      <div
        key={item.id}
        className="relative"
        onMouseEnter={() => handleMegaEnter(item.id)}
        onMouseLeave={handleMegaLeave}
      >
        <button
          type="button"
          onClick={() => setOpenMegaId(openMegaId === item.id ? null : item.id)}
          className={`hover:opacity-60 transition-opacity duration-500 flex items-center gap-1.5 ${isActive ? "text-primary" : ""}`}
        >
          {item.icon && <DynIcon name={item.icon} className="h-3 w-3" />}
          <T>{item.label}</T>
          <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-300 ${openMegaId === item.id ? "rotate-180" : ""}`} />
        </button>

        {/* Mega menu dropdown */}
        <AnimatePresence>
          {openMegaId === item.id && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-50"
              onMouseEnter={() => handleMegaEnter(item.id)}
              onMouseLeave={handleMegaLeave}
            >
              <div className="bg-card border border-border shadow-lg min-w-[320px] max-w-[480px] p-5">
                <div className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                  {item.label}
                </div>
                <div className="grid gap-1">
                  {item.children
                    .filter((c) => isVisible(c.visibility, user, isAdmin))
                    .map((child) => {
                      const childLinkProps = child.type === "external" && child.open_new_tab
                        ? { target: "_blank" as const, rel: "noopener noreferrer" }
                        : {};
                      return (
                        <Link
                          key={child.id}
                          to={child.path}
                          className="flex items-start gap-3 p-3 rounded-sm hover:bg-muted/40 transition-colors group"
                          onClick={() => setOpenMegaId(null)}
                          {...childLinkProps}
                        >
                          {child.icon && (
                            <DynIcon name={child.icon} className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <span className="text-sm font-medium block group-hover:text-primary transition-colors" style={{ fontFamily: "var(--font-heading)" }}>
                              <T>{child.label}</T>
                            </span>
                            {child.description && (
                              <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug" style={{ fontFamily: "var(--font-body)" }}>
                                {child.description}
                              </span>
                            )}
                          </div>
                          {child.type === "external" && (
                            <LucideIcons.ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                          )}
                        </Link>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <>
      <nav
        className={`${
          transparent
            ? ""
            : "sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
        }`}
        aria-label="Main navigation"
      >
        <div className="container mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 relative z-10" aria-label="50mm Retina World Home">
            <img src="/images/logo.png" alt="50mm Retina World" className="h-12 w-12 object-contain" />
            <span
              className="text-sm font-semibold tracking-[0.2em] uppercase"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              50mm Retina World
            </span>
          </Link>

          {/* Desktop links */}
          <div
            className="hidden lg:flex items-center gap-5 xl:gap-8 text-xs tracking-[0.15em] uppercase flex-shrink-0"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {loading
              ? fallbackLinks.map((l) => (
                  <Link key={l.to} to={l.to} className={`hover:opacity-60 transition-opacity duration-500 ${location.pathname.startsWith(l.to) ? "text-primary" : ""}`}>
                    <T>{l.label}</T>
                  </Link>
                ))
              : navItems.map((item) => renderDesktopItem(item))
            }
          </div>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-3">
            <LanguageSelector compact />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-border hover:border-primary hover:text-primary transition-all duration-500"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <GlobalSearch />
            {user && <NotificationBell />}
            {user ? (
              <UserMenu variant="desktop" />
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs tracking-[0.15em] uppercase hover:opacity-60 transition-opacity duration-500"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <T>Login</T>
                </Link>
                <Link
                  to="/signup"
                  className="text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-foreground/30 hover:bg-foreground hover:text-background transition-all duration-700"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <T>Join</T>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 hover:opacity-60 transition-opacity"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60]"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-card border-l border-border z-[70] flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <span
                  style={{ fontFamily: "var(--font-heading)" }}
                  className="text-xs font-semibold tracking-[0.2em] uppercase"
                >
                  Menu
                </span>
                <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col p-6 gap-4 flex-1" style={{ fontFamily: "var(--font-heading)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <GlobalSearch />
                  <LanguageSelector compact />
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full border border-border hover:border-primary hover:text-primary transition-all duration-500"
                    aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                </div>

                {/* Mobile nav items */}
                {(loading ? fallbackLinks.map((l, i) => ({ id: String(i), ...l, label: l.label, path: l.to, children: [] as MenuTree[], icon: "", description: "", type: "system" as const, parent_id: null, sort_order: i, visibility: "all" as const, meta_title: "", meta_description: "", og_image: "", noindex: false, show_in_nav: true, open_new_tab: false })) : navItems).map((item) => (
                  <div key={item.id}>
                    <Link
                      to={item.path}
                      onClick={() => !item.children?.length && setMobileMenuOpen(false)}
                      className="text-sm tracking-[0.15em] uppercase hover:text-primary transition-colors flex items-center gap-2"
                    >
                      {item.icon && <DynIcon name={item.icon} className="h-3.5 w-3.5" />}
                      <T>{item.label}</T>
                    </Link>
                    {item.children?.filter((c) => isVisible(c.visibility, user, isAdmin)).map((child) => (
                      <Link
                        key={child.id}
                        to={child.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-xs tracking-[0.1em] uppercase text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 ml-5 mt-2"
                        {...(child.type === "external" && child.open_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {child.icon && <DynIcon name={child.icon} className="h-3 w-3" />}
                        <T>{child.label}</T>
                      </Link>
                    ))}
                  </div>
                ))}

                <div className="h-px bg-border my-2" />

                {user ? (
                  <UserMenu variant="mobile" onNavigate={() => setMobileMenuOpen(false)} />
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm tracking-[0.15em] uppercase hover:text-primary transition-colors"><T>Login</T></Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm tracking-[0.15em] uppercase px-5 py-2.5 border border-foreground/30 hover:bg-foreground hover:text-background transition-all duration-500 text-center"
                    >
                      <T>Join</T>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
