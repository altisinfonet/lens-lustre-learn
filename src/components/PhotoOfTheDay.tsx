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
    <section className="relative" aria-label="Photo of the Day">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: slowEase }}
        className="relative w-full h-[70vh] md:h-[85vh] overflow-hidden bg-muted"
      >
        <motion.img
          src={potd.image_url}
          alt={potd.title}
          className="w-full h-full object-cover"
          initial={{ scale: 1.05 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 6, ease: slowEase }}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-6 md:px-12 pb-12 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: slowEase }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-[10px] tracking-[0.35em] uppercase text-yellow-500" style={{ fontFamily: "var(--font-heading)" }}>
                Photo of the Day
              </span>
              <div className="w-12 h-px bg-yellow-500/40" />
              <span className="text-[9px] tracking-[0.15em] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                {new Date(potd.featured_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl lg:text-6xl font-light tracking-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
              {potd.title}
            </h2>

            {potd.photographer_name && (
              <div className="flex items-center gap-2 mb-3">
                <Camera className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  by {potd.photographer_name}
                </span>
              </div>
            )}

            {potd.description && (
              <p className="text-sm text-muted-foreground/80 max-w-lg leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                {potd.description}
              </p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
