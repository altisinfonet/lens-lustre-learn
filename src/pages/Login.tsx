import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex">
      {/* Left — Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src="/images/sadhu.jpg" alt="Photography by ArteFoto Global" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />
      </div>

      {/* Right — Form */}
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

        <form className="space-y-6 max-w-sm" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500" placeholder="you@example.com" style={{ fontFamily: "var(--font-body)" }} />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500" placeholder="••••••••" style={{ fontFamily: "var(--font-body)" }} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 mt-4 disabled:opacity-50 flex items-center justify-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="text-xs text-muted-foreground mt-8" style={{ fontFamily: "var(--font-body)" }}>
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline">Create one</Link>
        </p>
      </div>
    </main>
  );
};

export default Login;
