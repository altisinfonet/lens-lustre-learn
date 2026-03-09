import { supabase } from "@/integrations/supabase/client";

export type AdPlacement = "header" | "footer" | "sidebar" | "in-content" | "between-entries" | "lightbox-overlay";
export type AdDevice = "desktop" | "mobile" | "tablet";
export type AdImageSource = "upload" | "url" | "code";

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
}

const DEFAULT_DEVICES: AdDevice[] = ["desktop", "mobile", "tablet"];
const CACHE_TTL_MS = 5_000;

let cachedSlots: AdSlot[] | null = null;
let cachedAt = 0;
let pendingFetch: Promise<AdSlot[]> | null = null;

const asText = (value: unknown): string => (typeof value === "string" ? value : "");

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
    priority: typeof slot.priority === "number" ? slot.priority : 0,
    start_date: asText(slot.start_date),
    end_date: asText(slot.end_date),
    image_url: asText(slot.image_url),
    image_source: imageSource,
    click_url: asText(slot.click_url),
    alt_text: asText(slot.alt_text),
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

const hasRenderableCreative = (slot: AdSlot): boolean => {
  if (slot.image_source === "code") return slot.ad_code.trim().length > 0;
  return slot.image_url.trim().length > 0;
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
    .filter((slot) => hasRenderableCreative(slot))
    .sort((a, b) => a.priority - b.priority);
};
