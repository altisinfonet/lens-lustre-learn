import { Link, useNavigate } from "react-router-dom";
import { Camera, Facebook, Instagram, Globe, KeyRound, Languages, Loader2, Mail, MapPin, Phone, Save, Shield, User, X, Building2 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProfileCompletionBar from "@/components/ProfileCompletionBar";
import { COUNTRIES } from "@/lib/profileCompletion";
import { SUPPORTED_LANGUAGES, useLanguage } from "@/hooks/useLanguage";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const INTEREST_OPTIONS = [
  "Wildlife", "Street", "Portrait", "Aerial", "Documentary",
  "Landscape", "Architecture", "Macro", "Sports", "Fashion",
  "Underwater", "Astrophotography", "Food", "Travel", "Abstract",
];

const labelCls = "block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2";
const inputCls = "w-full bg-transparent border-b border-border focus:border-primary outline-none py-3 text-sm transition-colors duration-500";
const sectionHeadCls = "text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-6";

const EditProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const { language: currentLang, setLanguage: setGlobalLanguage } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState("English");

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);
    if (error) {
      toast({ title: "Failed to send reset email", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent", description: "Check your inbox for the reset link." });
    }
  };

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [nationalIdUrl, setNationalIdUrl] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState(false);
  const idFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setPortfolioUrl(data.portfolio_url || "");
        setInterests(data.photography_interests || []);
        setFacebookUrl((data as any).facebook_url || "");
        setInstagramUrl((data as any).instagram_url || "");
        setWebsiteUrl((data as any).website_url || "");
        setAvatarUrl(data.avatar_url || null);
        setAddressLine1((data as any).address_line1 || "");
        setAddressLine2((data as any).address_line2 || "");
        setCity((data as any).city || "");
        setState((data as any).state || "");
        setCountry((data as any).country || "");
        setPostalCode((data as any).postal_code || "");
        setPhone((data as any).phone || "");
        setWhatsapp((data as any).whatsapp || "");
        setBankAccountName((data as any).bank_account_name || "");
        setBankAccountNumber((data as any).bank_account_number || "");
        setBankName((data as any).bank_name || "");
        setBankIfsc((data as any).bank_ifsc || "");
        setNationalIdUrl((data as any).national_id_url || null);
        setPreferredLanguage((data as any).preferred_language || "English");
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: newUrl } as any).eq("id", user.id);
    setAvatarUrl(newUrl);
    setUploadingAvatar(false);
    toast({ title: "Profile picture updated" });
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Please upload JPG, PNG, WebP or PDF", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File must be under 10MB", variant: "destructive" });
      return;
    }
    setUploadingId(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/national-id.${ext}`;
    const { error: uploadError } = await supabase.storage.from("national-ids").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingId(false);
      return;
    }
    // Store relative path; signed URL generated on view
    setNationalIdUrl(filePath);
    setUploadingId(false);
    toast({ title: "National ID uploaded" });
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const profileData = {
    avatar_url: avatarUrl,
    full_name: fullName,
    bio,
    portfolio_url: portfolioUrl,
    photography_interests: interests,
    facebook_url: facebookUrl,
    instagram_url: instagramUrl,
    website_url: websiteUrl,
    address_line1: addressLine1,
    city,
    state,
    country,
    postal_code: postalCode,
    phone,
    whatsapp,
    bank_account_name: bankAccountName,
    bank_account_number: bankAccountNumber,
    bank_name: bankName,
    bank_ifsc: bankIfsc,
    national_id_url: nationalIdUrl,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!avatarUrl) {
      toast({ title: "Profile picture is required", variant: "destructive" });
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
        facebook_url: facebookUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country: country || null,
        postal_code: postalCode.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        bank_account_name: bankAccountName.trim() || null,
        bank_account_number: bankAccountNumber.trim() || null,
        bank_name: bankName.trim() || null,
        bank_ifsc: bankIfsc.trim() || null,
        national_id_url: nationalIdUrl || null,
        preferred_language: preferredLanguage,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      await setGlobalLanguage(preferredLanguage);
      toast({ title: "Profile updated" });
      navigate("/dashboard");
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}>Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20 max-w-2xl">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Edit Profile" }]} className="mb-10" />

        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-px bg-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>Profile</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-8" style={{ fontFamily: "var(--font-display)" }}>
          Edit <em className="italic text-primary">Profile</em>
        </h1>

        {/* Completion Bar */}
        <ProfileCompletionBar profile={profileData} showSections className="mb-12 border border-border p-6" />

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Picture */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-24 w-24 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                  <User className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                {uploadingAvatar ? <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" /> : <Camera className="h-5 w-5 text-primary-foreground" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <div>
              <span className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Profile Picture *</span>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                className="text-xs text-primary hover:underline transition-all duration-300" style={{ fontFamily: "var(--font-body)" }}>
                {uploadingAvatar ? "Uploading…" : "Change photo"}
              </button>
              <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>JPG, PNG or WebP. Max 5MB. Required.</p>
            </div>
          </div>

          {/* Preferred Language */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>
              <Languages className="inline h-3 w-3 mr-1.5" />Preferred Language
            </label>
            <p className="text-[10px] text-muted-foreground mb-2" style={{ fontFamily: "var(--font-body)" }}>
              The entire website will be translated to your preferred language.
            </p>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className={`${inputCls} bg-background`}
              style={{ fontFamily: "var(--font-body)" }}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          {/* Full Name */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Full Name *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100}
              className={inputCls} placeholder="Your full name" style={{ fontFamily: "var(--font-body)" }} />
          </div>

          {/* Bio */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4}
              className="w-full bg-transparent border border-border focus:border-primary outline-none p-4 text-sm transition-colors duration-500 resize-none"
              placeholder="Tell us about yourself..." style={{ fontFamily: "var(--font-body)" }} />
            <span className="text-[10px] text-muted-foreground mt-1 block text-right" style={{ fontFamily: "var(--font-body)" }}>{bio.length}/500</span>
          </div>

          {/* Portfolio URL */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Portfolio URL</label>
            <input type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} maxLength={255}
              className={inputCls} placeholder="https://your-portfolio.com" style={{ fontFamily: "var(--font-body)" }} />
          </div>

          {/* Communication Address */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}>
              <MapPin className="inline h-3 w-3 mr-2" />Communication Address
            </span>
            <div className="space-y-5">
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Address Line 1</label>
                <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} maxLength={200}
                  className={inputCls} placeholder="Street address" style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Address Line 2</label>
                <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} maxLength={200}
                  className={inputCls} placeholder="Apartment, suite, etc." style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} maxLength={100}
                    className={inputCls} placeholder="City" style={{ fontFamily: "var(--font-body)" }} />
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>State / Province</label>
                  <input type="text" value={state} onChange={(e) => setState(e.target.value)} maxLength={100}
                    className={inputCls} placeholder="State" style={{ fontFamily: "var(--font-body)" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Country</label>
                  <select value={country} onChange={(e) => setCountry(e.target.value)}
                    className={`${inputCls} bg-background`} style={{ fontFamily: "var(--font-body)" }}>
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Postal Code</label>
                  <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} maxLength={20}
                    className={inputCls} placeholder="Postal / ZIP code" style={{ fontFamily: "var(--font-body)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Numbers */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}>
              <Phone className="inline h-3 w-3 mr-2" />Contact Numbers
            </span>
            <div className="space-y-5">
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20}
                  className={inputCls} placeholder="+91 XXXXX XXXXX" style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>WhatsApp Number</label>
                <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={20}
                  className={inputCls} placeholder="+91 XXXXX XXXXX" style={{ fontFamily: "var(--font-body)" }} />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}>
              <Building2 className="inline h-3 w-3 mr-2" />Bank Account Details
            </span>
            <div className="space-y-5">
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Account Holder Name</label>
                <input type="text" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} maxLength={150}
                  className={inputCls} placeholder="Name as on bank account" style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Account Number</label>
                <input type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} maxLength={30}
                  className={inputCls} placeholder="Account number" style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Bank Name</label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={100}
                    className={inputCls} placeholder="Bank name" style={{ fontFamily: "var(--font-body)" }} />
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>IFSC Code</label>
                  <input type="text" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} maxLength={20}
                    className={inputCls} placeholder="IFSC code" style={{ fontFamily: "var(--font-body)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* National ID Upload */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}>
              <Shield className="inline h-3 w-3 mr-2" />Identity Verification
            </span>
            <p className="text-xs text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>
              Upload a government-issued photo ID (Aadhaar, Passport, Driving Licence, etc.). This is kept private and secure.
            </p>
            <div className="flex items-center gap-4">
              {nationalIdUrl ? (
                <span className="text-xs text-green-500 flex items-center gap-1" style={{ fontFamily: "var(--font-body)" }}>
                  ✓ National ID uploaded
                </span>
              ) : (
                <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>No file uploaded</span>
              )}
              <button type="button" onClick={() => idFileRef.current?.click()} disabled={uploadingId}
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500 disabled:opacity-50"
                style={{ fontFamily: "var(--font-heading)" }}>
                {uploadingId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                {nationalIdUrl ? "Replace" : "Upload"} ID
              </button>
              <input ref={idFileRef} type="file" accept="image/*,application/pdf" onChange={handleIdUpload} className="hidden" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2" style={{ fontFamily: "var(--font-body)" }}>JPG, PNG, WebP or PDF. Max 10MB.</p>
          </div>

          {/* Social Media Links */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}>Social Media Links</span>
            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  <Facebook className="h-3 w-3" /> Facebook URL
                </label>
                <input type="url" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} maxLength={500}
                  className={inputCls} placeholder="https://facebook.com/yourprofile" style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  <Instagram className="h-3 w-3" /> Instagram URL
                </label>
                <input type="url" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} maxLength={500}
                  className={inputCls} placeholder="https://instagram.com/yourhandle" style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  <Globe className="h-3 w-3" /> Website URL
                </label>
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} maxLength={500}
                  className={inputCls} placeholder="https://yourwebsite.com" style={{ fontFamily: "var(--font-body)" }} />
              </div>
            </div>
          </div>

          {/* Photography Interests */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Photography Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                    className={`text-[11px] tracking-[0.1em] px-4 py-2 border transition-all duration-500 ${
                      selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/50"
                    }`} style={{ fontFamily: "var(--font-heading)" }}>
                    {interest}
                    {selected && <X className="inline h-3 w-3 ml-1.5 -mr-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Settings */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}>Account Settings</span>
            <div className="mb-6">
              <span className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Email Address</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span style={{ fontFamily: "var(--font-body)" }}>{user?.email}</span>
                <span className="text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border border-border text-muted-foreground/60 ml-2" style={{ fontFamily: "var(--font-heading)" }}>
                  Cannot be changed
                </span>
              </div>
            </div>
            <div>
              <span className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>Password</span>
              <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>
                We'll send a password reset link to your email address.
              </p>
              <button type="button" onClick={handlePasswordReset} disabled={sendingReset}
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500 disabled:opacity-50"
                style={{ fontFamily: "var(--font-heading)" }}>
                <KeyRound className="h-3 w-3" />
                {sendingReset ? "Sending…" : "Send Reset Link"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </button>
            <Link to="/dashboard"
              className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-500"
              style={{ fontFamily: "var(--font-heading)" }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
};

export default EditProfile;
