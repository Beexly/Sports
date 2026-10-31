from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "assets/og/gse-redline-og.png",
    "assets/social/gse-pick-x.png",
    "assets/social/gse-dfs-portrait.png",
    "assets/social/gse-held-square.png",
    "assets/social/gse-product-x.png",
    "assets/cards/gse-dfs-card.png",
    "assets/social/gse-pick-story.png",
]
TILE_W, TILE_H = 420, 440
sheet = Image.new("RGB", (TILE_W * 3, TILE_H * 3), (25, 25, 25))
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 16)
for index, relative in enumerate(FILES):
    image = Image.open(ROOT / relative).convert("RGB")
    thumb = ImageOps.contain(image, (400, 390))
    x = (index % 3) * TILE_W + (TILE_W - thumb.width) // 2
    y = (index // 3) * TILE_H + 8
    sheet.paste(thumb, (x, y))
    draw.text(((index % 3) * TILE_W + 12, (index // 3) * TILE_H + 408), Path(relative).name, font=font, fill=(237, 232, 224))
sheet.save(ROOT / "reviews" / "social-contact-sheet.png")
print("Created social contact sheet")
