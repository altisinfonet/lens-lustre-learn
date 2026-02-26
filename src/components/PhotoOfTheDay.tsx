import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Star, Camera } from "lucide-react";

interface POTD {
  id: string;
  image_url: string;
  title: string;
  photographer_name: string | null;
  description: string | null;
  featured_date: string;
}

const slowEase = [0.25, 0.1, 0.25, 1] as const;

export default function PhotoOfTheDay() {
  const [potd, setPotd] = useState<POTD | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("photo_of_the_day")
        .select("id, image_url, title, photographer_name, description, featured_date")
        .eq("is_active", true)
        .order("featured_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setPotd(data as any);
    };
    fetch();
  }, []);

  if (!potd) return null;

  return (
    <section className="relative py-16 md:py-24" aria-label="Photo of the Day">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          {/* Left — Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: slowEase }}
            className="relative overflow-hidden rounded-sm aspect-[3/4] md:aspect-[4/5] bg-muted"
          >
            <motion.img
              src={potd.image_url}
              alt={potd.title}
              className="w-full h-full object-cover"
              initial={{ scale: 1.06 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 5, ease: slowEase }}
            />
            {/* Minimal bottom-edge gradient for depth */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/30 to-transparent" />
          </motion.div>

          {/* Right — Text */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: slowEase }}
            className="flex flex-col justify-center"
          >
            <div className="flex items-center gap-3 mb-6">
              <Star className="h-4 w-4 text-primary fill-primary" />
              <span
                className="text-[10px] tracking-[0.35em] uppercase text-primary"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Photo of the Day
              </span>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4, ease: slowEase }}
              className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {potd.title}
            </motion.h2>

            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6, ease: slowEase }}
              className="origin-left w-16 h-px bg-border mb-6"
            />

            {potd.photographer_name && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.7, ease: slowEase }}
                className="flex items-center gap-2 mb-4"
              >
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  by {potd.photographer_name}
                </span>
              </motion.div>
            )}

            {potd.description && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.8, ease: slowEase }}
                className="text-sm text-muted-foreground/80 max-w-md leading-relaxed mb-6"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {potd.description}
              </motion.p>
            )}

            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.9, ease: slowEase }}
              className="text-[10px] tracking-[0.2em] text-muted-foreground/50 uppercase"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {new Date(potd.featured_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </motion.span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
