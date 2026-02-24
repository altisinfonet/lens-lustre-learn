import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255),
  password: z.string().min(1, "Password is required").max(72),
});

const Login = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"google" | "apple" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleOAuth = async (provider: "google" | "apple") => {
    setError(null);
    setLoading(provider);
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) {
      setError(error instanceof Error ? error.message : String(error));
      setLoading(null);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading("email");
    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      setError(error.message);
    }
    setLoading(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex">
      {/* Left — Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src="/images/sadhu.jpg" alt="Photography by ArteFoto Global" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />
      </div>

      {/* Right — Content */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-500 mb-12" style={{ fontFamily: "var(--font-heading)" }}>
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-12">
          <img src="/images/logo.png" alt="ArteFoto Global" className="h-8 w-8 object-contain" />
          <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>ArteFoto Global</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Welcome <em className="italic text-primary">Back</em>
        </h1>
        <p className="text-sm text-muted-foreground mb-10" style={{ fontFamily: "var(--font-body)" }}>Sign in to continue your journey.</p>

        {error && (
          <div className="mb-6 text-sm text-destructive border border-destructive/30 px-4 py-3 max-w-sm" style={{ fontFamily: "var(--font-body)" }}>
            {error}
          </div>
        )}

        <div className="space-y-4 max-w-sm">
          {/* OAuth buttons */}
          <button
            onClick={() => handleOAuth("google")}
            disabled={!!loading}
            className="w-full py-3.5 bg-foreground text-background text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50 flex items-center justify-center gap-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {loading === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuth("apple")}
            disabled={!!loading}
            className="w-full py-3.5 border border-foreground/30 text-foreground text-xs tracking-[0.15em] uppercase hover:bg-foreground hover:text-background transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {loading === "apple" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            )}
            Continue with Apple
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Or sign in with email
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                maxLength={255}
                className="w-full py-3 px-4 bg-transparent border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors"
                style={{ fontFamily: "var(--font-body)" }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  Password
                </label>
                <Link to="/forgot-password" className="text-[10px] tracking-[0.15em] uppercase text-primary hover:underline" style={{ fontFamily: "var(--font-heading)" }}>
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  maxLength={72}
                  className="w-full py-3 px-4 pr-12 bg-transparent border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded-sm border border-border accent-primary cursor-pointer"
              />
              <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground group-hover:text-foreground transition-colors" style={{ fontFamily: "var(--font-heading)" }}>
                Remember me
              </span>
            </label>
            <button
              type="submit"
              disabled={!!loading}
              className="w-full py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50 flex items-center justify-center gap-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {loading === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Sign In
            </button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground mt-10" style={{ fontFamily: "var(--font-body)" }}>
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline">Create one</Link>
        </p>

        <p className="text-[10px] text-muted-foreground/60 mt-4" style={{ fontFamily: "var(--font-body)" }}>
          By continuing, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </main>
  );
};

export default Login;
