import { Camera, ArrowRight, ArrowDown, Trophy, BookOpen, Newspaper, Aperture, Eye, Layers, Award, User, Expand } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, lazy, Suspense, memo } from "react";
import Lightbox from "@/components/Lightbox";
import PhotoOfTheDay from "@/components/PhotoOfTheDay";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState(defaultHeroSlides);
  const [winners, setWinners] = useState<WinnerShowcase[]>([]);
  const [certificates, setCertificates] = useState<CertificateShowcase[]>([]);
  const [journalArticles, setJournalArticles] = useState<JournalPreview[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionPreview[]>([]);
  const [courses, setCourses] = useState<CoursePreview[]>([]);
  const [galleryWorks, setGalleryWorks] = useState<PortfolioImage[]>(fallbackGalleryWorks);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

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
    // Fetch winners and certificates in parallel — single round-trip each
    const fetchShowcaseData = async () => {
      const [winnersRes, certsRes, articlesRes, compsListRes, coursesRes, portfolioRes, bannersRes] = await Promise.all([
        supabase
          .from("competition_entries")
          .select("id, title, photos, competition_id, user_id")
          .eq("status", "winner")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("certificates")
          .select("id, title, type, issued_at, user_id")
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
          .select("id, title, category, cover_image_url, status, starts_at, ends_at, prize_info")
          .in("status", ["active", "upcoming"])
          .order("starts_at", { ascending: true })
          .limit(4),
        supabase
          .from("courses")
          .select("id, title, slug, category, difficulty, cover_image_url, is_free, author_id")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("portfolio_images")
          .select("id, title, category, image_url, sort_order")
          .eq("is_visible", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("hero_banners")
          .select("id, title, category, image_url, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

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

      const [profilesRes, compsRes] = await Promise.all([
        allUserIds.length > 0
          ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", allUserIds)
          : Promise.resolve({ data: [] }),
        compIds.length > 0
          ? supabase.from("competitions").select("id, title").in("id", compIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
      const compMap = new Map((compsRes.data || []).map((c) => [c.id, c.title]));

      if (winnerData.length > 0) {
        setWinners(winnerData.map((e) => ({
          id: e.id,
          title: e.title,
          photos: e.photos || [],
          competition_title: compMap.get(e.competition_id) || "Competition",
          photographer_name: profileMap.get(e.user_id)?.full_name || null,
          photographer_avatar: profileMap.get(e.user_id)?.avatar_url || null,
        })));
      }

      if (certData.length > 0) {
        setCertificates(certData.map((c) => ({
          id: c.id,
          title: c.title,
          type: c.type,
          issued_at: c.issued_at,
          recipient_name: profileMap.get(c.user_id)?.full_name || null,
          recipient_avatar: profileMap.get(c.user_id)?.avatar_url || null,
        })));
      }

      if (articleData.length > 0) {
        setJournalArticles(articleData.map((a) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt,
          cover_image_url: a.cover_image_url,
          tags: a.tags || [],
          published_at: a.published_at,
          author_name: profileMap.get(a.author_id)?.full_name || null,
        })));
      }

      // Set competitions
      if (compsListData.length > 0) {
        setCompetitions(compsListData.map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          cover_image_url: c.cover_image_url,
          status: c.status,
          starts_at: c.starts_at,
          ends_at: c.ends_at,
          prize_info: c.prize_info,
        })));
      }

      // Set courses
      if (coursesData.length > 0) {
        setCourses(coursesData.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          category: c.category,
          difficulty: c.difficulty,
          cover_image_url: c.cover_image_url,
          is_free: c.is_free,
          author_name: profileMap.get(c.author_id)?.full_name || null,
        })));
      }

      // Set portfolio images from database (fallback to hardcoded if empty)
      const portfolioData = portfolioRes.data || [];
      if (portfolioData.length > 0) {
        setGalleryWorks(portfolioData.map((p) => ({
          id: p.id,
          src: p.image_url,
          title: p.title,
          category: p.category,
        })));
      }

      // Set hero banners from database (fallback to defaults if empty)
      const bannerData = bannersRes.data || [];
      if (bannerData.length > 0) {
        setHeroSlides(bannerData.map((b) => ({
          src: b.image_url,
          title: b.title,
          category: b.category,
        })));
      }
    };

    fetchShowcaseData();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Hero — Slow crossfade slideshow */}
      <section className="relative h-screen flex items-end pb-20 md:pb-28" aria-label="Featured photography">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: slowEase }}
            className="absolute inset-0"
          >
            <motion.img
              src={heroSlides[currentSlide].src}
              alt={`${heroSlides[currentSlide].title} — ${heroSlides[currentSlide].category} photography by ArteFoto Global`}
              className="w-full h-full object-cover"
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 8, ease: slowEase }}
              loading={currentSlide === 0 ? "eager" : "lazy"}
              fetchPriority={currentSlide === 0 ? "high" : "auto"}
            />
          </motion.div>
        </AnimatePresence>

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />

        {/* Hero content */}
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2, delay: 0.5, ease: slowEase }}
            >
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.5, delay: 0.8, ease: classicEase }}
                className="flex items-center gap-4 mb-6"
              >
                <div className="w-16 h-px bg-primary" />
                <span className="text-xs tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  Photography Platform
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.8, delay: 1, ease: classicEase }}
                className="text-5xl md:text-7xl lg:text-8xl font-light leading-[0.9] mb-6 tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Every Frame{" "}
                <em className="text-primary font-light italic">Tells</em>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 1.6, ease: slowEase }}
                className="text-sm md:text-base text-muted-foreground max-w-md leading-relaxed mb-12"
                style={{ fontFamily: "var(--font-body)" }}
              >
                A curated space for photographers who see the world differently.
                Compete globally. Learn from masters. Share your stories.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 2, ease: slowEase }}
                className="flex items-center gap-6"
              >
                <Link
                  to="/signup"
                  className="group inline-flex items-center gap-3 text-sm tracking-[0.15em] uppercase"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  <span className="w-12 h-12 rounded-full bg-primary flex items-center justify-center group-hover:w-14 group-hover:h-14 transition-all duration-700">
                    <ArrowRight className="h-4 w-4 text-primary-foreground" />
                  </span>
                  Begin Your Journey
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Slide counter */}
        <div className="absolute right-6 md:right-12 bottom-24 z-10 flex flex-col items-end gap-3" aria-label="Slide navigation">
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
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>Scroll</span>
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </section>

      {/* Photo of the Day — Big Banner */}
      <PhotoOfTheDay />

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
                Portfolio
              </span>
              <div className="w-16 h-px bg-primary" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Selected <em className="italic text-primary">Works</em>
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
                  className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 auto-rows-[1fr] gap-1 sm:gap-1.5"
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
                              ? "col-span-3 row-span-3 sm:col-span-4 sm:row-span-4 md:col-span-4 md:row-span-5 lg:col-span-5 lg:row-span-6 aspect-auto"
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
      <Lightbox
        images={galleryWorks}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        onPrev={prevLightbox}
        onNext={nextLightbox}
      />

      {/* Philosophy — Split layout */}
      <section id="about" className="py-24 md:py-32 relative" aria-label="Our philosophy">
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
                  src="/images/sadhu.jpg"
                  alt="The Ascetic — portrait photography showcasing the depth of human character"
                  className="w-full h-[500px] object-cover"
                  loading="lazy"
                />
                <div className="absolute -bottom-6 -right-6 w-48 h-48 border border-primary/20 transition-all duration-[2s]" />
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10" />
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
                  Philosophy
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-4xl md:text-6xl font-light leading-[1.1] mb-8" style={{ fontFamily: "var(--font-display)" }}>
                Photography is
                <br />
                the art of <em className="italic text-primary">seeing</em>
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-sm text-muted-foreground leading-relaxed mb-6" style={{ fontFamily: "var(--font-body)" }}>
                We believe every photographer has a unique perspective. Our platform
                brings together competing visions, educational paths, and storytelling —
                creating a space where the art of photography thrives in all its forms.
              </motion.p>
              <motion.p variants={fadeUp} custom={3} className="text-sm text-muted-foreground leading-relaxed mb-10" style={{ fontFamily: "var(--font-body)" }}>
                From wildlife to street, portrait to aerial — every genre has a home here.
              </motion.p>
              <motion.div variants={fadeUp} custom={4}>
                <Link
                  to="/signup"
                  className="group inline-flex items-center gap-3 text-xs tracking-[0.15em] uppercase border-b border-foreground/30 pb-2 hover:border-primary transition-colors duration-700"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Join the Community
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-700" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Three Pillars */}
      <section id="pillars" className="py-24 md:py-32" aria-label="Explore competitions, education, and journal">
        <div className="container mx-auto px-6 md:px-12">
          <motion.header
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-20"
          >
            <motion.div variants={fadeIn} custom={0} className="flex items-center justify-center gap-4 mb-4">
              <div className="w-12 h-px bg-primary" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                Explore
              </span>
              <div className="w-12 h-px bg-primary" />
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Three <em className="italic">Worlds</em>
            </motion.h2>
          </motion.header>

          <div className="grid md:grid-cols-3 gap-1">
            {[
              {
                title: "Compete",
                subtitle: "Global Competitions",
                desc: "Submit your finest work to international photography competitions. Expert juries. Real recognition.",
                image: "/images/hero-1.jpg",
                icon: Trophy,
                link: "/competitions",
              },
              {
                title: "Learn",
                subtitle: "Master Classes",
                desc: "Structured courses from wildlife to street photography. Video lessons, assignments, and certificates.",
                image: "/images/after-prayer.jpg",
                icon: BookOpen,
                link: "/courses",
              },
              {
                title: "Read",
                subtitle: "Photo Journal",
                desc: "Interviews, behind-the-scenes, case studies, and gear reviews from the photography world.",
                image: "/images/life-in-summer.jpg",
                icon: Newspaper,
                link: "/journal",
              },
            ].map((pillar, i) => (
              <motion.article
                key={pillar.title}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.25, duration: 1.5, ease: slowEase }}
                className="group relative h-[500px] md:h-[600px] overflow-hidden cursor-pointer"
              >
                <img
                  src={pillar.image}
                  alt={`${pillar.subtitle} — ${pillar.desc}`}
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-[2s] ease-out group-hover:scale-[1.05] brightness-[0.35] group-hover:brightness-[0.2]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

                <div className="relative z-10 h-full flex flex-col justify-between p-8 md:p-10">
                  <div>
                    <pillar.icon className="h-6 w-6 text-primary mb-3" strokeWidth={1.5} />
                    <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block" style={{ fontFamily: "var(--font-heading)" }}>
                      {pillar.subtitle}
                    </span>
                  </div>

                  <div className="transform translate-y-3 group-hover:translate-y-0 transition-transform duration-[1s] ease-out">
                    <h3 className="text-5xl md:text-6xl font-light mb-4" style={{ fontFamily: "var(--font-display)" }}>
                      <em className="italic">{pillar.title}</em>
                    </h3>
                    <p className="text-sm text-foreground/60 leading-relaxed mb-6 max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-[1s] delay-150" style={{ fontFamily: "var(--font-body)" }}>
                      {pillar.desc}
                    </p>
                    <Link
                      to={pillar.link}
                      className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-[1s] delay-300"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      Explore <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Active Competitions Showcase */}
      <section className="py-24 md:py-32 bg-card/30" aria-label="Active competitions">
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
                  Compete Now
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Live <em className="italic">Competitions</em>
              </motion.h2>
            </div>
            <motion.div variants={fadeIn} custom={2}>
              <Link
                to="/competitions"
                className="group inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                View All <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-500" />
              </Link>
            </motion.div>
          </motion.header>

          {competitions.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {competitions.map((comp, i) => (
                <motion.div
                  key={comp.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                >
                  <Link to={`/competitions/${comp.id}`} className="group block border border-border hover:border-primary/40 transition-all duration-700 overflow-hidden">
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {comp.cover_image_url ? (
                        <img src={comp.cover_image_url} alt={comp.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1.5s]" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-muted flex items-center justify-center">
                          <Trophy className="h-10 w-10 text-primary/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className={`text-[9px] tracking-[0.2em] uppercase px-3 py-1 inline-flex items-center gap-1 ${comp.status === "active" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`} style={{ fontFamily: "var(--font-heading)" }}>
                          {comp.status === "active" ? "● Live" : "Upcoming"}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <span className="text-[9px] tracking-[0.2em] uppercase text-primary block mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                        {comp.category}
                      </span>
                      <h3 className="text-base font-light tracking-tight mb-2 group-hover:text-primary transition-colors duration-500 line-clamp-2" style={{ fontFamily: "var(--font-display)" }}>
                        {comp.title}
                      </h3>
                      {comp.prize_info && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mb-2" style={{ fontFamily: "var(--font-body)" }}>
                          🏆 {comp.prize_info}
                        </p>
                      )}
                      <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                        {comp.status === "active" ? `Ends ${new Date(comp.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : `Starts ${new Date(comp.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-sm">
              <Trophy className="h-10 w-10 text-primary/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>New competitions coming soon</p>
              <Link to="/competitions" className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                Browse All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Featured Courses */}
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
                  Learn
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Featured <em className="italic">Courses</em>
              </motion.h2>
            </div>
            <motion.div variants={fadeIn} custom={2}>
              <Link
                to="/courses"
                className="group inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                View All <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-500" />
              </Link>
            </motion.div>
          </motion.header>

          {courses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                >
                  <Link to={`/courses/${course.slug}`} className="group block border border-border hover:border-primary/40 transition-all duration-700 overflow-hidden">
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {course.cover_image_url ? (
                        <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1.5s]" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-secondary/10 to-muted flex items-center justify-center">
                          <BookOpen className="h-10 w-10 text-secondary/30" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`text-[9px] tracking-[0.2em] uppercase px-3 py-1 ${course.is_free ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`} style={{ fontFamily: "var(--font-heading)" }}>
                          {course.is_free ? "Free" : "Premium"}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                          {course.category}
                        </span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                          {course.difficulty}
                        </span>
                      </div>
                      <h3 className="text-base font-light tracking-tight mb-2 group-hover:text-primary transition-colors duration-500 line-clamp-2" style={{ fontFamily: "var(--font-display)" }}>
                        {course.title}
                      </h3>
                      {course.author_name && (
                        <span className="text-[9px] tracking-[0.1em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                          by {course.author_name}
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-sm">
              <BookOpen className="h-10 w-10 text-secondary/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>Courses coming soon</p>
              <Link to="/courses" className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                Browse All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Competition Winners Showcase */}
      <section className="py-24 md:py-32 bg-card/30" aria-label="Competition winners">
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
                    Hall of Fame
                  </span>
                </motion.div>
                <motion.h2 variants={fadeUp} custom={1} className="text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Competition <em className="italic">Winners</em>
                </motion.h2>
              </div>
              <motion.div variants={fadeIn} custom={2}>
                <Link
                  to="/winners"
                  className="group inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  View All <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-500" />
                </Link>
              </motion.div>
            </motion.header>

          {winners.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {winners.map((winner, i) => (
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

      {/* Certificate Holders Showcase */}
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
                    Recognition
                  </span>
                </motion.div>
                <motion.h2 variants={fadeUp} custom={1} className="text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Certified <em className="italic">Excellence</em>
                </motion.h2>
              </div>
              <motion.div variants={fadeIn} custom={2}>
                <Link
                  to="/certificates"
                  className="group inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  View All <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-500" />
                </Link>
              </motion.div>
            </motion.header>

          {certificates.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((cert, i) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                  className="border border-border p-6 hover:border-primary/40 transition-all duration-700 group"
                >
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

                  <p className="text-[10px] text-muted-foreground mb-5" style={{ fontFamily: "var(--font-body)" }}>
                    Issued {new Date(cert.issued_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>

                  {/* Recipient */}
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
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-sm">
              <Award className="h-10 w-10 text-primary/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>Certificates of excellence will appear here</p>
              <Link to="/courses" className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                Start Learning <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
          </div>
        </section>

      {/* Journal Preview */}
      <section className="py-24 md:py-32 bg-card/30" aria-label="Latest from the journal">
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
                    From the Journal
                  </span>
                </motion.div>
                <motion.h2 variants={fadeUp} custom={1} className="text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Stories & <em className="italic">Insights</em>
                </motion.h2>
              </div>
              <motion.div variants={fadeIn} custom={2}>
                <Link
                  to="/journal"
                  className="group inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors duration-500"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  View All <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-500" />
                </Link>
              </motion.div>
            </motion.header>

          {journalArticles.length > 0 ? (
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
                          <Eye className="h-3 w-3" /> Featured
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
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>Stories and insights coming soon</p>
              <Link to="/journal" className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                Visit Journal <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
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
      <section className="py-24 md:py-32" aria-label="Join ArteFoto Global">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight mb-8" style={{ fontFamily: "var(--font-display)" }}>
              Start <em className="italic text-primary">Creating</em>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-sm text-muted-foreground max-w-md mx-auto mb-12 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
              Your lens has stories to tell. Join a community that celebrates
              the art of photography in its purest form.
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
                Create Free Account
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
                <img src="/images/logo.png" alt="ArteFoto Global" className="h-7 w-7 object-contain" />
                <span className="text-sm tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                  ArteFoto Global
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                A curated platform for photographers
                <br />who see the world differently.
              </p>
            </div>
            <nav className="flex flex-col gap-3" aria-label="Footer navigation">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>Navigate</span>
              <a href="#works" className="text-xs text-foreground/70 hover:text-foreground transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}>Works</a>
              <Link to="/competitions" className="text-xs text-foreground/70 hover:text-foreground transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}>Competitions</Link>
              <Link to="/courses" className="text-xs text-foreground/70 hover:text-foreground transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}>Education</Link>
              <Link to="/journal" className="text-xs text-foreground/70 hover:text-foreground transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}>Journal</Link>
              <Link to="/verify" className="text-xs text-foreground/70 hover:text-foreground transition-colors duration-500" style={{ fontFamily: "var(--font-body)" }}>Verify Certificate</Link>
            </nav>
            <div className="md:text-right">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-3" style={{ fontFamily: "var(--font-heading)" }}>Newsletter</span>
              <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                Stay inspired with updates & insights.
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
                  Subscribe
                </button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-6" style={{ fontFamily: "var(--font-body)" }}>
                © 2026 ArteFoto Global. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
