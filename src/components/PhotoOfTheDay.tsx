import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Star, Camera, Calendar } from "lucide-react";

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

      {/* Image with hover overlay */}
      <div className="group relative overflow-hidden rounded-sm aspect-square bg-muted mb-4 cursor-pointer">
        <motion.img
          src={potd.image_url}
          alt={potd.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          initial={{ scale: 1.06 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 5, ease: slowEase }}
        />

        {/* Dark overlay on hover */}
        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/70 transition-all duration-500" />

        {/* Content that slides up on hover */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
          <h3
            className="text-xl md:text-2xl font-light tracking-tight text-foreground mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {potd.title}
          </h3>
          <div className="w-10 h-px bg-primary mb-3" />
          {potd.photographer_name && (
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                {potd.photographer_name}
              </span>
            </div>
          )}
          {potd.description && (
            <p
              className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {potd.description}
            </p>
          )}
        </div>

        {/* Date badge - always visible */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5">
          <Calendar className="h-3 w-3 text-primary" />
          <span
            className="text-[9px] tracking-[0.15em] uppercase text-foreground"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {new Date(potd.featured_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Bottom gradient - hidden on hover */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/40 to-transparent group-hover:opacity-0 transition-opacity duration-500" />
      </div>
    </motion.div>
  );
}
