import { Link, useNavigate } from "react-router-dom";
import { Loader2, Save, X } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import GlobalSearch from "@/components/GlobalSearch";
import { toast } from "@/hooks/use-toast";

const INTEREST_OPTIONS = [
  "Wildlife", "Street", "Portrait", "Aerial", "Documentary",
  "Landscape", "Architecture", "Macro", "Sports", "Fashion",
  "Underwater", "Astrophotography", "Food", "Travel", "Abstract",
];

const EditProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, bio, portfolio_url, photography_interests")
        .eq("id", user.id)
        .single();
      if (data) {
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setPortfolioUrl(data.portfolio_url || "");
        setInterests(data.photography_interests || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        photography_interests: interests.length > 0 ? interests : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
      navigate("/dashboard");
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="container mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/logo.png" alt="ArteFoto Global" className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
              ArteFoto Global
            </span>
          </Link>
          <GlobalSearch />
        </div>
      </nav>

      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20 max-w-2xl">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Edit Profile" }]} className="mb-10" />

        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-px bg-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Profile</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-12" style={{ fontFamily: "var(--font-display)" }}>
          Edit <em className="italic text-primary">Profile</em>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Full Name */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              placeholder="Your full name"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full bg-transparent border border-border focus:border-primary outline-none p-4 text-sm transition-colors duration-500 resize-none"
              placeholder="Tell us about yourself and your photography journey..."
              style={{ fontFamily: "var(--font-body)" }}
            />
            <span className="text-[10px] text-muted-foreground mt-1 block text-right" style={{ fontFamily: "var(--font-body)" }}>
              {bio.length}/500
            </span>
          </div>

          {/* Portfolio URL */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Portfolio URL
            </label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              maxLength={255}
              className="w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500"
              placeholder="https://your-portfolio.com"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>

          {/* Photography Interests */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4" style={{ fontFamily: "var(--font-heading)" }}>
              Photography Interests
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`text-[11px] tracking-[0.1em] px-4 py-2 border transition-all duration-500 ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-foreground/50"
                    }`}
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {interest}
                    {selected && <X className="inline h-3 w-3 ml-1.5 -mr-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </button>
            <Link
              to="/dashboard"
              className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-500"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
};

export default EditProfile;
