import { supabase } from "@/integrations/supabase/client";
import { isS3Enabled, uploadToS3 } from "@/lib/s3Upload";

interface StorageUploadResult {
  url: string;
  path: string;
}

let _s3Enabled: boolean | null = null;
let _s3CheckTime = 0;

/** Cached check for S3 enabled status */
async function checkS3(): Promise<boolean> {
  if (_s3Enabled !== null && Date.now() - _s3CheckTime < 60_000) return _s3Enabled;
  _s3Enabled = await isS3Enabled();
  _s3CheckTime = Date.now();
  return _s3Enabled;
}

/**
 * Upload a file to external S3 (if enabled) or default Supabase storage.
 * Returns { url, path } where path is the storage key.
 */
export async function storageUpload(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean; cacheControl?: string; fileName?: string }
): Promise<StorageUploadResult> {
  const useS3 = await checkS3();

  if (useS3) {
    const s3Path = `${bucket}/${path}`;
    const fileName = options?.fileName || (file instanceof File ? file.name : path.split("/").pop() || "file");
    const result = await uploadToS3(file, s3Path, fileName);
    return { url: result.url, path: s3Path };
  }

  // Default Supabase storage
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: options?.upsert,
    cacheControl: options?.cacheControl,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * Upload compressed image pair (webp + jpeg) and return the webp URL.
 */
export async function storageUploadImagePair(
  bucket: string,
  webpPath: string,
  jpegPath: string,
  webpFile: File | Blob,
  jpegFile: File | Blob,
  options?: { cacheControl?: string }
): Promise<StorageUploadResult> {
  const useS3 = await checkS3();

  if (useS3) {
    // Upload both to S3
    const [webpResult] = await Promise.all([
      uploadToS3(webpFile, `${bucket}/${webpPath}`, webpPath.split("/").pop() || "image.webp"),
      uploadToS3(jpegFile, `${bucket}/${jpegPath}`, jpegPath.split("/").pop() || "image.jpg"),
    ]);
    return { url: webpResult.url, path: `${bucket}/${webpPath}` };
  }

  // Default Supabase storage
  const [webpRes] = await Promise.all([
    supabase.storage.from(bucket).upload(webpPath, webpFile, { cacheControl: options?.cacheControl }),
    supabase.storage.from(bucket).upload(jpegPath, jpegFile, { cacheControl: options?.cacheControl }),
  ]);
  if (webpRes.error) throw webpRes.error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(webpPath);
  return { url: data.publicUrl, path: webpPath };
}

/**
 * Delete file(s) from storage. Only works for Supabase storage currently.
 * S3 deletes would need a separate edge function.
 */
export async function storageRemove(bucket: string, paths: string[]): Promise<void> {
  // For now, attempt Supabase storage removal (works if file is there)
  await supabase.storage.from(bucket).remove(paths);
}

/**
 * Get public URL for a file in storage.
 */
export function storageGetPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
