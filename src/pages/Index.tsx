import { Camera, ArrowRight, ArrowDown, Trophy, BookOpen, Newspaper, Aperture, Eye, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

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

const heroSlides = [
  { src: "/images/lives-on-life.jpg", title: "Lives on Life", category: "Aerial" },
  { src: "/images/sadhu.jpg", title: "The Ascetic", category: "Portrait" },
  { src: "/images/hero-1.jpg", title: "Breakfast", category: "Wildlife" },
  { src: "/images/innocence.jpg", title: "Innocence", category: "Portrait" },
  { src: "/images/hero-2.jpg", title: "Flying Food", category: "Action" },
];

const galleryWorks = [
  { src: "/images/lives-on-life.jpg", title: "Lives on Life", category: "Aerial", size: "tall" as const },
  { src: "/images/sadhu.jpg", title: "The Ascetic", category: "Portrait", size: "normal" as const },
  { src: "/images/hero-1.jpg", title: "Breakfast", category: "Wildlife", size: "normal" as const },
  { src: "/images/after-prayer.jpg", title: "After the Prayer", category: "Street", size: "wide" as const },
  { src: "/images/innocence.jpg", title: "Innocence", category: "Portrait", size: "normal" as const },
  { src: "/images/life-in-summer.jpg", title: "Life in Summer", category: "Street", size: "normal" as const },
  { src: "/images/hero-3.jpg", title: "Morning Snacks", category: "Wildlife", size: "normal" as const },
  { src: "/images/portrait-1.jpg", title: "The Holy Dip", category: "Portrait", size: "tall" as const },
  { src: "/images/hero-4.jpg", title: "The Brunch", category: "Wildlife", size: "normal" as const },
  { src: "/images/hero-2.jpg", title: "Flying Food", category: "Action", size: "normal" as const },
];

const Index = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50" aria-label="Main navigation">
        <div className="container mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="ArteFoto Global Home">
            <img src="/images/logo.png" alt="ArteFoto Global" className="h-8 w-8 object-contain" />
            <span style={{ fontFamily: "var(--font-heading)" }} className="text-sm font-semibold tracking-[0.2em] uppercase">
              ArteFoto Global
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-10 text-xs tracking-[0.15em] uppercase" style={{ fontFamily: "var(--font-heading)" }}>
            <a href="#works" className="hover:opacity-60 transition-opacity duration-500">Works</a>
            <a href="#about" className="hover:opacity-60 transition-opacity duration-500">About</a>
            <a href="#pillars" className="hover:opacity-60 transition-opacity duration-500">Explore</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-xs tracking-[0.15em] uppercase hover:opacity-60 transition-opacity duration-500" style={{ fontFamily: "var(--font-heading)" }}>
              Login
            </Link>
            <Link
              to="/signup"
              className="text-xs tracking-[0.15em] uppercase px-5 py-2.5 border border-foreground/30 hover:bg-foreground hover:text-background transition-all duration-700"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Join
            </Link>
          </div>
        </div>
      </nav>

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

      {/* Marquee — slower, more elegant */}
      <div className="py-6 border-y border-border overflow-hidden" aria-hidden="true">
        <motion.div
          animate={{ x: [0, -1200] }}
          transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
          className="flex gap-12 whitespace-nowrap"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="text-7xl md:text-8xl font-light tracking-tight opacity-[0.06]" style={{ fontFamily: "var(--font-display)" }}>
              Wildlife • Street • Portrait • Aerial • Documentary •
            </span>
          ))}
        </motion.div>
      </div>

      {/* Featured Works */}
      <section id="works" className="py-24 md:py-32" aria-label="Selected photography works">
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
                  Portfolio
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-5xl md:text-7xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Selected <em className="italic">Works</em>
              </motion.h2>
            </div>
            <motion.div variants={fadeIn} custom={2} className="hidden md:block">
              <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                10 Photographs
              </span>
            </motion.div>
          </motion.header>

          {/* Masonry grid */}
          <div className="columns-2 md:columns-3 gap-3 md:gap-4 space-y-3 md:space-y-4">
            {galleryWorks.map((work, i) => (
              <motion.article
                key={work.title}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i % 3) * 0.15, duration: 1.2, ease: slowEase }}
                className="group relative overflow-hidden break-inside-avoid cursor-pointer"
              >
                <figure className="relative overflow-hidden">
                  <img
                    src={work.src}
                    alt={`${work.title} — ${work.category} photography`}
                    className={`w-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-[1.03] group-hover:brightness-[0.6] ${
                      work.size === "tall" ? "h-[450px] md:h-[550px]" : work.size === "wide" ? "h-[250px] md:h-[300px]" : "h-[280px] md:h-[380px]"
                    }`}
                    loading="lazy"
                  />
                  <figcaption className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-[1s]">
                    <div className="transform translate-y-3 group-hover:translate-y-0 transition-transform duration-[1s]">
                      <span className="text-[9px] tracking-[0.3em] uppercase text-primary block mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                        {work.category}
                      </span>
                      <h3 className="text-xl font-light" style={{ fontFamily: "var(--font-display)" }}>{work.title}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>View</span>
                      </div>
                    </div>
                  </figcaption>
                </figure>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

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

      {/* Quote */}
      <section className="relative py-32 md:py-40 overflow-hidden" aria-label="Photography quote">
        <div className="absolute inset-0">
          <img src="/images/innocence.jpg" alt="" className="w-full h-full object-cover brightness-[0.15]" aria-hidden="true" />
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
            </nav>
            <div className="md:text-right">
              <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground block mb-4" style={{ fontFamily: "var(--font-heading)" }}>Join Us</span>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase border-b border-foreground/30 pb-1 hover:border-primary transition-colors duration-700"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Create Account <ArrowRight className="h-3 w-3" />
              </Link>
              <p className="text-[10px] text-muted-foreground mt-8" style={{ fontFamily: "var(--font-body)" }}>
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
