import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Palette, ArrowRight } from "lucide-react";
import T from "@/components/T";

interface FeaturedArtistData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  artist_name: string | null;
  artist_avatar_url: string | null;
}

const slowEase = [0.25, 0.1, 0.25, 1] as const;

export default function FeaturedArtist() {
  const [artist, setArtist] = useState<FeaturedArtistData | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("featured_artists")
        .select("id, title, slug, excerpt, cover_image_url, artist_name, artist_avatar_url")
        .eq("is_active", true)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setArtist(data as any);
    };
    fetch();
  }, []);

  if (!artist) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay: 0.15, ease: slowEase }}
      className="flex flex-col"
    >
      {/* Label */}
      <div className="flex items-center gap-3 mb-4">
        <Palette className="h-4 w-4 text-primary" />
        <span
          className="text-[10px] tracking-[0.35em] uppercase text-primary"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <T>Featured Artist</T>
        </span>
      </div>

      {/* Image */}
      <div className="relative overflow-hidden rounded-sm aspect-[3/4] bg-muted mb-5">
        {artist.cover_image_url ? (
          <motion.img
            src={artist.cover_image_url}
            alt={artist.title}
            className="w-full h-full object-cover"
            initial={{ scale: 1.06 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 5, ease: slowEase }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-muted flex items-center justify-center">
            <Palette className="h-16 w-16 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/30 to-transparent" />
      </div>

      {/* Title */}
      <h3
        className="text-2xl md:text-3xl font-light tracking-tight mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {artist.title}
      </h3>

      <div className="w-12 h-px bg-border mb-4" />

      {artist.artist_name && (
        <div className="flex items-center gap-3 mb-3">
          {artist.artist_avatar_url && (
            <img
              src={artist.artist_avatar_url}
              alt={artist.artist_name}
              className="h-7 w-7 rounded-full object-cover border border-border"
            />
          )}
          <span className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            {artist.artist_name}
          </span>
        </div>
      )}

      {artist.excerpt && (
        <p
          className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-3 mb-6"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {artist.excerpt}
        </p>
      )}

      <Link
        to={`/featured-artist/${artist.slug}`}
        className="group inline-flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase text-primary hover:text-primary/80 transition-colors duration-500 mt-auto"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        <T>Read More</T>
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-500" />
      </Link>
    </motion.div>
  );
}
