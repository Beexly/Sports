"""
generate_mega_slate_graphics.py
===============================
Generates high-impact visual cards covering the entire Mega-Slate:
- Kickers, Defense/Sacks, Interceptions (INTs), 1st Half / 1st Quarter, Player Props.
Strict 80% safe zone margins, zero text-clipping, neon glassmorphic HUD.
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

def create_mega_vertical():
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

    # Header Capsule
    hy = 125
    draw_glass_card(draw, [SAFE_L, hy, SAFE_R, hy + 42], radius=21, fill_color=(13, 22, 40, 240), border_color=C_GREEN)
    draw.text((SAFE_L + 20, hy + 11), "GALAXY SPORTS EDGE", font=get_font(15, bold=True), fill=C_GREEN)
    draw.text((SAFE_R - 175, hy + 13), "WE DETECT. YOU DECIDE.", font=get_font(11, bold=True), fill=C_WHITE)

    # Title
    ty = 180
    draw.text((SAFE_L, ty), "NFL WEEK 4 FULL-BOARD DISRUPTION", font=get_font(12, bold=True), fill=C_CYAN)
    draw.text((SAFE_L, ty + 18), "MEGA-SLATE CERTIFIED MENU", font=get_font(25, bold=True), fill=C_WHITE)
    draw.text((SAFE_L, ty + 50), "KICKERS • SACKS • INTS • 1H • PROPS", font=get_font(14, bold=True), fill=C_GREEN)

    # Status Banner
    sb_y = ty + 78
    draw_glass_card(draw, [SAFE_L, sb_y, SAFE_R, sb_y + 36], radius=8, fill_color=(18, 38, 28, 240), border_color=C_GREEN)
    draw.text((SAFE_L + 18, sb_y + 9), "⚡ 25+ CERTIFIED EDGES ACROSS ALL MARKETS", font=get_font(13, bold=True), fill=C_GREEN)

    cards = [
        {"cat": "KICKER", "title": "B. Aubrey OVER 7.5 Kicking Pts", "edge": "+19.8% EDGE", "note": "DAL @ HOU • Proj 9.4 pts • 70.3% Win Prob", "col": C_GOLD},
        {"cat": "DEFENSE", "title": "Vikings Defense OVER 3.5 Sacks", "edge": "+18.1% EDGE", "note": "vs MIA • Flores #1 Blitz Rate vs Huntley (2.3s TTP)", "col": C_GREEN},
        {"cat": "DEFENSE", "title": "Packers Defense OVER 2.5 Sacks", "edge": "+20.7% EDGE", "note": "@ TB • Baker OUT • Rookie Daniels 2.4s Collapse", "col": C_GREEN},
        {"cat": "INT PROP", "title": "Drake Maye OVER 0.5 INTs (Throws 1+)", "edge": "+13.9% EDGE", "note": "@ BUF • 6 INTs in 3 starts • 71.3% Win Prob", "col": C_ORANGE},
        {"cat": "INT PROP", "title": "Jalon Daniels OVER 0.5 INTs (Throws 1+)", "edge": "+11.2% EDGE", "note": "vs GB • Debut vs Hafley's #1 Takeaway Secondary", "col": C_ORANGE},
        {"cat": "1ST HALF", "title": "PACKERS -2.5 (1st Half)", "edge": "+3.0 PT EDGE", "note": "@ TB • Model -5.5 (1H) • 68% Win Prob", "col": C_GREEN},
        {"cat": "1ST HALF", "title": "NYJ @ CHI UNDER 21.5 (1st Half)", "edge": "+4.5 PT EDGE", "note": "Model 17.0 (1H) • Severe Backup QB Pace Drag", "col": C_CYAN},
        {"cat": "RUSH PROP", "title": "Braelon Allen OVER 52.5 Rush Yds", "edge": "+34.7% EDGE", "note": "Breece OUT • Proj 74.0 • 85.8% Prob • 5% Kelly", "col": C_GREEN},
        {"cat": "REC PROP", "title": "Jordan Addison OVER 54.5 Rec Yds", "edge": "+30.8% EDGE", "note": "Jefferson OUT • Proj 72.0 • 80.8% Prob • 5% Kelly", "col": C_GREEN},
    ]

    card_y = 315
    card_h = 68
    gap = 74

    for i, c in enumerate(cards):
        cy = card_y + i * gap
        draw_glass_card(draw, [SAFE_L, cy, SAFE_R, cy + card_h], radius=8, fill_color=(16, 26, 46, 240), border_color=C_BORDER)

        draw.rounded_rectangle([SAFE_L + 10, cy + 10, SAFE_L + 72, cy + 30], radius=4, fill=(10, 16, 28), outline=c["col"], width=1)
        draw.text((SAFE_L + 14, cy + 13), c["cat"], font=get_font(9.5, bold=True), fill=c["col"])

        draw.text((SAFE_L + 80, cy + 10), c["title"], font=get_font(13.5, bold=True), fill=C_WHITE)
        draw.text((SAFE_L + 12, cy + 38), c["note"], font=get_font(10.5, bold=False), fill=C_MUTED)

        draw.rounded_rectangle([SAFE_R - 110, cy + 10, SAFE_R - 12, cy + 32], radius=4, fill=(15, 35, 25), outline=c["col"], width=1)
        draw.text((SAFE_R - 102, cy + 14), c["edge"], font=get_font(9.5, bold=True), fill=c["col"])

    bot_y = card_y + 9 * gap + 10
    draw_glass_card(draw, [SAFE_L, bot_y, SAFE_R, bot_y + 78], radius=10, fill_color=(12, 28, 50, 240), border_color=C_GREEN)
    draw.text((SAFE_L + 18, bot_y + 12), "⚡ COMPLETE INSTITUTIONAL MARKET PENETRATION", font=get_font(12, bold=True), fill=C_GREEN)
    draw.text((SAFE_L + 18, bot_y + 32), "We don't force bad sides. We find verified alpha across\nKickers, Sacks, INTs, 1st Half Spreads, and Player Props.", font=get_font(10.5, bold=False), fill=C_WHITE)
    draw.text((SAFE_L + 18, bot_y + 54), "DraftKings 50-Man Single-Entry Hammer: $49,300 with Late Swap!", font=get_font(10, bold=True), fill=C_CYAN)

    draw.text((SAFE_L + 130, bot_y + 90), "galaxysportsedge.com • @GalaxySportsHQ", font=get_font(13, bold=True), fill=C_GREEN)

    out_file = os.path.join(OUTPUT_DIR, "gse_week4_mega_slate_vertical.png")
    img.convert("RGB").save(out_file, "PNG", quality=95)
    print(f"Generated: {out_file}")
    return out_file

def create_mega_landscape():
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
    draw.text((450, 66), "NFL WEEK 4 SOVEREIGN MULTI-MARKET WAR ROOM", font=get_font(16, bold=False), fill=C_MUTED)
    draw.text((WIDTH - 420, 62), "WE DETECT. YOU DECIDE.", font=get_font(20, bold=True), fill=C_WHITE)
    draw.text((WIDTH - 150, 64), "WEEK 4", font=get_font(16, bold=True), fill=C_CYAN)

    # 3 Panels across 1920 width
    # Panel 1: Kickers, Defense Sacks & INTs (x: 50 to 650)
    p1_w = 580
    draw_glass_card(draw, [50, 130, 50 + p1_w, 1030], radius=16, fill_color=(13, 21, 38, 235), border_color=C_GOLD)
    draw.text((70, 155), "KICKERS • SACKS • QB INTS", font=get_font(18, bold=True), fill=C_GOLD)
    draw.text((70, 182), "Derivative Count & Hazard Physics", font=get_font(12, bold=False), fill=C_MUTED)

    col1 = [
        ("KICKER", "Brandon Aubrey (DAL)", "OVER 7.5 Kicking Pts", "+19.8% Edge", "Dome track • Proj 9.4 pts • 70% Win Prob", C_GOLD),
        ("KICKER", "Tyler Bass (BUF)", "OVER 7.5 Kicking Pts", "+13.7% Edge", "BUF 28.5 implied total • Proj 8.8 pts", C_GOLD),
        ("DEFENSE", "Vikings Defense", "OVER 3.5 Sacks", "+18.1% Edge", "Flores #1 blitz rate vs Huntley (2.3s TTP)", C_GREEN),
        ("DEFENSE", "Packers Defense", "OVER 2.5 Sacks", "+20.7% Edge", "Baker OUT • Rookie Daniels 2.4s TTP", C_GREEN),
        ("INT PROP", "Drake Maye (NE)", "OVER 0.5 INT (Throws 1+)", "+13.9% Edge", "6 INTs in 3 starts • 71.3% Win Prob", C_ORANGE),
        ("INT PROP", "Jalon Daniels (TB)", "OVER 0.5 INT (Throws 1+)", "+11.2% Edge", "Debut vs Hafley's #1 takeaway secondary", C_ORANGE),
        ("INT PROP", "Tyler Huntley (MIA)", "OVER 0.5 INT (Throws 1+)", "+10.0% Edge", "Flores zero-blitz forces panic throws", C_ORANGE),
    ]

    for i, (tag, name, pick, edge, note, col) in enumerate(col1):
        cy = 215 + i * 110
        draw_glass_card(draw, [65, cy, 45 + p1_w, cy + 98], radius=8, fill_color=(19, 29, 52, 230), border_color=C_BORDER)
        draw.text((80, cy + 12), f"[{tag}] {name}", font=get_font(13, bold=True), fill=col)
        draw.text((80, cy + 34), pick, font=get_font(15, bold=True), fill=C_WHITE)
        draw.text((80, cy + 62), note, font=get_font(11, bold=False), fill=C_MUTED)
        draw.text((45 + p1_w - 110, cy + 14), edge, font=get_font(11, bold=True), fill=col)

    # Panel 2: 1st Half / 1st Quarter & Full Game (x: 655 to 1255)
    draw_glass_card(draw, [655, 130, 655 + p1_w, 1030], radius=16, fill_color=(13, 21, 38, 235), border_color=C_GREEN)
    draw.text((675, 155), "1ST HALF, 1Q & SPREADS", font=get_font(18, bold=True), fill=C_GREEN)
    draw.text((675, 182), "Bivariate Poisson & Key Margin Grids", font=get_font(12, bold=False), fill=C_MUTED)

    col2 = [
        ("1ST HALF", "PACKERS -2.5 (1H)", "@ TB • Model -5.5 (1H)", "+3.0 PT EDGE", "Green Bay #3 scripted EPA • Daniels debut", C_GREEN),
        ("1ST HALF", "BILLS -4.0 (1H)", "vs NE • Model -6.5 (1H)", "+2.5 PT EDGE", "Allen 1H scoring margin +9.3 pts", C_GREEN),
        ("1ST HALF", "NYJ/CHI UNDER 21.5 (1H)", "Model 17.0 (1H)", "+4.5 PT EDGE", "Both backup QBs • Slow ground pace", C_CYAN),
        ("1ST QUARTER", "NYJ/CHI 1Q UNDER 7.5", "Defensive feeling-out", "+19.5% EDGE", "75% Win Prob • Clock-grind game script", C_CYAN),
        ("SPREAD", "PACKERS -3.5 (Game)", "Model -9.0 vs -3.5", "+5.5 PT EDGE", "5.0% Kelly • Baker OUT • Trench control", C_GREEN),
        ("SPREAD", "BILLS -7.0 (Game)", "Model -10.5 vs -7.0", "+3.5 PT EDGE", "5.0% Kelly • Maye vs Allen EPA", C_GREEN),
        ("TOTAL", "NYJ @ CHI UNDER 42.5", "Model 33.5 vs 42.5", "+9.0 PT EDGE", "5.0% Kelly • Caleb & Breece OUT", C_CYAN),
    ]

    for i, (tag, pick, sub, edge, note, col) in enumerate(col2):
        cy = 215 + i * 110
        draw_glass_card(draw, [670, cy, 650 + p1_w, cy + 98], radius=8, fill_color=(19, 29, 52, 230), border_color=C_BORDER)
        draw.text((685, cy + 12), f"[{tag}] {pick}", font=get_font(14, bold=True), fill=C_WHITE)
        draw.text((685, cy + 36), sub, font=get_font(12, bold=True), fill=col)
        draw.text((685, cy + 62), note, font=get_font(11, bold=False), fill=C_MUTED)
        draw.text((650 + p1_w - 115, cy + 14), edge, font=get_font(11, bold=True), fill=col)

    # Panel 3: Player Props & Touchdowns (x: 1260 to 1870)
    p3_w = WIDTH - 50 - 1260
    draw_glass_card(draw, [1260, 130, WIDTH - 50, 1030], radius=16, fill_color=(13, 21, 38, 235), border_color=C_CYAN)
    draw.text((1280, 155), "PLAYER PROPS & TOUCHDOWNS", font=get_font(18, bold=True), fill=C_CYAN)
    draw.text((1280, 182), "Romano CQR 90% & Target Vacancies", font=get_font(12, bold=False), fill=C_MUTED)

    col3 = [
        ("RUSH YDS", "Braelon Allen", "OVER 52.5 RUSH", "+34.7% EDGE", "Breece OUT • Proj 74.0 • 5% Kelly", C_GREEN),
        ("REC YDS", "Jordan Addison", "OVER 54.5 REC", "+30.8% EDGE", "Jefferson OUT • Proj 72.0 • 5% Kelly", C_GREEN),
        ("CATCHES", "Parker Washington", "OVER 4.5 RECEPTIONS", "+22.9% EDGE", "Slot Alpha • Proj 5.8 • 3.2% Kelly", C_CYAN),
        ("RUSH YDS", "James Cook", "OVER 64.5 RUSH", "+22.0% EDGE", "15-20mph wind • Proj 78.5 • 2% Kelly", C_GREEN),
        ("REC YDS", "A.J. Brown", "OVER 76.5 REC", "+22.9% EDGE", "Smith OUT • Proj 94.0 • 2% Kelly", C_GREEN),
        ("ANYTIME TD", "Braelon Allen (+130)", "ANYTIME TOUCHDOWN", "+13.3% EDGE", "100% inside-5 goal line role", C_GOLD),
        ("ANYTIME TD", "Derrick Henry (-165)", "ANYTIME TOUCHDOWN", "+6.3% EDGE", "6 TDs in 3 games • Goal-line monopoly", C_GOLD),
    ]

    for i, (tag, name, pick, edge, note, col) in enumerate(col3):
        cy = 215 + i * 110
        draw_glass_card(draw, [1275, cy, WIDTH - 65, cy + 98], radius=8, fill_color=(19, 29, 52, 230), border_color=C_BORDER)
        draw.text((1290, cy + 12), f"[{tag}] {name}", font=get_font(13, bold=True), fill=col)
        draw.text((1290, cy + 34), pick, font=get_font(15, bold=True), fill=C_WHITE)
        draw.text((1290, cy + 62), note, font=get_font(11, bold=False), fill=C_MUTED)
        draw.text((WIDTH - 180, cy + 14), edge, font=get_font(11, bold=True), fill=col)

    out_file = os.path.join(OUTPUT_DIR, "gse_week4_mega_slate_landscape.png")
    img.convert("RGB").save(out_file, "PNG", quality=95)
    print(f"Generated: {out_file}")
    return out_file

if __name__ == "__main__":
    create_mega_vertical()
    create_mega_landscape()
