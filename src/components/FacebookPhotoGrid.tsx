import { useState } from "react";
import { Download } from "lucide-react";
import { getJpegDownloadUrl } from "@/lib/imageCompression";

interface FacebookPhotoGridProps {
  urls: string[];
  onPhotoClick?: (index: number) => void;
}

/**
 * Facebook-style photo grid layouts:
 * 1 photo  → full width, capped height
 * 2 photos → side by side
 * 3 photos → 1 big left + 2 stacked right
 * 4 photos → 2×2 grid
 * 5+ photos → 2 top + 3 bottom, with "+N" overlay on last
 */
const FacebookPhotoGrid = ({ urls, onPhotoClick }: FacebookPhotoGridProps) => {
  const count = urls.length;
  if (count === 0) return null;

  const Photo = ({ src, index, className = "", overlay }: { src: string; index: number; className?: string; overlay?: string }) => (
    <div
      className={`relative group/photo overflow-hidden cursor-pointer bg-muted/30 ${className}`}
      onClick={() => onPhotoClick?.(index)}
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

  if (count === 1) {
    return (
      <div className="mt-2 max-h-[480px] overflow-hidden">
        <Photo src={urls[0]} index={0} className="max-h-[480px]" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-0.5 max-h-[400px] overflow-hidden">
        <Photo src={urls[0]} index={0} className="h-[400px]" />
        <Photo src={urls[1]} index={1} className="h-[400px]" />
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-0.5 max-h-[400px] overflow-hidden">
        <Photo src={urls[0]} index={0} className="row-span-2 h-[400px]" />
        <Photo src={urls[1]} index={1} className="h-[199px]" />
        <Photo src={urls[2]} index={2} className="h-[199px]" />
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-0.5 max-h-[400px] overflow-hidden">
        <Photo src={urls[0]} index={0} className="h-[199px]" />
        <Photo src={urls[1]} index={1} className="h-[199px]" />
        <Photo src={urls[2]} index={2} className="h-[199px]" />
        <Photo src={urls[3]} index={3} className="h-[199px]" />
      </div>
    );
  }

  // 5+ photos: show 5, overlay remaining count on last
  const remaining = count - 5;
  return (
    <div className="mt-2 grid grid-cols-6 gap-0.5 max-h-[400px] overflow-hidden">
      <Photo src={urls[0]} index={0} className="col-span-3 h-[266px]" />
      <Photo src={urls[1]} index={1} className="col-span-3 h-[266px]" />
      <Photo src={urls[2]} index={2} className="col-span-2 h-[132px]" />
      <Photo src={urls[3]} index={3} className="col-span-2 h-[132px]" />
      <Photo
        src={urls[4]}
        index={4}
        className="col-span-2 h-[132px]"
        overlay={remaining > 0 ? String(remaining) : undefined}
      />
    </div>
  );
};

export default FacebookPhotoGrid;
