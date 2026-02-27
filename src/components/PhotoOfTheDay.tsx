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
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: slowEase }}
      className="flex flex-col"
    >
      {/* Label */}
      <div className="flex items-center gap-3 mb-4">
        <Star className="h-4 w-4 text-primary fill-primary" />
        <span
          className="text-[10px] tracking-[0.35em] uppercase text-primary"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Photo of the Day
        </span>
      </div>

      {/* Image */}
      <div className="relative overflow-hidden rounded-sm aspect-[4/3] bg-muted mb-4">
        <motion.img
          src={potd.image_url}
          alt={potd.title}
          className="w-full h-full object-cover"
          initial={{ scale: 1.06 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 5, ease: slowEase }}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/30 to-transparent" />
      </div>

      {/* Title */}
      <h3
        className="text-2xl md:text-3xl font-light tracking-tight mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {potd.title}
      </h3>

      <div className="w-12 h-px bg-border mb-4" />

      {potd.photographer_name && (
        <div className="flex items-center gap-2 mb-3">
          <Camera className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            by {potd.photographer_name}
          </span>
        </div>
      )}

      {potd.description && (
        <p
          className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-3 mb-4"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {potd.description}
        </p>
      )}

      <span
        className="text-[10px] tracking-[0.2em] text-muted-foreground/50 uppercase mt-auto"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {new Date(potd.featured_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </span>
    </motion.div>
  );
}
