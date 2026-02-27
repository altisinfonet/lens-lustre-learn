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
    <section className="relative py-16 md:py-24" aria-label="Featured Artist">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">
          {/* Right — Text (order first on mobile for visual hierarchy) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: slowEase }}
            className="flex flex-col justify-center order-2 md:order-1"
          >
            <div className="flex items-center gap-3 mb-6">
              <Palette className="h-4 w-4 text-primary" />
              <span
                className="text-[10px] tracking-[0.35em] uppercase text-primary"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <T>Featured Artist</T>
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
              {artist.title}
            </motion.h2>

            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6, ease: slowEase }}
              className="origin-left w-16 h-px bg-border mb-6"
            />

            {artist.artist_name && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.7, ease: slowEase }}
                className="flex items-center gap-3 mb-4"
              >
                {artist.artist_avatar_url && (
                  <img
                    src={artist.artist_avatar_url}
                    alt={artist.artist_name}
                    className="h-8 w-8 rounded-full object-cover border border-border"
                  />
                )}
                <span className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  {artist.artist_name}
                </span>
              </motion.div>
            )}

            {artist.excerpt && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.8, ease: slowEase }}
                className="text-sm text-muted-foreground/80 max-w-md leading-relaxed mb-8 line-clamp-3"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {artist.excerpt}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.9, ease: slowEase }}
            >
              <Link
                to={`/featured-artist/${artist.slug}`}
                className="group inline-flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase text-primary hover:text-primary/80 transition-colors duration-500"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <T>Read More</T>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-500" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Left — Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: slowEase }}
            className="relative overflow-hidden rounded-sm aspect-[3/4] md:aspect-[4/5] bg-muted order-1 md:order-2"
          >
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
          </motion.div>
        </div>
      </div>
    </section>
  );
}
