"""
generate_gse_social_cards.py
============================
Generates high-resolution 1200x675 (16:9) Twitter/X social graphics cards
for Galaxy Sports Edge (galaxysportsedge.com).
"""

import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = r"C:\Users\Garrett\Downloads"
WIDTH = 1200
HEIGHT = 675

# Color Palette (Galaxy Sports Edge Obsidian & Cyan/Orange Theme)
BG_DARK = (10, 14, 23)        # Obsidian Navy
PANEL_BG = (17, 24, 39)       # Dark Slate Card
BORDER_CYAN = (0, 229, 255)   # Orbital Cyan Neon
TEXT_WHITE = (248, 250, 252)  # Bright White
TEXT_MUTED = (148, 163, 184)  # Muted Slate
ACCENT_ORANGE = (255, 94, 58) # Electric Orange
ACCENT_GREEN = (16, 185, 129) # Alpha Green
BADGE_BG = (30, 41, 59)       # Pill background

def get_font(size: int, bold: bool = False):
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except:
        return ImageFont.load_default()

def create_lineup_card():
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)

    # Subtle background accent lines / grid
    for y in range(0, HEIGHT, 45):
        draw.line([(0, y), (WIDTH, y)], fill=(15, 23, 42), width=1)
    for x in range(0, WIDTH, 60):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 23, 42), width=1)

    # Top Brand Bar
    draw.rectangle([(0, 0), (WIDTH, 70)], fill=(13, 20, 36))
    draw.line([(0, 70), (WIDTH, 70)], fill=BORDER_CYAN, width=2)

    # Logo & Brand Header
    draw.text((40, 18), "GALAXY SPORTS EDGE", font=get_font(24, bold=True), fill=BORDER_CYAN)
    draw.text((360, 22), "•   WE DETECT. YOU DECIDE.   •   galaxysportsedge.com", font=get_font(16, bold=False), fill=TEXT_MUTED)
    draw.text((980, 20), "@GalaxySportsHQ", font=get_font(18, bold=True), fill=TEXT_WHITE)

    # Main Card Title & Subtitle
    draw.text((40, 85), "NFL WEEK 4 DRAFTKINGS OPTIMAL TOURNAMENT LINEUP", font=get_font(26, bold=True), fill=TEXT_WHITE)
    draw.text((40, 120), "3-1 Jungleball Shootout Stack  |  $49,300 / $50,000 Cap  |  Preserves 4:25 PM Late Swap", font=get_font(15, bold=False), fill=ACCENT_ORANGE)

    # Roster Slots (3 columns x 3 rows grid)
    slots = [
        {"pos": "QB", "name": "Trevor Lawrence", "team": "JAX @ CIN", "time": "1:00 PM", "sal": "$5,900", "role": "51.5 O/U Shootout Anchor"},
        {"pos": "RB", "name": "Derrick Henry", "team": "BAL vs TEN", "time": "1:00 PM", "sal": "$8,400", "role": "66 carries, 6 TDs bellcow"},
        {"pos": "RB", "name": "Braelon Allen", "team": "NYJ @ CHI", "time": "1:00 PM", "sal": "$5,200", "role": "Breece Hall OUT, lead role"},
        {"pos": "WR", "name": "Parker Washington", "team": "JAX @ CIN", "time": "1:00 PM", "sal": "$6,500", "role": "30.2% Target Share leader"},
        {"pos": "WR", "name": "Tee Higgins", "team": "CIN vs JAX", "time": "1:00 PM", "sal": "$6,100", "role": "The Bring-Back (Air Yards)"},
        {"pos": "WR", "name": "Jordan Addison", "team": "MIN vs MIA", "time": "4:05 PM", "sal": "$5,300", "role": "WR1 with Jefferson OUT"},
        {"pos": "TE", "name": "Brenton Strange", "team": "JAX @ CIN", "time": "1:00 PM", "sal": "$3,200", "role": "QB-TE Correlation (+0.27)"},
        {"pos": "FLEX", "name": "Emanuel Wilson", "team": "SEA vs LAC", "time": "4:25 PM", "sal": "$4,700", "role": "LATE SWAP KEY • 3rd RB"},
        {"pos": "DST", "name": "Vikings DST", "team": "MIN vs MIA", "time": "4:05 PM", "sal": "$4,000", "role": "#1 Sack Rate, MIA imp 14"},
    ]

    start_x = 40
    start_y = 155
    col_width = 360
    row_height = 140
    padding = 15

    for idx, s in enumerate(slots):
        r = idx // 3
        c = idx % 3
        x = start_x + c * (col_width + padding)
        y = start_y + r * (row_height + padding)

        # Highlight FLEX in Electric Orange border for Late Swap
        is_flex = (s["pos"] == "FLEX")
        box_border = ACCENT_ORANGE if is_flex else (38, 54, 82)
        box_bg = (24, 34, 53) if is_flex else PANEL_BG

        # Card container
        draw.rounded_rectangle([(x, y), (x + col_width, y + row_height)], radius=8, fill=box_bg, outline=box_border, width=2 if is_flex else 1)

        # Pos Badge
        badge_color = ACCENT_ORANGE if is_flex else BORDER_CYAN
        draw.rounded_rectangle([(x + 12, y + 12), (x + 65, y + 36)], radius=4, fill=(15, 23, 42), outline=badge_color, width=1)
        draw.text((x + 20, y + 15), s["pos"], font=get_font(13, bold=True), fill=badge_color)

        # Salary & Kickoff
        draw.text((x + 75, y + 15), f"{s['team']} • {s['time']}", font=get_font(12, bold=False), fill=TEXT_MUTED)
        draw.text((x + col_width - 70, y + 14), s["sal"], font=get_font(16, bold=True), fill=ACCENT_GREEN)

        # Player Name
        draw.text((x + 14, y + 48), s["name"], font=get_font(20, bold=True), fill=TEXT_WHITE)

        # Role / Alpha detail
        draw.text((x + 14, y + 80), s["role"], font=get_font(12, bold=False), fill=TEXT_MUTED if not is_flex else ACCENT_ORANGE)

    # Bottom Banner (Late Swap Protocol)
    draw.rounded_rectangle([(40, 605), (WIDTH - 40, 655)], radius=6, fill=(19, 30, 49), outline=BORDER_CYAN, width=1)
    draw.text((60, 620), "⚡ LATE-SWAP PROTOCOL:", font=get_font(14, bold=True), fill=BORDER_CYAN)
    draw.text((250, 621), "FLEX is live until 4:25 PM ET. If leading at 4:00 PM, keep Wilson. If trailing, pivot to contrarian ceiling!", font=get_font(13, bold=False), fill=TEXT_WHITE)
    draw.text((1050, 620), "$700 REMAINING", font=get_font(13, bold=True), fill=ACCENT_GREEN)

    out_path = os.path.join(OUTPUT_DIR, "gse_week4_dfs_lineup_card.png")
    img.save(out_path, "PNG", quality=95)
    print(f"Created: {out_path}")
    return out_path

def create_law9_board_card():
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)

    # Subtle background accent lines
    for y in range(0, HEIGHT, 45):
        draw.line([(0, y), (WIDTH, y)], fill=(15, 23, 42), width=1)
    for x in range(0, WIDTH, 60):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 23, 42), width=1)

    # Top Brand Bar
    draw.rectangle([(0, 0), (WIDTH, 70)], fill=(13, 20, 36))
    draw.line([(0, 70), (WIDTH, 70)], fill=ACCENT_ORANGE, width=2)

    # Logo & Brand Header
    draw.text((40, 18), "GALAXY SPORTS EDGE", font=get_font(24, bold=True), fill=ACCENT_ORANGE)
    draw.text((360, 22), "•   MARKET MICROSTRUCTURE AUDIT   •   galaxysportsedge.com", font=get_font(16, bold=False), fill=TEXT_MUTED)
    draw.text((980, 20), "LAW 9 REPORT", font=get_font(18, bold=True), fill=BORDER_CYAN)

    # Main Card Title & Subtitle
    draw.text((40, 85), "NFL WEEK 4 SOVEREIGN AUDIT: ZERO-TRUST BETTING BOARD", font=get_font(25, bold=True), fill=TEXT_WHITE)
    draw.text((40, 120), "Levitt/Dmochowski Profit-Bias Identity  |  Romano CQR 5-Gate Sieve  |  100% Fail-Closed Discipline", font=get_font(15, bold=False), fill=BORDER_CYAN)

    # Left Column: Game Spreads & Totals (4 games)
    draw.text((40, 160), "STRAIGHT PLAYS & SPREADS", font=get_font(16, bold=True), fill=BORDER_CYAN)
    spreads = [
        ("DAL @ HOU", "HOU -3.0", "O/U 48.5", "Overround inside vig (4.3%). Key-3 balancing."),
        ("TEN @ BAL", "BAL -11.5", "O/U 42.5", "NWS 50% drizzle, NOT deluge. High spread variance."),
        ("JAX @ CIN", "CIN -2.5", "O/U 51.5", "Slate-high total is public magnet. Money splits split."),
        ("ARI @ NYG", "ARI -2.5", "O/U 44.5", "5-pt flip was Dart knee / McCarthy trade news."),
    ]

    for idx, (matchup, line, total, note) in enumerate(spreads):
        y = 195 + idx * 95
        draw.rounded_rectangle([(40, y), (560, y + 80)], radius=6, fill=PANEL_BG, outline=(38, 54, 82), width=1)
        draw.text((55, y + 12), matchup, font=get_font(17, bold=True), fill=TEXT_WHITE)
        draw.text((200, y + 14), f"{line}  |  {total}", font=get_font(14, bold=True), fill=BORDER_CYAN)
        draw.text((55, y + 42), note, font=get_font(12, bold=False), fill=TEXT_MUTED)

        # Stamp: ABSTAIN
        draw.rounded_rectangle([(450, y + 12), (545, y + 40)], radius=4, fill=(50, 15, 20), outline=ACCENT_ORANGE, width=1)
        draw.text((462, y + 17), "ABSTAIN", font=get_font(13, bold=True), fill=ACCENT_ORANGE)

    # Right Column: Player Props (4 marquee props)
    draw.text((620, 160), "PLAYER PROPS 5-GATE SIEVE", font=get_font(16, bold=True), fill=ACCENT_ORANGE)
    props = [
        ("Derrick Henry", "Rush Yds: 98.5", "CQR Width 46.2 > 40.0; LCB is -28.6 yds."),
        ("Drake Maye", "Pass Yds: 231.5", "Season mean 195.0 yds. 95% LCB is -68.5 yds."),
        ("Parker Washington", "Rec Yds: 73.5", "Mean is 73.7. Edge +0.2 yds. LCB is -23.6 yds."),
        ("Trey McBride", "Receptions: 6.5", "Juiced to -147 (59.5%). 3 games: Kelly f* = 0."),
    ]

    for idx, (player, line, note) in enumerate(props):
        y = 195 + idx * 95
        draw.rounded_rectangle([(620, y), (WIDTH - 40, y + 80)], radius=6, fill=PANEL_BG, outline=(38, 54, 82), width=1)
        draw.text((635, y + 12), player, font=get_font(17, bold=True), fill=TEXT_WHITE)
        draw.text((810, y + 14), line, font=get_font(14, bold=True), fill=ACCENT_ORANGE)
        draw.text((635, y + 42), note, font=get_font(12, bold=False), fill=TEXT_MUTED)

        # Stamp: ABSTAIN
        draw.rounded_rectangle([(1030, y + 12), (1125, y + 40)], radius=4, fill=(50, 15, 20), outline=ACCENT_ORANGE, width=1)
        draw.text((1042, y + 17), "ABSTAIN", font=get_font(13, bold=True), fill=ACCENT_ORANGE)

    # Bottom Banner (Law 9 Affirmation)
    draw.rounded_rectangle([(40, 595), (WIDTH - 40, 650)], radius=6, fill=(19, 30, 49), outline=ACCENT_ORANGE, width=1)
    draw.text((60, 613), "🛡️ LAW 9 ENFORCEMENT:", font=get_font(14, bold=True), fill=ACCENT_ORANGE)
    draw.text((260, 614), "Every pre-game edge is inside noise or parameter uncertainty. $0.00 risked on uncertified picks. Capital preserved.", font=get_font(13, bold=False), fill=TEXT_WHITE)

    out_path = os.path.join(OUTPUT_DIR, "gse_week4_law9_board_card.png")
    img.save(out_path, "PNG", quality=95)
    print(f"Created: {out_path}")
    return out_path

if __name__ == "__main__":
    create_lineup_card()
    create_law9_board_card()
