/**
 * Screenshots go to the model as base64 inside the request body, and the whole
 * conversation is replayed on every turn — so attachments are downscaled and
 * re-encoded as JPEG here, before they ever reach the wire.
 */
const MAX_DIMENSION = 1280;
// Must stay under the server's per-image cap (1.2M characters).
const MAX_DATA_URL_CHARS = 1_150_000;

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error(`Couldn't read "${file.name}". Try a PNG or JPEG screenshot.`);
  }
}

function render(bitmap: ImageBitmap, scale: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process that image.');
  // JPEG has no alpha channel, so transparent PNG screenshots would come out
  // with a black background without this.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function fileToChatImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`"${file.name}" is not an image.`);
  }

  const bitmap = await decode(file);
  try {
    const fit = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

    // Step the quality down first, then the resolution — text in a screenshot
    // survives compression better than it survives shrinking.
    for (const scale of [fit, fit * 0.75, fit * 0.5]) {
      const canvas = render(bitmap, scale);
      for (const quality of [0.85, 0.7, 0.55]) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length <= MAX_DATA_URL_CHARS) return dataUrl;
      }
    }
    throw new Error(`"${file.name}" is too large to attach. Try cropping it first.`);
  } finally {
    bitmap.close();
  }
}
