"""
generate_certified_action_cards.py
==================================
Produces high-impact, institutional visual cards for Galaxy Sports Edge:
Certified Game Picks, High-Alpha Copula SGPs, and DFS Optimal.
Zero text-clipping, strict 80% safe margins, and electric neon aesthetics.
"""

import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = r"C:\Users\Garrett\Downloads"

# Palette
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

def create_action_plays_vertical():
    WIDTH, HEIGHT = 720, 1280
    img = Image.new("RGBA", (WIDTH, HEIGHT), C_VOID)
    draw = ImageDraw.Draw(img)

    # Grid
    for y in range(0, HEIGHT, 45):
        draw.line([(0, y), (WIDTH, y)], fill=(15, 25, 45, 90), width=1)
    for x in range(0, WIDTH, 45):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 25, 45, 90), width=1)

    # Glows
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([WIDTH // 2 - 250, 70, WIDTH // 2 + 250, 360], fill=(0, 255, 136, 25))
    gdraw.ellipse([WIDTH // 2 - 200, 700, WIDTH // 2 + 200, 1100], fill=(0, 240, 255, 25))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # SAFE MARGINS: 80px left and right (width 560px), 125px top, 1100px bottom
    SAFE_L = 80
    SAFE_R = WIDTH - 80

    # Header Capsule
    hy = 125
    draw_glass_card(draw, [SAFE_L, hy, SAFE_R, hy + 42], radius=21, fill_color=(13, 22, 40, 240), border_color=C_GREEN)
    draw.text((SAFE_L + 20, hy + 11), "GALAXY SPORTS EDGE", font=get_font(15, bold=True), fill=C_GREEN)
    draw.text((SAFE_R - 175, hy + 13), "WE DETECT. YOU DECIDE.", font=get_font(11, bold=True), fill=C_WHITE)

    # Title
    ty = 180
    draw.text((SAFE_L, ty), "NFL WEEK 4 SOVEREIGN BOARD", font=get_font(13, bold=True), fill=C_CYAN)
    draw.text((SAFE_L, ty + 18), "CERTIFIED ACTION PLAYS", font=get_font(26, bold=True), fill=C_WHITE)
    draw.text((SAFE_L, ty + 50), "PURE QUANTITATIVE MODEL EDGE", font=get_font(16, bold=True), fill=C_GREEN)

    # Status Banner
    sb_y = ty + 78
    draw_glass_card(draw, [SAFE_L, sb_y, SAFE_R, sb_y + 36], radius=8, fill_color=(18, 38, 28, 240), border_color=C_GREEN)
    draw.text((SAFE_L + 18, sb_y + 9), "⚡ 4 CERTIFIED EDGES + 2 VINE COPULA SGPs", font=get_font(13, bold=True), fill=C_GREEN)

    # 4 Straight Bets
    plays = [
        {"type": "SPREAD", "pick": "PACKERS -3.5", "match": "GB @ TB (4:25 PM)", "edge": "+5.5 PT EDGE", "note": "Model GB -9.0. Baker OUT -> 2.4s pocket collapse hazard.", "stake": "5.0% Kelly", "color": C_GREEN},
        {"type": "SPREAD", "pick": "BILLS -7.0", "match": "BUF vs NE (1:00 PM)", "edge": "+3.5 PT EDGE", "note": "Model BUF -10.5. Drake Maye vs Highmark wind & Allen EPA.", "stake": "5.0% Kelly", "color": C_GREEN},
        {"type": "SPREAD", "pick": "CARDINALS -1.5", "match": "ARI @ NYG (1:00 PM)", "edge": "+3.5 PT EDGE", "note": "Model ARI -5.0. 4.0-pt steam flip. Giants pass pro collapse.", "stake": "3.9% Kelly", "color": C_GREEN},
        {"type": "TOTAL", "pick": "JETS / BEARS UNDER 42.5", "match": "NYJ @ CHI (1:00 PM)", "edge": "+9.0 PT EDGE", "note": "Model 33.5. Caleb & Breece OUT. Ground-grind pace.", "stake": "5.0% Kelly", "color": C_CYAN},
    ]

    card_y = 315
    card_h = 78
    gap = 84

    for i, p in enumerate(plays):
        cy = card_y + i * gap
        draw_glass_card(draw, [SAFE_L, cy, SAFE_R, cy + card_h], radius=8, fill_color=(16, 26, 46, 240), border_color=C_BORDER)

        # Type pill
        draw.rounded_rectangle([SAFE_L + 12, cy + 12, SAFE_L + 72, cy + 32], radius=4, fill=(10, 16, 28), outline=p["color"], width=1)
        draw.text((SAFE_L + 18, cy + 15), p["type"], font=get_font(10, bold=True), fill=p["color"])

        # Pick & Match
        draw.text((SAFE_L + 82, cy + 11), p["pick"], font=get_font(16, bold=True), fill=C_WHITE)
        draw.text((SAFE_L + 12, cy + 38), p["match"], font=get_font(11, bold=True), fill=C_CYAN)
        draw.text((SAFE_L + 12, cy + 54), p["note"], font=get_font(10, bold=False), fill=C_MUTED)

        # Right Edge Pill
        draw.rounded_rectangle([SAFE_R - 115, cy + 12, SAFE_R - 12, cy + 38], radius=4, fill=(15, 35, 25), outline=p["color"], width=1)
        draw.text((SAFE_R - 105, cy + 18), p["edge"], font=get_font(10, bold=True), fill=p["color"])
        draw.text((SAFE_R - 95, cy + 45), p["stake"], font=get_font(10, bold=True), fill=C_WHITE)

    # 2 Same-Game Parlays Section
    sgp_y = card_y + 4 * gap + 8
    draw.text((SAFE_L, sgp_y), "CANONICAL VINE COPULA SGPs (+40% ALPHA)", font=get_font(13, bold=True), fill=C_GOLD)

    sgps = [
        {"title": "PACKERS DEFENSIVE SQUEEZE (+158 Fair)", "legs": "Packers -3.5 + Under 39.5 + Daniels Under 195.5 Pass", "alpha": "+46.0% COPULA ALPHA", "col": C_GREEN},
        {"title": "BILLS HIGHMARK DEFENSE (+220 Fair)", "legs": "Bills -7.0 + Maye Under 225.5 Pass + Under 48.5", "alpha": "+33.0% COPULA ALPHA", "col": C_CYAN}
    ]

    for j, s in enumerate(sgps):
        sy = sgp_y + 24 + j * 76
        draw_glass_card(draw, [SAFE_L, sy, SAFE_R, sy + 68], radius=8, fill_color=(20, 28, 48, 240), border_color=C_GOLD)
        draw.text((SAFE_L + 14, sy + 10), s["title"], font=get_font(13, bold=True), fill=C_WHITE)
        draw.text((SAFE_L + 14, sy + 30), s["legs"], font=get_font(10.5, bold=False), fill=C_MUTED)

        draw.rounded_rectangle([SAFE_R - 145, sy + 44, SAFE_R - 12, sy + 64], radius=3, fill=(35, 30, 15), outline=C_GOLD, width=1)
        draw.text((SAFE_R - 138, sy + 48), s["alpha"], font=get_font(9.5, bold=True), fill=C_GOLD)

    # Bottom Protocol Box
    bot_y = sgp_y + 24 + 2 * 76 + 12
    draw_glass_card(draw, [SAFE_L, bot_y, SAFE_R, bot_y + 78], radius=10, fill_color=(12, 28, 50, 240), border_color=C_GREEN)
    draw.text((SAFE_L + 18, bot_y + 12), "🛡️ WE REJECT PUBLIC TRAPS. WE FIRE CERTIFIED EDGES.", font=get_font(12, bold=True), fill=C_GREEN)
    draw.text((SAFE_L + 18, bot_y + 32), "We passed on DAL/HOU & fake rain in Baltimore to protect roll.\nEvery play above clears 3.5+ pt edge & Bayesian Kelly sizing.", font=get_font(10.5, bold=False), fill=C_WHITE)
    draw.text((SAFE_L + 18, bot_y + 54), "Single-Entry DFS Hammer: $49,300 with 4:25 PM Late Swap!", font=get_font(10, bold=True), fill=C_CYAN)

    draw.text((SAFE_L + 130, bot_y + 90), "galaxysportsedge.com • @GalaxySportsHQ", font=get_font(13, bold=True), fill=C_GREEN)

    out_file = os.path.join(OUTPUT_DIR, "gse_week4_certified_action_plays_vertical.png")
    img.convert("RGB").save(out_file, "PNG", quality=95)
    print(f"Generated: {out_file}")
    return out_file

def create_action_plays_landscape():
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

    # Header
    draw_glass_card(draw, [50, 40, WIDTH - 50, 110], radius=16, fill_color=(12, 20, 36, 245), border_color=C_GREEN)
    draw.text((80, 58), "GALAXY SPORTS EDGE", font=get_font(26, bold=True), fill=C_GREEN)
    draw.text((450, 66), "NFL WEEK 4 SOVEREIGN ACTION BOARD", font=get_font(16, bold=False), fill=C_MUTED)
    draw.text((WIDTH - 420, 62), "WE DETECT. YOU DECIDE.", font=get_font(20, bold=True), fill=C_WHITE)
    draw.text((WIDTH - 150, 64), "WEEK 4", font=get_font(16, bold=True), fill=C_CYAN)

    # Left: Straight Plays & SGPs
    draw_glass_card(draw, [50, 130, 1020, 1030], radius=16, fill_color=(13, 21, 38, 235), border_color=C_GREEN)
    draw.text((80, 155), "CERTIFIED HIGH-EDGE BETTING PLAYS", font=get_font(20, bold=True), fill=C_WHITE)
    draw.text((80, 185), "Strict 5-Gate Conformal Hurdle Cleared • CMTK Kelly Allocation", font=get_font(13, bold=False), fill=C_GREEN)

    plays = [
        ("SPREAD", "PACKERS -3.5", "GB @ TB (4:25 PM)", "+5.5 PT EDGE", "Model GB -9.0 vs Market -3.5. Baker OUT -> 2.4s pocket hazard.", "5.0% Kelly", C_GREEN),
        ("SPREAD", "BILLS -7.0", "BUF vs NE (1:00 PM)", "+3.5 PT EDGE", "Model BUF -10.5 vs -7.0. Maye vs Highmark wind & Allen EPA.", "5.0% Kelly", C_GREEN),
        ("SPREAD", "CARDINALS -1.5", "ARI @ NYG (1:00 PM)", "+3.5 PT EDGE", "Model ARI -5.0. 4.0-pt steam reversal. Giants pass pro collapse.", "3.9% Kelly", C_GREEN),
        ("TOTAL", "JETS / BEARS UNDER 42.5", "NYJ @ CHI (1:00 PM)", "+9.0 PT EDGE", "Model Total 33.5. Caleb & Breece OUT. Ground-grind pace.", "5.0% Kelly", C_CYAN),
    ]

    py = 225
    p_gap = 100
    for i, (ptype, pick, match, edge, desc, stake, col) in enumerate(plays):
        cy = py + i * p_gap
        draw_glass_card(draw, [75, cy, 995, cy + 90], radius=8, fill_color=(19, 29, 52, 230), border_color=C_BORDER)

        draw.rounded_rectangle([90, cy + 14, 155, cy + 38], radius=4, fill=(10, 16, 28), outline=col, width=1)
        draw.text((98, cy + 18), ptype, font=get_font(11, bold=True), fill=col)

        draw.text((165, cy + 12), pick, font=get_font(20, bold=True), fill=C_WHITE)
        draw.text((165, cy + 40), f"{match} • {desc}", font=get_font(12, bold=False), fill=C_MUTED)

        draw.rounded_rectangle([840, cy + 18, 975, cy + 46], radius=6, fill=(15, 35, 25), outline=col, width=1)
        draw.text((852, cy + 24), edge, font=get_font(12, bold=True), fill=col)
        draw.text((870, cy + 54), stake, font=get_font(12, bold=True), fill=C_WHITE)

    # 2 SGPs in left panel bottom
    sgp_box_y = py + 4 * p_gap + 10
    draw_glass_card(draw, [75, sgp_box_y, 995, sgp_box_y + 165], radius=10, fill_color=(20, 28, 48, 240), border_color=C_GOLD)
    draw.text((95, sgp_box_y + 14), "CANONICAL VINE COPULA SAME GAME PARLAYS", font=get_font(15, bold=True), fill=C_GOLD)

    draw.text((95, sgp_box_y + 44), "1. Packers Defensive Squeeze (+158 Fair / +46.0% Copula Alpha)", font=get_font(14, bold=True), fill=C_WHITE)
    draw.text((115, sgp_box_y + 68), "Legs: Packers -3.5 + Packers/Bucs Under 39.5 + Daniels Under 195.5 Pass Yds", font=get_font(12, bold=False), fill=C_MUTED)

    draw.text((95, sgp_box_y + 98), "2. Bills Highmark Wind & Defense (+220 Fair / +33.0% Copula Alpha)", font=get_font(14, bold=True), fill=C_WHITE)
    draw.text((115, sgp_box_y + 122), "Legs: Bills -7.0 + Drake Maye Under 225.5 Pass Yds + Bills/Pats Under 48.5", font=get_font(12, bold=False), fill=C_MUTED)

    # Right: Public Traps Exterminator & DFS Optimal
    draw_glass_card(draw, [1050, 130, WIDTH - 50, 1030], radius=16, fill_color=(13, 21, 38, 235), border_color=C_ORANGE)
    draw.text((1080, 155), "WHY WE REJECTED THE TOUT TRAPS (LAW 9)", font=get_font(20, bold=True), fill=C_WHITE)
    draw.text((1080, 185), "We Protected Bankrolls From 4 Sucker Traps Pushed by Public Media", font=get_font(13, bold=False), fill=C_ORANGE)

    traps = [
        ("DAL @ HOU (48.5 Total)", "Overround inside 4.3% vig. Key-3 balance. Zero edge.", "AVOID"),
        ("TEN @ BAL (-11.5 Spread)", "NWS confirms 50% drizzle, NOT deluge. Public bias trap.", "AVOID"),
        ("JAX @ CIN (51.5 Total)", "Highest slate total public magnet. Missing genuine handle.", "AVOID"),
        ("Derrick Henry (98.5 Rush)", "Sample variance huge. CQR Width 46.2 > 40 Cap. LCB < 0.", "AVOID"),
    ]

    ty = 225
    for i, (title, reason, act) in enumerate(traps):
        cy = ty + i * 82
        draw_glass_card(draw, [1075, cy, WIDTH - 75, cy + 72], radius=8, fill_color=(25, 18, 28, 230), border_color=(60, 30, 40))
        draw.text((1095, cy + 14), title, font=get_font(16, bold=True), fill=C_WHITE)
        draw.text((1095, cy + 40), reason, font=get_font(12, bold=False), fill=C_MUTED)

        draw.rounded_rectangle([WIDTH - 195, cy + 18, WIDTH - 95, cy + 54], radius=6, fill=(55, 18, 22), outline=C_ORANGE, width=1)
        draw.text((WIDTH - 175, cy + 27), act, font=get_font(14, bold=True), fill=C_ORANGE)

    # DFS Optimal Summary Box on Right
    dfs_box_y = ty + 4 * 82 + 15
    draw_glass_card(draw, [1075, dfs_box_y, WIDTH - 75, 1000], radius=10, fill_color=(12, 28, 50, 240), border_color=C_CYAN)
    draw.text((1095, dfs_box_y + 18), "DRAFTKINGS 50-MAN WINNER-TAKE-ALL HAMMER ($49,300)", font=get_font(16, bold=True), fill=C_CYAN)
    draw.text((1095, dfs_box_y + 45), "• 3-1 Shootout Core: Trevor Lawrence ($5.9k) + Parker Washington ($6.5k) + Brenton Strange ($3.2k)\n  with Tee Higgins ($6.1k) Cincinnati Air Yards Bring-Back", font=get_font(12, bold=False), fill=C_WHITE)
    draw.text((1095, dfs_box_y + 88), "• Bellcow Floor: Derrick Henry ($8.4k) + Braelon Allen ($5.2k lead role)", font=get_font(12, bold=False), fill=C_WHITE)
    draw.text((1095, dfs_box_y + 115), "• Target Vacuum: Jordan Addison ($5.3k) with Jefferson OUT vs Miami", font=get_font(12, bold=False), fill=C_WHITE)
    draw.text((1095, dfs_box_y + 142), "• ⚡ 4:25 PM LATE SWAP KEY: Emanuel Wilson ($4.7k) in FLEX slot (pivot if trailing)", font=get_font(12, bold=True), fill=C_ORANGE)
    draw.text((1095, dfs_box_y + 172), "• DST: Minnesota Vikings ($4.0k) vs Tyler Huntley", font=get_font(12, bold=False), fill=C_WHITE)

    draw.text((1095, dfs_box_y + 205), "Single-entry game theory perfected. Zero duplicated chalk.", font=get_font(12, bold=True), fill=C_GREEN)
    draw.text((WIDTH - 380, dfs_box_y + 205), "galaxysportsedge.com", font=get_font(14, bold=True), fill=C_CYAN)

    out_file = os.path.join(OUTPUT_DIR, "gse_week4_certified_action_plays_landscape.png")
    img.convert("RGB").save(out_file, "PNG", quality=95)
    print(f"Generated: {out_file}")
    return out_file

if __name__ == "__main__":
    create_action_plays_vertical()
    create_action_plays_landscape()
