/**
 * Downscale + re-encode an image in the browser before upload, so a multi-MB
 * screenshot becomes a couple hundred KB. Keeps the free 1GB Storage bucket
 * effectively unlimited for a league's worth of trash talk. Client-only
 * (uses canvas / createImageBitmap).
 */
export async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.8
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const longest = Math.max(width, height);
  if (longest > maxDim) {
    const scale = maxDim / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas is not supported in this browser.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not process image.")),
      "image/jpeg",
      quality
    );
  });
}
