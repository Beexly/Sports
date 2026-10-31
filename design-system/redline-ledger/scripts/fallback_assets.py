from pathlib import Path
from PIL import Image, ImageDraw
import random

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "higgsfield"
PUBLIC = ROOT / "site" / "public" / "assets" / "higgsfield"
PUBLIC.mkdir(parents=True, exist_ok=True)
random.seed(81)

SPECS = {
    "hero-sideline": (1600, 1000, "field"),
    "field-chalk": (1600, 1000, "field"),
    "stats-desk": (1600, 1000, "desk"),
    "empty-grandstand": (1600, 1000, "stands"),
    "chain-marker-portrait": (1080, 1920, "field"),
    "football-seams-portrait": (1080, 1920, "field"),
    "contact-sheet-square": (1200, 1200, "field"),
    "paper-grain-square": (1200, 1200, "paper"),
}

def noisy_surface(size, base, variation=12):
    w, h = size
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(h):
        for x in range(w):
            delta = random.randint(-variation, variation)
            pixels[x, y] = tuple(max(0, min(255, c + delta)) for c in base)
    return image

for name, (w, h, kind) in SPECS.items():
    if (OUT / f"{name}.webp").exists():
        continue
    if kind == "paper":
        image = noisy_surface((w, h), (244, 241, 235), 5)
        draw = ImageDraw.Draw(image)
        x, y = int(w * 0.88), int(h * 0.12)
        draw.line((x - 32, y, x + 32, y), fill=(255, 77, 46), width=3)
        draw.line((x, y - 32, x, y + 32), fill=(255, 77, 46), width=3)
    else:
        image = noisy_surface((w, h), (8, 9, 12), 9)
        draw = ImageDraw.Draw(image)
        if kind == "field":
            draw.line((int(w * 0.08), int(h * 0.88), int(w * 0.82), int(h * 0.14)), fill=(196, 191, 182), width=max(3, w // 300))
            draw.line((int(w * 0.74), int(h * 0.18), int(w * 0.79), int(h * 0.24)), fill=(255, 77, 46), width=max(5, w // 180))
            for _ in range(85):
                x, y = random.randrange(w), random.randrange(h)
                draw.point((x, y), fill=(237, 232, 224))
        elif kind == "desk":
            draw.rectangle((int(w * .12), int(h * .12), int(w * .72), int(h * .84)), outline=(196, 191, 182), width=3)
            draw.line((int(w * .16), int(h * .76), int(w * .72), int(h * .28)), fill=(255, 77, 46), width=8)
            draw.ellipse((int(w * .76), int(h * .18), int(w * .9), int(h * .42)), outline=(49, 53, 63), width=12)
        elif kind == "stands":
            for row in range(8):
                y = int(h * (0.18 + row * 0.09))
                draw.line((int(w * .06), y, int(w * .94), y + row * 3), fill=(49 + row * 3, 53 + row * 3, 63 + row * 3), width=5)
            draw.line((int(w * .72), int(h * .22), int(w * .72), int(h * .28)), fill=(255, 77, 46), width=8)
    image.save(OUT / f"{name}.webp", quality=88, method=6)
    image.save(PUBLIC / f"{name}.webp", quality=88, method=6)
print("Fallback pass complete; all existing assets preserved")
