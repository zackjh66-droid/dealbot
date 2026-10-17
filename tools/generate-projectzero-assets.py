from __future__ import annotations

import base64
import io
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND_FILE = ROOT / "apps" / "web" / "components" / "Brand.jsx"
OUT_DIR = ROOT / "launcher" / "ProjectZero" / "Assets"
BACKGROUND = (8, 9, 13, 255)

ASSETS = {
    "StoreLogo.png": (50, 50, 0.84),
    "StoreLogo.scale-200.png": (100, 100, 0.84),
    "Square44x44Logo.png": (44, 44, 0.84),
    "Square44x44Logo.scale-200.png": (88, 88, 0.84),
    "Square150x150Logo.png": (150, 150, 0.86),
    "Square150x150Logo.scale-200.png": (300, 300, 0.86),
    "Square310x310Logo.png": (310, 310, 0.86),
    "Square310x310Logo.scale-200.png": (620, 620, 0.86),
    "Wide310x150Logo.png": (310, 150, 0.78),
    "Wide310x150Logo.scale-200.png": (620, 300, 0.78),
    "SplashScreen.png": (620, 300, 0.66),
    "SplashScreen.scale-200.png": (1240, 600, 0.66),
}


def load_brand_logo() -> Image.Image:
    text = BRAND_FILE.read_text(encoding="utf-8")
    match = re.search(r"data:image/webp;base64,([A-Za-z0-9+/=]+)", text)
    if not match:
        raise RuntimeError(f"Project Zero brand image was not found in {BRAND_FILE}")

    raw = base64.b64decode(match.group(1), validate=True)
    image = Image.open(io.BytesIO(raw)).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if bbox:
        image = image.crop(bbox)
    return image


def write_asset(logo: Image.Image, name: str, width: int, height: int, fill: float) -> None:
    canvas = Image.new("RGBA", (width, height), BACKGROUND)
    max_width = max(1, int(width * fill))
    max_height = max(1, int(height * fill))
    ratio = min(max_width / logo.width, max_height / logo.height)
    size = (max(1, round(logo.width * ratio)), max(1, round(logo.height * ratio)))
    resized = logo.resize(size, Image.Resampling.LANCZOS)
    x = (width - resized.width) // 2
    y = (height - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    canvas.convert("RGB").save(OUT_DIR / name, format="PNG", optimize=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    logo = load_brand_logo()
    for name, (width, height, fill) in ASSETS.items():
        write_asset(logo, name, width, height, fill)
        print(f"generated {name} ({width}x{height})")


if __name__ == "__main__":
    main()
