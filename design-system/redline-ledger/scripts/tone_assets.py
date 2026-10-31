from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "higgsfield"
PUBLIC = ROOT / "site" / "public" / "assets" / "higgsfield"
PUBLIC.mkdir(parents=True, exist_ok=True)

GROUND = (8, 9, 12)
BONE = (237, 232, 224)
EMBER = (255, 77, 46)

def contact_tone(image):
    gray = ImageOps.grayscale(image)
    gray = ImageOps.autocontrast(gray, cutoff=1)
    return ImageOps.colorize(gray, black=GROUND, white=BONE, mid=(92, 89, 84))

def save(image, name):
    image.save(OUT / f"{name}.webp", quality=88, method=6)
    image.save(PUBLIC / f"{name}.webp", quality=88, method=6)

hero = Image.open(OUT / "hero-sideline.png").convert("RGB")
hero_crop = hero.crop((36, 390, 1960, 1088))
save(contact_tone(hero_crop), "hero-sideline")

field_crop = hero.crop((540, 510, 1740, 1088))
save(contact_tone(field_crop), "field-chalk")

square_crop = hero.crop((700, 450, 1500, 1088))
square_crop = ImageOps.fit(square_crop, (1200, 1200), method=Image.Resampling.LANCZOS)
save(contact_tone(square_crop), "contact-sheet-square")

football = Image.open(OUT / "football-seams-portrait.png").convert("RGB")
laces = football.crop((40, 1510, 1080, 1880))
laces = contact_tone(laces)
portrait = Image.new("RGB", (1080, 1440), GROUND)
portrait.paste(laces, (0, 900))
draw = ImageDraw.Draw(portrait)
draw.line((0, 830, 1080, 830), fill=EMBER, width=6)
save(portrait, "football-seams-portrait")
print("Created 4 reviewed derivatives from 2 source generations")
