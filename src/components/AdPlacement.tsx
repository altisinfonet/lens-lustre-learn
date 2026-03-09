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

  return (
    <div className={cn(variant === "card" && "border border-border bg-card/50 rounded-sm", className)}>
      {variant === "card" && label && (
        <div className="px-4 py-3 border-b border-border">
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            {label}
          </span>
        </div>
      )}

      <div className={cn("space-y-3", variant === "card" && "p-4")}>
        {visibleAds.map((ad) => {
          const hasImage = ad.image_source !== "code" && ad.image_url;

          if (hasImage) {
            const imageNode = (
              <img
                src={ad.image_url}
                alt={ad.alt_text || "Sponsored"}
                className={cn("w-full rounded-sm object-cover", imageClassName)}
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
