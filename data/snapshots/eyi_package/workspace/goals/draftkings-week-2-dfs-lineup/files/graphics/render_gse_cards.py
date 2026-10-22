#!/usr/bin/env python3
"""Render 6 GSE Week 2 cards from GSE-Week2-Lineup-Card.pdf. 1080x1350. PIL only."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.expanduser("~/workspace/your_files/graphics")
os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1350
BG = (7, 11, 22)
CYAN = (34, 211, 238)
VIOLET = (168, 85, 247)
GREEN = (52, 211, 153)
ROSE = (251, 113, 133)
AMBER = (251, 191, 36)
WHITE = (255, 255, 255)
MUT = (148, 163, 184)
DIMM = (100, 116, 139)
DARKMUT = (71, 85, 105)

def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    for p in [f"/usr/share/fonts/truetype/dejavu/{name}"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def base(accent):
    img = Image.new("RGB", (W, H), BG)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for i in range(60):
        a = int(26 * (1 - i / 60))
        d.ellipse([-500 + i*8, -700 + i*8, W + 500 - i*8, 500 - i*4], fill=accent + (a,))
    return Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")

def brand(d):
    f = font(24)
    d.text((70, H - 80), "GALAXY SPORTS EDGE", font=f, fill=DARKMUT)
    t = "WE DETECT. YOU DECIDE."
    bb = d.textbbox((0, 0), t, font=f)
    d.text((W - 70 - (bb[2] - bb[0]), H - 80), t, font=f, fill=DARKMUT)

def kicker(d, y, text, color=CYAN):
    d.text((70, y), text, font=font(26, True), fill=color)
    return y + 52

def wrap(d, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textbbox((0, 0), t, font=fnt)[2] < maxw:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def box(img, y, h, accent=MUT):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rounded_rectangle([60, y, W - 60, y + h], radius=22,
                        fill=(148, 163, 184, 18), outline=(148, 163, 184, 46), width=2)
    img.paste(Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB"))
    return ImageDraw.Draw(img)

# ============ 1. HERO ============
img = base(VIOLET); d = ImageDraw.Draw(img)
y = 300
d.text((70, y), "GALAXY", font=font(120, True), fill=WHITE); y += 135
d.text((70, y), "SPORTS EDGE", font=font(120, True), fill=CYAN); y += 170
d.text((70, y), "NFL WEEK 2 — DRAFTKINGS CLASSIC", font=font(34, True), fill=WHITE); y += 70
d.text((70, y), "We detect. You decide.", font=font(36), fill=MUT); y += 90
d.text((70, y), "15-game Sun-Mon slate · Lock 12:00 PM CDT", font=font(30), fill=DIMM); y += 60
d.text((70, y), "@GalaxySportsHQ · galaxysportsedge.com", font=font(30), fill=DIMM)
brand(d)
img.save(f"{OUT}/gse-hero.png")

# ============ LINEUP CARD BUILDER ============
def lineup_card(fname, knum, ktitle, accent, rows, thesis_lines, note=None):
    img = base(accent); d = ImageDraw.Draw(img)
    y = 90
    y = kicker(d, y, f"GALAXY SPORTS EDGE · WEEK 2 · LINEUP {knum}", accent)
    d.text((70, y), ktitle, font=font(64, True), fill=WHITE); y += 92
    d.text((70, y), "$50,000 cap-exact · LineStar 15-game ownership", font=font(28), fill=MUT); y += 62
    # header
    d.text((70, y), "POS", font=font(22, True), fill=DIMM)
    d.text((180, y), "PLAYER", font=font(22, True), fill=DIMM)
    for lbl, x in (("SALARY", W - 330), ("OWN", W - 170)):
        bb = d.textbbox((0, 0), lbl, font=font(22, True))
        d.text((x - (bb[2]-bb[0]), y), lbl, font=font(22, True), fill=DIMM)
    y += 40
    d.line([70, y, W-70, y], fill=(148,163,184,60), width=2); y += 18
    for pos, name, team, opp, sal, own in rows:
        d.text((70, y), pos, font=font(24, True), fill=accent)
        d.text((180, y - 2), name, font=font(29, True), fill=WHITE)
        nw = d.textbbox((0, 0), name, font=font(29, True))[2]
        d.text((180 + nw + 12, y + 3), f"{team} vs {opp}", font=font(24), fill=MUT)
        for val, x in ((sal, W - 240), (own, W - 70)):
            bb = d.textbbox((0, 0), val, font=font(28, True))
            d.text((x - (bb[2]-bb[0]), y - 2), val, font=font(28, True), fill=(226,232,240))
        y += 58
        d.line([70, y - 10, W - 70, y - 10], fill=(148,163,184,28), width=1)
    y += 8
    d = box(img, y, 190, accent)
    ty = y + 28
    for i, ln in enumerate(thesis_lines):
        d.text((100, ty), ln, font=font(28, True) if i == 0 else font(28), fill=WHITE if i == 0 else (203,213,225))
        ty += 44
    if note:
        d.text((100, ty + 6), note, font=font(24), fill=AMBER)
    brand(d)
    img.save(f"{OUT}/{fname}")

lineup_a = [
    ("QB", "Jayden Daniels", "WAS", "DAL", "$6,300", "9.2%"),
    ("RB", "Bijan Robinson", "ATL", "CAR", "$8,200", "28.6%"),
    ("RB", "Ashton Jeanty", "LV", "LAC", "$6,800", "5.8%"),
    ("WR", "Stefon Diggs", "WAS", "DAL", "$5,300", "8.8%"),
    ("WR", "Terry McLaurin", "WAS", "DAL", "$5,200", "5.1%"),
    ("WR", "DK Metcalf", "PIT", "NE", "$5,200", "1.3%"),
    ("TE", "Dalton Schultz", "HOU", "CIN", "$3,200", "15.6%"),
    ("FLX", "Kenneth Walker III", "KC", "IND", "$6,500", "5.1%"),
    ("DST", "Ravens", "BAL", "NO", "$3,300", "10.0%"),
]
lineup_card("gse-lineup-a.png", "A", "THE ONE WE'D FIRE", CYAN, lineup_a,
    ["THE THESIS",
     "Dallas pass defense: 3.2nd percentile. Worst in our lab.",
     "Minus two starters. WAS gets them in the 50.5-total game, indoors."])

lineup_b = [
    ("QB", "Dak Prescott", "DAL", "WAS", "$6,400", "9.7%"),
    ("RB", "Kenneth Walker III", "KC", "IND", "$6,500", "5.1%"),
    ("RB", "Javonte Williams", "DAL", "WAS", "$6,400", "26.0%"),
    ("WR", "CeeDee Lamb", "DAL", "WAS", "$7,300", "15%"),
    ("WR", "George Pickens", "DAL", "WAS", "$6,300", "21.4%"),
    ("WR", "DK Metcalf", "PIT", "NE", "$5,200", "1.3%"),
    ("TE", "Isaiah Likely", "NYG", "LAR", "$4,500", "4.1%"),
    ("FLX", "Jake Ferguson", "DAL", "WAS", "$3,800", "2.4%"),
    ("DST", "Buccaneers", "TB", "CLE", "$3,600", "12.0%"),
]
lineup_card("gse-lineup-b.png", "B", "MAX CEILING", VIOLET, lineup_b,
    ["THE PIVOT",
     "Five pieces of the 50.5 game. Every Dallas TD pays three times.",
     "One entry: fire A for the best shot, B for the highest score."],
    note="Honest caveat: the Dallas stack is the slate's most-duplicated correlation.")

# ============ 4. SLATE MATRIX ============
img = base(GREEN); d = ImageDraw.Draw(img)
y = 110
y = kicker(d, y, "GALAXY SPORTS EDGE · WEEK 2", GREEN)
d.text((70, y), "SLATE MATRIX", font=font(72, True), fill=WHITE); y += 105
d.text((70, y), "Role vs ownership. GSE proprietary ratings.", font=font(28), fill=MUT); y += 80
cols = [70, 330, 640, 800]
for lbl, x in zip(["PLAYER", "ROLE", "OWN%", "GSE RATING"], cols):
    d.text((x, y), lbl, font=font(22, True), fill=DIMM)
y += 42
d.line([70, y, W-70, y], fill=(148,163,184,60), width=2); y += 26
mrows = [
    ("Metcalf, DK", "WR1 (No Pittman)", "1.3%", "AAA+ LEVERAGE", GREEN, False),
    ("Schultz, Dalton", "Only healthy target", "15.6%", "SALARY GLITCH ($3.2K)", AMBER, False),
    ("Nacua, Puka", "DNP / Doubtful MNF", "--", "AUTO-ZERO TRAP", ROSE, True),
]
for name, role, own, rate, col, crossed in mrows:
    d.text((cols[0], y), name, font=font(32, True), fill=WHITE)
    d.text((cols[1], y + 6), role, font=font(26), fill=MUT)
    d.text((cols[2], y), own, font=font(32, True), fill=WHITE)
    d.text((cols[3], y + 6), rate, font=font(26, True), fill=col)
    if crossed:
        d.line([cols[0]-10, y+22, W-70, y+22], fill=ROSE, width=6)
        d.line([cols[0]-10, y+30, W-70, y+30], fill=ROSE, width=4)
    y += 96
    d.line([70, y - 22, W - 70, y - 22], fill=(148,163,184,28), width=1)
y += 40
d = box(img, y, 150)
for i, ln in enumerate(["1.3% owned with Pittman OUT and NE's CB1 OUT is criminal.",
                        "Puka is doubtful Monday night. You lock Sunday at noon."]):
    d.text((100, y + 30 + i*44), ln, font=font(28), fill=(203,213,225))
brand(d)
img.save(f"{OUT}/gse-matrix.png")

# ============ 5. LEVERAGE SHEET ============
img = base(ROSE); d = ImageDraw.Draw(img)
y = 110
y = kicker(d, y, "GALAXY SPORTS EDGE · WEEK 2", ROSE)
d.text((70, y), "LEVERAGE SHEET", font=font(72, True), fill=WHITE); y += 110
d = box(img, y, 300)
d.text((100, y + 30), "28.4%", font=font(96, True), fill=ROSE)
d.text((100, y + 140), "TRAP", font=font(72, True), fill=WHITE)
d.text((100, y + 226), "Aaron Jones. Soldier Field: 30 mph gusts + 100% rain. FADE.",
       font=font(28), fill=MUT)
y += 330
d = box(img, y, 300)
d.text((100, y + 30), "5%", font=font(96, True), fill=GREEN)
d.text((100, y + 140), "UNTOUCHED", font=font(72, True), fill=WHITE)
d.text((100, y + 226), "Ashton Jeanty. 87% XFP share vs the Chargers. RUN IT.",
       font=font(28), fill=MUT)
y += 330
d.text((70, y), "Chalk you can smell from the parking lot vs the role nobody priced.",
       font=font(28), fill=MUT)
brand(d)
img.save(f"{OUT}/gse-leverage.png")

# ============ 6. THE THESIS ============
img = base(CYAN); d = ImageDraw.Draw(img)
y = 130
y = kicker(d, y, "GALAXY SPORTS EDGE · WEEK 2", CYAN)
d.text((70, y), "THE THESIS", font=font(72, True), fill=WHITE); y += 120
d.text((70, y), "3.2nd", font=font(200, True), fill=CYAN); y += 220
d.text((70, y), "percentile", font=font(64, True), fill=WHITE); y += 100
d.text((70, y), "Dallas pass defense. Worst unit in our lab.", font=font(32), fill=MUT); y += 80
for b in ["Lost two more starters: Overshown and Hooker.",
          "WAS vs DAL total: 50.5 — highest on the slate.",
          "Roof closed. Indoors at AT&T.",
          "Attack it from both sides: Daniels, then the Dallas stack."]:
    d.text((70, y), "•  " + b, font=font(30), fill=(203,213,225)); y += 58
brand(d)
img.save(f"{OUT}/gse-thesis.png")

print("done")
