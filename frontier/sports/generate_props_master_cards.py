"""
generate_props_master_cards.py
==============================
Generates stunning visual cards dedicated exclusively to
GSE's Certified Player Props Portfolio for NFL Week 4.
Zero text-clipping, strict 80% safe zone margins, glassmorphism, and neon telemetry.
"""

import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = r"C:\Users\Garrett\Downloads"

C_VOID = (5, 8, 17)
C_GLASS_BG = (15, 23, 42, 235)
C_CYAN = (0, 240, 255)
C_ORANGE = (255, 85, 0)
C_GREEN = (0, 255, 136)
C_WHITE = (255, 255, 255)
C_MUTED = (148, 163, 184)
C_GOLD = (255, 215, 0)
C_BORDER = (38, 54, 82)

def get_font(size: int, bold: bool = False):
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except:
        return ImageFont.load_default()

def draw_glass_card(draw, bbox, radius, fill_color, border_color, top_highlight=True):
    x0, y0, x1, y1 = bbox
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill_color, outline=border_color, width=1)
    if top_highlight:
        draw.line([(x0 + radius, y0 + 1), (x1 - radius, y0 + 1)], fill=(255, 255, 255, 80), width=1)

def create_props_vertical():
    WIDTH, HEIGHT = 720, 1280
    img = Image.new("RGBA", (WIDTH, HEIGHT), C_VOID)
    draw = ImageDraw.Draw(img)

    for y in range(0, HEIGHT, 45):
        draw.line([(0, y), (WIDTH, y)], fill=(15, 25, 45, 90), width=1)
    for x in range(0, WIDTH, 45):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 25, 45, 90), width=1)

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([WIDTH // 2 - 250, 70, WIDTH // 2 + 250, 360], fill=(0, 255, 136, 25))
    gdraw.ellipse([WIDTH // 2 - 200, 700, WIDTH // 2 + 200, 1100], fill=(0, 240, 255, 25))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    SAFE_L = 80
    SAFE_R = WIDTH - 80

    # Header
    hy = 125
    draw_glass_card(draw, [SAFE_L, hy, SAFE_R, hy + 42], radius=21, fill_color=(13, 22, 40, 240), border_color=C_GREEN)
    draw.text((SAFE_L + 20, hy + 11), "GALAXY SPORTS EDGE", font=get_font(15, bold=True), fill=C_GREEN)
    draw.text((SAFE_R - 175, hy + 13), "WE DETECT. YOU DECIDE.", font=get_font(11, bold=True), fill=C_WHITE)

    # Title
    ty = 180
    draw.text((SAFE_L, ty), "NFL WEEK 4 PLAYER PROPS INTELLIGENCE", font=get_font(12, bold=True), fill=C_CYAN)
    draw.text((SAFE_L, ty + 18), "CERTIFIED PROPS PORTFOLIO", font=get_font(26, bold=True), fill=C_WHITE)
    draw.text((SAFE_L, ty + 50), "CLEARED FIVE-GATE CONFORMAL SIEVE", font=get_font(15, bold=True), fill=C_GREEN)

    # Status Banner
    sb_y = ty + 78
    draw_glass_card(draw, [SAFE_L, sb_y, SAFE_R, sb_y + 36], radius=8, fill_color=(18, 38, 28, 240), border_color=C_GREEN)
    draw.text((SAFE_L + 18, sb_y + 9), "🎯 8 TOP CERTIFIED HIGH-EDGE PLAYER PROPS", font=get_font(13, bold=True), fill=C_GREEN)

    props = [
        {"player": "Braelon Allen", "team": "NYJ", "pick": "OVER 52.5 RUSH YDS", "proj": "Proj: 74.0 yds", "edge": "+34.7% EDGE", "ev": "+60.5% EV", "meta": "Breece Hall OUT • 70%+ Touch Share • 5% Kelly", "col": C_GREEN},
        {"player": "Jordan Addison", "team": "MIN", "pick": "OVER 54.5 REC YDS", "proj": "Proj: 72.0 yds", "edge": "+30.8% EDGE", "ev": "+54.2% EV", "meta": "Jefferson OUT • Unquestioned WR1 • 5% Kelly", "col": C_GREEN},
        {"player": "Parker Washington", "team": "JAX", "pick": "OVER 4.5 RECEPTIONS", "proj": "Proj: 5.8 rec", "edge": "+22.9% EDGE", "ev": "+34.4% EV", "meta": "7.3 Tgts/Gm • Bengals Bleed Slot • 3.2% Kelly", "col": C_CYAN},
        {"player": "James Cook", "team": "BUF", "pick": "OVER 64.5 RUSH YDS", "proj": "Proj: 78.5 yds", "edge": "+22.0% EDGE", "ev": "+36.5% EV", "meta": "Bills -7.0 Fav • 15-20mph Wind • 2.0% Kelly", "col": C_GREEN},
        {"player": "A.J. Brown", "team": "PHI", "pick": "OVER 76.5 REC YDS", "proj": "Proj: 94.0 yds", "edge": "+22.9% EDGE", "ev": "+38.4% EV", "meta": "DeVonta Smith OUT • 34%+ Target Funnel", "col": C_GREEN},
        {"player": "Jahmyr Gibbs", "team": "DET", "pick": "OVER 56.5 RUSH YDS", "proj": "Proj: 68.0 yds", "edge": "+21.9% EDGE", "ev": "+37.2% EV", "meta": "Panthers Leak Chunk Runs • Dome Script", "col": C_GREEN},
        {"player": "Jalon Daniels", "team": "TB", "pick": "UNDER 195.5 PASS YDS", "proj": "Proj: 162.0 yds", "edge": "+22.2% EDGE", "ev": "+37.7% EV", "meta": "Baker OUT • Packers 2.4s Pocket Collapse", "col": C_ORANGE},
        {"player": "Braelon Allen", "team": "NYJ", "pick": "ANYTIME TOUCHDOWN", "proj": "+130 Odds", "edge": "+13.3% EDGE", "ev": "+20.0% EV", "meta": "Absorbs 100% Goal-Line Work vs Bears", "col": C_GOLD},
    ]

    card_y = 315
    card_h = 75
    gap = 81

    for i, p in enumerate(props):
        cy = card_y + i * gap
        draw_glass_card(draw, [SAFE_L, cy, SAFE_R, cy + card_h], radius=8, fill_color=(16, 26, 46, 240), border_color=C_BORDER)

        draw.text((SAFE_L + 14, cy + 10), f"{p['player']} ({p['team']})", font=get_font(15, bold=True), fill=C_WHITE)
        draw.text((SAFE_L + 14, cy + 32), p["pick"], font=get_font(13, bold=True), fill=p["col"])
        draw.text((SAFE_L + 14, cy + 52), p["meta"], font=get_font(10, bold=False), fill=C_MUTED)

        draw.rounded_rectangle([SAFE_R - 118, cy + 12, SAFE_R - 12, cy + 36], radius=4, fill=(15, 35, 25), outline=p["col"], width=1)
        draw.text((SAFE_R - 110, cy + 17), p["edge"], font=get_font(10, bold=True), fill=p["col"])
        draw.text((SAFE_R - 100, cy + 45), p["proj"], font=get_font(10.5, bold=True), fill=C_WHITE)

    bot_y = card_y + 8 * gap + 10
    draw_glass_card(draw, [SAFE_L, bot_y, SAFE_R, bot_y + 78], radius=10, fill_color=(12, 28, 50, 240), border_color=C_GREEN)
    draw.text((SAFE_L + 18, bot_y + 12), "⚡ ZERO GUESSING. ZERO UNCHECKED VIG.", font=get_font(12, bold=True), fill=C_GREEN)
    draw.text((SAFE_L + 18, bot_y + 32), "Every prop cleared Romano Conformal Quantile Regression (CQR 90%)\nand verified positive Bayesian Lower Credible Bound (LCB) edge.", font=get_font(10.5, bold=False), fill=C_WHITE)
    draw.text((SAFE_L + 18, bot_y + 54), "Single-Entry DFS + Certified Spreads Live on galaxysportsedge.com", font=get_font(10, bold=True), fill=C_CYAN)

    draw.text((SAFE_L + 130, bot_y + 90), "galaxysportsedge.com • @GalaxySportsHQ", font=get_font(13, bold=True), fill=C_GREEN)

    out_file = os.path.join(OUTPUT_DIR, "gse_week4_certified_props_master_vertical.png")
    img.convert("RGB").save(out_file, "PNG", quality=95)
    print(f"Generated: {out_file}")
    return out_file

def create_props_landscape():
    WIDTH, HEIGHT = 1920, 1080
    img = Image.new("RGBA", (WIDTH, HEIGHT), C_VOID)
    draw = ImageDraw.Draw(img)

    for y in range(0, HEIGHT, 45):
        draw.line([(0, y), (WIDTH, y)], fill=(15, 25, 45, 70), width=1)
    for x in range(0, WIDTH, 45):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 25, 45, 70), width=1)

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([200, 100, 800, 700], fill=(0, 255, 136, 25))
    gdraw.ellipse([1100, 300, 1800, 950], fill=(0, 240, 255, 25))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    draw_glass_card(draw, [50, 40, WIDTH - 50, 110], radius=16, fill_color=(12, 20, 36, 245), border_color=C_GREEN)
    draw.text((80, 58), "GALAXY SPORTS EDGE", font=get_font(26, bold=True), fill=C_GREEN)
    draw.text((450, 66), "NFL WEEK 4 SOVEREIGN PLAYER PROPS INTELLIGENCE", font=get_font(16, bold=False), fill=C_MUTED)
    draw.text((WIDTH - 420, 62), "WE DETECT. YOU DECIDE.", font=get_font(20, bold=True), fill=C_WHITE)
    draw.text((WIDTH - 150, 64), "WEEK 4", font=get_font(16, bold=True), fill=C_CYAN)

    # Left: Rushing & Passing Props
    draw_glass_card(draw, [50, 130, 990, 1030], radius=16, fill_color=(13, 21, 38, 235), border_color=C_GREEN)
    draw.text((80, 155), "RUSHING & PASSING CERTIFIED PROPS", font=get_font(20, bold=True), fill=C_WHITE)
    draw.text((80, 185), "Lognormal Continuous Yardage • CQR 90% Bounds • Bayesian Kelly Sizing", font=get_font(13, bold=False), fill=C_GREEN)

    left_props = [
        ("Braelon Allen", "NYJ", "OVER 52.5 RUSH YARDS", "Proj: 74.0 yds", "+34.7% EDGE", "+60.5% EV", "Breece Hall OUT • 70%+ Touch Share • 5.0% Kelly", C_GREEN),
        ("James Cook", "BUF", "OVER 64.5 RUSH YARDS", "Proj: 78.5 yds", "+22.0% EDGE", "+36.5% EV", "Bills -7.0 Fav • 15-20mph Wind • 2.0% Kelly", C_GREEN),
        ("Jahmyr Gibbs", "DET", "OVER 56.5 RUSH YARDS", "Proj: 68.0 yds", "+21.9% EDGE", "+37.2% EV", "Panthers Leak Chunk Runs • Dome Turf • 2.0% Kelly", C_GREEN),
        ("Saquon Barkley", "PHI", "OVER 78.5 RUSH YARDS", "Proj: 92.0 yds", "+17.9% EDGE", "+29.0% EV", "DeVonta Smith OUT • Rams 27th Rush DVOA", C_GREEN),
        ("Jalon Daniels", "TB", "UNDER 195.5 PASS YARDS", "Proj: 162.0 yds", "+22.2% EDGE", "+37.7% EV", "Baker OUT • Packers 2.4s Pocket Collapse • 2.0% Kelly", C_ORANGE),
        ("Drake Maye", "NE", "UNDER 225.5 PASS YARDS", "Proj: 195.0 yds", "+17.5% EDGE", "+28.9% EV", "Highmark Stadium Wind • Buffalo #4 Pass DVOA", C_ORANGE),
    ]

    ly = 225
    l_gap = 125
    for i, (name, team, pick, proj, edge, ev, note, col) in enumerate(left_props):
        cy = ly + i * l_gap
        draw_glass_card(draw, [75, cy, 965, cy + 112], radius=8, fill_color=(19, 29, 52, 230), border_color=C_BORDER)

        draw.text((95, cy + 14), f"{name} ({team})", font=get_font(18, bold=True), fill=C_WHITE)
        draw.text((95, cy + 42), pick, font=get_font(16, bold=True), fill=col)
        draw.text((95, cy + 74), note, font=get_font(12, bold=False), fill=C_MUTED)

        draw.rounded_rectangle([820, cy + 18, 945, cy + 46], radius=6, fill=(15, 35, 25), outline=col, width=1)
        draw.text((835, cy + 24), edge, font=get_font(12, bold=True), fill=col)
        draw.text((830, cy + 56), proj, font=get_font(13, bold=True), fill=C_WHITE)
        draw.text((835, cy + 82), ev, font=get_font(11, bold=True), fill=C_CYAN)

    # Right: Receiving, Receptions & Anytime TDs
    draw_glass_card(draw, [1020, 130, WIDTH - 50, 1030], radius=16, fill_color=(13, 21, 38, 235), border_color=C_CYAN)
    draw.text((1050, 155), "RECEIVING, RECEPTIONS & ANYTIME TOUCHDOWNS", font=get_font(20, bold=True), fill=C_WHITE)
    draw.text((1050, 185), "Negative Binomial Count & Scheme Conditioning • Discrete Exact CDF", font=get_font(13, bold=False), fill=C_CYAN)

    right_props = [
        ("Jordan Addison", "MIN", "OVER 54.5 RECEIVING YARDS", "Proj: 72.0 yds", "+30.8% EDGE", "+54.2% EV", "Jefferson OUT • Commands WR1 Target Funnel • 5.0% Kelly", C_GREEN),
        ("A.J. Brown", "PHI", "OVER 76.5 RECEIVING YARDS", "Proj: 94.0 yds", "+22.9% EDGE", "+38.4% EV", "DeVonta Smith OUT • 34%+ Target Share • 2.0% Kelly", C_GREEN),
        ("Tee Higgins", "CIN", "OVER 62.5 RECEIVING YARDS", "Proj: 76.0 yds", "+22.9% EDGE", "+39.3% EV", "JAX @ CIN Shootout • Trailing Air Yards • 2.0% Kelly", C_CYAN),
        ("Parker Washington", "JAX", "OVER 4.5 RECEPTIONS", "Proj: 5.8 rec", "+22.9% EDGE", "+34.4% EV", "Slot Alpha • Bengals Bleed Slot Completions • 3.2% Kelly", C_CYAN),
        ("Braelon Allen", "NYJ", "ANYTIME TOUCHDOWN (+130)", "Proj: 0.85 TDs", "+13.3% EDGE", "+20.0% EV", "Absorbs Inside-5 Goal-Line Work vs Bears • Plus Money", C_GOLD),
        ("Derrick Henry", "BAL", "ANYTIME TOUCHDOWN (-165)", "Proj: 1.15 TDs", "+6.3% EDGE", "+9.5% EV", "6 TDs in 3 Games • 100% Red Zone Monopoly vs Titans", C_GOLD),
    ]

    for i, (name, team, pick, proj, edge, ev, note, col) in enumerate(right_props):
        cy = ly + i * l_gap
        draw_glass_card(draw, [1045, cy, WIDTH - 75, cy + 112], radius=8, fill_color=(19, 29, 52, 230), border_color=C_BORDER)

        draw.text((1065, cy + 14), f"{name} ({team})", font=get_font(18, bold=True), fill=C_WHITE)
        draw.text((1065, cy + 42), pick, font=get_font(16, bold=True), fill=col)
        draw.text((1065, cy + 74), note, font=get_font(12, bold=False), fill=C_MUTED)

        draw.rounded_rectangle([WIDTH - 200, cy + 18, WIDTH - 75 - 20, cy + 46], radius=6, fill=(15, 35, 25), outline=col, width=1)
        draw.text((WIDTH - 185, cy + 24), edge, font=get_font(12, bold=True), fill=col)
        draw.text((WIDTH - 190, cy + 56), proj, font=get_font(13, bold=True), fill=C_WHITE)
        draw.text((WIDTH - 185, cy + 82), ev, font=get_font(11, bold=True), fill=C_CYAN)

    out_file = os.path.join(OUTPUT_DIR, "gse_week4_certified_props_master_landscape.png")
    img.convert("RGB").save(out_file, "PNG", quality=95)
    print(f"Generated: {out_file}")
    return out_file

if __name__ == "__main__":
    create_props_vertical()
    create_props_landscape()
