import { Camera, Trophy, BookOpen, Newspaper, ArrowRight, Star, Users, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold tracking-tight">
              Neil Photography
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-body text-sm">
            <a href="#competitions" className="text-muted-foreground hover:text-foreground transition-colors">
              Competitions
            </a>
            <a href="#education" className="text-muted-foreground hover:text-foreground transition-colors">
              Education
            </a>
            <a href="#journal" className="text-muted-foreground hover:text-foreground transition-colors">
              Journal
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="text-sm px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full bg-secondary/10 blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 mb-8">
              Where Photographers Thrive
            </span>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] mb-6 max-w-5xl mx-auto">
              Capture.{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Compete.
              </span>{" "}
              Create.
            </h1>
            <p className="font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Join the ultimate photography community — enter global competitions,
              master your craft through expert courses, and stay inspired by our journal.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-all animate-glow-pulse"
              >
                Start Your Journey
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#competitions"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-border text-foreground font-medium text-base hover:bg-muted transition-colors"
              >
                Explore Competitions
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {[
              { label: "Photographers", value: "10K+", icon: Users },
              { label: "Competitions", value: "250+", icon: Trophy },
              { label: "Courses", value: "80+", icon: BookOpen },
              { label: "Awards Given", value: "1.2K", icon: Award },
            ].map((stat, i) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <div className="font-display text-2xl md:text-3xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="font-display text-4xl md:text-5xl font-bold mb-4"
            >
              Three Pillars of Photography
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="text-muted-foreground text-lg max-w-xl mx-auto"
            >
              Everything you need to grow, compete, and stay inspired
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Competitions Card */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
              id="competitions"
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-primary/50 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Trophy className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-3">Competitions</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Enter global & national photography competitions. Submit your best work,
                  get judged by professionals, and win recognition.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-8">
                  <li className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-secondary" /> Multiple categories & levels</li>
                  <li className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-secondary" /> Expert jury panels</li>
                  <li className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-secondary" /> Winner certificates</li>
                </ul>
                <Link
                  to="/competitions"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Browse Competitions <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* Education Card */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
              id="education"
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-accent/50 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                  <BookOpen className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-3">Education</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Master photography through expert-led courses, tutorials, and
                  masterclasses — from beginner to advanced.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-8">
                  <li className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-secondary" /> Structured courses & lessons</li>
                  <li className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-secondary" /> Video & text content</li>
                  <li className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-secondary" /> Completion certificates</li>
                </ul>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  Explore Courses <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* Journal Card */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={2}
              id="journal"
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-secondary/50 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-6">
                  <Newspaper className="h-7 w-7 text-secondary" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-3">Journal</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Read interviews, case studies, gear reviews, and tips from
                  industry professionals and fellow photographers.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-8">
                  <li className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-secondary" /> Expert interviews</li>
                  <li className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-secondary" /> Gear reviews & tips</li>
                  <li className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-secondary" /> Case studies</li>
                </ul>
                <Link
                  to="/journal"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline"
                >
                  Read Articles <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="font-display text-4xl md:text-6xl font-bold mb-6"
            >
              Ready to Showcase{" "}
              <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                Your Vision?
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="text-muted-foreground text-lg max-w-xl mx-auto mb-10"
            >
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
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <span className="font-display font-bold">Neil Photography</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
