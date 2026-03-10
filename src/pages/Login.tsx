import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, Eye, EyeOff, ShieldCheck, ShieldX, Timer } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import SimpleCaptcha from "@/components/SimpleCaptcha";
import { useTrustedDevice } from "@/hooks/useTrustedDevice";
import T from "@/components/T";
import {
  getLockedOutSeconds,
  getFailedAttempts,
  recordFailedAttempt,
  resetLockout,
} from "@/lib/passwordSecurity";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255),
  password: z.string().min(1, "Password is required").max(72),
});

const isNetworkError = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed");
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withNetworkRetry = async <T,>(operation: () => Promise<T>, retries = 2): Promise<T> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const message = error?.message || "";
      if (!isNetworkError(message) || attempt === retries) {
        throw error;
      }
      await wait(800 * (attempt + 1));
    }
  }
  throw new Error("Network retry exhausted");
};

const friendlyError = (raw: string): string => {
  const lower = raw.toLowerCase();
  if (isNetworkError(raw))
    return "Unable to connect to the server. Please check your internet connection and try again.";
  if (lower.includes("invalid login credentials"))
    return "Incorrect email or password. Please try again.";
  if (lower.includes("email not confirmed"))
    return "Your email hasn't been verified yet. Please check your inbox.";
  if (lower.includes("too many requests") || lower.includes("rate limit"))
    return "Too many attempts. Please wait a moment before trying again.";
  return raw;
};

const Login = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"google" | "apple" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(() => getFailedAttempts());
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [showTrustPrompt, setShowTrustPrompt] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(() => getLockedOutSeconds());
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDeviceTrusted, trustDevice } = useTrustedDevice();

  const needsCaptcha = failedAttempts >= 3;

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      const remaining = getLockedOutSeconds();
      setLockoutSeconds(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  useEffect(() => {
    if (user && !showTrustPrompt) {
      if (isDeviceTrusted(user.id)) {
        navigate("/dashboard");
      } else {
        setShowTrustPrompt(true);
      }
    }
  }, [user, navigate, isDeviceTrusted, showTrustPrompt]);

  const handleTrustDecision = (trust: boolean) => {
    if (trust && user) {
      trustDevice(user.id);
    }
    setShowTrustPrompt(false);
    navigate("/dashboard");
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setError(null);
    setLoading(provider);
    try {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Ignore
      }
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) {
        setError(friendlyError(error instanceof Error ? error.message : String(error)));
        setLoading(null);
      }
    } catch (err: any) {
      setError(friendlyError(err?.message || "Something went wrong. Please try again."));
      setLoading(null);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check lockout
    const remaining = getLockedOutSeconds();
    if (remaining > 0) {
      setLockoutSeconds(remaining);
      setError(`Account temporarily locked. Please wait ${formatTime(remaining)} before trying again.`);
      return;
    }

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    if (needsCaptcha && !captchaVerified) {
      setError("Please complete the security check first.");
      return;
    }

    setLoading("email");

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore
    }

    try {
      const res = await withNetworkRetry(
        () =>
          supabase.auth.signInWithPassword({
            email: result.data.email,
            password: result.data.password,
          }),
        2
      );

      if (res.error) {
        if (!isNetworkError(res.error.message)) {
          const lockoutDuration = recordFailedAttempt();
          const attempts = getFailedAttempts();
          setFailedAttempts(attempts);
          setCaptchaVerified(false);

          if (lockoutDuration > 0) {
            setLockoutSeconds(lockoutDuration);
            setError(`Too many failed attempts. Account locked for ${formatTime(lockoutDuration)}. Please try again later.`);
          } else {
            setError(friendlyError(res.error.message));
          }
        } else {
          setError(friendlyError(res.error.message));
        }
      } else {
        // Success — reset lockout
        resetLockout();
        setFailedAttempts(0);
      }
    } catch (err: any) {
      const message = err?.message || "Something went wrong.";
      setError(friendlyError(message));
      if (!isNetworkError(message)) {
        const lockoutDuration = recordFailedAttempt();
        setFailedAttempts(getFailedAttempts());
        setCaptchaVerified(false);
        if (lockoutDuration > 0) setLockoutSeconds(lockoutDuration);
      }
    }
    setLoading(null);
  };

  const onCaptchaVerified = useCallback((v: boolean) => setCaptchaVerified(v), []);

  const isLockedOut = lockoutSeconds > 0;

  // Trust this device prompt
  if (showTrustPrompt) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-8">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-2xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            <T>Trust This</T> <em className="italic text-primary"><T>Device</T></em>?
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
            <T>Would you like to remember this device? You won't be asked again on future logins from this browser.</T>
          </p>
          <div className="space-y-3">
            <button
              onClick={() => handleTrustDecision(true)}
              className="w-full py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity duration-500 flex items-center justify-center gap-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <ShieldCheck className="h-4 w-4" /> <T>Yes, Trust This Device</T>
            </button>
            <button
              onClick={() => handleTrustDecision(false)}
              className="w-full py-3.5 border border-border text-foreground text-xs tracking-[0.15em] uppercase hover:bg-muted transition-colors duration-500 flex items-center justify-center gap-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <ShieldX className="h-4 w-4" /> <T>No, Don't Trust</T>
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/60" style={{ fontFamily: "var(--font-body)" }}>
            <T>You can manage trusted devices from your profile settings.</T>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex">
      {/* Left — Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src="/images/sadhu.jpg" alt="Photography by 50mm Retina World" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />
      </div>

      {/* Right — Content */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 md:px-16 lg:px-24 py-12">
        <Link to="/" className="self-start inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-500 mb-12" style={{ fontFamily: "var(--font-heading)" }}>
          <ArrowLeft className="h-3 w-3" /> <T>Back</T>
        </Link>

        <div className="flex flex-col items-center text-center mb-10">
          <img src="/images/logo.png" alt="50mm Retina World" className="h-48 w-48 object-contain mb-8" />
          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
            <T>Welcome</T> <em className="italic text-primary"><T>Back</T></em>
          </h1>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}><T>Sign in to continue your journey.</T></p>
        </div>

        {error && (
          <div className="mb-6 text-sm text-destructive border border-destructive/30 px-4 py-3 max-w-sm" style={{ fontFamily: "var(--font-body)" }}>
            {error}
          </div>
        )}

        {/* Lockout timer */}
        {isLockedOut && (
          <div className="mb-6 flex items-center gap-3 text-sm text-destructive border border-destructive/30 px-4 py-3 max-w-sm" style={{ fontFamily: "var(--font-body)" }}>
            <Timer className="h-5 w-5 flex-shrink-0 animate-pulse" />
            <div>
              <span className="font-medium"><T>Account locked</T></span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                <T>Try again in</T> {formatTime(lockoutSeconds)}
              </span>
            </div>
          </div>
        )}

        {!isLockedOut && failedAttempts > 0 && failedAttempts < 3 && (
          <div className="mb-4 text-[10px] tracking-[0.15em] uppercase text-muted-foreground max-w-sm" style={{ fontFamily: "var(--font-heading)" }}>
            {3 - failedAttempts} <T>{`attempt${3 - failedAttempts > 1 ? "s" : ""} remaining before security check`}</T>
          </div>
        )}

        <div className="space-y-4 max-w-sm">
          {/* OAuth buttons */}
          <button
            onClick={() => handleOAuth("google")}
            disabled={!!loading || isLockedOut}
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
            <T>Continue with Google</T>
          </button>

          <button
            onClick={() => handleOAuth("apple")}
            disabled={!!loading || isLockedOut}
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
            <T>Continue with Apple</T>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              <T>Or sign in with email</T>
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Email</T>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                maxLength={255}
                disabled={isLockedOut}
                className="w-full py-3 px-4 bg-transparent border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)" }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  <T>Password</T>
                </label>
                <Link to="/forgot-password" className="text-[10px] tracking-[0.15em] uppercase text-primary hover:underline" style={{ fontFamily: "var(--font-heading)" }}>
                  <T>Forgot Password?</T>
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
                  disabled={isLockedOut}
                  className="w-full py-3 px-4 pr-12 bg-transparent border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
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

            {needsCaptcha && !isLockedOut && (
              <SimpleCaptcha onVerified={onCaptchaVerified} />
            )}

            <button
              type="submit"
              disabled={!!loading || (needsCaptcha && !captchaVerified) || isLockedOut}
              className="w-full py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50 flex items-center justify-center gap-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {loading === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {isLockedOut ? <T>Locked</T> : <T>Sign In</T>}
            </button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground mt-10" style={{ fontFamily: "var(--font-body)" }}>
          <T>Don't have an account?</T>{" "}
          <Link to="/signup" className="text-primary hover:underline"><T>Create one</T></Link>
        </p>

        <p className="text-[10px] text-muted-foreground/60 mt-4" style={{ fontFamily: "var(--font-body)" }}>
          <T>By continuing, you agree to our terms of service and privacy policy.</T>
        </p>
      </div>
    </main>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default Login;
