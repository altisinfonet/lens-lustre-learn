import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import T from "@/components/T";
import { Menu, X, Sun, Moon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import GlobalSearch from "@/components/GlobalSearch";
import LanguageSelector from "@/components/LanguageSelector";
import { useTheme } from "@/hooks/useTheme";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";

interface NavbarProps {
  transparent?: boolean;
}

const navLinks = [
  { to: "/competitions", label: "Competitions" },
  { to: "/journal", label: "Journal" },
  { to: "/courses", label: "Courses" },
  { to: "/winners", label: "Winners" },
];

const Navbar = ({ transparent = false }: NavbarProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
            <img src="/images/logo.png" alt="50mm Retina World" className="h-7 w-7 object-contain" />
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
