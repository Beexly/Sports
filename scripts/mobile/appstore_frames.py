#!/usr/bin/env python3
"""
appstore_frames.py — render the App Store preview frames as PNG.

WHY PIL AND NOT THE BROWSER:
  The Minis browser wedged on these pages twice (a 300s hang, twice, on a page
  with no script in it). It is also the wrong tool for the job: an App Store
  screenshot has to be an EXACT pixel size, and a screenshot pipeline that
  applies a device scale factor is one rounding step away from 1287x2796, which
  App Store Connect rejects without saying why.

  PIL gives exact dimensions, uses the real brand fonts already installed at
  /usr/share/fonts/gse/, and produces the same output every run.

WHAT IT PRODUCES
  Six frames at 1290x2796 (the App Store Connect size for a 6.9 inch iPhone),
  plus a contact sheet for review.

USAGE
  python3 scripts/appstore_frames.py
"""

from __future__ import annotations

import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

# ── FIELD tokens, from apps/mobile/src/theme/tokens.ts ───────────────────────
CARBON = (8, 9, 12)
ECLIPSE = (18, 20, 26)
MINERAL = (35, 38, 46)
BONE = (237, 232, 224)
FOG = (196, 191, 182)
MIST = (143, 138, 130)
EMBER = (255, 77, 46)
IRIS = (154, 168, 232)
CAUTION = (255, 180, 84)

W, H = 1290, 2796
MARGIN = 72
# Apple's safe area for the top of a 6.9 inch display, at 3x.
TOP_SAFE = 162
BOTTOM_SAFE = 120

FONT_DIR = pathlib.Path("/usr/share/fonts/gse")
FALLBACK_DIR = pathlib.Path("/usr/share/fonts")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    """Load a brand font, falling back to DejaVu rather than crashing."""
    candidate = FONT_DIR / name
    if candidate.exists():
        return ImageFont.truetype(str(candidate), size)
    for fb in FALLBACK_DIR.rglob("DejaVuSans.ttf"):
        return ImageFont.truetype(str(fb), size)
    return ImageFont.load_default()


def inter(weight: int, size: int) -> ImageFont.FreeTypeFont:
    return font(f"Inter-{weight}-normal.ttf", size)


FRAMES = [
    {
        "id": "01-gate",
        "eyebrow": "THE BOARD",
        "caption": "It says no\nmore than it\nsays yes.",
        "body": "Published, scoring and gated, side by side.",
        "kind": "lanes",
    },
    {
        "id": "02-evidence",
        "eyebrow": "EVERY PICK",
        "caption": "Every call\ncarries its\nown evidence.",
        "body": "The factor breakdown, the market price, the freshness stamp.",
        "kind": "confidence",
    },
    {
        "id": "03-calibration",
        "eyebrow": "CALIBRATION",
        "caption": "When it is\nwrong, it says\nso here.",
        "body": "Does higher confidence actually win more? We publish either answer.",
        "kind": "verdict",
    },
    {
        "id": "04-withheld",
        "eyebrow": "DISCIPLINE",
        "caption": "We withhold\nwhat we price\nworse than\nthe book.",
        "body": "And we count it, rather than hiding it.",
        "kind": "withheld",
    },
    {
        "id": "05-quiet",
        "eyebrow": "QUIET DAYS",
        "caption": "Some days\nthere is\nnothing.",
        "body": "We tell you that too.",
        "kind": "quiet",
    },
    {
        "id": "06-receipt",
        "eyebrow": "RECEIPTS",
        "caption": "Every pick\nhas a receipt\nyou can check.",
        "body": "Committed before kickoff. Verifiable after.",
        "kind": "receipt",
    },
]


def draw_mark(draw: ImageDraw.ImageDraw, x: int, y: int, size: int) -> None:
    """The NEBULA v7 mark, scaled. Same geometry as the app's component."""
    s = size / 64.0
    cx, cy, r = x + 32 * s, y + 32 * s, 27 * s
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(58, 63, 75), width=max(1, int(2 * s)))
    draw.ellipse([cx - 7 * s, cy - 7 * s, cx + 7 * s, cy + 7 * s], fill=BONE)
    draw.ellipse(
        [x + 6.5 * s, y + 36.5 * s, x + 13.5 * s, y + 43.5 * s],
        fill=EMBER,
    )


def wrap(
    draw: ImageDraw.ImageDraw,
    text: str,
    fnt: ImageFont.FreeTypeFont,
    max_width: int,
) -> str:
    """Greedy word wrap. PIL has no layout engine, so this is explicit.

    Without it the body copy ran off the right edge of the frame, which the
    contact-sheet review caught and no test would have.
    """
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=fnt) <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\n".join(lines)


def text_block(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    spacing: int = 12,
) -> int:
    """Draw multi-line text, returning the y after the block."""
    x, y = xy
    for line in text.split("\n"):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += fnt.size + spacing
    return y


def render(frame: dict[str, str], index: int, out_dir: pathlib.Path) -> pathlib.Path:
    img = Image.new("RGB", (W, H), CARBON)
    d = ImageDraw.Draw(img)

    # ── Header: mark + wordmark ─────────────────────────────────────────────
    y = TOP_SAFE
    draw_mark(d, MARGIN, y, 66)
    d.text((MARGIN + 92, y + 16), "GALAXY SPORTS EDGE", font=inter(600, 30), fill=IRIS)

    # ── Caption: the arch-scale headline, in the condensed face ─────────────
    y = 560
    d.text((MARGIN, y), frame["eyebrow"], font=inter(600, 30), fill=MIST)
    y += 70
    y = text_block(d, frame["caption"], (MARGIN, y), font("BarlowCondensed-700-normal.ttf", 168), BONE, spacing=6)
    y += 40
    body_font = inter(400, 44)
    y = text_block(
        d,
        wrap(d, frame["body"], body_font, W - 2 * MARGIN),
        (MARGIN, y),
        body_font,
        FOG,
        spacing=16,
    )

    # ── Evidence panel ──────────────────────────────────────────────────────
    panel_top = y + 120
    # A ceiling so a long caption cannot push the panel off the bottom, and a
    # floor so a short one does not float in the middle of the frame.
    panel_top = max(panel_top, 1180)
    panel_bottom = H - BOTTOM_SAFE - 150
    # Measure first (on a scratch layer), then draw the card, then the content,
    # so the panel is exactly as tall as what is inside it.
    scratch = ImageDraw.Draw(Image.new("RGB", (W, H)))
    used = evidence(scratch, frame["kind"], MARGIN + 56, panel_top + 56, W - 2 * MARGIN - 112)
    panel_bottom = min(panel_top + 56 + used + 56, H - BOTTOM_SAFE - 150)
    d.rounded_rectangle(
        [MARGIN, panel_top, W - MARGIN, panel_bottom],
        radius=42,
        fill=ECLIPSE,
        outline=MINERAL,
        width=2,
    )
    evidence(d, frame["kind"], MARGIN + 56, panel_top + 56, W - 2 * MARGIN - 112)

    # ── Footer ──────────────────────────────────────────────────────────────
    d.line([MARGIN, H - BOTTOM_SAFE - 78, W - MARGIN, H - BOTTOM_SAFE - 78], fill=MINERAL, width=2)
    d.text((MARGIN, H - BOTTOM_SAFE - 46), f"FRAME {index + 1} OF {len(FRAMES)}", font=inter(500, 26), fill=MIST)
    closing = "We detect. You decide."
    wpx = d.textlength(closing, font=inter(500, 26))
    d.text((W - MARGIN - wpx, H - BOTTOM_SAFE - 46), closing, font=inter(500, 26), fill=MIST)

    path = out_dir / f"{frame['id']}.png"
    img.save(path, "PNG")
    return path


def evidence(d: ImageDraw.ImageDraw, kind: str, x: int, y: int, width: int) -> int:
    """The per-frame proof, mirroring the app's real components.

    Returns the height used, so the panel is sized to its content rather than to
    a constant. A fixed bottom left a third of three frames as empty card.
    """
    if kind == "lanes":
        pills = [("PUBLISHED 3", EMBER), ("SCORING 4", IRIS), ("GATED 7", FOG)]
        cx = x
        for label, colour in pills:
            w = d.textlength(label, font=inter(500, 26)) + 40
            d.rounded_rectangle([cx, y, cx + w, y + 58], radius=8, outline=colour, width=2)
            d.text((cx + 20, y + 14), label, font=inter(500, 26), fill=colour)
            cx += w + 20
        d.text((x, y + 130), "BOOKS POLLED", font=inter(500, 26), fill=MIST)
        d.text((x, y + 176), "11", font=inter(700, 96), fill=BONE)
        return 176 + 116

    elif kind == "confidence":
        d.text((x, y), "CONFIDENCE", font=inter(500, 26), fill=MIST)
        d.text((x, y + 46), "72/100", font=inter(700, 110), fill=EMBER)
        bx, by, bw = x, y + 196, width
        d.rounded_rectangle([bx, by, bx + bw, by + 16], radius=8, fill=(48, 51, 60))
        d.rounded_rectangle([bx, by, bx + int(bw * 0.72), by + 16], radius=8, fill=EMBER)
        d.text((x, y + 262), "EDGE INDEX", font=inter(500, 26), fill=MIST)
        d.text((x, y + 306), "14.2", font=inter(600, 62), fill=BONE)
        d.text((x + 340, y + 262), "MARKET IMPLIED", font=inter(500, 26), fill=MIST)
        d.text((x + 340, y + 306), "48.7%", font=inter(600, 62), fill=BONE)
        return 306 + 78

    elif kind == "verdict":
        d.polygon([(x + 24, y + 10), (x + 44, y + 46), (x + 4, y + 46)], fill=EMBER)
        d.text((x + 66, y + 6), "Higher confidence is winning less.", font=inter(600, 48), fill=EMBER)
        d.text((x + 66, y + 70), "Under review.", font=inter(600, 48), fill=EMBER)
        d.text((x, y + 180), "SETTLED", font=inter(500, 26), fill=MIST)
        d.text((x, y + 224), "142", font=inter(600, 62), fill=BONE)
        d.text((x + 340, y + 180), "BRIER", font=inter(500, 26), fill=MIST)
        d.text((x + 340, y + 224), "0.2381", font=inter(600, 62), fill=BONE)
        return 224 + 78

    elif kind == "withheld":
        label = "WITHHELD 3"
        w = d.textlength(label, font=inter(500, 26)) + 40
        d.rounded_rectangle([x, y, x + w, y + 58], radius=8, outline=CAUTION, width=2)
        d.text((x + 20, y + 14), label, font=inter(500, 26), fill=CAUTION)
        d.text((x, y + 110), "2 priced worse than the book", font=inter(400, 44), fill=FOG)
        d.text((x, y + 168), "by our own estimate.", font=inter(400, 44), fill=FOG)
        d.text((x, y + 254), "1 not refreshed inside", font=inter(400, 44), fill=FOG)
        d.text((x, y + 312), "the staleness window.", font=inter(400, 44), fill=FOG)
        return 312 + 56

    elif kind == "quiet":
        d.text((x, y), "The engine ran and did not", font=inter(400, 46), fill=FOG)
        d.text((x, y + 62), "find an edge it could stand", font=inter(400, 46), fill=FOG)
        d.text((x, y + 124), "behind. That is the product", font=inter(400, 46), fill=FOG)
        d.text((x, y + 186), "working as designed.", font=inter(400, 46), fill=FOG)
        d.line([x, y + 280, x + width, y + 280], fill=MINERAL, width=2)
        d.text((x, y + 310), "QUIET SLATE", font=inter(500, 26), fill=MIST)
        return 310 + 40

    else:  # receipt
        d.text((x, y), "CONTENT HASH", font=inter(500, 26), fill=MIST)
        d.text((x, y + 50), "4f9c21ab8e77d0c3b1a59e42", font=inter(400, 34), fill=FOG)
        d.text((x, y + 96), "0f6d7c88a1b3e5f7092d4c6a", font=inter(400, 34), fill=FOG)
        d.line([x, y + 180, x + width, y + 180], fill=MINERAL, width=2)
        d.text((x, y + 214), "COMMITTED BEFORE KICKOFF", font=inter(500, 26), fill=MIST)
        return 214 + 40


def contact_sheet(paths: list[pathlib.Path], out_dir: pathlib.Path) -> pathlib.Path:
    """One image with all six frames, for a single-glance review."""
    thumb_w = 320
    thumb_h = int(H * (thumb_w / W))
    pad = 24
    sheet = Image.new("RGB", (pad + (thumb_w + pad) * len(paths), thumb_h + pad * 2), (0, 0, 0))
    for i, path in enumerate(paths):
        with Image.open(path) as im:
            sheet.paste(im.resize((thumb_w, thumb_h), Image.LANCZOS), (pad + i * (thumb_w + pad), pad))
    out = out_dir / "contact-sheet.png"
    sheet.save(out, "PNG")
    return out


def main() -> int:
    out_dir = pathlib.Path(__file__).resolve().parent.parent / "preview" / "store"
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = [render(frame, i, out_dir) for i, frame in enumerate(FRAMES)]
    for path in paths:
        with Image.open(path) as im:
            if im.size != (W, H):
                print(f"FAIL: {path.name} is {im.size}, expected {(W, H)}", file=sys.stderr)
                return 2
        print(f"wrote {path.name}  {W}x{H}")
    print(f"wrote {contact_sheet(paths, out_dir).name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
