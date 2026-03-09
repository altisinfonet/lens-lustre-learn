import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type AdPlacement as AdPlacementKey,
  type AdSlot,
  type AdDevice,
  detectAdDevice,
  fetchAdSlots,
  filterAdSlotsForPlacement,
} from "@/lib/adSlots";

interface AdPlacementProps {
  placement: AdPlacementKey;
  className?: string;
  imageClassName?: string;
  maxAds?: number;
  label?: string;
  variant?: "card" | "plain";
}

/** Placement-specific wrapper + image styles */
const placementStyles: Record<AdPlacementKey, { wrapper: string; image: string }> = {
  header: {
    wrapper: "w-full max-h-[120px] overflow-hidden rounded-sm",
    image: "w-full h-auto max-h-[120px] object-cover",
  },
  footer: {
    wrapper: "w-full max-h-[120px] overflow-hidden rounded-sm",
    image: "w-full h-auto max-h-[120px] object-cover",
  },
  sidebar: {
    wrapper: "w-full rounded-sm overflow-hidden",
    image: "w-full h-auto object-cover rounded-sm",
  },
  "in-content": {
    wrapper: "w-full max-h-[150px] overflow-hidden rounded-sm mx-auto max-w-3xl",
    image: "w-full h-auto max-h-[150px] object-cover",
  },
  "between-entries": {
    wrapper: "w-full max-h-[200px] overflow-hidden rounded-sm",
    image: "w-full h-auto max-h-[200px] object-cover",
  },
  "lightbox-overlay": {
    wrapper: "w-full rounded-sm overflow-hidden",
    image: "w-full h-auto max-h-[100px] object-cover rounded-sm",
  },
};

const AdPlacement = ({
  placement,
  className,
  imageClassName,
  maxAds = 1,
  label,
  variant = "card",
}: AdPlacementProps) => {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [device, setDevice] = useState<AdDevice>(() => detectAdDevice(typeof window === "undefined" ? 1280 : window.innerWidth));

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const data = await fetchAdSlots();
      if (alive) setSlots(data);
    };

    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    const onResize = () => setDevice(detectAdDevice(window.innerWidth));
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const visibleAds = useMemo(
    () => filterAdSlotsForPlacement(slots, placement, device).slice(0, maxAds),
    [slots, placement, device, maxAds]
  );

  if (visibleAds.length === 0) return null;

  const ps = placementStyles[placement] ?? placementStyles.sidebar;

  return (
    <div className={cn(
      variant === "card" && "border border-border bg-card/50 rounded-sm",
      ps.wrapper,
      className,
    )}>
      {variant === "card" && label && (
        <div className="px-4 py-2 border-b border-border">
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            {label}
          </span>
        </div>
      )}

      <div className={cn("space-y-3", variant === "card" && "p-3")}>
        {visibleAds.map((ad) => {
          const hasImage = ad.image_source !== "code" && ad.image_url;

          if (hasImage) {
            const imageNode = (
              <img
                src={ad.image_url}
                alt={ad.alt_text || "Sponsored"}
                className={cn(ps.image, imageClassName)}
                loading="lazy"
              />
            );

            return (
              <div key={ad.id}>
                {ad.click_url ? (
                  <a href={ad.click_url} target="_blank" rel="noopener noreferrer" className="block">
                    {imageNode}
                  </a>
                ) : (
                  imageNode
                )}
              </div>
            );
          }

          return ad.ad_code ? (
            <div
              key={ad.id}
              dangerouslySetInnerHTML={{ __html: ad.ad_code }}
              className="text-xs [&_img]:max-w-full [&_img]:rounded-sm"
            />
          ) : null;
        })}
      </div>
    </div>
  );
};

export default AdPlacement;
