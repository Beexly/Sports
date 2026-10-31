from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {
    "assets/og/gse-redline-og.png": (1200, 630),
    "assets/social/gse-pick-x.png": (1600, 900),
    "assets/social/gse-dfs-portrait.png": (1080, 1350),
    "assets/social/gse-held-square.png": (1080, 1080),
    "assets/social/gse-product-x.png": (1600, 900),
    "assets/cards/gse-dfs-card.png": (1200, 675),
    "assets/social/gse-pick-story.png": (1080, 1920),
}

for relative, dimensions in EXPECTED.items():
    path = ROOT / relative
    assert path.exists(), f"Missing export: {relative}"
    with Image.open(path) as image:
        assert image.size == dimensions, f"{relative}: expected {dimensions}, got {image.size}"
print(f"Validated {len(EXPECTED)} static exports")
