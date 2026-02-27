/**
 * Client-side image compression utility.
 *
 * • Accepts ANY size image.
 * • Produces a **WebP** blob for on-site display (small KB).
 * • Produces a **JPEG** blob for user downloads (reasonable quality).
 *
 * Both are generated via the Canvas API – no server dependency.
 */

interface CompressedImage {
  /** WebP blob – used for storage & display on the website */
  webp: Blob;
  /** JPEG blob – used when the user clicks "Download" */
  jpeg: Blob;
  /** Width after resize */
  width: number;
  /** Height after resize */
  height: number;
}

interface CompressOptions {
  /** Max dimension (width or height) in px. Default 1920. */
  maxDimension?: number;
  /** WebP quality 0-1. Default 0.75 */
  webpQuality?: number;
  /** JPEG quality 0-1. Default 0.85 */
  jpegQuality?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxDimension: 1920,
  webpQuality: 0.75,
  jpegQuality: 0.85,
};

/**
 * Load a File / Blob into an HTMLImageElement.
 */
const loadImage = (file: File | Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    const url = URL.createObjectURL(file);
    img.src = url;
    // Revoke after load to free memory
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
  });

/**
 * Draw the image on a canvas, respecting maxDimension, and export
 * both WebP and JPEG blobs.
 */
export async function compressImage(
  file: File,
  options?: CompressOptions
): Promise<CompressedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const img = await loadImage(file);

  let { naturalWidth: w, naturalHeight: h } = img;

  // Down-scale if needed
  if (w > opts.maxDimension || h > opts.maxDimension) {
    const ratio = Math.min(opts.maxDimension / w, opts.maxDimension / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, w, h);

  const [webp, jpeg] = await Promise.all([
    canvasToBlob(canvas, "image/webp", opts.webpQuality),
    canvasToBlob(canvas, "image/jpeg", opts.jpegQuality),
  ]);

  return { webp, jpeg, width: w, height: h };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to create ${type} blob`));
      },
      type,
      quality
    );
  });
}

/**
 * Convenience: compress & return File objects with proper names.
 */
export async function compressImageToFiles(
  file: File,
  baseName?: string,
  options?: CompressOptions
): Promise<{ webpFile: File; jpegFile: File; width: number; height: number }> {
  const name = baseName || file.name.replace(/\.[^.]+$/, "");
  const result = await compressImage(file, options);
  return {
    webpFile: new File([result.webp], `${name}.webp`, { type: "image/webp" }),
    jpegFile: new File([result.jpeg], `${name}.jpg`, { type: "image/jpeg" }),
    width: result.width,
    height: result.height,
  };
}

/**
 * Avatar-specific compression (smaller dimensions).
 */
export async function compressAvatar(file: File): Promise<{ webpFile: File; jpegFile: File }> {
  const { webpFile, jpegFile } = await compressImageToFiles(file, "avatar", {
    maxDimension: 400,
    webpQuality: 0.8,
    jpegQuality: 0.9,
  });
  return { webpFile, jpegFile };
}

/**
 * Thumbnail compression for gallery grids.
 */
export async function compressThumbnail(file: File, baseName?: string): Promise<{ webpFile: File }> {
  const name = baseName || file.name.replace(/\.[^.]+$/, "");
  const result = await compressImage(file, {
    maxDimension: 600,
    webpQuality: 0.7,
  });
  return {
    webpFile: new File([result.webp], `${name}-thumb.webp`, { type: "image/webp" }),
  };
}

/**
 * Given a WebP display URL, derive the corresponding JPEG download URL.
 * If the URL doesn't end with .webp, returns the original URL as-is.
 */
export function getJpegDownloadUrl(webpUrl: string): string {
  if (webpUrl.includes(".webp")) {
    return webpUrl.replace(".webp", ".jpg");
  }
  // Fallback: return original URL (legacy images not yet converted)
  return webpUrl;
}
