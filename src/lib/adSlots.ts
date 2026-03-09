import { supabase } from "@/integrations/supabase/client";

export type AdPlacement = "header" | "footer" | "sidebar" | "in-content" | "between-entries" | "lightbox-overlay" | "above-journal" | "below-journal";
export type AdDevice = "desktop" | "mobile" | "tablet";
export type AdImageSource = "upload" | "url" | "code";
export type AdSource = "internal" | "adsense";

export interface AdSlot {
  id: string;
  name: string;
  placement: AdPlacement;
  devices: AdDevice[];
  ad_code: string;
  is_active: boolean;
  priority: number;
  start_date: string;
  end_date: string;
  image_url: string;
  image_source: AdImageSource;
  click_url: string;
  alt_text: string;
  /** "internal" = self-served creative, "adsense" = Google AdSense unit */
  ad_source: AdSource;
  /** Google AdSense ad-slot ID (data-ad-slot) — only used when ad_source === "adsense" */
  adsense_slot_id: string;
  /** Responsive format hint: "auto" | "horizontal" | "vertical" | "rectangle" */
  adsense_format: string;
  /** Enable A/B testing between adsense and internal */
  ab_enabled: boolean;
  /** % of traffic that sees adsense variant (0-100) */
  ab_adsense_pct: number;
  /** Geo targeting — ISO country codes; empty = all */
  geo_targets: string[];
  /** Hour-of-day range 0-23 */
  schedule_hours_start: number;
  schedule_hours_end: number;
}

export interface AdSenseConfig {
  publisher_id: string; // ca-pub-XXXXX
  enabled: boolean;
  auto_ads: boolean;
}

const DEFAULT_DEVICES: AdDevice[] = ["desktop", "mobile", "tablet"];
const CACHE_TTL_MS = 5_000;

let cachedSlots: AdSlot[] | null = null;
let cachedAt = 0;
let pendingFetch: Promise<AdSlot[]> | null = null;

let cachedAdsenseConfig: AdSenseConfig | null = null;
let adsenseConfigAt = 0;

const asText = (value: unknown): string => (typeof value === "string" ? value : "");
const asNum = (value: unknown, def: number): number => (typeof value === "number" ? value : def);

const asDevices = (value: unknown): AdDevice[] => {
  if (!Array.isArray(value)) return DEFAULT_DEVICES;
  const filtered = value.filter((item): item is AdDevice => item === "desktop" || item === "mobile" || item === "tablet");
  return filtered.length ? filtered : DEFAULT_DEVICES;
};

const normalizeSlot = (raw: unknown): AdSlot | null => {
  if (!raw || typeof raw !== "object") return null;
  const slot = raw as Record<string, unknown>;

  const placement = asText(slot.placement) as AdPlacement;
  if (!placement) return null;

  const imageSource = (asText(slot.image_source) as AdImageSource) || "code";

  return {
    id: asText(slot.id) || crypto.randomUUID(),
    name: asText(slot.name),
    placement,
    devices: asDevices(slot.devices),
    ad_code: asText(slot.ad_code) || asText(slot.html_code),
    is_active: slot.is_active !== false,
    priority: asNum(slot.priority, 0),
    start_date: asText(slot.start_date),
    end_date: asText(slot.end_date),
    image_url: asText(slot.image_url),
    image_source: imageSource,
    click_url: asText(slot.click_url),
    alt_text: asText(slot.alt_text),
    ad_source: (asText(slot.ad_source) as AdSource) || "internal",
    adsense_slot_id: asText(slot.adsense_slot_id),
    adsense_format: asText(slot.adsense_format) || "auto",
    ab_enabled: slot.ab_enabled === true,
    ab_adsense_pct: asNum(slot.ab_adsense_pct, 50),
    geo_targets: Array.isArray(slot.geo_targets) ? (slot.geo_targets as string[]) : [],
    schedule_hours_start: asNum(slot.schedule_hours_start, 0),
    schedule_hours_end: asNum(slot.schedule_hours_end, 24),
  };
};

const isWithinSchedule = (slot: AdSlot, now: Date): boolean => {
  if (slot.start_date) {
    const start = new Date(`${slot.start_date}T00:00:00`);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (slot.end_date) {
    const end = new Date(`${slot.end_date}T23:59:59.999`);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
};

const isWithinHourSchedule = (slot: AdSlot, now: Date): boolean => {
  const hour = now.getHours();
  if (slot.schedule_hours_start === 0 && slot.schedule_hours_end === 24) return true;
  if (slot.schedule_hours_start <= slot.schedule_hours_end) {
    return hour >= slot.schedule_hours_start && hour < slot.schedule_hours_end;
  }
  // Wraps midnight e.g. 22-6
  return hour >= slot.schedule_hours_start || hour < slot.schedule_hours_end;
};

const hasRenderableCreative = (slot: AdSlot): boolean => {
  if (slot.ad_source === "adsense") return !!slot.adsense_slot_id.trim();
  if (slot.image_source === "code") return slot.ad_code.trim().length > 0;
  return slot.image_url.trim().length > 0;
};

/** Resolve A/B: returns effective ad_source for this impression */
export const resolveAdSource = (slot: AdSlot): AdSource => {
  if (!slot.ab_enabled) return slot.ad_source;
  return Math.random() * 100 < slot.ab_adsense_pct ? "adsense" : "internal";
};

export const detectAdDevice = (width: number): AdDevice => {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
};

export const fetchAdSlots = async ({ force = false }: { force?: boolean } = {}): Promise<AdSlot[]> => {
  const now = Date.now();
  if (!force && cachedSlots && now - cachedAt < CACHE_TTL_MS) return cachedSlots;
  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["ad_slots", "advertisements"]);

    if (error) return cachedSlots ?? [];

    const adSlotsSetting = data?.find((row) => row.key === "ad_slots")?.value;
    const legacyAdsSetting = data?.find((row) => row.key === "advertisements")?.value as { slots?: unknown[] } | undefined;

    const rawSlots = Array.isArray(adSlotsSetting)
      ? adSlotsSetting
      : Array.isArray(legacyAdsSetting?.slots)
        ? legacyAdsSetting.slots
        : [];

    const normalized = rawSlots
      .map(normalizeSlot)
      .filter((slot): slot is AdSlot => !!slot)
      .sort((a, b) => a.priority - b.priority);

    cachedSlots = normalized;
    cachedAt = Date.now();

    return normalized;
  })();

  try {
    return await pendingFetch;
  } finally {
    pendingFetch = null;
  }
};

export const fetchAdsenseConfig = async ({ force = false }: { force?: boolean } = {}): Promise<AdSenseConfig> => {
  const now = Date.now();
  if (!force && cachedAdsenseConfig && now - adsenseConfigAt < CACHE_TTL_MS) return cachedAdsenseConfig;

  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "adsense_config")
    .maybeSingle();

  const val = (data?.value || {}) as Record<string, unknown>;
  const config: AdSenseConfig = {
    publisher_id: asText(val.publisher_id),
    enabled: val.enabled === true,
    auto_ads: val.auto_ads === true,
  };

  cachedAdsenseConfig = config;
  adsenseConfigAt = Date.now();
  return config;
};

export const filterAdSlotsForPlacement = (
  slots: AdSlot[],
  placement: AdPlacement,
  device: AdDevice,
  now = new Date()
): AdSlot[] => {
  return slots
    .filter((slot) => slot.placement === placement)
    .filter((slot) => slot.is_active)
    .filter((slot) => slot.devices.includes(device))
    .filter((slot) => isWithinSchedule(slot, now))
    .filter((slot) => isWithinHourSchedule(slot, now))
    .filter((slot) => hasRenderableCreative(slot))
    .sort((a, b) => a.priority - b.priority);
};

/** Track an ad impression or click */
export const trackAdEvent = async (
  slotId: string,
  placement: string,
  eventType: "impression" | "click",
  device: string,
  adSource: AdSource
) => {
  try {
    await supabase.from("ad_impressions").insert({
      slot_id: slotId,
      placement,
      event_type: eventType,
      device,
      ad_source: adSource,
    });
  } catch {
    // silent — tracking should never block UX
  }
};
