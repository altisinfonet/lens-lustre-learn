import { Link, useNavigate } from "react-router-dom";
import { Camera, CheckCircle2, Facebook, Instagram, Globe, KeyRound, Languages, Loader2, Mail, MapPin, Phone, Save, Shield, User, X, Building2, AlertCircle, ExternalLink, Twitter, Youtube } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProfileCompletionBar from "@/components/ProfileCompletionBar";
import T from "@/components/T";
import { COUNTRIES } from "@/lib/profileCompletion";
import { getCountries, getStatesForCountry, getCitiesForState } from "@/lib/locationData";
import { SUPPORTED_LANGUAGES, useLanguage } from "@/hooks/useLanguage";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { compressAvatar } from "@/lib/imageCompression";

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
  const [facebookUrl, setFacebookUrl] = useState(""); // stores username only
  const [instagramUrl, setInstagramUrl] = useState(""); // stores username only
  const [fbVerified, setFbVerified] = useState<boolean | null>(null);
  const [igVerified, setIgVerified] = useState<boolean | null>(null);
  const [verifyingFb, setVerifyingFb] = useState(false);
  const [verifyingIg, setVerifyingIg] = useState(false);
  const [twitterUrl, setTwitterUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [twVerified, setTwVerified] = useState<boolean | null>(null);
  const [ytVerified, setYtVerified] = useState<boolean | null>(null);
  const [verifyingTw, setVerifyingTw] = useState(false);
  const [verifyingYt, setVerifyingYt] = useState(false);
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

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cascading location lists
  const availableCountries = [...new Set([...getCountries(), ...COUNTRIES])].sort();
  const availableStates = country ? getStatesForCountry(country) : [];
  const availableCities = country && state ? getCitiesForState(country, state) : [];

  // Validation helpers
  const validatePhone = (value: string): string => {
    if (!value.trim()) return "";
    const cleaned = value.replace(/[\s\-()]/g, "");
    if (!/^\+?\d{7,15}$/.test(cleaned)) return "Enter a valid phone number (7-15 digits, optional + prefix)";
    return "";
  };

  const validatePostalCode = (value: string): string => {
    if (!value.trim()) return "";
    if (!/^[A-Za-z0-9\s\-]{3,10}$/.test(value.trim())) return "Enter a valid postal/ZIP code";
    return "";
  };

  const validateFacebook = (value: string): string => {
    if (!value.trim()) return "";
    if (!/^[a-zA-Z0-9.]{1,100}$/.test(value.trim())) return "Invalid Facebook username. Use only letters, numbers, and periods.";
    if (value.trim().length < 3) return "Facebook username must be at least 3 characters.";
    return "";
  };

  const validateInstagram = (value: string): string => {
    if (!value.trim()) return "";
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(value.trim())) return "Invalid Instagram handle. Use only letters, numbers, periods, and underscores.";
    if (value.trim().length < 2) return "Instagram handle must be at least 2 characters.";
    return "";
  };

  const validateTwitter = (value: string): string => {
    if (!value.trim()) return "";
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(value.trim())) return "Invalid X/Twitter handle. Use only letters, numbers, and underscores (max 15 chars).";
    return "";
  };

  const validateYoutube = (value: string): string => {
    if (!value.trim()) return "";
    if (!/^[a-zA-Z0-9._\-]{1,100}$/.test(value.trim())) return "Invalid YouTube channel name. Use only letters, numbers, periods, dashes, and underscores.";
    if (value.trim().length < 2) return "YouTube channel name must be at least 2 characters.";
    return "";
  };

  const handleFacebookChange = (val: string) => {
    const cleaned = val.replace(/\s/g, "");
    setFacebookUrl(cleaned);
    setFbVerified(null);
    setErrors((prev) => ({ ...prev, facebook: validateFacebook(cleaned) }));
  };

  const handleInstagramChange = (val: string) => {
    const cleaned = val.replace(/\s/g, "");
    setInstagramUrl(cleaned);
    setIgVerified(null);
    setErrors((prev) => ({ ...prev, instagram: validateInstagram(cleaned) }));
  };

  const handleTwitterChange = (val: string) => {
    const cleaned = val.replace(/\s/g, "");
    setTwitterUrl(cleaned);
    setTwVerified(null);
    setErrors((prev) => ({ ...prev, twitter: validateTwitter(cleaned) }));
  };

  const handleYoutubeChange = (val: string) => {
    const cleaned = val.replace(/\s/g, "");
    setYoutubeUrl(cleaned);
    setYtVerified(null);
    setErrors((prev) => ({ ...prev, youtube: validateYoutube(cleaned) }));
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    setErrors((prev) => ({ ...prev, phone: validatePhone(val) }));
  };

  const handleWhatsappChange = (val: string) => {
    setWhatsapp(val);
    setErrors((prev) => ({ ...prev, whatsapp: validatePhone(val) }));
  };

  const handlePostalCodeChange = (val: string) => {
    setPostalCode(val);
    setErrors((prev) => ({ ...prev, postalCode: validatePostalCode(val) }));
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    setState("");
    setCity("");
  };

  const handleStateChange = (val: string) => {
    setState(val);
    setCity("");
  };

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
        const rawFb = (data as any).facebook_url || "";
        setFacebookUrl(rawFb.replace(/^https?:\/\/(www\.)?facebook\.com\//i, "").replace(/\/$/, ""));
        const rawIg = (data as any).instagram_url || "";
        setInstagramUrl(rawIg.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, ""));
        const rawTw = (data as any).twitter_url || "";
        setTwitterUrl(rawTw.replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i, "").replace(/\/$/, ""));
        const rawYt = (data as any).youtube_url || "";
        setYoutubeUrl(rawYt.replace(/^https?:\/\/(www\.)?youtube\.com\/@?/i, "").replace(/\/$/, ""));
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
        // Bank details loaded separately below
        setNationalIdUrl((data as any).national_id_url || null);
        setPreferredLanguage((data as any).preferred_language || "English");
      }
      // Fetch bank details from separate table
      const { data: bankData } = await supabase
        .from("bank_details" as any)
        .select("bank_account_name, bank_account_number, bank_name, bank_ifsc")
        .eq("user_id", user.id)
        .maybeSingle();
      if (bankData) {
        setBankAccountName((bankData as any).bank_account_name || "");
        setBankAccountNumber((bankData as any).bank_account_number || "");
        setBankName((bankData as any).bank_name || "");
        setBankIfsc((bankData as any).bank_ifsc || "");
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
    setUploadingAvatar(true);
    try {
      const { webpFile } = await compressAvatar(file);
      const filePath = `${user.id}/avatar.webp`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, webpFile, { upsert: true });
      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setUploadingAvatar(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: newUrl } as any).eq("id", user.id);
      setAvatarUrl(newUrl);
      toast({ title: "Profile picture updated" });
    } catch (err: any) {
      toast({ title: "Compression failed", description: err.message, variant: "destructive" });
    }
    setUploadingAvatar(false);
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
    facebook_url: facebookUrl.trim() ? `https://www.facebook.com/${facebookUrl.trim()}` : null,
    instagram_url: instagramUrl.trim() ? `https://www.instagram.com/${instagramUrl.trim()}` : null,
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
    bank_ifsc: bankIfsc,  // from bank_details table
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
    // Validate phone/whatsapp/postal/social
    const phoneErr = validatePhone(phone);
    const whatsappErr = validatePhone(whatsapp);
    const postalErr = validatePostalCode(postalCode);
    const fbErr = validateFacebook(facebookUrl);
    const igErr = validateInstagram(instagramUrl);
    const twErr = validateTwitter(twitterUrl);
    const ytErr = validateYoutube(youtubeUrl);
    if (phoneErr || whatsappErr || postalErr || fbErr || igErr || twErr || ytErr) {
      setErrors({ phone: phoneErr, whatsapp: whatsappErr, postalCode: postalErr, facebook: fbErr, instagram: igErr, twitter: twErr, youtube: ytErr });
      toast({ title: "Please fix validation errors before saving", variant: "destructive" });
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
        facebook_url: facebookUrl.trim() ? `https://www.facebook.com/${facebookUrl.trim()}` : null,
        instagram_url: instagramUrl.trim() ? `https://www.instagram.com/${instagramUrl.trim()}` : null,
        twitter_url: twitterUrl.trim() ? `https://x.com/${twitterUrl.trim()}` : null,
        youtube_url: youtubeUrl.trim() ? `https://www.youtube.com/@${youtubeUrl.trim()}` : null,
        website_url: websiteUrl.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country: country || null,
        postal_code: postalCode.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        national_id_url: nationalIdUrl || null,
        preferred_language: preferredLanguage,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", user.id);
    // Save bank details to separate table
    if (!error) {
      const bankPayload = {
        user_id: user.id,
        bank_account_name: bankAccountName.trim() || null,
        bank_account_number: bankAccountNumber.trim() || null,
        bank_name: bankName.trim() || null,
        bank_ifsc: bankIfsc.trim() || null,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("bank_details" as any).upsert(bankPayload as any, { onConflict: "user_id" });
    }
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
        <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse" style={{ fontFamily: "var(--font-heading)" }}><T>Loading...</T></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 md:px-12 py-12 md:py-20 max-w-2xl">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Edit Profile" }]} className="mb-10" />

        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-px bg-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}><T>Profile</T></span>
        </div>
        <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-8" style={{ fontFamily: "var(--font-display)" }}>
          <T>Edit</T> <em className="italic text-primary"><T>Profile</T></em>
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
              <span className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Profile Picture</T> *</span>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                className="text-xs text-primary hover:underline transition-all duration-300" style={{ fontFamily: "var(--font-body)" }}>
                {uploadingAvatar ? <T>Uploading…</T> : <T>Change photo</T>}
              </button>
              <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}><T>JPG, PNG or WebP. Max 5MB. Required.</T></p>
            </div>
          </div>

          {/* Preferred Language */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}>
              <Languages className="inline h-3 w-3 mr-1.5" /><T>Preferred Language</T>
            </label>
            <p className="text-[10px] text-muted-foreground mb-2" style={{ fontFamily: "var(--font-body)" }}>
              <T>The entire website will be translated to your preferred language.</T>
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
            <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Full Name</T> *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100}
              className={inputCls} placeholder="Your full name" style={{ fontFamily: "var(--font-body)" }} />
          </div>

          {/* Bio */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Bio</T></label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4}
              className="w-full bg-transparent border border-border focus:border-primary outline-none p-4 text-sm transition-colors duration-500 resize-none"
              placeholder="Tell us about yourself..." style={{ fontFamily: "var(--font-body)" }} />
            <span className="text-[10px] text-muted-foreground mt-1 block text-right" style={{ fontFamily: "var(--font-body)" }}>{bio.length}/500</span>
          </div>

          {/* Portfolio URL */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Portfolio URL</T></label>
            <input type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} maxLength={255}
              className={inputCls} placeholder="https://your-portfolio.com" style={{ fontFamily: "var(--font-body)" }} />
          </div>

          {/* Communication Address */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}>
              <MapPin className="inline h-3 w-3 mr-2" /><T>Communication Address</T>
            </span>
            <div className="space-y-5">
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Address Line 1</T></label>
                <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} maxLength={200}
                  className={inputCls} placeholder="Street address" style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Address Line 2</T></label>
                <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} maxLength={200}
                  className={inputCls} placeholder="Apartment, suite, etc." style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Country</T></label>
                  <select value={country} onChange={(e) => handleCountryChange(e.target.value)}
                    className={`${inputCls} bg-background`} style={{ fontFamily: "var(--font-body)" }}>
                    <option value="">Select country</option>
                    {availableCountries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>State / Province</T></label>
                  {availableStates.length > 0 ? (
                    <select value={state} onChange={(e) => handleStateChange(e.target.value)}
                      className={`${inputCls} bg-background`} style={{ fontFamily: "var(--font-body)" }}>
                      <option value="">Select state</option>
                      {availableStates.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={state} onChange={(e) => setState(e.target.value)} maxLength={100}
                      className={inputCls} placeholder={country ? "Enter state" : "Select country first"} disabled={!country}
                      style={{ fontFamily: "var(--font-body)" }} />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>City</T></label>
                  {availableCities.length > 0 ? (
                    <select value={city} onChange={(e) => setCity(e.target.value)}
                      className={`${inputCls} bg-background`} style={{ fontFamily: "var(--font-body)" }}>
                      <option value="">Select city</option>
                      {availableCities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} maxLength={100}
                      className={inputCls} placeholder={state ? "Enter city" : "Select state first"} disabled={!state && availableStates.length > 0}
                      style={{ fontFamily: "var(--font-body)" }} />
                  )}
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Postal Code</T></label>
                  <input type="text" value={postalCode} onChange={(e) => handlePostalCodeChange(e.target.value)} maxLength={10}
                    className={`${inputCls} ${errors.postalCode ? "border-destructive" : ""}`} placeholder="Postal / ZIP code" style={{ fontFamily: "var(--font-body)" }} />
                  {errors.postalCode && (
                    <span className="text-[10px] text-destructive flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                      <AlertCircle className="h-3 w-3" /> {errors.postalCode}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Numbers */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}>
              <Phone className="inline h-3 w-3 mr-2" /><T>Contact Numbers</T>
            </span>
            <div className="space-y-5">
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Phone Number</T></label>
                <input type="tel" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} maxLength={20}
                  className={`${inputCls} ${errors.phone ? "border-destructive" : ""}`} placeholder="+91 XXXXX XXXXX" style={{ fontFamily: "var(--font-body)" }} />
                {errors.phone && (
                  <span className="text-[10px] text-destructive flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <AlertCircle className="h-3 w-3" /> {errors.phone}
                  </span>
                )}
              </div>
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>WhatsApp Number</T></label>
                <input type="tel" value={whatsapp} onChange={(e) => handleWhatsappChange(e.target.value)} maxLength={20}
                  className={`${inputCls} ${errors.whatsapp ? "border-destructive" : ""}`} placeholder="+91 XXXXX XXXXX" style={{ fontFamily: "var(--font-body)" }} />
                {errors.whatsapp && (
                  <span className="text-[10px] text-destructive flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <AlertCircle className="h-3 w-3" /> {errors.whatsapp}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}>
              <Building2 className="inline h-3 w-3 mr-2" /><T>Bank Account Details</T>
            </span>
            <div className="space-y-5">
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Account Holder Name</T></label>
                <input type="text" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} maxLength={150}
                  className={inputCls} placeholder="Name as on bank account" style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div>
                <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Account Number</T></label>
                <input type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} maxLength={30}
                  className={inputCls} placeholder="Account number" style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Bank Name</T></label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={100}
                    className={inputCls} placeholder="Bank name" style={{ fontFamily: "var(--font-body)" }} />
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>IFSC Code</T></label>
                  <input type="text" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} maxLength={20}
                    className={inputCls} placeholder="IFSC code" style={{ fontFamily: "var(--font-body)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* National ID Upload */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}>
              <Shield className="inline h-3 w-3 mr-2" /><T>Identity Verification</T>
            </span>
            <p className="text-xs text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>
              <T>Upload a government-issued photo ID (Aadhaar, Passport, Driving Licence, etc.). This is kept private and secure.</T>
            </p>
            <div className="flex items-center gap-4">
              {nationalIdUrl ? (
                <span className="text-xs text-green-500 flex items-center gap-1" style={{ fontFamily: "var(--font-body)" }}>
                  ✓ <T>National ID uploaded</T>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}><T>No file uploaded</T></span>
              )}
              <button type="button" onClick={() => idFileRef.current?.click()} disabled={uploadingId}
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500 disabled:opacity-50"
                style={{ fontFamily: "var(--font-heading)" }}>
                {uploadingId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                {nationalIdUrl ? <T>Replace</T> : <T>Upload</T>} ID
              </button>
              <input ref={idFileRef} type="file" accept="image/*,application/pdf" onChange={handleIdUpload} className="hidden" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2" style={{ fontFamily: "var(--font-body)" }}><T>JPG, PNG, WebP or PDF. Max 10MB.</T></p>
          </div>

          {/* Social Media Links */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}><T>Social Media Links</T></span>
            <div className="space-y-5">
              {/* Facebook */}
              <div>
                <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  <Facebook className="h-3 w-3" /> <T>Facebook</T>
                </label>
                <div className="flex items-center gap-0">
                  <span className="text-xs text-muted-foreground bg-muted border-b border-l border-t border-border px-3 py-3 whitespace-nowrap select-none" style={{ fontFamily: "var(--font-body)" }}>
                    https://www.facebook.com/
                  </span>
                  <input
                    type="text"
                    value={facebookUrl}
                    onChange={(e) => handleFacebookChange(e.target.value)}
                    maxLength={100}
                    className={`${inputCls} flex-1 ${errors.facebook ? "border-destructive" : ""}`}
                    placeholder="yourprofile"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                  {facebookUrl.trim() && !errors.facebook && (
                    <button
                      type="button"
                      disabled={verifyingFb}
                      onClick={() => {
                        setVerifyingFb(true);
                        window.open(`https://www.facebook.com/${facebookUrl.trim()}`, "_blank", "noopener,noreferrer");
                        setFbVerified(true);
                        setVerifyingFb(false);
                      }}
                      className="ml-2 inline-flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase px-3 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-300 whitespace-nowrap"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      <T>Verify</T>
                    </button>
                  )}
                </div>
                {errors.facebook && (
                  <span className="text-[10px] text-destructive flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <AlertCircle className="h-3 w-3" /> {errors.facebook}
                  </span>
                )}
                {!errors.facebook && fbVerified === true && (
                  <span className="text-[10px] text-green-500 flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <CheckCircle2 className="h-3 w-3" /> <T>Opened for verification — confirm the profile exists</T>
                  </span>
                )}
              </div>

              {/* Instagram */}
              <div>
                <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  <Instagram className="h-3 w-3" /> <T>Instagram</T>
                </label>
                <div className="flex items-center gap-0">
                  <span className="text-xs text-muted-foreground bg-muted border-b border-l border-t border-border px-3 py-3 whitespace-nowrap select-none" style={{ fontFamily: "var(--font-body)" }}>
                    https://www.instagram.com/
                  </span>
                  <input
                    type="text"
                    value={instagramUrl}
                    onChange={(e) => handleInstagramChange(e.target.value)}
                    maxLength={30}
                    className={`${inputCls} flex-1 ${errors.instagram ? "border-destructive" : ""}`}
                    placeholder="yourhandle"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                  {instagramUrl.trim() && !errors.instagram && (
                    <button
                      type="button"
                      disabled={verifyingIg}
                      onClick={() => {
                        setVerifyingIg(true);
                        window.open(`https://www.instagram.com/${instagramUrl.trim()}`, "_blank", "noopener,noreferrer");
                        setIgVerified(true);
                        setVerifyingIg(false);
                      }}
                      className="ml-2 inline-flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase px-3 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-300 whitespace-nowrap"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      <T>Verify</T>
                    </button>
                  )}
                </div>
                {errors.instagram && (
                  <span className="text-[10px] text-destructive flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <AlertCircle className="h-3 w-3" /> {errors.instagram}
                  </span>
                )}
                {!errors.instagram && igVerified === true && (
                  <span className="text-[10px] text-green-500 flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <CheckCircle2 className="h-3 w-3" /> <T>Opened for verification — confirm the profile exists</T>
                  </span>
                )}
              </div>

              {/* Twitter/X */}
              <div>
                <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  <Twitter className="h-3 w-3" /> <T>Twitter / X</T>
                </label>
                <div className="flex items-center gap-0">
                  <span className="text-xs text-muted-foreground bg-muted border-b border-l border-t border-border px-3 py-3 whitespace-nowrap select-none" style={{ fontFamily: "var(--font-body)" }}>
                    https://x.com/
                  </span>
                  <input
                    type="text"
                    value={twitterUrl}
                    onChange={(e) => handleTwitterChange(e.target.value)}
                    maxLength={15}
                    className={`${inputCls} flex-1 ${errors.twitter ? "border-destructive" : ""}`}
                    placeholder="yourhandle"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                  {twitterUrl.trim() && !errors.twitter && (
                    <button
                      type="button"
                      disabled={verifyingTw}
                      onClick={() => {
                        setVerifyingTw(true);
                        window.open(`https://x.com/${twitterUrl.trim()}`, "_blank", "noopener,noreferrer");
                        setTwVerified(true);
                        setVerifyingTw(false);
                      }}
                      className="ml-2 inline-flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase px-3 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-300 whitespace-nowrap"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      <T>Verify</T>
                    </button>
                  )}
                </div>
                {errors.twitter && (
                  <span className="text-[10px] text-destructive flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <AlertCircle className="h-3 w-3" /> {errors.twitter}
                  </span>
                )}
                {!errors.twitter && twVerified === true && (
                  <span className="text-[10px] text-green-500 flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <CheckCircle2 className="h-3 w-3" /> <T>Opened for verification — confirm the profile exists</T>
                  </span>
                )}
              </div>

              {/* YouTube */}
              <div>
                <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  <Youtube className="h-3 w-3" /> <T>YouTube</T>
                </label>
                <div className="flex items-center gap-0">
                  <span className="text-xs text-muted-foreground bg-muted border-b border-l border-t border-border px-3 py-3 whitespace-nowrap select-none" style={{ fontFamily: "var(--font-body)" }}>
                    https://youtube.com/@
                  </span>
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => handleYoutubeChange(e.target.value)}
                    maxLength={100}
                    className={`${inputCls} flex-1 ${errors.youtube ? "border-destructive" : ""}`}
                    placeholder="yourchannel"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                  {youtubeUrl.trim() && !errors.youtube && (
                    <button
                      type="button"
                      disabled={verifyingYt}
                      onClick={() => {
                        setVerifyingYt(true);
                        window.open(`https://www.youtube.com/@${youtubeUrl.trim()}`, "_blank", "noopener,noreferrer");
                        setYtVerified(true);
                        setVerifyingYt(false);
                      }}
                      className="ml-2 inline-flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase px-3 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-300 whitespace-nowrap"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      <T>Verify</T>
                    </button>
                  )}
                </div>
                {errors.youtube && (
                  <span className="text-[10px] text-destructive flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <AlertCircle className="h-3 w-3" /> {errors.youtube}
                  </span>
                )}
                {!errors.youtube && ytVerified === true && (
                  <span className="text-[10px] text-green-500 flex items-center gap-1 mt-1" style={{ fontFamily: "var(--font-body)" }}>
                    <CheckCircle2 className="h-3 w-3" /> <T>Opened for verification — confirm the profile exists</T>
                  </span>
                )}
              </div>

              {/* Website */}
              <div>
                <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  <Globe className="h-3 w-3" /> <T>Website URL</T>
                </label>
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} maxLength={500}
                  className={inputCls} placeholder="https://yourwebsite.com" style={{ fontFamily: "var(--font-body)" }} />
              </div>
            </div>
          </div>

          {/* Photography Interests */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Photography Interests</T></label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                    className={`text-[11px] tracking-[0.1em] px-4 py-2 border transition-all duration-500 ${
                      selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/50"
                    }`} style={{ fontFamily: "var(--font-heading)" }}>
                    <T>{interest}</T>
                    {selected && <X className="inline h-3 w-3 ml-1.5 -mr-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Settings */}
          <div className="border border-border p-8">
            <span className={sectionHeadCls} style={{ fontFamily: "var(--font-heading)" }}><T>Account Settings</T></span>
            <div className="mb-6">
              <span className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Email Address</T></span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span style={{ fontFamily: "var(--font-body)" }}>{user?.email}</span>
                <span className="text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border border-border text-muted-foreground/60 ml-2" style={{ fontFamily: "var(--font-heading)" }}>
                  <T>Cannot be changed</T>
                </span>
              </div>
            </div>
            <div>
              <span className={labelCls} style={{ fontFamily: "var(--font-heading)" }}><T>Password</T></span>
              <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>
                <T>We'll send a password reset link to your email address.</T>
              </p>
              <button type="button" onClick={handlePasswordReset} disabled={sendingReset}
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-border hover:border-primary hover:text-primary transition-all duration-500 disabled:opacity-50"
                style={{ fontFamily: "var(--font-heading)" }}>
                <KeyRound className="h-3 w-3" />
                {sendingReset ? <T>Sending…</T> : <T>Send Reset Link</T>}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-500 disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <T>Save Changes</T>
            </button>
            <Link to="/dashboard"
              className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-500"
              style={{ fontFamily: "var(--font-heading)" }}>
              <T>Cancel</T>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
};

export default EditProfile;
