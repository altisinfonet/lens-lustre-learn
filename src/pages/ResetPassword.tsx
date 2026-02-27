import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import T from "@/components/T";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-2xl font-light tracking-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
            <T>Invalid Reset Link</T>
          </h1>
          <p className="text-sm text-muted-foreground mb-8" style={{ fontFamily: "var(--font-body)" }}>
            <T>This link is invalid or has expired. Please request a new password reset.</T>
          </p>
          <Link to="/forgot-password" className="text-xs tracking-[0.15em] uppercase text-primary hover:underline" style={{ fontFamily: "var(--font-heading)" }}>
            <T>Request New Link</T>
          </Link>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
            <T>Password</T> <em className="italic text-primary"><T>Updated</T></em>
          </h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
            <T>Your password has been successfully changed. You can now sign in with your new password.</T>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <T>Go to Dashboard</T>
            </Link>
            <Link
              to="/profile"
              className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-500"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <T>View Profile</T>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Lock className="h-8 w-8 text-primary mb-8" />

        <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
          <T>Set New</T> <em className="italic text-primary"><T>Password</T></em>
        </h1>
        <p className="text-sm text-muted-foreground mb-8" style={{ fontFamily: "var(--font-body)" }}>
          <T>Choose a strong password for your account.</T>
        </p>

        {error && (
          <div className="mb-6 text-sm text-destructive border border-destructive/30 px-4 py-3" style={{ fontFamily: "var(--font-body)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
              <T>New Password</T>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              maxLength={72}
              className="w-full py-3 px-4 bg-transparent border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-1.5" style={{ fontFamily: "var(--font-heading)" }}>
              <T>Confirm Password</T>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              maxLength={72}
              className="w-full py-3 px-4 bg-transparent border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50 flex items-center justify-center gap-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <T>Update Password</T>
          </button>
        </form>
      </div>
    </main>
  );
};

export default ResetPassword;
