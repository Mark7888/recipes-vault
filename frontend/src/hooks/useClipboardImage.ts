import { useEffect, useState } from 'react';
import { clipboardHasImage, clipboardImagesSupported } from '../utils/clipboard';

/**
 * Whether to offer a "From Clipboard" button. It is hidden where the browser
 * cannot read the clipboard at all, and where the clipboard can be inspected
 * it also disappears while there is no image on it. When the clipboard cannot
 * be inspected (the common case until the user grants the permission), the
 * button stays — better an offer that reports an empty clipboard than a
 * feature nobody can find.
 */
export function useClipboardImage(): boolean {
  const [available, setAvailable] = useState(() => clipboardImagesSupported());

  useEffect(() => {
    if (!clipboardImagesSupported()) return;
    let cancelled = false;
    const run = () => { void clipboardHasImage().then((result) => { if (!cancelled) setAvailable(result ?? true); }); };
    run();
    // Copying happens in another window, so coming back is the moment to look.
    window.addEventListener('focus', run);
    return () => { cancelled = true; window.removeEventListener('focus', run); };
  }, []);

  return available;
}
