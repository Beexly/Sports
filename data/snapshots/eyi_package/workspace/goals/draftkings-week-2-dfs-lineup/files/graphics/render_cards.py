#!/usr/bin/env python3
"""Render the 4 Winning Packet graphics cards with PIL. 1080x1350."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.expanduser("~/workspace/your_files/graphics")
W, H = 1080, 1350
BG = (7, 11, 22)
CYAN = (34, 211, 238)
PINK = (232, 121, 249)
ROSE = (251, 113, 133)
WHITE = (255, 255, 255)
MUT = (148, 163, 184)
DIMM = (100, 116, 139)
DARKMUT = (71, 85, 105)

def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    for p in [f"/usr/share/fonts/truetype/dejavu/{name}", f"/usr/share/fonts/{name}"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def glow_bg(accent):
    img = Image.new("RGB", (W, H), BG)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    # soft top glow
    for i in range(60):
        a = int(28 * (1 - i / 60))
        d.ellipse([-500 + i*8, -700 + i*8, W + 500 - i*8, 500 - i*4],
                  fill=accent + (a,))
    img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
    return img

def kicker(d, y, text, color):
    d.text((70, y), text, font=font(26, True), fill=color)
    return y + 48

def title(d, y, text, size=84):
    f = font(size, True)
    d.text((70, y), text, font=f, fill=WHITE)
    # measure lines
    lines = text.split("\n")
    return y + int(size * 1.15 * len(lines)) + 8

def sub(d, y, text):
    d.text((70, y), text, font=font(30), fill=MUT)
    return y + 52

def brand(d):
    f = font(24)
    d.text((70, H - 80), "GALAXY SPORTS EDGE", font=f, fill=DARKMUT)
    t = "WE DETECT. YOU DECIDE."
    bb = d.textbbox((0, 0), t, font=f)
    d.text((W - 70 - (bb[2] - bb[0]), H - 80), t, font=f, fill=DARKMUT)

def card_box(img, y, h):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rounded_rectangle([60, y, W - 60, y + h], radius=22,
                        fill=(148, 163, 184, 18), outline=(148, 163, 184, 46), width=2)
    img.paste(Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB"))
    return ImageDraw.Draw(img)

# ---------- 1. THE BOARD ----------
img = glow_bg(CYAN); d = ImageDraw.Draw(img)
y = 120
y = kicker(d, y, "THE WINNING PACKET \u00b7 WEEK 2", CYAN)
y = title(d, y, "THE BOARD")
y = sub(d, y, "The exact lineup. No paywall.")
rows = [
    ("QB", "C.J. Stroud", "HOU", "$5,500"),
    ("RB", "Derrick Henry", "BAL", "$7,200"),
    ("RB", "D'Andre Swift", "CHI", "$6,300"),
    ("WR", "Jaxon Smith-Njigba", "SEA", "$8,100"),
    ("WR", "DK Metcalf", "PIT", "$5,200"),
    ("WR", "Xavier Hutchinson", "HOU", "$3,500"),
    ("TE", "Dalton Schultz", "HOU", "$3,200"),
    ("FLEX", "Christian McCaffrey", "SF", "$8,000"),
    ("DST", "Jacksonville", "JAX", "$2,400"),
]
y += 10
for pos, name, team, sal in rows:
    d.text((70, y), pos, font=font(24, True), fill=CYAN)
    d.text((200, y - 2), name, font=font(30, True), fill=WHITE)
    nw = d.textbbox((0, 0), name, font=font(30, True))[2]
    d.text((200 + nw + 14, y + 2), team, font=font(28), fill=MUT)
    sw = d.textbbox((0, 0), sal, font=font(30, True))[2]
    d.text((W - 70 - sw, y - 2), sal, font=font(30, True), fill=(226, 232, 240))
    y += 62
    d.line([70, y - 12, W - 70, y - 12], fill=(148, 163, 184, 40), width=1)
y += 26
d.text((70, y), "TOTAL", font=font(34, True), fill=WHITE)
t2 = "$49,400 / $50,000"
sw = d.textbbox((0, 0), t2, font=font(34, True))[2]
d.text((W - 70 - sw, y), t2, font=font(34, True), fill=CYAN)
y += 60
d.text((70, y), "Salaries via DraftKings \u00b7 15-game slate", font=font(24), fill=DIMM)
brand(d)
img.save(f"{OUT}/packet-lineup.png")

# ---------- 2. THE STACK ----------
img = glow_bg(PINK); d = ImageDraw.Draw(img)
y = 120
y = kicker(d, y, "THE WINNING PACKET \u00b7 WEEK 2", PINK)
y = title(d, y, "THE STACK")
y = sub(d, y, "One stack wins tournaments. This is ours.")
y += 8
stack = [
    ("QB \u00b7 $5,500", "C.J. Stroud", "Home vs Cincinnati. Nico Collins is out. Somebody has to catch those passes."),
    ("WR \u00b7 $3,500", "Xavier Hutchinson", "A star's routes at minimum price. The pricing department fell asleep."),
    ("TE \u00b7 $3,200", "Dalton Schultz", "74% of routes, 18% first-read share vs the worst TE defense in football."),
]
for p, n, desc in stack:
    d = card_box(img, y, 218)
    d.text((100, y + 26), p, font=font(26, True), fill=PINK)
    d.text((100, y + 62), n, font=font(44, True), fill=WHITE)
    # wrap desc
    words, lines, cur = desc.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textbbox((0, 0), t, font=font(29))[2] < 840:
            cur = t
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    ly = y + 122
    for ln in lines[:2]:
        d.text((100, ly), ln, font=font(29), fill=(203, 213, 225)); ly += 40
    y += 218 + 26
y += 14
d = card_box(img, y, 120)
d.text((100, y + 38), "COMBINED", font=font(30, True), fill=MUT)
t2 = "$12,200"
sw = d.textbbox((0, 0), t2, font=font(56, True))[2]
d.text((W - 100 - sw, y + 24), t2, font=font(56, True), fill=CYAN)
brand(d)
img.save(f"{OUT}/packet-stack.png")

# ---------- 3. THE SIGNAL ----------
img = glow_bg(CYAN); d = ImageDraw.Draw(img)
y = 120
y = kicker(d, y, "THE WINNING PACKET \u00b7 WEEK 2", CYAN)
y = title(d, y, "THE SIGNAL")
y = sub(d, y, "What our lab actually found. Percentiles, not opinions.")
y += 8
edges = [
    ("JAX pass defense vs DEN", "100th", 100, CYAN, "Denver's pass offense: 9.7. That's why Jacksonville is our defense."),
    ("BAL pass defense vs NO", "96.8th", 96.8, CYAN, "Saints can't throw on them. Henry runs clock all second half."),
    ("SF offense vs MIA", "93rd", 93, CYAN, "Miami's defense: 12th. The CMC game, in 72 and clear."),
    ("Chargers INT luck (fade)", "+7.11", 88, ROSE, "Takeaways that already happened. We passed. Our optimizer disagreed."),
]
for lab, val, pct, col, note in edges:
    d.text((70, y), lab, font=font(28, True), fill=WHITE)
    vw = d.textbbox((0, 0), val, font=font(28, True))[2]
    d.text((W - 70 - vw, y), val, font=font(28, True), fill=col)
    y += 52
    d.rounded_rectangle([70, y, W - 70, y + 26], radius=13, fill=(148, 163, 184, 36))
    fw = int((W - 140) * pct / 100)
    d.rounded_rectangle([70, y, 70 + fw, y + 26], radius=13, fill=col)
    y += 40
    d.text((70, y), note, font=font(25), fill=MUT)
    y += 62
y += 10
d.text((70, y), "Source: GSE lab unit-matchup + turnover-luck tables", font=font(24), fill=DIMM)
brand(d)
img.save(f"{OUT}/packet-edges.png")

# ---------- 4. WHAT WE PASSED ON ----------
img = glow_bg(ROSE); d = ImageDraw.Draw(img)
y = 120
y = kicker(d, y, "THE WINNING PACKET \u00b7 WEEK 2", ROSE)
y = title(d, y, "WHAT WE\nPASSED ON", size=76)
d.text((70, y), "A pass is not a blank. It is the finding.", font=font(28), fill=(226, 232, 240))
y += 70
fades = [
    ("Chargers DST", "PASS", "+7.11 interceptions of pure luck. You're paying for takeaways that already happened."),
    ("Chris Olave", "PASS", "Hamstring, game-time decision, vs a 96th-percentile pass defense. A donation, not a risk."),
    ("Terry McLaurin", "PASS", "Every show loves him. Our role data says mirage. Paying for the name on the jersey."),
]
for n, tag, desc in fades:
    d = card_box(img, y, 210)
    d.text((100, y + 26), n, font=font(40, True), fill=WHITE)
    nw = d.textbbox((0, 0), n, font=font(40, True))[2]
    d.text((100 + nw + 18, y + 34), "\u00b7 " + tag, font=font(28, True), fill=ROSE)
    words, lines, cur = desc.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textbbox((0, 0), t, font=font(28))[2] < 840:
            cur = t
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    ly = y + 96
    for ln in lines[:2]:
        d.text((100, ly), ln, font=font(28), fill=(203, 213, 225)); ly += 42
    y += 210 + 26
brand(d)
img.save(f"{OUT}/packet-passed.png")

print("done:", sorted(f for f in os.listdir(OUT) if f.startswith("packet-") and f.endswith(".png")))
