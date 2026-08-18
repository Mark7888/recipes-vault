/**
 * Reading an image out of the system clipboard.
 *
 * Browsers disagree about all of this: `navigator.clipboard.read` needs a
 * secure context and does not exist everywhere, and looking at the clipboard
 * without a user gesture only works once the user has granted clipboard-read
 * (Chromium). So the support check is a feature check, and the "is there
 * actually an image on it?" probe is allowed to answer "cannot tell".
 */

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Whether this browser can be asked for the clipboard's contents at all. */
export function clipboardImagesSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator.clipboard?.read === 'function' &&
    typeof ClipboardItem !== 'undefined'
  );
}

/**
 * True/false when the clipboard could be inspected, null when it could not be
 * — no permission yet, or the browser refuses outside a user gesture. Callers
 * treat null as "assume there might be one".
 */
export async function clipboardHasImage(): Promise<boolean | null> {
  if (!clipboardImagesSupported()) return false;
  try {
    const permissions = navigator.permissions as
      | { query: (descriptor: { name: string }) => Promise<{ state: string }> }
      | undefined;
    // Without a standing grant, reading here would either throw or pop the
    // browser's own paste prompt — neither belongs in a background check.
    const status = await permissions?.query({ name: 'clipboard-read' });
    if (status?.state !== 'granted') return null;
    const items = await navigator.clipboard.read();
    return items.some((item) => item.types.some((type) => type.startsWith('image/')));
  } catch {
    return null;
  }
}

/**
 * The image on the clipboard as a file ready to upload, or null when there is
 * none. Throws only when the read itself was refused (denied permission).
 */
export async function readClipboardImage(): Promise<File | null> {
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (!type) continue;
    const blob = await item.getType(type);
    const extension = EXTENSIONS[type] ?? 'png';
    return new File([blob], `clipboard-${Date.now()}.${extension}`, { type: blob.type || type });
  }
  return null;
}
