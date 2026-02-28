import { useState, useCallback, useEffect } from "react";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getJpegDownloadUrl } from "@/lib/imageCompression";
import { motion, AnimatePresence } from "framer-motion";

interface FacebookPhotoGridProps {
  urls: string[];
  onPhotoClick?: (index: number) => void;
}

const FacebookPhotoGrid = ({ urls, onPhotoClick }: FacebookPhotoGridProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const count = urls.length;
  if (count === 0) return null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    onPhotoClick?.(index);
  };

  const Photo = ({ src, index, className = "", overlay }: { src: string; index: number; className?: string; overlay?: string }) => (
    <div
      className={`relative group/photo overflow-hidden cursor-pointer bg-muted/30 ${className}`}
      onClick={() => openLightbox(index)}
    >
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover transition-transform duration-300 group-hover/photo:scale-[1.02]"
        loading="lazy"
      />
      {overlay && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span className="text-white text-3xl font-bold">+{overlay}</span>
        </div>
      )}
      <a
        href={getJpegDownloadUrl(src)}
        download
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-2 right-2 p-1.5 rounded-full bg-card/80 backdrop-blur-sm text-foreground opacity-0 group-hover/photo:opacity-100 transition-opacity hover:bg-card shadow-sm z-10"
        title="Download JPEG"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );

  const grid = count === 1 ? (
    <div className="mt-2 max-h-[480px] overflow-hidden">
      <Photo src={urls[0]} index={0} className="max-h-[480px]" />
    </div>
  ) : count === 2 ? (
    <div className="mt-2 grid grid-cols-2 gap-0.5 max-h-[400px] overflow-hidden">
      <Photo src={urls[0]} index={0} className="h-[400px]" />
      <Photo src={urls[1]} index={1} className="h-[400px]" />
    </div>
  ) : count === 3 ? (
    <div className="mt-2 grid grid-cols-2 gap-0.5 max-h-[400px] overflow-hidden">
      <Photo src={urls[0]} index={0} className="row-span-2 h-[400px]" />
      <Photo src={urls[1]} index={1} className="h-[199px]" />
      <Photo src={urls[2]} index={2} className="h-[199px]" />
    </div>
  ) : count === 4 ? (
    <div className="mt-2 grid grid-cols-2 gap-0.5 max-h-[400px] overflow-hidden">
      <Photo src={urls[0]} index={0} className="h-[199px]" />
      <Photo src={urls[1]} index={1} className="h-[199px]" />
      <Photo src={urls[2]} index={2} className="h-[199px]" />
      <Photo src={urls[3]} index={3} className="h-[199px]" />
    </div>
  ) : (
    <div className="mt-2 grid grid-cols-6 gap-0.5 max-h-[400px] overflow-hidden">
      <Photo src={urls[0]} index={0} className="col-span-3 h-[266px]" />
      <Photo src={urls[1]} index={1} className="col-span-3 h-[266px]" />
      <Photo src={urls[2]} index={2} className="col-span-2 h-[132px]" />
      <Photo src={urls[3]} index={3} className="col-span-2 h-[132px]" />
      <Photo
        src={urls[4]}
        index={4}
        className="col-span-2 h-[132px]"
        overlay={count - 5 > 0 ? String(count - 5) : undefined}
      />
    </div>
  );

  return (
    <>
      {grid}
      <PostLightbox
        urls={urls}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
};

/* ── Full-screen Lightbox ── */
interface PostLightboxProps {
  urls: string[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const PostLightbox = ({ urls, currentIndex, onClose, onNavigate }: PostLightboxProps) => {
  const isOpen = currentIndex !== null;

  const goPrev = useCallback(() => {
    if (currentIndex === null) return;
    onNavigate(currentIndex > 0 ? currentIndex - 1 : urls.length - 1);
  }, [currentIndex, urls.length, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex === null) return;
    onNavigate(currentIndex < urls.length - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, urls.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose, goPrev, goNext]);

  return (
    <AnimatePresence>
      {isOpen && currentIndex !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Top bar */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <span className="text-sm text-white/60 mr-2">
              {currentIndex + 1} / {urls.length}
            </span>
            <a
              href={getJpegDownloadUrl(urls[currentIndex])}
              download
              onClick={(e) => e.stopPropagation()}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              title="Download JPEG"
            >
              <Download className="h-5 w-5" />
            </a>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav arrows */}
          {urls.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Image */}
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              src={urls[currentIndex]}
              alt=""
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FacebookPhotoGrid;
