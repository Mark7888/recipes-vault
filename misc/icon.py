#!/usr/bin/env python3
"""Generate the favicon and PWA icons from misc/icon.png.

Run from the project root:

    python3 misc/icon.py

Outputs into frontend/public/ (created if missing):
  - favicon.ico              multi-size (16/32/48) browser tab icon
  - apple-touch-icon.png     180x180, iOS home screen
  - pwa-192x192.png          Android/PWA install icon
  - pwa-512x512.png          Android/PWA splash icon
  - maskable-icon-512x512.png  512x512 with a safe-zone margin for adaptive masks

Requires Pillow: pip install Pillow
"""

from pathlib import Path

from PIL import Image

SOURCE = Path("misc/icon.png")
OUT_DIR = Path("frontend/public")

BACKGROUND = (255, 255, 255)  # source art sits on a white background
PWA_SIZES = (192, 512)
APPLE_TOUCH_SIZE = 180
MASKABLE_SIZE = 512
# Adaptive icon masks may crop anything outside the central ~80% circle,
# so the artwork is scaled down to this fraction of the canvas.
MASKABLE_SAFE_ZONE = 0.78
FAVICON_SIZES = [(16, 16), (32, 32), (48, 48)]


def load_square_source() -> Image.Image:
    img = Image.open(SOURCE).convert("RGB")
    if img.width == img.height:
        return img
    # Pad the shorter side with the background color to make it square
    side = max(img.size)
    canvas = Image.new("RGB", (side, side), BACKGROUND)
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas


def resized(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def maskable(img: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGB", (size, size), BACKGROUND)
    inner = round(size * MASKABLE_SAFE_ZONE)
    offset = (size - inner) // 2
    canvas.paste(img.resize((inner, inner), Image.LANCZOS), (offset, offset))
    return canvas


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"{SOURCE} not found — run this script from the project root")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    src = load_square_source()

    for size in PWA_SIZES:
        path = OUT_DIR / f"pwa-{size}x{size}.png"
        resized(src, size).save(path, optimize=True)
        print(f"wrote {path}")

    path = OUT_DIR / "apple-touch-icon.png"
    resized(src, APPLE_TOUCH_SIZE).save(path, optimize=True)
    print(f"wrote {path}")

    path = OUT_DIR / f"maskable-icon-{MASKABLE_SIZE}x{MASKABLE_SIZE}.png"
    maskable(src, MASKABLE_SIZE).save(path, optimize=True)
    print(f"wrote {path}")

    path = OUT_DIR / "favicon.ico"
    resized(src, 48).save(path, sizes=FAVICON_SIZES)
    print(f"wrote {path}")


if __name__ == "__main__":
    main()
