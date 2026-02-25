import { memo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxProps {
  images: { src: string; title: string; category: string }[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const Lightbox = memo(({ images, currentIndex, isOpen, onClose, onPrev, onNext }: LightboxProps) => {
  const current = images[currentIndex];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    },
    [onClose, onPrev, onNext],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            aria-label="Close lightbox"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Previous */}
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-muted/40 hover:bg-muted/70 flex items-center justify-center text-foreground transition-all"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-muted/40 hover:bg-muted/70 flex items-center justify-center text-foreground transition-all"
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Image */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={current.src}
                alt={`${current.title} — ${current.category}`}
                className="max-w-full max-h-[75vh] object-contain rounded-sm shadow-2xl"
              />
              <div className="mt-6 text-center">
                <span
                  className="text-[10px] tracking-[0.3em] uppercase text-primary block mb-1"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {current.category}
                </span>
                <h3
                  className="text-2xl md:text-3xl font-light text-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {current.title}
                </h3>
                <span
                  className="text-xs text-muted-foreground mt-2 block"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {currentIndex + 1} / {images.length}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

Lightbox.displayName = "Lightbox";

export default Lightbox;
