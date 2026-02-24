import { Camera, Trophy, BookOpen, Newspaper, ArrowRight, Star, Users, Award, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

const heroImages = [
  { src: "/images/hero-1.jpg", title: "Breakfast", photographer: "Neil Basu" },
  { src: "/images/hero-2.jpg", title: "Flying Food", photographer: "Neil Basu" },
  { src: "/images/hero-3.jpg", title: "Morning Snacks", photographer: "Neil Basu" },
  { src: "/images/hero-4.jpg", title: "The Brunch", photographer: "Neil Basu" },
];

const galleryImages = [
  { src: "/images/hero-1.jpg", title: "Breakfast", category: "Wildlife" },
  { src: "/images/hero-4.jpg", title: "The Brunch", category: "Wildlife" },
  { src: "/images/hero-2.jpg", title: "Flying Food", category: "Action" },
  { src: "/images/hero-3.jpg", title: "Morning Snacks", category: "Nature" },
];

const Index = () => {
  const [currentHero, setCurrentHero] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHero((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/40 border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold tracking-tight">
              Neil Photography
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-body text-sm">
            <a href="#gallery" className="text-muted-foreground hover:text-foreground transition-colors">Gallery</a>
            <a href="#competitions" className="text-muted-foreground hover:text-foreground transition-colors">Competitions</a>
            <a href="#education" className="text-muted-foreground hover:text-foreground transition-colors">Education</a>
            <a href="#journal" className="text-muted-foreground hover:text-foreground transition-colors">Journal</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
            <Link to="/signup" className="text-sm px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — Full-screen image slideshow */}
      <section className="relative h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentHero}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1.2, ease: "easeOut" as const }}
            className="absolute inset-0"
          >
            <img
              src={heroImages[currentHero].src}
              alt={heroImages[currentHero].title}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

        {/* Hero content */}
        <div className="absolute inset-0 flex items-end pb-24 md:pb-32 z-10">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" as const }}
              className="max-w-3xl"
            >
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase bg-primary/20 text-primary border border-primary/30 mb-6 backdrop-blur-sm">
                Where Photographers Thrive
              </span>
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] mb-6">
                Capture.{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  Compete.
                </span>{" "}
                Create.
              </h1>
              <p className="font-body text-lg md:text-xl text-foreground/70 max-w-xl mb-10 leading-relaxed">
                Join the ultimate photography community — enter global competitions,
                master your craft, and stay inspired.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link
                  to="/signup"
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-all animate-glow-pulse"
                >
                  Start Your Journey
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#gallery"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-foreground/20 text-foreground font-medium text-base hover:bg-foreground/10 backdrop-blur-sm transition-colors"
                >
                  View Gallery
                </a>
              </div>
            </motion.div>

            {/* Image indicators */}
            <div className="flex items-center gap-3 mt-12">
              {heroImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentHero(i)}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === currentHero
                      ? "w-12 bg-primary"
                      : "w-6 bg-foreground/30 hover:bg-foreground/50"
                  }`}
                  aria-label={`View ${img.title}`}
                />
              ))}
              <span className="ml-4 text-xs text-foreground/50 font-body">
                📷 {heroImages[currentHero].title} — {heroImages[currentHero].photographer}
              </span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <ChevronDown className="h-6 w-6 text-foreground/40" />
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="relative z-10 -mt-1">
        <div className="bg-card/80 backdrop-blur-xl border-y border-border">
          <div className="container mx-auto px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Photographers", value: "10K+", icon: Users },
                { label: "Competitions", value: "250+", icon: Trophy },
                { label: "Courses", value: "80+", icon: BookOpen },
                { label: "Awards Given", value: "1.2K", icon: Award },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Gallery */}
      <section id="gallery" className="py-24 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mb-12"
          >
            <motion.span variants={fadeUp} custom={0} className="text-primary text-sm font-medium tracking-wider uppercase block mb-3">
              Featured Work
            </motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold mb-4">
              Award-Winning Shots
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-lg max-w-xl">
              Stunning captures from our community's most talented photographers
            </motion.p>
          </motion.div>

          {/* Masonry-style gallery */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {galleryImages.map((img, i) => (
              <motion.div
                key={img.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" as const }}
                className={`group relative overflow-hidden rounded-xl cursor-pointer ${
                  i === 0 ? "md:col-span-2 md:row-span-2" : ""
                }`}
              >
                <img
                  src={img.src}
                  alt={img.title}
                  className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                    i === 0 ? "h-64 md:h-full" : "h-48 md:h-64"
                  }`}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <span className="text-xs text-primary font-medium uppercase tracking-wider">{img.category}</span>
                  <h3 className="font-display text-lg font-bold text-foreground">{img.title}</h3>
                  <p className="text-xs text-muted-foreground">by Neil Basu</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="py-24 relative" id="competitions">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/50 to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.span variants={fadeUp} custom={0} className="text-primary text-sm font-medium tracking-wider uppercase block mb-3">
              What We Offer
            </motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-4xl md:text-5xl font-bold mb-4">
              Three Pillars of Photography
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-lg max-w-xl mx-auto">
              Everything you need to grow, compete, and stay inspired
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Competitions Card */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="group relative rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0">
                <img src="/images/hero-1.jpg" alt="Competition" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
              </div>
              <div className="relative z-10 p-8 pt-40 md:pt-56">
                <div className="w-12 h-12 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center mb-5 border border-primary/30">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-3">Competitions</h3>
                <p className="text-foreground/70 leading-relaxed mb-6 text-sm">
                  Enter global & national photography competitions. Submit your best work,
                  get judged by professionals, and win recognition.
                </p>
                <ul className="space-y-2 text-sm text-foreground/60 mb-6">
                  <li className="flex items-center gap-2"><Star className="h-3 w-3 text-secondary" /> Multiple categories & levels</li>
                  <li className="flex items-center gap-2"><Star className="h-3 w-3 text-secondary" /> Expert jury panels</li>
                  <li className="flex items-center gap-2"><Star className="h-3 w-3 text-secondary" /> Winner certificates</li>
                </ul>
                <Link to="/competitions" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  Browse Competitions <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* Education Card */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
              id="education"
              className="group relative rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0">
                <img src="/images/hero-3.jpg" alt="Education" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
              </div>
              <div className="relative z-10 p-8 pt-40 md:pt-56">
                <div className="w-12 h-12 rounded-xl bg-accent/20 backdrop-blur-sm flex items-center justify-center mb-5 border border-accent/30">
                  <BookOpen className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-3">Education</h3>
                <p className="text-foreground/70 leading-relaxed mb-6 text-sm">
                  Master photography through expert-led courses, tutorials, and
                  masterclasses — from beginner to advanced.
                </p>
                <ul className="space-y-2 text-sm text-foreground/60 mb-6">
                  <li className="flex items-center gap-2"><Star className="h-3 w-3 text-secondary" /> Structured courses & lessons</li>
                  <li className="flex items-center gap-2"><Star className="h-3 w-3 text-secondary" /> Video & text content</li>
                  <li className="flex items-center gap-2"><Star className="h-3 w-3 text-secondary" /> Completion certificates</li>
                </ul>
                <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                  Explore Courses <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* Journal Card */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={2}
              id="journal"
              className="group relative rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0">
                <img src="/images/hero-4.jpg" alt="Journal" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
              </div>
              <div className="relative z-10 p-8 pt-40 md:pt-56">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 backdrop-blur-sm flex items-center justify-center mb-5 border border-secondary/30">
                  <Newspaper className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-3">Journal</h3>
                <p className="text-foreground/70 leading-relaxed mb-6 text-sm">
                  Read interviews, case studies, gear reviews, and tips from
                  industry professionals and fellow photographers.
                </p>
                <ul className="space-y-2 text-sm text-foreground/60 mb-6">
                  <li className="flex items-center gap-2"><Star className="h-3 w-3 text-secondary" /> Expert interviews</li>
                  <li className="flex items-center gap-2"><Star className="h-3 w-3 text-secondary" /> Gear reviews & tips</li>
                  <li className="flex items-center gap-2"><Star className="h-3 w-3 text-secondary" /> Case studies</li>
                </ul>
                <Link to="/journal" className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline">
                  Read Articles <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section with background image */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/hero-2.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
        </div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-4xl md:text-6xl font-bold mb-6">
              Ready to Showcase{" "}
              <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                Your Vision?
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
              Join thousands of photographers who compete, learn, and grow together.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <Link
                to="/signup"
                className="group inline-flex items-center gap-2 px-10 py-5 rounded-full bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-all"
              >
                Create Free Account
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <span className="font-display font-bold">Neil Photography</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#gallery" className="hover:text-foreground transition-colors">Gallery</a>
              <a href="#competitions" className="hover:text-foreground transition-colors">Competitions</a>
              <a href="#education" className="hover:text-foreground transition-colors">Education</a>
              <a href="#journal" className="hover:text-foreground transition-colors">Journal</a>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2026 Neil Photography. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
