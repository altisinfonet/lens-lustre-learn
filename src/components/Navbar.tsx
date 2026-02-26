import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import T from "@/components/T";
import { LogOut, Shield, Menu, X, Sun, Moon, Scale, Wallet } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUserRoles } from "@/hooks/useUserRoles";
import GlobalSearch from "@/components/GlobalSearch";
import LanguageSelector from "@/components/LanguageSelector";
import { useTheme } from "@/hooks/useTheme";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface NavbarProps {
  /** When true the nav is rendered absolute/transparent over a hero section */
  transparent?: boolean;
}

const navLinks = [
  { to: "/competitions", label: "Competitions" },
  { to: "/journal", label: "Journal" },
  { to: "/courses", label: "Courses" },
  { to: "/winners", label: "Winners" },
];

const Navbar = ({ transparent = false }: NavbarProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { hasRole } = useUserRoles();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!user || isAdmin) return;
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setWalletBalance(data?.balance ?? 0));
  }, [user, isAdmin]);

  const isHome = location.pathname === "/";

  return (
    <>
      <nav
        className={`${
          transparent
            ? "absolute top-0 left-0 right-0 z-50"
            : "sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
        }`}
        aria-label="Main navigation"
      >
        <div className="container mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 relative z-10" aria-label="50mm Retina Home">
            <img src="/images/logo.png" alt="50mm Retina" className="h-7 w-7 object-contain" />
            <span
              className="text-sm font-semibold tracking-[0.2em] uppercase"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              50mm Retina
            </span>
          </Link>

          {/* Desktop links */}
          <div
            className="hidden md:flex items-center gap-6 lg:gap-8 text-xs tracking-[0.15em] uppercase flex-shrink-0"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`hover:opacity-60 transition-opacity duration-500 ${
                  location.pathname.startsWith(l.to) ? "text-primary" : ""
                }`}
              >
                <T>{l.label}</T>
              </Link>
            ))}
            {user && <Link to="/profile" className="hover:opacity-60 transition-opacity duration-500"><T>Profile</T></Link>}
            {user && <Link to="/dashboard" className="hover:opacity-60 transition-opacity duration-500"><T>Dashboard</T></Link>}
            {user && !isAdmin && (
              <Link to="/wallet" className="hover:opacity-60 transition-opacity duration-500 flex items-center gap-1.5">
                <Wallet className="h-3 w-3" />
                <T>Wallet</T>
                {walletBalance !== null && (
                  <span className="text-[8px] tracking-[0.1em] px-1.5 py-0.5 bg-primary/15 text-primary rounded-full" style={{ fontFamily: "var(--font-heading)" }}>
                    ${Number(walletBalance).toFixed(2)}
                  </span>
                )}
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="hover:opacity-60 transition-opacity duration-500 flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                <T>Admin</T>
              </Link>
            )}
            {(hasRole("judge") || isAdmin) && (
              <Link to="/judge" className="hover:opacity-60 transition-opacity duration-500 flex items-center gap-1.5">
                <Scale className="h-3 w-3" />
                <T>Judge</T>
              </Link>
            )}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSelector compact />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-border hover:border-primary hover:text-primary transition-all duration-500"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <GlobalSearch />
            {user ? (
              <>
                <span
                  className="text-xs tracking-[0.15em] uppercase text-muted-foreground flex items-center gap-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                  {hasRole("admin") ? (
                    <Badge variant="default" className="text-[9px] px-1.5 py-0">Admin</Badge>
                  ) : hasRole("registered_photographer") ? (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Photographer</Badge>
                  ) : hasRole("student") ? (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Student</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">Guest</Badge>
                  )}
                </span>
                <button
                  onClick={async () => { await signOut(); navigate("/"); }}
                  className="text-xs tracking-[0.15em] uppercase px-4 py-2 border border-foreground/30 hover:bg-foreground hover:text-background transition-all duration-700 inline-flex items-center gap-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <LogOut className="h-3 w-3" />
                  <T>Logout</T>
                </button>
              </>
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
            className="md:hidden p-2 hover:opacity-60 transition-opacity"
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
              className="fixed top-0 right-0 bottom-0 w-72 bg-card border-l border-border z-[70] flex flex-col"
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

              <div className="flex flex-col p-6 gap-6 flex-1" style={{ fontFamily: "var(--font-heading)" }}>
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
                
                {navLinks.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setMobileMenuOpen(false)}
                    className="text-sm tracking-[0.15em] uppercase hover:text-primary transition-colors">
                    <T>{l.label}</T>
                  </Link>
                ))}
                {user && (
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="text-sm tracking-[0.15em] uppercase hover:text-primary transition-colors"><T>Profile</T></Link>
                )}
                {user && (
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-sm tracking-[0.15em] uppercase hover:text-primary transition-colors"><T>Dashboard</T></Link>
                )}
                {user && !isAdmin && (
                  <Link to="/wallet" onClick={() => setMobileMenuOpen(false)} className="text-sm tracking-[0.15em] uppercase hover:text-primary transition-colors flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5" />
                    <T>Wallet</T>
                    {walletBalance !== null && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-primary/15 text-primary rounded-full" style={{ fontFamily: "var(--font-heading)" }}>
                        ${Number(walletBalance).toFixed(2)}
                      </span>
                    )}
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-sm tracking-[0.15em] uppercase hover:text-primary transition-colors flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5" />
                    <T>Admin</T>
                  </Link>
                )}
                {(hasRole("judge") || isAdmin) && (
                  <Link to="/judge" onClick={() => setMobileMenuOpen(false)} className="text-sm tracking-[0.15em] uppercase hover:text-primary transition-colors flex items-center gap-2">
                    <Scale className="h-3.5 w-3.5" />
                    <T>Judge</T>
                  </Link>
                )}

                <div className="h-px bg-border my-2" />

                {user ? (
                  <>
                    <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground flex items-center gap-2 flex-wrap">
                      {user.user_metadata?.full_name || user.email?.split("@")[0]}
                      {hasRole("admin") ? (
                        <Badge variant="default" className="text-[9px] px-1.5 py-0">Admin</Badge>
                      ) : hasRole("registered_photographer") ? (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Photographer</Badge>
                      ) : hasRole("student") ? (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Student</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">Guest</Badge>
                      )}
                    </span>
                    <button
                      onClick={async () => { await signOut(); setMobileMenuOpen(false); navigate("/"); }}
                      className="text-sm tracking-[0.15em] uppercase hover:text-primary transition-colors inline-flex items-center gap-2"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <T>Logout</T>
                    </button>
                  </>
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
