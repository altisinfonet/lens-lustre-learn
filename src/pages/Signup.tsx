import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Signup = () => {
  return (
    <main className="min-h-screen bg-background text-foreground flex">
      {/* Left — Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="/images/innocence.jpg"
          alt="Photography by Neil Basu"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />
      </div>

      {/* Right — Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-500 mb-12" style={{ fontFamily: "var(--font-heading)" }}>
          <ArrowLeft className="h-3 w-3" />
          Back
        </Link>

        <div className="flex items-center gap-3 mb-12">
          <img src="/images/logo.png" alt="ArteFoto Global" className="h-8 w-8 object-contain" />
          <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
            ArteFoto Global
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Join the <em className="italic text-primary">Community</em>
        </h1>
        <p className="text-sm text-muted-foreground mb-10" style={{ fontFamily: "var(--font-body)" }}>
          Create your account and start sharing your vision.
        </p>

        <form className="space-y-6 max-w-sm" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Full Name</label>
            <input
              type="text"
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              placeholder="Your name"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Email</label>
            <input
              type="email"
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              placeholder="you@example.com"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Password</label>
            <input
              type="password"
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              placeholder="••••••••"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 mt-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Create Account
          </button>
        </form>

        <p className="text-xs text-muted-foreground mt-8" style={{ fontFamily: "var(--font-body)" }}>
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
};

export default Signup;
