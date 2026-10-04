"""
generate_ultra_creative_suite.py
================================
Produces breathtaking, award-winning visual cards for Galaxy Sports Edge:
1. 720x1280 (9:16 Vertical Reel/Story/Shorts format) with strict 80% safe zone margins.
2. 1920x1080 (16:9 Master Landscape format) for Twitter/X cards and broadcast monitors.
Features glassmorphic lighting, telemetry meters, neon glow blooms, and zero text-clipping.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = r"C:\Users\Garrett\Downloads"

# Color Palette
C_VOID = (5, 8, 17)
C_GLASS_BG = (15, 23, 42, 230)
C_CYAN = (0, 240, 255)
C_CYAN_DIM = (0, 150, 180)
C_ORANGE = (255, 85, 0)
C_ORANGE_DIM = (180, 50, 0)
C_GREEN = (0, 255, 136)
C_GOLD = (255, 215, 0)
C_WHITE = (255, 255, 255)
C_MUTED = (148, 163, 184)
C_DARK_SLATE = (20, 29, 47)
C_BORDER_BASE = (38, 54, 82)

def get_font(size: int, bold: bool = False):
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except:
        return ImageFont.load_default()

def draw_glass_card(draw, bbox, radius, fill_color, border_color, glow=True, top_highlight=True):
    x0, y0, x1, y1 = bbox
    # Base fill & border
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill_color, outline=border_color, width=1)
    if top_highlight:
        # Glass reflection on top edge
        draw.line([(x0 + radius, y0 + 1), (x1 - radius, y0 + 1)], fill=(255, 255, 255, 70), width=1)

def draw_telemetry_bar(draw, x, y, width, height, percent, fill_color, bg_color=(25, 35, 55)):
    # Draw background track
    draw.rounded_rectangle([x, y, x + width, y + height], radius=height // 2, fill=bg_color)
    # Draw active fill
    active_w = int(width * max(0.0, min(1.0, percent)))
    if active_w > height:
        draw.rounded_rectangle([x, y, x + active_w, y + height], radius=height // 2, fill=fill_color)

def create_ultra_vertical_dfs():
    WIDTH, HEIGHT = 720, 1280
    img = Image.new("RGBA", (WIDTH, HEIGHT), C_VOID)
    draw = ImageDraw.Draw(img)

    # 1. Tech Grid Background
    for y in range(0, HEIGHT, 45):
        draw.line([(0, y), (WIDTH, y)], fill=(15, 25, 45, 90), width=1)
    for x in range(0, WIDTH, 45):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 25, 45, 90), width=1)

    # 2. Ambient Nebula Blooms
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([WIDTH // 2 - 260, 60, WIDTH // 2 + 260, 380], fill=(0, 240, 255, 30))
    gdraw.ellipse([WIDTH // 2 - 200, 750, WIDTH // 2 + 200, 1150], fill=(255, 85, 0, 25))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # 3. STRICT 80% SAFE MARGINS (Width: 560px, Left: 80, Right: 640)
    SAFE_L = 80
    SAFE_R = WIDTH - 80
    SAFE_W = SAFE_R - SAFE_L

    # Header Capsule (y: 125 to 168)
    head_y = 125
    draw_glass_card(draw, [SAFE_L, head_y, SAFE_R, head_y + 42], radius=21, fill_color=(13, 22, 40, 240), border_color=C_CYAN)
    draw.text((SAFE_L + 20, head_y + 11), "GALAXY SPORTS EDGE", font=get_font(15, bold=True), fill=C_CYAN)
    draw.text((SAFE_R - 175, head_y + 13), "WE DETECT. YOU DECIDE.", font=get_font(11, bold=True), fill=C_WHITE)

    # Title & Subhead
    ty = 180
    draw.text((SAFE_L, ty), "NFL WEEK 4 QUANTITATIVE OPTIMAL", font=get_font(13, bold=True), fill=C_ORANGE)
    draw.text((SAFE_L, ty + 18), "DRAFTKINGS 50-MAN WINNER", font=get_font(26, bold=True), fill=C_WHITE)
    draw.text((SAFE_L, ty + 50), "3-1 SHOOTOUT CORRELATION CORE", font=get_font(17, bold=True), fill=C_CYAN)

    # Stats Banner (Salary + Flex status)
    sb_y = ty + 78
    draw_glass_card(draw, [SAFE_L, sb_y, SAFE_L + 260, sb_y + 36], radius=8, fill_color=(20, 32, 54, 240), border_color=C_GREEN)
    draw.text((SAFE_L + 12, sb_y + 8), "CAP SPENT: $49,300 / $50K", font=get_font(13, bold=True), fill=C_GREEN)

    draw_glass_card(draw, [SAFE_L + 275, sb_y, SAFE_R, sb_y + 36], radius=8, fill_color=(45, 20, 25, 240), border_color=C_ORANGE)
    draw.text((SAFE_L + 290, sb_y + 8), "4:25 PM LATE-SWAP LIVE", font=get_font(12, bold=True), fill=C_ORANGE)

    # 9-Slot Roster Grid
    roster_y = 315
    slot_h = 66
    gap = 71

    roster = [
        {"pos": "QB", "name": "Trevor Lawrence", "meta": "$5,900 • JAX @ CIN • 51.5 O/U", "badge": "+0.31 CORR", "badge_col": C_CYAN, "bar": 0.85},
        {"pos": "RB", "name": "Derrick Henry", "meta": "$8,400 • BAL vs TEN • 6 TDs", "badge": "BELLCOW", "badge_col": C_GREEN, "bar": 0.95},
        {"pos": "RB", "name": "Braelon Allen", "meta": "$5,200 • NYJ @ CHI • Lead RB", "badge": "VALUE LOCK", "badge_col": C_GREEN, "bar": 0.75},
        {"pos": "WR", "name": "Parker Washington", "meta": "$6,500 • JAX @ CIN • Slot Alpha", "badge": "TARGET WR", "badge_col": C_CYAN, "bar": 0.82},
        {"pos": "WR", "name": "Tee Higgins", "meta": "$6,100 • CIN vs JAX • Bring-Back", "badge": "AIR YARDS", "badge_col": C_CYAN, "bar": 0.80},
        {"pos": "WR", "name": "Jordan Addison", "meta": "$5,300 • MIN vs MIA • WR1 Role", "badge": "TARGETS UP", "badge_col": C_WHITE, "bar": 0.70},
        {"pos": "TE", "name": "Brenton Strange", "meta": "$3,200 • JAX @ CIN • +0.27 Corr", "badge": "MATCHUP", "badge_col": C_CYAN, "bar": 0.65},
        {"pos": "FLX", "name": "Emanuel Wilson", "meta": "$4,700 • GB vs DET • 4:25 PM ET", "badge": "SWAP PIVOT", "badge_col": C_ORANGE, "bar": 0.78},
        {"pos": "DST", "name": "Minnesota Vikings", "meta": "$4,000 • MIN vs MIA • 4:05 PM", "badge": "#1 SACKS", "badge_col": C_WHITE, "bar": 0.88},
    ]

    for i, p in enumerate(roster):
        cy = roster_y + i * gap
        is_flex = (p["pos"] == "FLX")
        box_bg = (40, 20, 30, 240) if is_flex else (16, 25, 45, 235)
        border_col = C_ORANGE if is_flex else (C_CYAN_DIM if "CORR" in p["badge"] or p["badge_col"] == C_CYAN else C_BORDER_BASE)

        draw_glass_card(draw, [SAFE_L, cy, SAFE_R, cy + slot_h], radius=8, fill_color=box_bg, border_color=border_col)

        # Pos Badge
        draw.rounded_rectangle([SAFE_L + 10, cy + 11, SAFE_L + 54, cy + 54], radius=6, fill=(10, 16, 28), outline=p["badge_col"], width=1)
        draw.text((SAFE_L + (14 if len(p["pos"]) == 3 else 17), cy + 24), p["pos"], font=get_font(13, bold=True), fill=p["badge_col"])

        # Name & Sub-meta
        draw.text((SAFE_L + 66, cy + 12), p["name"], font=get_font(17, bold=True), fill=C_WHITE)
        draw.text((SAFE_L + 66, cy + 36), p["meta"], font=get_font(11, bold=False), fill=C_ORANGE if is_flex else C_MUTED)

        # Right Telemetry Pill
        draw.rounded_rectangle([SAFE_R - 118, cy + 14, SAFE_R - 12, cy + 38], radius=4, fill=(10, 18, 32), outline=p["badge_col"], width=1)
        draw.text((SAFE_R - 110, cy + 19), p["badge"], font=get_font(10, bold=True), fill=p["badge_col"])

        # Mini Micro-meter Bar below badge
        draw_telemetry_bar(draw, SAFE_R - 118, cy + 44, 106, 5, p["bar"], p["badge_col"])

    # Bottom Callout Box (FLEX Strategy)
    bot_y = roster_y + 9 * gap + 10
    draw_glass_card(draw, [SAFE_L, bot_y, SAFE_R, bot_y + 88], radius=10, fill_color=(12, 28, 50, 240), border_color=C_CYAN)
    draw.text((SAFE_L + 18, bot_y + 14), "⚡ LATE-SWAP PROTOCOL ACTIVE", font=get_font(14, bold=True), fill=C_CYAN)
    draw.text((SAFE_L + 18, bot_y + 36), "FLEX is live until 4:25 PM ET. If leading: lock Wilson.\nIf trailing: pivot to 4:25 PM / SNF tournament ceiling!", font=get_font(11, bold=False), fill=C_WHITE)
    draw.text((SAFE_L + 18, bot_y + 66), "Zero unspent salary traps. Single-entry game theory applied.", font=get_font(10, bold=True), fill=C_GREEN)

    # Domain / Handle
    draw.text((SAFE_L + 130, bot_y + 100), "galaxysportsedge.com • @GalaxySportsHQ", font=get_font(13, bold=True), fill=C_CYAN)

    out_file = os.path.join(OUTPUT_DIR, "gse_week4_ultra_vertical_dfs.png")
    img.convert("RGB").save(out_file, "PNG", quality=95)
    print(f"Generated: {out_file}")
    return out_file

def create_ultra_vertical_law9():
    WIDTH, HEIGHT = 720, 1280
    img = Image.new("RGBA", (WIDTH, HEIGHT), C_VOID)
    draw = ImageDraw.Draw(img)

    for y in range(0, HEIGHT, 45):
        draw.line([(0, y), (WIDTH, y)], fill=(15, 25, 45, 90), width=1)
    for x in range(0, WIDTH, 45):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 25, 45, 90), width=1)

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([WIDTH // 2 - 260, 80, WIDTH // 2 + 260, 400], fill=(255, 85, 0, 30))
    gdraw.ellipse([WIDTH // 2 - 200, 700, WIDTH // 2 + 200, 1100], fill=(0, 240, 255, 20))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    SAFE_L = 80
    SAFE_R = WIDTH - 80

    head_y = 125
    draw_glass_card(draw, [SAFE_L, head_y, SAFE_R, head_y + 42], radius=21, fill_color=(13, 22, 40, 240), border_color=C_ORANGE)
    draw.text((SAFE_L + 20, head_y + 11), "GALAXY SPORTS EDGE", font=get_font(15, bold=True), fill=C_ORANGE)
    draw.text((SAFE_R - 175, head_y + 13), "WE DETECT. YOU DECIDE.", font=get_font(11, bold=True), fill=C_WHITE)

    ty = 180
    draw.text((SAFE_L, ty), "MARKET MICROSTRUCTURE AUDIT", font=get_font(13, bold=True), fill=C_CYAN)
    draw.text((SAFE_L, ty + 18), "LAW 9 FAIL-CLOSED SIEVE", font=get_font(26, bold=True), fill=C_WHITE)
    draw.text((SAFE_L, ty + 50), "ZERO-TRUST SPORTS INTELLIGENCE", font=get_font(17, bold=True), fill=C_ORANGE)

    # Status Banner
    sb_y = ty + 78
    draw_glass_card(draw, [SAFE_L, sb_y, SAFE_R, sb_y + 38], radius=8, fill_color=(45, 18, 24, 240), border_color=C_ORANGE)
    draw.text((SAFE_L + 20, sb_y + 10), "🛡️ UNANIMOUS PRE-GAME FAIL-CLOSED ABSTAIN", font=get_font(13, bold=True), fill=C_ORANGE)

    # Cards list
    items = [
        {"title": "DAL @ HOU (48.5 O/U)", "desc": "Overround inside 4.3% vig. Key-3 balance.", "reason": "NO EDGE", "stat": "Vig > Delta P"},
        {"title": "TEN @ BAL (-11.5 SPREAD)", "desc": "NWS 50% drizzle, NOT deluge. Public bias.", "reason": "HIGH VAR", "stat": "Weather Exag"},
        {"title": "JAX @ CIN (51.5 TOTAL)", "desc": "Highest total magnet. Tickets unverified.", "reason": "TOUT TRAP", "stat": "False Climax"},
        {"title": "DERRICK HENRY (98.5 RUSH)", "desc": "CQR Width 46.2 > 40 Cap. LCB is -28.6.", "reason": "LCB < 0", "stat": "Gate 1 Fail"},
        {"title": "DRAKE MAYE (231.5 PASS)", "desc": "Mean 195.0. Wind 7-15mph. LCB -68.5 yds.", "reason": "SUB-PAR", "stat": "Sample N=3"},
        {"title": "PARKER WASHINGTON (73.5 REC)", "desc": "Mean 73.7. Edge +0.2. LCB is -23.6 yds.", "reason": "JUICE TRAP", "stat": "Zero Margin"},
        {"title": "TREY McBRIDE (6.5 REC)", "desc": "Juiced to -147 (59.5%). Kelly f* = 0.", "reason": "PRICE TAX", "stat": "No Half-Kelly"},
    ]

    card_y = 315
    card_h = 75
    gap = 81

    for i, it in enumerate(items):
        cy = card_y + i * gap
        draw_glass_card(draw, [SAFE_L, cy, SAFE_R, cy + card_h], radius=8, fill_color=(16, 25, 45, 235), border_color=(50, 65, 95))

        # Title & Description
        draw.text((SAFE_L + 16, cy + 12), it["title"], font=get_font(15, bold=True), fill=C_WHITE)
        draw.text((SAFE_L + 16, cy + 34), it["desc"], font=get_font(11, bold=False), fill=C_MUTED)
        draw.text((SAFE_L + 16, cy + 52), f"Audit Diagnostic: {it['stat']}", font=get_font(10, bold=True), fill=C_CYAN)

        # Right Action Tag (ABSTAIN)
        draw.rounded_rectangle([SAFE_R - 110, cy + 14, SAFE_R - 14, cy + 42], radius=4, fill=(55, 18, 22), outline=C_ORANGE, width=1)
        draw.text((SAFE_R - 96, cy + 21), "ABSTAIN", font=get_font(12, bold=True), fill=C_ORANGE)

        draw.rounded_rectangle([SAFE_R - 110, cy + 46, SAFE_R - 14, cy + 64], radius=3, fill=(20, 30, 48), outline=C_BORDER_BASE, width=1)
        draw.text((SAFE_R - 98, cy + 49), it["reason"], font=get_font(9, bold=True), fill=C_MUTED)

    # Bottom Protocol Box
    bot_y = card_y + 7 * gap + 15
    draw_glass_card(draw, [SAFE_L, bot_y, SAFE_R, bot_y + 88], radius=10, fill_color=(12, 28, 50, 240), border_color=C_ORANGE)
    draw.text((SAFE_L + 18, bot_y + 14), "CAPITAL PRESERVATION IS THE FIRST VICTORY", font=get_font(13, bold=True), fill=C_ORANGE)
    draw.text((SAFE_L + 18, bot_y + 36), "Zero forced bets. $0.00 donated to sportsbooks.\nLive second-half jump-diffusion engine on standby at halftime.", font=get_font(11, bold=False), fill=C_WHITE)
    draw.text((SAFE_L + 18, bot_y + 66), "Real math protects your roll. Conformal sieve verified.", font=get_font(10, bold=True), fill=C_CYAN)

    draw.text((SAFE_L + 130, bot_y + 100), "galaxysportsedge.com • @GalaxySportsHQ", font=get_font(13, bold=True), fill=C_CYAN)

    out_file = os.path.join(OUTPUT_DIR, "gse_week4_ultra_vertical_law9.png")
    img.convert("RGB").save(out_file, "PNG", quality=95)
    print(f"Generated: {out_file}")
    return out_file

def create_ultra_landscape_master():
    WIDTH, HEIGHT = 1920, 1080
    img = Image.new("RGBA", (WIDTH, HEIGHT), C_VOID)
    draw = ImageDraw.Draw(img)

    for y in range(0, HEIGHT, 45):
        draw.line([(0, y), (WIDTH, y)], fill=(15, 25, 45, 70), width=1)
    for x in range(0, WIDTH, 45):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 25, 45, 70), width=1)

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([200, 100, 800, 700], fill=(0, 240, 255, 30))
    gdraw.ellipse([1100, 300, 1800, 950], fill=(255, 85, 0, 25))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # Top Master Header
    draw_glass_card(draw, [50, 40, WIDTH - 50, 110], radius=16, fill_color=(12, 20, 36, 245), border_color=C_CYAN)
    draw.text((80, 58), "GALAXY SPORTS EDGE", font=get_font(26, bold=True), fill=C_CYAN)
    draw.text((450, 66), "QUANTITATIVE SPORTS INTELLIGENCE LAB", font=get_font(16, bold=False), fill=C_MUTED)
    draw.text((WIDTH - 420, 62), "WE DETECT. YOU DECIDE.", font=get_font(20, bold=True), fill=C_WHITE)
    draw.text((WIDTH - 150, 64), "WEEK 4", font=get_font(16, bold=True), fill=C_ORANGE)

    # Two Main Panels: Left = DFS Master Lineup, Right = Law 9 Audit
    # Left Panel: DFS
    draw_glass_card(draw, [50, 130, 990, 1030], radius=16, fill_color=(13, 21, 38, 235), border_color=C_CYAN)
    draw.text((80, 155), "DRAFTKINGS 50-MAN SINGLE-ENTRY OPTIMAL", font=get_font(20, bold=True), fill=C_WHITE)
    draw.text((80, 185), "3-1 Shootout Correlation Core • 4:25 PM Late-Swap Leverage • $49,300 Spent", font=get_font(13, bold=False), fill=C_CYAN)

    roster = [
        ("QB", "Trevor Lawrence", "$5,900", "JAX @ CIN (51.5 O/U)", "+0.31 Shootout Core", C_CYAN),
        ("RB", "Derrick Henry", "$8,400", "BAL vs TEN (6 TDs)", "Bellcow Goal-line Floor", C_GREEN),
        ("RB", "Braelon Allen", "$5,200", "NYJ @ CHI (Lead Role)", "Free Square Volume Lock", C_GREEN),
        ("WR", "Parker Washington", "$6,500", "JAX @ CIN (Slot Alpha)", "30% Target Share Alpha", C_CYAN),
        ("WR", "Tee Higgins", "$6,100", "CIN vs JAX (Bring-Back)", "Air Yards Monopolizer", C_CYAN),
        ("WR", "Jordan Addison", "$5,300", "MIN vs MIA (WR1 Role)", "Jefferson Out Leverage", C_WHITE),
        ("TE", "Brenton Strange", "$3,200", "JAX @ CIN (TE Matchup)", "+0.27 Correlation Pair", C_CYAN),
        ("FLX", "Emanuel Wilson", "$4,700", "GB vs DET (4:25 PM ET)", "LATE-SWAP KEY PIVOT", C_ORANGE),
        ("DST", "Minnesota Vikings", "$4,000", "MIN vs MIA (4:05 PM)", "#1 Pressure Rate / Sacks", C_WHITE),
    ]

    r_y = 225
    r_h = 75
    r_gap = 82
    for i, (pos, name, sal, match, tag, col) in enumerate(roster):
        cy = r_y + i * r_gap
        is_flex = (pos == "FLX")
        bg_col = (35, 18, 28, 240) if is_flex else (19, 29, 52, 230)
        bord = C_ORANGE if is_flex else (C_CYAN_DIM if col == C_CYAN else C_BORDER_BASE)

        draw_glass_card(draw, [75, cy, 965, cy + r_h], radius=8, fill_color=bg_col, border_color=bord)

        # Pos
        draw.rounded_rectangle([90, cy + 12, 140, cy + 62], radius=6, fill=(10, 16, 28), outline=col, width=1)
        draw.text((95 + (4 if len(pos)==3 else 10), cy + 28), pos, font=get_font(15, bold=True), fill=col)

        # Name, Salary, Matchup
        draw.text((155, cy + 14), name, font=get_font(18, bold=True), fill=C_WHITE)
        draw.text((155, cy + 42), f"{sal} • {match}", font=get_font(12, bold=False), fill=C_MUTED)

        # Tag
        draw.rounded_rectangle([780, cy + 20, 945, cy + 54], radius=6, fill=(12, 20, 36), outline=col, width=1)
        draw.text((795, cy + 28), tag, font=get_font(11, bold=True), fill=col)

    # Right Panel: Law 9 Audit
    draw_glass_card(draw, [1020, 130, WIDTH - 50, 1030], radius=16, fill_color=(13, 21, 38, 235), border_color=C_ORANGE)
    draw.text((1050, 155), "ZERO-TRUST BETTING AUDIT (LAW 9)", font=get_font(20, bold=True), fill=C_WHITE)
    draw.text((1050, 185), "Strict 5-Gate Conformal Sieve • Mathematical Edge < 3.5% Or LCB <= 0.0 -> ABSTAIN", font=get_font(13, bold=False), fill=C_ORANGE)

    law_items = [
        ("DAL @ HOU", "48.5 Total", "Overround within 4.3% vig. Key-3 book balancing.", "ABSTAIN"),
        ("TEN @ BAL", "-11.5 Spread", "NWS confirms 50% drizzle, NOT deluge. Public trap.", "ABSTAIN"),
        ("JAX @ CIN", "51.5 Total", "Highest total on slate. Reverse money unverified.", "ABSTAIN"),
        ("Derrick Henry", "98.5 Rush Yds", "CQR Width 46.2 > 40 Cap. 95% LCB is -28.6 yds.", "ABSTAIN"),
        ("Drake Maye", "231.5 Pass Yds", "Season mean 195.0 yds. 95% LCB is -68.5 yds.", "ABSTAIN"),
        ("Parker Washington", "73.5 Rec Yds", "Season mean 73.7. Edge +0.2 yds. LCB is -23.6 yds.", "ABSTAIN"),
        ("Trey McBride", "6.5 Receptions", "Juiced to -147 (59.5% implied). Half-Kelly f* = 0.", "ABSTAIN"),
    ]

    l_y = 230
    l_h = 88
    l_gap = 96
    for i, (match, mtype, diag, verdict) in enumerate(law_items):
        cy = l_y + i * l_gap
        draw_glass_card(draw, [1045, cy, WIDTH - 75, cy + l_h], radius=8, fill_color=(19, 29, 52, 230), border_color=(50, 65, 95))

        draw.text((1070, cy + 15), f"{match} • {mtype}", font=get_font(18, bold=True), fill=C_WHITE)
        draw.text((1070, cy + 45), diag, font=get_font(13, bold=False), fill=C_MUTED)

        draw.rounded_rectangle([WIDTH - 210, cy + 22, WIDTH - 95, cy + 66], radius=6, fill=(55, 18, 22), outline=C_ORANGE, width=1)
        draw.text((WIDTH - 192, cy + 34), verdict, font=get_font(16, bold=True), fill=C_ORANGE)

    # Bottom Branding Bar on Right
    draw_glass_card(draw, [1045, 915, WIDTH - 75, 1005], radius=10, fill_color=(10, 25, 45, 240), border_color=C_CYAN)
    draw.text((1070, 932), "SOVEREIGN SPORTS MODELING • ZERO TICKET SHADING", font=get_font(14, bold=True), fill=C_CYAN)
    draw.text((1070, 960), "Halftime Live Reseeding Jump-Diffusion Engine Activates ~2:30 PM ET.", font=get_font(12, bold=False), fill=C_WHITE)
    draw.text((WIDTH - 380, 945), "galaxysportsedge.com", font=get_font(16, bold=True), fill=C_WHITE)

    out_file = os.path.join(OUTPUT_DIR, "gse_week4_ultra_landscape_master.png")
    img.convert("RGB").save(out_file, "PNG", quality=95)
    print(f"Generated: {out_file}")
    return out_file

if __name__ == "__main__":
    create_ultra_vertical_dfs()
    create_ultra_vertical_law9()
    create_ultra_landscape_master()
