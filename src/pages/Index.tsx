import { Camera, ArrowRight, ArrowDown, Trophy, BookOpen, Newspaper, Aperture, Eye, Layers, Award, User, Expand, Calendar, Rss, Users, Globe, MessageCircle, Facebook, Instagram, Twitter, Youtube, Linkedin, Github, Music2, MapPin, Phone as PhoneIcon, Send as SendIcon } from "lucide-react";
import AdPlacement from "@/components/AdPlacement";
import T from "@/components/T";
import { Link, useNavigate } from "react-router-dom";
import { motion, type Variants, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useEffect, useState, useCallback, lazy, Suspense, memo, useRef } from "react";
const Lightbox = lazy(() => import("@/components/Lightbox"));
const PhotoOfTheDay = lazy(() => import("@/components/PhotoOfTheDay"));
const FeaturedArtist = lazy(() => import("@/components/FeaturedArtist"));
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { profilesPublic } from "@/lib/profilesPublic";
import { toast } from "@/hooks/use-toast";
import { getAdminIds, resolveName } from "@/lib/adminBrand";

/* Classic easing — gentle, cinematic transitions */
const classicEase = [0.4, 0, 0.2, 1] as const;
const slowEase = [0.25, 0.1, 0.25, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2, duration: 1.2, ease: classicEase },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { delay: i * 0.2, duration: 1.4, ease: slowEase },
  }),
};

const defaultHeroSlides = [
  { src: "/images/lives-on-life.jpg", title: "Lives on Life", category: "Aerial" },
  { src: "/images/sadhu.jpg", title: "The Ascetic", category: "Portrait" },
  { src: "/images/hero-1.jpg", title: "Breakfast", category: "Wildlife" },
  { src: "/images/innocence.jpg", title: "Innocence", category: "Portrait" },
  { src: "/images/hero-2.jpg", title: "Flying Food", category: "Action" },
];

const ITEMS_PER_PAGE = 20;

const fallbackGalleryWorks = [
  { src: "/images/lives-on-life.jpg", title: "Lives on Life", category: "Aerial" },
  { src: "/images/sadhu.jpg", title: "The Ascetic", category: "Portrait" },
  { src: "/images/hero-1.jpg", title: "Breakfast", category: "Wildlife" },
  { src: "/images/after-prayer.jpg", title: "After the Prayer", category: "Street" },
  { src: "/images/innocence.jpg", title: "Innocence", category: "Portrait" },
  { src: "/images/life-in-summer.jpg", title: "Life in Summer", category: "Street" },
  { src: "/images/hero-3.jpg", title: "Morning Snacks", category: "Wildlife" },
  { src: "/images/portrait-1.jpg", title: "The Holy Dip", category: "Portrait" },
  { src: "/images/hero-4.jpg", title: "The Brunch", category: "Wildlife" },
  { src: "/images/hero-2.jpg", title: "Flying Food", category: "Action" },
  // New uploads
  { src: "/images/twilight-boats.jpg", title: "Twilight Boats", category: "Landscape" },
  { src: "/images/the-hand.jpg", title: "The Hand", category: "Fine Art" },
  { src: "/images/the-craftsman.jpg", title: "The Craftsman", category: "Documentary" },
  { src: "/images/devotion.jpg", title: "Devotion", category: "Documentary" },
  { src: "/images/hercules.jpg", title: "Hercules", category: "Action" },
  { src: "/images/behind-the-veil.jpg", title: "Behind the Veil", category: "Fine Art" },
  { src: "/images/wall-art.jpg", title: "Wall Art", category: "Street" },
  { src: "/images/dry-earth.jpg", title: "Dry Earth", category: "Portrait" },
  { src: "/images/frozen-love.jpg", title: "Frozen Love", category: "Fine Art" },
  { src: "/images/pottery.jpg", title: "Pottery", category: "Documentary" },
  // Extended collection
  { src: "/images/sadhu.jpg", title: "Eternal Gaze", category: "Portrait" },
  { src: "/images/lives-on-life.jpg", title: "Above the Delta", category: "Aerial" },
  { src: "/images/hero-1.jpg", title: "Dawn Feast", category: "Wildlife" },
  { src: "/images/twilight-boats.jpg", title: "Still Waters", category: "Landscape" },
  { src: "/images/the-hand.jpg", title: "Reaching Out", category: "Fine Art" },
  { src: "/images/pottery.jpg", title: "Earth & Hands", category: "Documentary" },
  { src: "/images/hero-3.jpg", title: "Feathered Grace", category: "Wildlife" },
  { src: "/images/hercules.jpg", title: "The Wrestler", category: "Action" },
  { src: "/images/wall-art.jpg", title: "Living Canvas", category: "Street" },
  { src: "/images/dry-earth.jpg", title: "Crown of Nature", category: "Portrait" },
  { src: "/images/frozen-love.jpg", title: "Golden Bloom", category: "Fine Art" },
  { src: "/images/the-craftsman.jpg", title: "Forge & Steam", category: "Documentary" },
  { src: "/images/after-prayer.jpg", title: "Sacred Moments", category: "Street" },
  { src: "/images/devotion.jpg", title: "Faithful Souls", category: "Documentary" },
  { src: "/images/life-in-summer.jpg", title: "Monsoon Fields", category: "Street" },
  { src: "/images/innocence.jpg", title: "Pure Light", category: "Portrait" },
  { src: "/images/hero-4.jpg", title: "River Dance", category: "Wildlife" },
  { src: "/images/portrait-1.jpg", title: "Morning Ritual", category: "Portrait" },
  { src: "/images/hero-2.jpg", title: "Aerial Hunt", category: "Action" },
  { src: "/images/twilight-boats.jpg", title: "Blue Hour", category: "Landscape" },
];

interface PortfolioImage {
  id?: string;
  src: string;
  title: string;
  category: string;
  is_pinned?: boolean;
  is_trending?: boolean;
  view_count?: number;
}

interface WinnerShowcase {
  id: string;
  title: string;
  photos: string[];
  competition_title: string;
  photographer_name: string | null;
  photographer_avatar: string | null;
}

interface CertificateShowcase {
  id: string;
  title: string;
  type: string;
  issued_at: string;
  recipient_name: string | null;
  recipient_avatar: string | null;
  is_featured: boolean;
  featured_quote: string | null;
}

interface Testimonial {
  id: string;
  testimonial: string;
  user_name: string | null;
  cert_title: string | null;
  photo_url: string | null;
}

interface TierConfig {
  name: string;
  min_certs: number;
  color: string;
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  cert_count: number;
  tier: string;
}

interface JournalPreview {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  published_at: string | null;
  author_name: string | null;
}

interface CompetitionPreview {
  id: string;
  title: string;
  category: string;
  cover_image_url: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  prize_info: string | null;
}

interface CoursePreview {
  id: string;
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  cover_image_url: string | null;
  is_free: boolean;
  author_name: string | null;
  is_featured: boolean;
  labels: string[];
}

const fallbackCompetitions: CompetitionPreview[] = [
  {
    id: "fallback-comp-1",
    title: "Monsoon Street Stories",
    category: "Street",
    cover_image_url: "/images/after-prayer.jpg",
    status: "open",
    starts_at: "2026-03-01T00:00:00.000Z",
    ends_at: "2026-03-21T23:59:59.000Z",
    prize_info: "$1,500",
  },
  {
    id: "fallback-comp-2",
    title: "Faces of Devotion",
    category: "Portrait",
    cover_image_url: "/images/devotion.jpg",
    status: "upcoming",
    starts_at: "2026-03-25T00:00:00.000Z",
    ends_at: "2026-04-20T23:59:59.000Z",
    prize_info: "$2,000",
  },
  {
    id: "fallback-comp-3",
    title: "Twilight River Frames",
    category: "Landscape",
    cover_image_url: "/images/twilight-boats.jpg",
    status: "closed",
    starts_at: "2026-01-01T00:00:00.000Z",
    ends_at: "2026-01-31T23:59:59.000Z",
    prize_info: "$1,000",
  },
  {
    id: "fallback-comp-4",
    title: "Artisan Hands",
    category: "Documentary",
    cover_image_url: "/images/the-craftsman.jpg",
    status: "judging",
    starts_at: "2026-02-01T00:00:00.000Z",
    ends_at: "2026-02-28T23:59:59.000Z",
    prize_info: "$1,250",
  },
];

const fallbackCourses: CoursePreview[] = [
  {
    id: "fallback-course-1",
    title: "Street Light Composition",
    slug: "street-light-composition",
    category: "Street",
    difficulty: "Beginner",
    cover_image_url: "/images/wall-art.jpg",
    is_free: true,
    author_name: "Lens Academy",
    is_featured: true,
    labels: ["Most Demand"],
  },
  {
    id: "fallback-course-2",
    title: "Portrait Storytelling",
    slug: "portrait-storytelling",
    category: "Portrait",
    difficulty: "Intermediate",
    cover_image_url: "/images/portrait-1.jpg",
    is_free: false,
    author_name: "Editorial Team",
    is_featured: false,
    labels: ["Few Seats Left"],
  },
  {
    id: "fallback-course-3",
    title: "Wildlife Timing Masterclass",
    slug: "wildlife-timing-masterclass",
    category: "Wildlife",
    difficulty: "Advanced",
    cover_image_url: "/images/hero-4.jpg",
    is_free: false,
    author_name: "Field Mentors",
    is_featured: true,
    labels: ["Early Bird Offer"],
  },
  {
    id: "fallback-course-4",
    title: "Documentary Mood & Tone",
    slug: "documentary-mood-tone",
    category: "Documentary",
    difficulty: "Beginner",
    cover_image_url: "/images/the-hand.jpg",
    is_free: true,
    author_name: "Community Studio",
    is_featured: false,
    labels: [],
  },
];

const fallbackWinners: WinnerShowcase[] = [
  {
    id: "fallback-winner-1",
    title: "Silent Prayer",
    photos: ["/images/after-prayer.jpg"],
    competition_title: "Monsoon Street Stories",
    photographer_name: "Community Winner",
    photographer_avatar: null,
  },
  {
    id: "fallback-winner-2",
    title: "Twilight Departure",
    photos: ["/images/twilight-boats.jpg"],
    competition_title: "River Light Awards",
    photographer_name: "Featured Member",
    photographer_avatar: null,
  },
  {
    id: "fallback-winner-3",
    title: "Maker's Focus",
    photos: ["/images/the-craftsman.jpg"],
    competition_title: "Human Stories",
    photographer_name: "Creative Circle",
    photographer_avatar: null,
  },
];

const fallbackCertificates: CertificateShowcase[] = [
  {
    id: "fallback-cert-1",
    title: "Advanced Composition Excellence",
    type: "course_completion",
    issued_at: "2026-02-14T00:00:00.000Z",
    recipient_name: "Certified Member",
    recipient_avatar: null,
    is_featured: true,
    featured_quote: "Precision in framing creates emotional impact.",
  },
  {
    id: "fallback-cert-2",
    title: "Documentary Storytelling Certification",
    type: "achievement",
    issued_at: "2026-01-20T00:00:00.000Z",
    recipient_name: "Editorial Graduate",
    recipient_avatar: null,
    is_featured: false,
    featured_quote: null,
  },
  {
    id: "fallback-cert-3",
    title: "Portrait Light Mastery",
    type: "course_completion",
    issued_at: "2026-01-05T00:00:00.000Z",
    recipient_name: "Studio Artist",
    recipient_avatar: null,
    is_featured: false,
    featured_quote: null,
  },
];

const fallbackJournalArticles: JournalPreview[] = [
  {
    id: "fallback-article-1",
    title: "Mastering Black & White: More Than Just Desaturation",
    slug: "mastering-black-white",
    excerpt: "Learn how contrast, texture and intention shape compelling monochrome stories.",
    cover_image_url: "/images/behind-the-veil.jpg",
    tags: ["Editing", "B&W"],
    published_at: "2026-02-10T00:00:00.000Z",
    author_name: "Editorial Desk",
  },
  {
    id: "fallback-article-2",
    title: "Reading Light Before You Lift the Camera",
    slug: "reading-light-before-shooting",
    excerpt: "A practical field guide to predict mood and contrast before your first frame.",
    cover_image_url: "/images/lives-on-life.jpg",
    tags: ["Technique"],
    published_at: "2026-01-22T00:00:00.000Z",
    author_name: "Journal Team",
  },
  {
    id: "fallback-article-3",
    title: "From Frame to Narrative in Documentary Work",
    slug: "frame-to-narrative-documentary",
    excerpt: "Transform single strong images into coherent visual essays that keep attention.",
    cover_image_url: "/images/devotion.jpg",
    tags: ["Documentary"],
    published_at: "2026-01-09T00:00:00.000Z",
    author_name: "Lens Notes",
  },
  {
    id: "fallback-article-4",
    title: "Travel Photography Without Visual Clichés",
    slug: "travel-photography-without-cliches",
    excerpt: "Simple methods to create fresh perspectives in heavily photographed places.",
    cover_image_url: "/images/twilight-boats.jpg",
    tags: ["Travel"],
    published_at: "2025-12-28T00:00:00.000Z",
    author_name: "Stories Desk",
  },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState(defaultHeroSlides);
  const [winners, setWinners] = useState<WinnerShowcase[]>([]);
  const [certificates, setCertificates] = useState<CertificateShowcase[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [certTiers, setCertTiers] = useState<TierConfig[]>([]);
  const [certLeaderboard, setCertLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [journalArticles, setJournalArticles] = useState<JournalPreview[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionPreview[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<(JournalPreview & { cover_image_url: string | null; body?: string }) | null>(null);
  const [courses, setCourses] = useState<CoursePreview[]>([]);
  const [galleryWorks, setGalleryWorks] = useState<PortfolioImage[]>(fallbackGalleryWorks);
  const [dataLoading, setDataLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [compFilter, setCompFilter] = useState("All");
  const [heroContent, setHeroContent] = useState({
    label: "Photography Platform",
    heading: "Every Frame",
    heading_accent: "Tells",
    subtitle: "A curated space for photographers who see the world differently. Compete globally. Learn from masters. Share your stories.",
    cta_text: "Begin Your Journey",
    cta_link: "/signup",
  });
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  // Scroll-linked background for middle sections
  const middleRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: middleRef, offset: ["start start", "end end"] });

  // Read resolved CSS colors from the DOM so framer-motion can interpolate real color values
  const [scrollColors, setScrollColors] = useState<string[]>([]);
  useEffect(() => {
    const readColors = () => {
      const style = getComputedStyle(document.documentElement);
      const get = (v: string) => {
        const raw = style.getPropertyValue(v).trim();
        return raw ? `hsl(${raw})` : "hsl(0 0% 4%)";
      };
      setScrollColors([
        get("--scroll-bg-1"),
        get("--scroll-bg-2"),
        get("--scroll-bg-3"),
        get("--scroll-bg-4"),
        get("--scroll-bg-5"),
        get("--scroll-bg-3"),
        get("--scroll-bg-1"),
      ]);
    };
    readColors();
    // Re-read when theme changes
    const observer = new MutationObserver(readColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const scrollBg = useTransform(
    scrollYProgress,
    [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1],
    scrollColors.length === 7 ? scrollColors : [
      "hsl(210 12% 5%)", "hsl(200 18% 8%)", "hsl(195 14% 6%)",
      "hsl(185 20% 9%)", "hsl(205 16% 7%)", "hsl(195 14% 6%)", "hsl(210 12% 5%)",
    ]
  );

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const prevLightbox = useCallback(() => setLightboxIndex((i) => (i - 1 + galleryWorks.length) % galleryWorks.length), [galleryWorks.length]);
  const nextLightbox = useCallback(() => setLightboxIndex((i) => (i + 1) % galleryWorks.length), [galleryWorks.length]);

  // Preload next hero slide for smooth transition
  useEffect(() => {
    const nextIdx = (currentSlide + 1) % heroSlides.length;
    const img = new Image();
    img.src = heroSlides[nextIdx].src;
  }, [currentSlide]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadingSafetyTimeout = window.setTimeout(() => {
      if (!isActive) return;
      setCompetitions((prev) => (prev.length > 0 ? prev : fallbackCompetitions));
      setCourses((prev) => (prev.length > 0 ? prev : fallbackCourses));
      setWinners((prev) => (prev.length > 0 ? prev : fallbackWinners));
      setCertificates((prev) => (prev.length > 0 ? prev : fallbackCertificates));
      setJournalArticles((prev) => (prev.length > 0 ? prev : fallbackJournalArticles));
      setDataLoading(false);
    }, 3000);

    // Fetch winners and certificates in parallel — single round-trip each
    const fetchShowcaseData = async () => {
      try {
      const [winnersRes, certsRes, articlesRes, compsListRes, coursesRes, portfolioRes, bannersRes, heroContentRes] = await Promise.all([
        supabase
          .from("competition_entries")
          .select("id, title, photos, competition_id, user_id")
          .eq("status", "winner")
          .order("updated_at", { ascending: false })
          .limit(6),
        supabase
          .from("certificates")
          .select("id, title, type, issued_at, user_id, is_featured, featured_quote")
          .order("issued_at", { ascending: false })
          .limit(6),
        supabase
          .from("journal_articles")
          .select("id, title, slug, excerpt, cover_image_url, tags, published_at, author_id")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(4),
        supabase
          .from("competitions")
          .select("id, title, category, cover_image_url, status, starts_at, ends_at, prize_info, updated_at")
          .order("updated_at", { ascending: false })
          .limit(4),
        supabase
          .from("courses")
          .select("id, title, slug, category, difficulty, cover_image_url, is_free, author_id, is_featured, labels")
          .eq("status", "published")
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("portfolio_images")
          .select("id, title, category, image_url, sort_order, is_pinned, is_trending, view_count")
          .eq("is_visible", true)
          .order("is_pinned", { ascending: false })
          .order("sort_order", { ascending: true }),
        supabase
          .from("hero_banners")
          .select("id, title, category, image_url, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("site_settings")
          .select("value")
          .eq("key", "hero_content")
          .maybeSingle(),
      ]);

      if (heroContentRes.data?.value) {
        setHeroContent(heroContentRes.data.value as any);
      }

      const winnerData = winnersRes.data || [];
      const certData = certsRes.data || [];
      const articleData = articlesRes.data || [];
      const compsListData = compsListRes.data || [];
      const coursesData = coursesRes.data || [];

      // Collect all unique user/comp IDs and fetch profiles + competitions in one parallel call
      const allUserIds = [...new Set([
        ...winnerData.map((e) => e.user_id),
        ...certData.map((c) => c.user_id),
        ...articleData.map((a) => a.author_id),
        ...coursesData.map((c) => c.author_id),
      ])];
      const compIds = [...new Set(winnerData.map((e) => e.competition_id))];

      const [profilesRes, compsRes, adminIds] = await Promise.all([
        allUserIds.length > 0
          ? profilesPublic().select("id, full_name, avatar_url").in("id", allUserIds)
          : Promise.resolve({ data: [] }),
        compIds.length > 0
          ? supabase.from("competitions").select("id, title").in("id", compIds)
          : Promise.resolve({ data: [] }),
        getAdminIds(),
      ]);

      const profileMap = new Map((profilesRes.data as any[] || []).map((p: any) => [p.id, p]));
      const compMap = new Map((compsRes.data || []).map((c) => [c.id, c.title]));

      const mappedWinners = winnerData.map((e) => ({
        id: e.id,
        title: e.title,
        photos: e.photos || [],
        competition_title: compMap.get(e.competition_id) || "Competition",
        photographer_name: resolveName(e.user_id, profileMap.get(e.user_id)?.full_name ?? null, adminIds),
        photographer_avatar: profileMap.get(e.user_id)?.avatar_url || null,
      }));
      setWinners(mappedWinners.length > 0 ? mappedWinners : fallbackWinners);

      const mappedCertificates = certData.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        issued_at: c.issued_at,
        recipient_name: resolveName(c.user_id, profileMap.get(c.user_id)?.full_name ?? null, adminIds),
        recipient_avatar: profileMap.get(c.user_id)?.avatar_url || null,
        is_featured: c.is_featured,
        featured_quote: c.featured_quote,
      }));
      setCertificates(mappedCertificates.length > 0 ? mappedCertificates : fallbackCertificates);

      // Defer secondary fetches (testimonials, tiers, featured article) — non-blocking
      const deferSecondary = async () => {
        try {
          const [{ data: testData }, { data: tierSetting }, { data: featData }] = await Promise.all([
            supabase.from("certificate_testimonials").select("id, testimonial, user_id, certificate_id, photo_url").eq("is_visible", true).order("sort_order").limit(6),
            supabase.from("site_settings").select("value").eq("key", "certificate_tiers").maybeSingle(),
            supabase.from("journal_articles").select("id, title, slug, excerpt, cover_image_url, tags, published_at, author_id, is_featured, body").eq("is_featured", true).eq("status", "published").limit(1).maybeSingle(),
          ]);

          if (testData && testData.length > 0) {
            const tUserIds = [...new Set(testData.map((t) => t.user_id))];
            const tCertIds = [...new Set(testData.map((t) => t.certificate_id))];
            const [{ data: tProfiles }, { data: tCerts }] = await Promise.all([
              profilesPublic().select("id, full_name").in("id", tUserIds),
              supabase.from("certificates").select("id, title").in("id", tCertIds),
            ]);
            const tpMap = new Map((tProfiles as any[] || []).map((p: any) => [p.id, p.full_name]) || []);
            const tcMap = new Map(tCerts?.map((c) => [c.id, c.title]) || []);
            setTestimonials(testData.map((t) => ({
              id: t.id, testimonial: t.testimonial, 
              user_name: resolveName(t.user_id, tpMap.get(t.user_id) || null, adminIds),
              cert_title: tcMap.get(t.certificate_id) || null, photo_url: t.photo_url,
            })));
          }

          if (Array.isArray(tierSetting?.value)) {
            const tiersArr = tierSetting.value as unknown as TierConfig[];
            setCertTiers(tiersArr);
            if (certData.length > 0) {
              const countMap = new Map<string, number>();
              certData.forEach((c) => countMap.set(c.user_id, (countMap.get(c.user_id) || 0) + 1));
              const sorted = [...countMap.entries()]
                .map(([uid, count]) => {
                  const tier = [...tiersArr].reverse().find((t) => count >= t.min_certs)?.name || "";
                  return { user_id: uid, full_name: profileMap.get(uid)?.full_name || null, avatar_url: profileMap.get(uid)?.avatar_url || null, cert_count: count, tier };
                })
                .sort((a, b) => b.cert_count - a.cert_count)
                .slice(0, 5);
              setCertLeaderboard(sorted);
            }
          }

          if (featData) {
            const authorName = profileMap.get(featData.author_id)?.full_name || null;
            setFeaturedArticle({
              id: featData.id, title: featData.title, slug: featData.slug, excerpt: featData.excerpt,
              cover_image_url: featData.cover_image_url, tags: featData.tags || [],
              published_at: featData.published_at, author_name: authorName, body: featData.body,
            });
          }
        } catch { /* secondary data is non-critical */ }
      };
      // Fire and forget — don't block primary render
      deferSecondary();
      } catch (err) {
        console.error("Failed to load showcase data:", err);
      } finally {
        window.clearTimeout(loadingSafetyTimeout);
        if (!isActive) return;
        setCompetitions((prev) => (prev.length > 0 ? prev : fallbackCompetitions));
        setCourses((prev) => (prev.length > 0 ? prev : fallbackCourses));
        setWinners((prev) => (prev.length > 0 ? prev : fallbackWinners));
        setCertificates((prev) => (prev.length > 0 ? prev : fallbackCertificates));
        setJournalArticles((prev) => (prev.length > 0 ? prev : fallbackJournalArticles));
        setDataLoading(false);
      }
    };

    fetchShowcaseData();

    return () => {
      isActive = false;
      window.clearTimeout(loadingSafetyTimeout);
    };
  }, []);

  return (
    <main className="min-h-screen text-foreground overflow-hidden">
      {/* Hero — Slow crossfade slideshow */}
      <section className="relative h-screen-safe flex items-end pb-20 md:pb-28 overflow-hidden" aria-label="Featured photography">
        <AnimatePresence mode="sync">
          {heroSlides.map((slide, i) => i === currentSlide && (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: slowEase }}
              className="absolute inset-0"
            >
              {/* Parallax layer — background shifts subtly */}
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1.15, x: "-3%", y: "2%" }}
                animate={{ scale: 1.05, x: "0%", y: "0%" }}
                exit={{ scale: 1, x: "3%", y: "-1%" }}
                transition={{ duration: 10, ease: [0.16, 1, 0.3, 1] }}
              >
                <img
                  src={slide.src}
                  alt={`${slide.title} — ${slide.category} photography by 50mm Retina World`}
                  className="w-full h-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                />
              </motion.div>
              {/* Depth overlay — subtle vignette for parallax depth feel */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-background/20 via-transparent to-background/30"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0.3 }}
                transition={{ duration: 4, ease: slowEase }}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Overlays — z-10 to stay above animated slides */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/50 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-transparent to-background/40 pointer-events-none" />

        {/* Hero content */}
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.2, ease: slowEase }}
            >
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: classicEase }}
                className="flex items-center gap-4 mb-6"
              >
                <div className="w-16 h-px bg-primary" />
                <span className="text-xs tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  <T>{heroContent.label}</T>
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.5, ease: classicEase }}
                className="text-5xl md:text-7xl lg:text-8xl font-light leading-[0.9] mb-6 tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <T>{heroContent.heading}</T>{" "}
                <em className="text-primary font-light italic"><T>{heroContent.heading_accent}</T></em>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.8, ease: slowEase }}
                className="text-sm md:text-base text-muted-foreground max-w-md leading-relaxed mb-12"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <T>{heroContent.subtitle}</T>
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1, ease: slowEase }}
                className="flex items-center gap-6"
              >
                <Link
                  to={heroContent.cta_link}
                  className="group inline-flex items-center gap-3 text-sm tracking-[0.15em] uppercase"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <span className="w-12 h-12 rounded-full bg-primary flex items-center justify-center group-hover:w-14 group-hover:h-14 transition-all duration-700">
                    <ArrowRight className="h-4 w-4 text-primary-foreground" />
                  </span>
                  <T>{heroContent.cta_text}</T>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Slide counter — hidden on small mobile to prevent overlap */}
        <div className="absolute right-6 md:right-12 bottom-24 z-10 hidden sm:flex flex-col items-end gap-3" aria-label="Slide navigation">
          {heroSlides.map((slide, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className="flex items-center gap-3 group"
              aria-label={`View ${slide.title}`}
            >
              <span className={`text-[10px] tracking-[0.2em] uppercase transition-opacity duration-700 ${
                i === currentSlide ? "opacity-100" : "opacity-0 group-hover:opacity-50"
              }`} style={{ fontFamily: "var(--font-heading)" }}>
                {slide.category}
              </span>
              <div className={`h-px transition-all duration-1000 ${
                i === currentSlide ? "w-12 bg-primary" : "w-4 bg-foreground/30 group-hover:bg-foreground/50"
              }`} />
            </button>
          ))}
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        >
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}><T>Scroll</T></span>
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </section>

      {/* Middle sections with scroll-based background */}
      <motion.div ref={middleRef} style={{ backgroundColor: scrollBg }} className="transition-colors duration-700">

      {/* Photo of the Day + Featured Artist — Split Layout */}
      <section className="py-8 md:py-12" aria-label="Spotlight">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <Suspense fallback={<div className="h-64 bg-muted/20 animate-pulse rounded-lg" />}>
              <PhotoOfTheDay />
            </Suspense>
            <Suspense fallback={<div className="h-64 bg-muted/20 animate-pulse rounded-lg" />}>
              <FeaturedArtist />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Header Ad Zone — below Spotlight */}
      <div className="container mx-auto px-6 md:px-12 py-4">
        <AdPlacement placement="header" variant="plain" />
      </div>

      {/* All Competitions Showcase — Grouped by Status */}
      <section className="py-24 md:py-32" aria-label="Competitions">
        <div className="container mx-auto px-6 md:px-12">
          <motion.header
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="flex items-end justify-between mb-16"
          >
            <div>
              <motion.div variants={fadeUp} custom={0} className="flex items-center gap-4 mb-4">
                <div className="w-12 h-px bg-primary" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  <T>Competitions</T>
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                <T>All</T> <em className="italic"><T>Competitions</T></em>
              </motion.h2>
            </div>
            <motion.div variants={fadeIn} custom={2}>
              <Link
                to="/competitions"
                className="group inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <T>View All</T> <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-500" />
              </Link>
            </motion.div>
          </motion.header>

          {(() => {
            const compTabs = ["All", "Upcoming", "Ongoing", "Closed"];
            const statusMap: Record<string, string[]> = {
              All: [],
              Upcoming: ["upcoming"],
              Ongoing: ["open", "active", "judging"],
              Closed: ["closed"],
            };
            const filtered = (compFilter === "All" ? competitions : competitions.filter(c => statusMap[compFilter]?.includes(c.status))).slice(0, 4);

            return (
              <>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
                  {compTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCompFilter(tab)}
                      className={`text-[10px] tracking-[0.25em] uppercase px-4 py-2 border transition-all duration-500 ${
                        compFilter === tab
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {dataLoading ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="border border-border overflow-hidden animate-pulse">
                        <div className="aspect-square bg-muted" />
                        <div className="p-4 space-y-2">
                          <div className="h-3 bg-muted rounded w-1/3" />
                          <div className="h-4 bg-muted rounded w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filtered.length > 0 ? (
                  <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                      {filtered.map((comp, i) => (
                        <motion.div
                          key={comp.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: i * 0.05, duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                        >
                          <Link to={`/competitions/${comp.id}`} className="group block border border-border hover:border-primary/40 transition-all duration-700 overflow-hidden">
                            {/* Image with hover-reveal overlay */}
                            <div className="relative aspect-square overflow-hidden bg-muted">
                              {comp.cover_image_url ? (
                                <img src={comp.cover_image_url} alt={comp.title} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" loading="lazy" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-muted flex items-center justify-center">
                                  <Trophy className="h-10 w-10 text-primary/30" />
                                </div>
                              )}

                              {/* Dark overlay on hover */}
                              <div className="absolute inset-0 bg-background/0 group-hover:bg-background/70 transition-all duration-500" />

                              {/* Content that slides up on hover */}
                              <div className="absolute inset-0 flex flex-col justify-end p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
                                <span className="text-[9px] tracking-[0.2em] uppercase text-primary block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                                  {comp.category}
                                </span>
                                <h3 className="text-lg md:text-xl font-light tracking-tight text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
                                  {comp.title}
                                </h3>
                                <div className="w-10 h-px bg-primary mb-3" />
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="h-3.5 w-3.5 text-primary" />
                                  <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                                    {comp.status === "closed"
                                      ? `Ended ${new Date(comp.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                      : comp.status === "open" || comp.status === "active"
                                      ? `Ends ${new Date(comp.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                      : `Starts ${new Date(comp.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary mt-1" style={{ fontFamily: "var(--font-heading)" }}>
                                  <T>View Details</T>
                                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-500" />
                                </span>
                              </div>

                              {/* Status badge - always visible */}
                              <div className="absolute top-3 left-3">
                                <span className={`text-[9px] tracking-[0.2em] uppercase px-3 py-1.5 inline-flex items-center gap-1 border bg-background/80 backdrop-blur-sm rounded-full ${
                                  comp.status === "open" || comp.status === "active" ? "border-primary text-primary"
                                  : comp.status === "judging" ? "border-yellow-500 text-yellow-500"
                                  : comp.status === "closed" ? "border-foreground/20 text-foreground/40"
                                  : "border-muted-foreground/40 text-muted-foreground"
                                }`} style={{ fontFamily: "var(--font-heading)" }}>
                                  {comp.status}
                                </span>
                              </div>

                              {/* Bottom gradient - hidden on hover */}
                              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/40 to-transparent group-hover:opacity-0 transition-opacity duration-500" />
                            </div>

                            {/* Footer: Grand Prize only */}
                            {comp.prize_info && (
                              <div className="px-5 py-3 border-t border-border bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] tracking-[0.3em] uppercase text-primary/70 font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                                    🏆 Grand Prize
                                  </span>
                                  <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
                                  <span className="text-sm font-bold text-primary tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                                    {comp.prize_info}
                                  </span>
                                </div>
                              </div>
                            )}
                          </Link>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <div className="text-center py-16 border border-dashed border-border rounded-sm">
                    <Trophy className="h-10 w-10 text-primary/30 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>No {compFilter.toLowerCase()} competitions found</p>
                    <Link to="/competitions" className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                      <T>Browse All</T> <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>

      {/* Featured Works — Redesigned */}
      <section id="works" className="py-12 md:py-20 relative" aria-label="Selected photography works">
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/30 to-transparent pointer-events-none" />

        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <motion.header
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-20"
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-px bg-primary" />
              <span className="text-[10px] tracking-[0.4em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Portfolio</T>
              </span>
              <div className="w-16 h-px bg-primary" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-light tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <T>Selected</T> <em className="italic text-primary"><T>Works</T></em>
            </motion.h2>
            <motion.p
              variants={fadeIn}
              custom={2}
              className="text-sm text-muted-foreground mt-4 max-w-md mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              A curated collection of moments frozen in time — click any image to explore
            </motion.p>
          </motion.header>

          {/* Category filter tabs */}
          {(() => {
            const categories = ["All", ...Array.from(new Set(galleryWorks.map(w => w.category)))];
            const filtered = activeCategory === "All" ? galleryWorks : galleryWorks.filter(w => w.category === activeCategory);
            const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
            const safePage = Math.min(currentPage, totalPages);
            const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
            // Build lightbox index map: paged index → original galleryWorks index
            const filteredIndexMap = paged.map(w => galleryWorks.indexOf(w));

            // Generate stable random featured indices
            const featuredSet = new Set<number>([0]);
            let next = 0;
            while (next < paged.length) {
              const gap = 12 + ((next * 7 + 13) % 14);
              next += gap;
              if (next < paged.length) featuredSet.add(next);
            }

            return (
              <>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setActiveCategory(cat); setCurrentPage(1); }}
                      className={`text-[10px] tracking-[0.25em] uppercase px-4 py-2 border transition-all duration-500 ${
                        activeCategory === cat
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <motion.div
                  layout
                  className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 auto-rows-fr gap-1 sm:gap-1.5"
                >
                  <AnimatePresence mode="popLayout">
                    {paged.map((work, i) => {
                      const isHero = featuredSet.has(i);
                      return (
                        <motion.div
                          key={`${work.src}-${work.title}`}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: Math.min(i * 0.015, 0.6) }}
                          className={`group relative overflow-hidden rounded-sm cursor-pointer bg-muted ${
                            isHero
                              ? "col-span-2 row-span-2 sm:col-span-3 sm:row-span-3 md:col-span-3 md:row-span-4 lg:col-span-4 lg:row-span-5 aspect-auto"
                              : "aspect-square"
                          }`}
                          onClick={() => openLightbox(filteredIndexMap[i])}
                        >
                          <img
                            src={work.src}
                            alt={`${work.title} — ${work.category}`}
                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-75"
                            loading={isHero ? "eager" : "lazy"}
                          />
                          {/* Trending badge */}
                          {work.is_trending && (
                            <div className="absolute top-1.5 left-1.5 z-10">
                              <span className="inline-flex items-center gap-1 text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 bg-primary text-primary-foreground rounded-sm" style={{ fontFamily: "var(--font-heading)" }}>
                                🔥 Trending
                              </span>
                            </div>
                          )}
                          {/* Pinned badge */}
                          {work.is_pinned && (
                            <div className={`absolute ${work.is_trending ? "top-6" : "top-1.5"} left-1.5 z-10`}>
                              <span className="inline-flex items-center gap-0.5 text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 bg-background/80 backdrop-blur-sm text-primary border border-primary/30 rounded-sm" style={{ fontFamily: "var(--font-heading)" }}>
                                📌 Pinned
                              </span>
                            </div>
                          )}
                          {/* View count */}
                          {(work.view_count || 0) > 0 && (
                            <div className="absolute bottom-1.5 right-1.5 z-10 opacity-80">
                              <span className="inline-flex items-center gap-0.5 text-[7px] px-1.5 py-0.5 bg-background/70 backdrop-blur-sm text-foreground/80 rounded-sm">
                                <Eye className="h-2.5 w-2.5" /> {(work.view_count || 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/60 ${
                            isHero ? "flex-col gap-2" : ""
                          }`}>
                            <Expand className={isHero ? "h-6 w-6 text-primary" : "h-3.5 w-3.5 text-primary"} />
                            {isHero && (
                              <>
                                <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>{work.category}</span>
                                <span className="text-lg font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>{work.title}</span>
                              </>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="text-[10px] tracking-[0.2em] uppercase px-4 py-2 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 text-[11px] border transition-all duration-300 ${
                          safePage === page
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                        }`}
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      className="text-[10px] tracking-[0.2em] uppercase px-4 py-2 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && (
        <Suspense fallback={null}>
          <Lightbox
            images={galleryWorks}
            currentIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={closeLightbox}
            onPrev={prevLightbox}
            onNext={nextLightbox}
          />
        </Suspense>
      )}
      </motion.div>

      <section id="about" className="py-24 md:py-32 relative" aria-label="Featured from the Journal">
        <div className="absolute inset-0 bg-gradient-to-b from-card/50 to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.8, ease: slowEase }}
            >
              <figure className="relative">
                <img
                  src={featuredArticle?.cover_image_url || "/images/sadhu.jpg"}
                  alt={featuredArticle?.title || "Featured photography article"}
                  className="w-full h-[500px] object-cover"
                  loading="lazy"
                />
                <div className="absolute -bottom-6 -right-6 w-48 h-48 border border-primary/20 transition-all duration-[2s] hidden md:block" />
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10 hidden md:block" />
              </figure>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-col justify-center"
            >
              <motion.div variants={fadeUp} custom={0} className="flex items-center gap-4 mb-6">
                <div className="w-12 h-px bg-primary" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  <T>Featured from Journal</T>
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-4xl md:text-6xl font-light leading-[1.1] mb-8" style={{ fontFamily: "var(--font-display)" }}>
                {featuredArticle ? (
                  <>{featuredArticle.title}</>
                ) : (
                  <><T>Photography is</T><br /><T>the art of</T> <em className="italic text-primary"><T>seeing</T></em></>
                )}
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-sm text-muted-foreground leading-relaxed mb-6 line-clamp-5" style={{ fontFamily: "var(--font-body)" }}>
                {featuredArticle?.body
                  ? featuredArticle.body.replace(/<[^>]*>/g, '').substring(0, 500)
                  : featuredArticle?.excerpt
                  ? featuredArticle.excerpt
                  : "We believe every photographer has a unique perspective. Our platform brings together competing visions, educational paths, and storytelling — creating a space where the art of photography thrives in all its forms. From wildlife to street, portrait to aerial — every genre has a home here."}
              </motion.p>
              {featuredArticle?.author_name && (
                <motion.p variants={fadeUp} custom={3} className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-6" style={{ fontFamily: "var(--font-heading)" }}>
                  By {featuredArticle.author_name}
                  {featuredArticle.published_at && (
                    <> · {new Date(featuredArticle.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
                  )}
                </motion.p>
              )}
              {featuredArticle?.tags && featuredArticle.tags.length > 0 && (
                <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-2 mb-10">
                  {featuredArticle.tags.map((tag) => (
                    <span key={tag} className="text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 border border-border text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                      {tag}
                    </span>
                  ))}
                </motion.div>
              )}
              <motion.div variants={fadeUp} custom={4}>
                <Link
                  to={featuredArticle ? `/journal/${featuredArticle.slug}` : "/journal"}
                  className="group inline-flex items-center gap-3 text-xs tracking-[0.15em] uppercase border-b border-foreground/30 pb-2 hover:border-primary transition-colors duration-700"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <T>Read Full Article</T>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-700" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>


      <section className="py-24 md:py-32" aria-label="Featured courses">
        <div className="container mx-auto px-6 md:px-12">
          <motion.header
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="flex items-end justify-between mb-16"
          >
            <div>
              <motion.div variants={fadeUp} custom={0} className="flex items-center gap-4 mb-4">
                <div className="w-12 h-px bg-primary" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  <T>Learn</T>
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                <T>Featured</T> <em className="italic"><T>Courses</T></em>
              </motion.h2>
            </div>
            <motion.div variants={fadeIn} custom={2}>
              <Link
                to="/courses"
                className="group inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <T>View All</T> <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-500" />
              </Link>
            </motion.div>
          </motion.header>

          {dataLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-border rounded-sm overflow-hidden animate-pulse">
                  <div className="h-48 bg-muted" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                  className="group border border-border hover:border-primary/40 transition-all duration-700 overflow-hidden"
                >
                  <Link to={`/courses/${course.slug}`} className="block">
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {course.cover_image_url ? (
                        <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[2s]" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
                      {/* Labels */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        {course.is_featured && (
                          <span className="text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 bg-primary text-primary-foreground rounded-sm" style={{ fontFamily: "var(--font-heading)" }}>
                            <T>Filling Up 1st</T>
                          </span>
                        )}
                        {course.labels?.map((label) => (
                          <span key={label} className="text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 bg-accent text-accent-foreground rounded-sm" style={{ fontFamily: "var(--font-heading)" }}>
                            {label}
                          </span>
                        ))}
                        <span className={`text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm ${course.is_free ? "bg-green-600 text-white" : "bg-blue-600 text-white"}`} style={{ fontFamily: "var(--font-heading)" }}>
                          {course.is_free ? <T>Free</T> : <T>Premium</T>}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] tracking-[0.15em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>{course.category}</span>
                        <span className="text-[9px] text-muted-foreground">·</span>
                        <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>{course.difficulty}</span>
                      </div>
                      <h3 className="text-base font-light leading-snug mb-1 group-hover:text-primary transition-colors duration-500" style={{ fontFamily: "var(--font-heading)" }}>{course.title}</h3>
                      {course.author_name && (
                        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-heading)" }}>
                          <T>by</T> {course.author_name}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-sm">
              <BookOpen className="h-10 w-10 text-secondary/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}><T>Courses coming soon</T></p>
              <Link to="/courses" className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Browse All</T> <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Competition Winners Showcase */}
      <section className="py-24 md:py-32" aria-label="Competition winners">
          <div className="container mx-auto px-6 md:px-12">
            <motion.header
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="flex items-end justify-between mb-16"
            >
              <div>
                <motion.div variants={fadeUp} custom={0} className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-px bg-primary" />
                  <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                    <T>Hall of Fame</T>
                  </span>
                </motion.div>
                <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                   <T>Competition</T> <em className="italic"><T>Winners</T></em>
                </motion.h2>
              </div>
              <motion.div variants={fadeIn} custom={2}>
                <Link
                  to="/winners"
                  className="group inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <T>View All</T> <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-500" />
                </Link>
              </motion.div>
            </motion.header>

          {dataLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-border overflow-hidden animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <div className="p-5 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="flex items-center gap-2 mt-3"><div className="w-7 h-7 rounded-full bg-muted" /><div className="h-3 bg-muted rounded w-20" /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : winners.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {winners.slice(0, 6).map((winner, i) => (
                <motion.div
                  key={winner.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                  className="group relative overflow-hidden border border-border hover:border-primary/40 transition-all duration-700"
                >
                  {/* Winner photo */}
                  {winner.photos[0] && (
                    <div className="relative h-64 overflow-hidden bg-muted">
                      <img
                        src={winner.photos[0]}
                        alt={winner.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1.5s]"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3">
                        <span
                          className="text-[9px] tracking-[0.2em] uppercase px-3 py-1 bg-primary/90 text-primary-foreground inline-flex items-center gap-1"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          <Trophy className="h-3 w-3" /> Winner
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-5">
                    <span className="text-[9px] tracking-[0.2em] uppercase text-primary block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                      {winner.competition_title}
                    </span>
                    <h3 className="text-lg font-light tracking-tight mb-3 group-hover:text-primary transition-colors duration-500" style={{ fontFamily: "var(--font-display)" }}>
                      {winner.title}
                    </h3>

                    {/* Photographer */}
                    <div className="flex items-center gap-2.5">
                      {winner.photographer_avatar ? (
                        <img src={winner.photographer_avatar} alt="" className="h-7 w-7 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center border border-border">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                        {winner.photographer_name || "Photographer"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-sm">
              <Trophy className="h-10 w-10 text-primary/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>Winners will be showcased here</p>
              <Link to="/competitions" className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                View Competitions <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
          </div>
        </section>

      {/* Certificate Holders Showcase — Enhanced */}
      <section className="py-24 md:py-32" aria-label="Certified photographers">
          <div className="container mx-auto px-6 md:px-12">
            <motion.header
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="flex items-end justify-between mb-16"
            >
              <div>
                <motion.div variants={fadeUp} custom={0} className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-px bg-primary" />
                  <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                    <T>Recognition</T>
                  </span>
                </motion.div>
                <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                   <T>Certified</T> <em className="italic"><T>Excellence</T></em>
                </motion.h2>
              </div>
              <motion.div variants={fadeIn} custom={2}>
                <Link
                  to="/certificates"
                  className="group inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <T>Verify Certificate</T> <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-500" />
                </Link>
              </motion.div>
            </motion.header>

            {/* Tier Badges */}
            {certTiers.length > 0 && (
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex flex-wrap items-center gap-4 mb-12">
                {certTiers.map((tier) => (
                  <div key={tier.name} className="flex items-center gap-2 border border-border px-4 py-2 rounded-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tier.color }} />
                    <span className="text-[10px] tracking-[0.15em] uppercase font-semibold" style={{ fontFamily: "var(--font-heading)", color: tier.color }}>{tier.name}</span>
                    <span className="text-[9px] text-muted-foreground">({tier.min_certs}+ certs)</span>
                  </div>
                ))}
              </motion.div>
            )}

          {dataLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-border p-6 animate-pulse">
                  <div className="h-3 bg-muted rounded w-1/4 mb-3" />
                  <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-4" />
                  <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-muted" /><div className="h-3 bg-muted rounded w-20" /></div>
                </div>
              ))}
            </div>
          ) : certificates.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {certificates.slice(0, 6).map((cert, i) => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                    className={`border p-6 transition-all duration-700 group relative ${cert.is_featured ? "border-2 border-primary/30 hover:border-primary" : "border-border hover:border-primary/40"}`}
                  >
                    {cert.is_featured && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 bg-primary/10 text-primary font-semibold" style={{ fontFamily: "var(--font-heading)" }}>★ Featured</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-5">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                        {cert.type === "competition_winner" ? "Competition" : cert.type === "course_completion" ? "Course" : "Achievement"}
                      </span>
                    </div>
                    <h3 className="text-base font-light tracking-tight mb-2 group-hover:text-primary transition-colors duration-500 line-clamp-2" style={{ fontFamily: "var(--font-display)" }}>
                      {cert.title}
                    </h3>
                    {cert.featured_quote && (
                      <p className="text-xs italic text-muted-foreground leading-relaxed mb-3 border-l-2 border-primary/30 pl-3" style={{ fontFamily: "var(--font-body)" }}>
                        "{cert.featured_quote}"
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mb-5" style={{ fontFamily: "var(--font-body)" }}>
                      Issued {new Date(cert.issued_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <div className="flex items-center gap-2.5 pt-4 border-t border-border">
                      {cert.recipient_avatar ? (
                        <img src={cert.recipient_avatar} alt="" className="h-7 w-7 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center border border-border">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                        {cert.recipient_name || "Photographer"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Testimonials */}
              {testimonials.length > 0 && (
                <div className="mt-16">
                  <h3 className="text-[10px] tracking-[0.3em] uppercase text-primary mb-8 text-center" style={{ fontFamily: "var(--font-heading)" }}><T>What Our Certified Photographers Say</T></h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {testimonials.map((t, i) => (
                      <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.8 }}
                        className="border border-border p-6 hover:border-primary/40 transition-all duration-700">
                        <div className="text-primary/30 mb-3 text-2xl" style={{ fontFamily: "serif" }}>"</div>
                        <p className="text-sm italic text-muted-foreground leading-relaxed mb-4" style={{ fontFamily: "var(--font-body)" }}>
                          {t.testimonial}
                        </p>
                        <div className="flex items-center gap-2.5 pt-3 border-t border-border">
                          {t.photo_url ? (
                            <img src={t.photo_url} alt="" className="h-7 w-7 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center border border-border">
                              <User className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] tracking-[0.1em] uppercase text-foreground block" style={{ fontFamily: "var(--font-heading)" }}>
                              {t.user_name || "Photographer"}
                            </span>
                            <span className="text-[9px] text-muted-foreground">{t.cert_title}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              {certLeaderboard.length > 0 && (
                <div className="mt-16">
                  <h3 className="text-[10px] tracking-[0.3em] uppercase text-primary mb-8 text-center" style={{ fontFamily: "var(--font-heading)" }}><T>Top Certified Photographers</T></h3>
                  <div className="max-w-lg mx-auto border border-border rounded-sm divide-y divide-border">
                    {certLeaderboard.map((entry, i) => (
                      <div key={entry.user_id} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-lg font-light text-muted-foreground/40 w-8 text-center" style={{ fontFamily: "var(--font-display)" }}>{i + 1}</span>
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border border-border">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium block truncate" style={{ fontFamily: "var(--font-body)" }}>{entry.full_name || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">{entry.cert_count} certificate{entry.cert_count !== 1 ? "s" : ""}</span>
                        </div>
                        {entry.tier && (
                          <span className="text-[9px] px-2 py-0.5 border rounded-sm uppercase tracking-wider font-semibold"
                            style={{ fontFamily: "var(--font-heading)", borderColor: certTiers.find((t) => t.name === entry.tier)?.color, color: certTiers.find((t) => t.name === entry.tier)?.color }}>
                            {entry.tier}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-sm">
              <Award className="h-10 w-10 text-primary/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}><T>Certificates of excellence will appear here</T></p>
              <Link to="/courses" className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Start Learning</T> <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
          </div>
        </section>

      {/* Above Journal Ad Zone */}
      <div className="container mx-auto px-6 md:px-12 pb-6">
        <AdPlacement placement="above-journal" variant="plain" />
      </div>

      {/* Journal Preview */}
      <section className="py-24 md:py-32" aria-label="Latest from the journal">
          <div className="container mx-auto px-6 md:px-12">
            <motion.header
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="flex items-end justify-between mb-16"
            >
              <div>
                <motion.div variants={fadeUp} custom={0} className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-px bg-primary" />
                  <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                    <T>From the Journal</T>
                  </span>
                </motion.div>
                <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                   <T>Stories &</T> <em className="italic"><T>Insights</T></em>
                </motion.h2>
              </div>
              <motion.div variants={fadeIn} custom={2}>
                <Link
                  to="/journal"
                  className="group inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <T>View All</T> <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-500" />
                </Link>
              </motion.div>
            </motion.header>

          {dataLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:row-span-2 border border-border overflow-hidden animate-pulse">
                <div className="h-64 md:h-80 bg-muted" />
                <div className="p-6 space-y-3">
                  <div className="flex gap-2"><div className="h-5 bg-muted rounded w-16" /><div className="h-5 bg-muted rounded w-20" /></div>
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-4 border border-border p-3 animate-pulse">
                    <div className="w-24 h-20 bg-muted shrink-0 rounded" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-muted rounded w-16" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : journalArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Featured / first article — large card */}
              <motion.article
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                className="group md:row-span-2"
              >
                <Link to={`/journal/${journalArticles[0].slug}`} className="block h-full border border-border hover:border-primary/40 transition-all duration-700 overflow-hidden">
                  {journalArticles[0].cover_image_url ? (
                    <div className="relative h-64 md:h-80 overflow-hidden bg-muted">
                      <img
                        src={journalArticles[0].cover_image_url}
                        alt={journalArticles[0].title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1.5s]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className="text-[9px] tracking-[0.2em] uppercase px-3 py-1 bg-primary text-primary-foreground inline-flex items-center gap-1.5" style={{ fontFamily: "var(--font-heading)" }}>
                          <Eye className="h-3 w-3" /> <T>Featured</T>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 md:h-80 bg-gradient-to-br from-muted to-background flex items-center justify-center">
                      <Newspaper className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="p-6 md:p-8">
                    {journalArticles[0].tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {journalArticles[0].tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[9px] tracking-[0.2em] uppercase text-primary border border-primary/30 px-2.5 py-0.5" style={{ fontFamily: "var(--font-heading)" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <h3 className="text-2xl md:text-3xl font-light tracking-tight mb-3 group-hover:text-primary transition-colors duration-500" style={{ fontFamily: "var(--font-display)" }}>
                      {journalArticles[0].title}
                    </h3>
                    {journalArticles[0].excerpt && (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3" style={{ fontFamily: "var(--font-body)" }}>
                        {journalArticles[0].excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                      {journalArticles[0].author_name && (
                        <span className="tracking-[0.1em] uppercase">{journalArticles[0].author_name}</span>
                      )}
                      {journalArticles[0].published_at && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="tracking-[0.1em] uppercase">
                            {new Date(journalArticles[0].published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.article>

              {/* Remaining articles — compact cards */}
              <div className="flex flex-col gap-6">
                {journalArticles.slice(1).map((article, i) => (
                  <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (i + 1) * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                  >
                    <Link to={`/journal/${article.slug}`} className="group flex gap-5 border border-border hover:border-primary/40 transition-all duration-700 overflow-hidden">
                      {article.cover_image_url ? (
                        <div className="relative w-32 md:w-40 shrink-0 overflow-hidden bg-muted">
                          <img
                            src={article.cover_image_url}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-[1.5s]"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-32 md:w-40 shrink-0 bg-muted flex items-center justify-center">
                          <Newspaper className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="py-4 pr-5 flex flex-col justify-center min-w-0">
                        {article.tags.length > 0 && (
                          <span className="text-[8px] tracking-[0.2em] uppercase text-primary mb-2 block" style={{ fontFamily: "var(--font-heading)" }}>
                            {article.tags[0]}
                          </span>
                        )}
                        <h3 className="text-sm font-light tracking-tight mb-1.5 group-hover:text-primary transition-colors duration-500 line-clamp-2" style={{ fontFamily: "var(--font-heading)" }}>
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2" style={{ fontFamily: "var(--font-body)" }}>
                            {article.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                          {article.author_name && <span className="tracking-[0.1em] uppercase">{article.author_name}</span>}
                          {article.published_at && (
                            <>
                              <span className="text-muted-foreground/30">·</span>
                              <span className="tracking-[0.1em] uppercase">
                                {new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-sm">
              <Newspaper className="h-10 w-10 text-primary/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}><T>Stories and insights coming soon</T></p>
              <Link to="/journal" className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                <T>Visit Journal</T> <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
          </div>
        </section>

      {/* Below Journal Ad Zone */}
      <div className="container mx-auto px-6 md:px-12 pt-6">
        <AdPlacement placement="below-journal" variant="plain" />
      </div>

      {/* Social Engagement Showcase */}
      <section className="relative py-20 md:py-28 overflow-hidden" aria-label="Community and social features" style={{ background: "hsl(var(--scroll-bg-2))" }}>
        {/* Subtle diagonal line accent */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.02]" style={{ background: "radial-gradient(circle, hsl(var(--secondary)), transparent 70%)" }} />
        </div>

        <div className="container mx-auto px-6 md:px-12 relative z-10">
          {/* Header — compact */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="mb-12 md:mb-16"
          >
            <div className="flex items-end justify-between">
              <div>
                <motion.div variants={fadeUp} custom={0} className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-px bg-primary" />
                  <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                    <T>Community</T>
                  </span>
                </motion.div>
                <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  <T>Connect &</T> <em className="italic text-primary"><T>Engage</T></em>
                </motion.h2>
                <motion.p variants={fadeUp} custom={2} className="text-sm text-muted-foreground mt-3 max-w-md" style={{ fontFamily: "var(--font-body)" }}>
                  <T>More than a portfolio — react, comment, share, and grow with photographers worldwide.</T>
                </motion.p>
              </div>
              <motion.div variants={fadeIn} custom={2} className="hidden sm:block">
                <Link
                  to={user ? "/feed" : "/signup"}
                  className="group inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <T>{user ? "Go to Feed" : "Join Now"}</T> <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-500" />
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* Bento Grid — asymmetric layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">

            {/* Card 1 — Share Your Story (large, spans 7 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: classicEase }}
              className="md:col-span-7 group bg-card/60 backdrop-blur-sm border border-border/60 hover:border-primary/30 rounded-xl p-5 md:p-6 transition-all duration-700 relative overflow-hidden"
            >
              {/* Glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full group-hover:scale-[2] transition-transform duration-[2s]" />
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Rss className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-medium tracking-tight" style={{ fontFamily: "var(--font-heading)" }}><T>Share Your Story</T></h3>
                </div>
                {/* Mock post */}
                <div className="bg-background/50 border border-border/40 rounded-lg p-3.5 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden">
                      <img src="/images/portrait-1.jpg" alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="text-xs font-medium block" style={{ fontFamily: "var(--font-body)" }}>Ankit Sharma</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        2h · <Globe className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>"Golden hour at the ghats — every frame tells a story of devotion ✨"</p>
                  <div className="h-36 md:h-44 rounded-md overflow-hidden bg-muted mb-2.5">
                    <img src="/images/devotion.jpg" alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5 px-0.5">
                    <div className="flex items-center gap-1">
                      <span className="flex -space-x-0.5 text-sm">❤️👍😮</span>
                      <span className="ml-1">24</span>
                    </div>
                    <span>8 comments</span>
                  </div>
                  <div className="border-t border-border/40 pt-2 flex items-center justify-around text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5 cursor-default"><span className="text-sm">👍</span> <T>Like</T></span>
                    <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> <T>Comment</T></span>
                    <span className="flex items-center gap-1.5"><Rss className="h-3.5 w-3.5" /> <T>Share</T></span>
                  </div>
                </div>
                {/* Reaction bar */}
                <div className="flex items-center gap-1.5 mt-3 bg-card border border-border/40 rounded-full px-3 py-1.5 w-fit shadow-sm">
                  {["👍", "❤️", "😂", "😮", "😢", "😡"].map((e, i) => (
                    <motion.span
                      key={e}
                      initial={{ opacity: 0, y: 6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6 + i * 0.06, duration: 0.25 }}
                      className="text-xl cursor-default hover:scale-125 hover:-translate-y-0.5 transition-transform duration-150"
                    >
                      {e}
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Card 2 — Build Your Circle (spans 5 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.8, ease: classicEase }}
              className="md:col-span-5 group bg-card/60 backdrop-blur-sm border border-border/60 hover:border-primary/30 rounded-xl p-5 md:p-6 transition-all duration-700 relative overflow-hidden"
            >
              <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-primary/5 rounded-full group-hover:scale-[2] transition-transform duration-[2s]" />
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-medium tracking-tight" style={{ fontFamily: "var(--font-heading)" }}><T>Build Your Circle</T></h3>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Priya Mehra", img: "/images/behind-the-veil.jpg", badge: "Friend" },
                    { name: "Rajesh Kumar", img: "/images/the-craftsman.jpg", badge: "Following" },
                    { name: "Sara Ali", img: "/images/frozen-love.jpg", badge: "Friend" },
                  ].map((f, i) => (
                    <motion.div
                      key={f.name}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                      className="flex items-center gap-2.5 bg-background/50 border border-border/40 rounded-lg px-3 py-2"
                    >
                      <div className="w-7 h-7 rounded-full bg-muted overflow-hidden shrink-0">
                        <img src={f.img} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs flex-1 truncate" style={{ fontFamily: "var(--font-body)" }}>{f.name}</span>
                      <span className={`text-[8px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm border ${
                        f.badge === "Friend" ? "border-primary/40 text-primary bg-primary/5" : "border-border text-muted-foreground"
                      }`} style={{ fontFamily: "var(--font-heading)" }}>
                        {f.badge}
                      </span>
                    </motion.div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: "Friends", value: "128" },
                    { label: "Followers", value: "2.4K" },
                    { label: "Following", value: "312" },
                  ].map((s) => (
                    <div key={s.label} className="text-center py-2 bg-background/30 rounded-lg border border-border/20">
                      <span className="text-base font-light block" style={{ fontFamily: "var(--font-display)" }}>{s.value}</span>
                      <span className="text-[8px] tracking-[0.12em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Card 3 — Your Feed (spans 4 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.8, ease: classicEase }}
              className="md:col-span-4 group bg-card/60 backdrop-blur-sm border border-border/60 hover:border-primary/30 rounded-xl p-5 md:p-6 transition-all duration-700 relative overflow-hidden"
            >
              <div className="absolute -top-12 -left-12 w-28 h-28 bg-primary/5 rounded-full group-hover:scale-[2] transition-transform duration-[2s]" />
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Rss className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-medium tracking-tight" style={{ fontFamily: "var(--font-heading)" }}><T>Your Feed</T></h3>
                </div>
                <div className="space-y-2">
                  {[
                    { text: "shared a wildlife photo", emoji: "📸", time: "5m" },
                    { text: "won 1st in Portrait Masters", emoji: "🏆", time: "1h" },
                    { text: "reacted ❤️ to your shot", emoji: "❤️", time: "2h" },
                    { text: "started following you", emoji: "👋", time: "3h" },
                    { text: "commented on your post", emoji: "💬", time: "4h" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.35 }}
                      className="flex items-center gap-2 bg-background/30 rounded-lg px-2.5 py-1.5 border border-border/20"
                    >
                      <span className="text-sm shrink-0">{item.emoji}</span>
                      <span className="flex-1 text-muted-foreground text-[11px] truncate" style={{ fontFamily: "var(--font-body)" }}>{item.text}</span>
                      <span className="text-[9px] text-muted-foreground/40 shrink-0">{item.time}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Card 4 — Privacy (spans 4 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25, duration: 0.8, ease: classicEase }}
              className="md:col-span-4 group bg-card/60 backdrop-blur-sm border border-border/60 hover:border-primary/30 rounded-xl p-5 md:p-6 transition-all duration-700 relative overflow-hidden"
            >
              <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-primary/5 rounded-full group-hover:scale-[2] transition-transform duration-[2s]" />
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Eye className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-medium tracking-tight" style={{ fontFamily: "var(--font-heading)" }}><T>Privacy Controls</T></h3>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: Globe, label: "Public", desc: "Everyone", active: true },
                    { icon: Users, label: "Friends Only", desc: "Friends", active: false },
                    { icon: Eye, label: "Only Me", desc: "Private", active: false },
                  ].map((p, i) => (
                    <motion.div
                      key={p.label}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.35 }}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 border transition-colors ${
                        p.active ? "border-primary/30 bg-primary/5" : "border-border/30 bg-background/30"
                      }`}
                    >
                      <p.icon className={`h-3.5 w-3.5 shrink-0 ${p.active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-xs flex-1 ${p.active ? "text-primary font-medium" : "text-muted-foreground"}`} style={{ fontFamily: "var(--font-body)" }}>{p.label}</span>
                      <span className="text-[9px] text-muted-foreground/50">{p.desc}</span>
                      {p.active && (
                        <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                          <ArrowRight className="h-2 w-2 text-primary-foreground rotate-[-45deg]" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Card 5 — CTA card (spans 4 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.8, ease: classicEase }}
              className="md:col-span-4 group border border-primary/20 hover:border-primary/50 rounded-xl p-5 md:p-6 transition-all duration-700 relative overflow-hidden flex flex-col justify-center items-center text-center"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--primary) / 0.02))" }}
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:border-primary transition-all duration-500">
                  <ArrowRight className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                </div>
                <p className="text-xs text-muted-foreground mb-3 max-w-[200px]" style={{ fontFamily: "var(--font-body)" }}>
                  <T>Join a vibrant community of photographers</T>
                </p>
                <Link
                  to={user ? "/feed" : "/signup"}
                  className="text-[10px] tracking-[0.2em] uppercase text-primary hover:text-foreground transition-colors duration-500"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <T>{user ? "Explore Feed" : "Get Started Free"}</T>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="relative py-32 md:py-40 overflow-hidden" aria-label="Photography quote">
        <div className="absolute inset-0">
          <img src="/images/innocence.jpg" alt="" className="w-full h-full object-cover brightness-[0.15]" aria-hidden="true" loading="lazy" />
        </div>
        <div className="container mx-auto px-6 md:px-12 relative z-10 text-center">
          <motion.blockquote
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 2, ease: slowEase }}
          >
            <Layers className="h-8 w-8 text-primary mx-auto mb-8" strokeWidth={1} />
            <p className="text-3xl md:text-5xl lg:text-6xl font-light leading-[1.2] max-w-4xl mx-auto mb-8" style={{ fontFamily: "var(--font-display)" }}>
              "The camera is an instrument that teaches people how to see
              <em className="italic text-primary"> without a camera</em>"
            </p>
            <cite className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground not-italic" style={{ fontFamily: "var(--font-heading)" }}>
              — Dorothea Lange
            </cite>
          </motion.blockquote>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32" aria-label="Join 50mm Retina World">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-light tracking-tight mb-8" style={{ fontFamily: "var(--font-display)" }}>
              <T>Start</T> <em className="italic text-primary"><T>Creating</T></em>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-sm text-muted-foreground max-w-md mx-auto mb-12 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
              <T>Your lens has stories to tell. Join a community that celebrates the art of photography in its purest form.</T>
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <Link
                to="/signup"
                className="group inline-flex items-center gap-4 text-sm tracking-[0.15em] uppercase"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <span className="w-16 h-16 rounded-full border border-primary flex items-center justify-center group-hover:bg-primary group-hover:scale-105 transition-all duration-[1s]">
                  <ArrowRight className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors duration-700" />
                </span>
                <T>Create Free Account</T>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16" role="contentinfo">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-3 gap-12 items-start">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/images/logo.png" alt="50mm Retina World" className="h-7 w-7 object-contain" />
                <span className="text-sm tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                  50mm Retina World
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                <T>A curated platform for photographers who see the world differently.</T>
              </p>
            </div>
            <nav className="flex flex-col gap-3" aria-label="Footer navigation">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}><T>Navigate</T></span>
              <a href="#works" className="text-xs text-foreground/70 hover:text-foreground transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}><T>Works</T></a>
              <Link to="/competitions" className="text-xs text-foreground/70 hover:text-foreground transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}><T>Competitions</T></Link>
              <Link to="/courses" className="text-xs text-foreground/70 hover:text-foreground transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}><T>Education</T></Link>
              <Link to="/journal" className="text-xs text-foreground/70 hover:text-foreground transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}><T>Journal</T></Link>
              <Link to="/#featured-artist" className="text-xs text-foreground/70 hover:text-foreground transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}><T>Featured Artist</T></Link>
              <Link to="/verify" className="text-xs text-foreground/70 hover:text-foreground transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}><T>Verify Certificate</T></Link>
            </nav>
            <div className="md:text-right">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}><T>Newsletter</T></span>
              <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                <T>Stay inspired with updates & insights.</T>
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const email = (form.elements.namedItem("newsletter_email") as HTMLInputElement).value;
                  if (email) {
                    toast({ title: "Subscribed!", description: "You'll receive our latest updates soon." });
                    form.reset();
                  }
                }}
                className="flex gap-1.5"
              >
                <input
                  name="newsletter_email"
                  type="email"
                  required
                  placeholder="your@email.com"
                  className="flex-1 h-8 rounded-sm border border-input bg-background px-2.5 text-[11px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  style={{ fontFamily: "var(--font-body)" }}
                />
                <button
                  type="submit"
                  className="h-8 px-3 rounded-sm bg-primary text-primary-foreground text-[9px] tracking-[0.15em] uppercase hover:bg-primary/90 transition-colors duration-300 shrink-0"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <T>Subscribe</T>
                </button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-6" style={{ fontFamily: "var(--font-body)" }}>
                © 2026 50mm Retina World. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
