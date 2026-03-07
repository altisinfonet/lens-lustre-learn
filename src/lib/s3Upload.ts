import { supabase } from "@/integrations/supabase/client";

interface S3UploadResult {
  url: string;
  key: string;
}

/**
 * Check if S3 storage is enabled via site_settings.
 * Caches the result for 60 seconds to avoid repeated queries.
 */
let cachedS3Enabled: boolean | null = null;
let cacheTime = 0;

export async function isS3Enabled(): Promise<boolean> {
  if (cachedS3Enabled !== null && Date.now() - cacheTime < 60_000) {
    return cachedS3Enabled;
  }
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "s3_storage_settings")
    .maybeSingle();

  const val = data?.value as any;
  cachedS3Enabled = !!(val?.enabled);
  cacheTime = Date.now();
  return cachedS3Enabled;
}

/** Clear the S3 enabled cache (call after admin saves settings) */
export function clearS3Cache() {
  cachedS3Enabled = null;
  cacheTime = 0;
}

/**
 * Upload a file to S3 via the edge function proxy.
 */
export async function uploadToS3(file: File | Blob, path: string, fileName?: string): Promise<S3UploadResult> {
  const formData = new FormData();
  formData.append("file", file, fileName || (file instanceof File ? file.name : "file"));
  formData.append("path", path);

  const { data, error } = await supabase.functions.invoke("s3-upload", {
    body: formData,
  });

  if (error) throw new Error(error.message || "S3 upload failed");
  if (data?.error) throw new Error(data.error);

  return { url: data.url, key: data.key };
}
