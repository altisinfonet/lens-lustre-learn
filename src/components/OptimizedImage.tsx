import { memo } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
}

/**
 * Renders a <picture> with WebP source + JPG fallback.
 * Expects a matching .webp file alongside the original in public/images/.
 */
const OptimizedImage = memo(({
  src,
  alt,
  className,
  loading = "lazy",
  fetchPriority = "auto",
  sizes,
}: OptimizedImageProps) => {
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, ".webp");
  const isLocalImage = src.startsWith("/images/");

  if (!isLocalImage) {
    return <img src={src} alt={alt} className={className} loading={loading} />;
  }

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" sizes={sizes} />
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={loading === "lazy" ? "async" : "auto"}
      />
    </picture>
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
