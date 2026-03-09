import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type AdPlacement as AdPlacementKey,
  type AdSlot,
  type AdDevice,
  type AdSenseConfig,
  detectAdDevice,
  fetchAdSlots,
  fetchAdsenseConfig,
  filterAdSlotsForPlacement,
  resolveAdSource,
  trackAdEvent,
} from "@/lib/adSlots";

interface AdPlacementProps {
  placement: AdPlacementKey;
  className?: string;
  imageClassName?: string;
  maxAds?: number;
  label?: string;
  variant?: "card" | "plain";
}

/** IAB responsive container styles per placement */
const placementStyles: Record<AdPlacementKey, { wrapper: string; image: string }> = {
  header: {
    wrapper: "w-full overflow-hidden rounded-sm",
    image: "w-full h-auto object-cover",
  },
  "above-journal": {
    wrapper: "w-full overflow-hidden rounded-sm",
    image: "w-full h-auto object-cover",
  },
  "below-journal": {
    wrapper: "w-full overflow-hidden rounded-sm",
    image: "w-full h-auto object-cover",
  },
  sidebar: {
    wrapper: "w-full rounded-sm overflow-hidden",
    image: "w-full h-auto object-cover rounded-sm",
  },
  "in-content": {
    wrapper: "w-full overflow-hidden rounded-sm mx-auto max-w-3xl",
    image: "w-full h-auto object-cover",
  },
  "between-entries": {
    wrapper: "w-full overflow-hidden rounded-sm",
    image: "w-full h-auto object-cover",
  },
  "lightbox-overlay": {
    wrapper: "w-full rounded-sm overflow-hidden",
    image: "w-full h-auto max-h-[100px] object-cover rounded-sm",
  },
};

/** Inject the AdSense <script> once globally */
let adsenseScriptLoaded = false;
const ensureAdsenseScript = (publisherId: string) => {
  if (adsenseScriptLoaded || !publisherId) return;
  adsenseScriptLoaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
  document.head.appendChild(script);
};

/** Renders a single Google AdSense responsive unit */
const AdsenseUnit = ({ ad, publisherId, placement }: { ad: AdSlot; publisherId: string; placement: AdPlacementKey }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current || !containerRef.current) return;
    pushed.current = true;
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not loaded
    }
  }, []);

  const formatMap: Record<string, string> = {
    auto: "auto",
    horizontal: "horizontal",
    vertical: "vertical",
    rectangle: "rectangle",
  };
  const format = formatMap[ad.adsense_format] || "auto";

  return (
    <div ref={containerRef} className="min-h-[50px]">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={publisherId}
        data-ad-slot={ad.adsense_slot_id}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
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
  const [adsenseConfig, setAdsenseConfig] = useState<AdSenseConfig | null>(null);
  const [device, setDevice] = useState<AdDevice>(() => detectAdDevice(typeof window === "undefined" ? 1280 : window.innerWidth));
  const trackedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [data, config] = await Promise.all([fetchAdSlots(), fetchAdsenseConfig()]);
      if (alive) {
        setSlots(data);
        setAdsenseConfig(config);
        if (config.enabled && config.publisher_id) {
          ensureAdsenseScript(config.publisher_id);
        }
      }
    };
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { alive = false; window.removeEventListener("focus", onFocus); };
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

  // Track impressions
  useEffect(() => {
    visibleAds.forEach((ad) => {
      if (!trackedRef.current.has(ad.id)) {
        trackedRef.current.add(ad.id);
        const source = resolveAdSource(ad);
        trackAdEvent(ad.id, placement, "impression", device, source);
      }
    });
  }, [visibleAds, placement, device]);

  const ps = placementStyles[placement] ?? placementStyles.sidebar;

  // Show placeholder when no ads configured
  if (visibleAds.length === 0) {
    const placementLabels: Record<AdPlacementKey, { label: string; hint: string }> = {
      header: { label: "Header Ad Zone", hint: "Leaderboard · Responsive" },
      footer: { label: "Footer Ad Zone", hint: "Leaderboard · Responsive" },
      "above-journal": { label: "Above Journal Ad Zone", hint: "Banner · Responsive" },
      "below-journal": { label: "Below Journal Ad Zone", hint: "Banner · Responsive" },
      sidebar: { label: "Sidebar Ad Zone", hint: "Rectangle · Responsive" },
      "in-content": { label: "In-Content Ad Zone", hint: "Native · Responsive" },
      "between-entries": { label: "Between Entries Ad Zone", hint: "Banner · Responsive" },
      "lightbox-overlay": { label: "Lightbox Ad Zone", hint: "Compact Strip · Responsive" },
    };
    const info = placementLabels[placement] ?? { label: "Ad Zone", hint: "Responsive" };

    return (
      <div
        className={cn(
          "border-2 border-dashed border-muted-foreground/20 rounded-sm flex flex-col items-center justify-center gap-1 bg-muted/10 select-none",
          placement === "lightbox-overlay" ? "py-3" : "py-6",
          ps.wrapper,
          className,
        )}
      >
        <span className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground/50 font-medium" style={{ fontFamily: "var(--font-heading)" }}>
          {info.label}
        </span>
        <span className="text-[8px] text-muted-foreground/30">{info.hint}</span>
      </div>
    );
  }

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
          const effectiveSource = resolveAdSource(ad);

          // AdSense unit
          if (effectiveSource === "adsense" && adsenseConfig?.enabled && adsenseConfig.publisher_id) {
            return (
              <div key={ad.id}>
                <AdsenseUnit ad={ad} publisherId={adsenseConfig.publisher_id} placement={placement} />
              </div>
            );
          }

          // Internal ad
          const hasImage = ad.image_source !== "code" && ad.image_url;

          if (hasImage) {
            const handleClick = () => {
              trackAdEvent(ad.id, placement, "click", device, "internal");
            };

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
                  <a href={ad.click_url} target="_blank" rel="noopener noreferrer" className="block" onClick={handleClick}>
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
