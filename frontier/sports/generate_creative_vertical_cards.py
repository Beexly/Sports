"""
generate_creative_vertical_cards.py
====================================
Generates stunning, ultra-creative 720x1280 (9:16 Vertical Video / Story / Reel format)
social graphics for Galaxy Sports Edge (galaxysportsedge.com).
Enforces STRICT 80% SAFE MARGINS:
- Top padding: 130px (avoids platform header / camera notch)
- Bottom padding: 190px (avoids TikTok/Reels caption / like button UI)
- Left/Right padding: 75px (10.4% each side -> exactly 570px safe content width)
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = r"C:\Users\Garrett\Downloads"
WIDTH = 720
HEIGHT = 1280

# Creative Color Scheme
C_BG = (5, 8, 17)             # Deep Obsidian
C_NEBULA = (18, 12, 38)       # Deep Cosmic Violet
C_PANEL = (15, 23, 42, 220)   # Translucent Glass Navy
C_CYAN = (0, 240, 255)        # Electric Orbital Cyan
C_ORANGE = (255, 85, 0)       # Solar Flare Orange
C_GREEN = (0, 255, 136)       # Alpha Matrix Emerald
C_PURPLE = (147, 51, 234)     # Cyber Purple
C_WHITE = (255, 255, 255)
C_MUTED = (148, 163, 184)
C_DARK_SLATE = (30, 41, 59)

def get_font(size: int, bold: bool = False):
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except:
        return ImageFont.load_default()

def draw_glowing_rect(draw, bbox, radius, fill_color, outline_color, glow_color, width=2):
    x0, y0, x1, y1 = bbox
    # Outer subtle glow box
    draw.rounded_rectangle([x0 - 2, y0 - 2, x1 + 2, y1 + 2], radius=radius + 2, outline=(outline_color[0]//3, outline_color[1]//3, outline_color[2]//3), width=1)
    draw.rounded_rectangle(bbox, radius=radius, fill=fill_color, outline=outline_color, width=width)

def create_vertical_dfs_reel_card():
    # 720x1280 RGBA canvas
    img = Image.new("RGBA", (WIDTH, HEIGHT), (5, 8, 17, 255))
    draw = ImageDraw.Draw(img)

    # 1. Background Grid & Cosmic Glows
    for y in range(0, HEIGHT, 40):
        draw.line([(0, y), (WIDTH, y)], fill=(15, 23, 42, 100), width=1)
    for x in range(0, WIDTH, 40):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 23, 42, 100), width=1)

    # Ambient Glow Circles (top cyan, bottom purple)
    glow_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_overlay)
    glow_draw.ellipse([WIDTH // 2 - 250, 60, WIDTH // 2 + 250, 360], fill=(0, 240, 255, 25))
    glow_draw.ellipse([WIDTH // 2 - 200, 700, WIDTH // 2 + 200, 1100], fill=(255, 85, 0, 20))
    img = Image.alpha_composite(img, glow_overlay)
    draw = ImageDraw.Draw(img)

    SAFE_LEFT = 75
    SAFE_RIGHT = WIDTH - 75
    SAFE_WIDTH = SAFE_RIGHT - SAFE_LEFT # 570px

    # TOP PLATFORM BUFFER: 0 to 125px is protected!
    # Brand Pill
    pill_y = 125
    draw.rounded_rectangle([SAFE_LEFT, pill_y, SAFE_RIGHT, pill_y + 40], radius=20, fill=(13, 20, 36, 230), outline=C_CYAN, width=1)
    draw.text((SAFE_LEFT + 25, pill_y + 10), "GALAXY SPORTS EDGE", font=get_font(15, bold=True), fill=C_CYAN)
    draw.text((SAFE_RIGHT - 180, pill_y + 11), "WE DETECT. YOU DECIDE.", font=get_font(12, bold=False), fill=C_WHITE)

    # Main Explosive Headline (Inside Safe Margins)
    head_y = 180
    draw.text((SAFE_LEFT, head_y), "NFL WEEK 4", font=get_font(22, bold=True), fill=C_ORANGE)
    draw.text((SAFE_LEFT, head_y + 30), "DRAFTKINGS OPTIMAL", font=get_font(30, bold=True), fill=C_WHITE)
    draw.text((SAFE_LEFT, head_y + 70), "3-1 SHOOTOUT HAMMER", font=get_font(24, bold=True), fill=C_CYAN)

    # Sub-badge with salary
    badge_y = head_y + 110
    draw.rounded_rectangle([SAFE_LEFT, badge_y, SAFE_LEFT + 260, badge_y + 32], radius=6, fill=(24, 34, 53), outline=(0, 240, 255), width=1)
    draw.text((SAFE_LEFT + 12, badge_y + 7), "CAP: $49,300 / $50,000", font=get_font(13, bold=True), fill=C_GREEN)

    draw.rounded_rectangle([SAFE_LEFT + 275, badge_y, SAFE_RIGHT, badge_y + 32], radius=6, fill=(45, 20, 25), outline=C_ORANGE, width=1)
    draw.text((SAFE_LEFT + 290, badge_y + 7), "4:25 PM LATE-SWAP READY", font=get_font(12, bold=True), fill=C_ORANGE)

    # 9-Player Compact Roster Stream (65px height each)
    roster_start_y = 345
    roster_gap = 68

    players = [
        {"pos": "QB", "name": "Trevor Lawrence", "meta": "$5,900 • JAX @ CIN • 51.5 O/U", "tag": "51.5 Shootout", "color": C_CYAN},
        {"pos": "RB", "name": "Derrick Henry", "meta": "$8,400 • BAL vs TEN • 6 TDs", "tag": "Bellcow Floor", "color": C_GREEN},
        {"pos": "RB", "name": "Braelon Allen", "meta": "$5,200 • NYJ @ CHI • Lead Role", "tag": "Free Square", "color": C_GREEN},
        {"pos": "WR", "name": "Parker Washington", "meta": "$6,500 • JAX @ CIN • 30% Share", "tag": "Slot Alpha", "color": C_CYAN},
        {"pos": "WR", "name": "Tee Higgins", "meta": "$6,100 • CIN vs JAX • Bring-Back", "tag": "Air Yards", "color": C_CYAN},
        {"pos": "WR", "name": "Jordan Addison", "meta": "$5,300 • MIN vs MIA • WR1 Role", "tag": "Jefferson Out", "color": C_WHITE},
        {"pos": "TE", "name": "Brenton Strange", "meta": "$3,200 • JAX @ CIN • +0.27 Corr", "tag": "CIN Bleeds TE", "color": C_CYAN},
        {"pos": "FLX", "name": "Emanuel Wilson", "meta": "$4,700 • SEA vs LAC • 4:25 PM", "tag": "LATE SWAP KEY", "color": C_ORANGE},
        {"pos": "DST", "name": "Vikings DST", "meta": "$4,000 • MIN vs MIA • 4:05 PM", "tag": "#1 Sack Rate", "color": C_WHITE},
    ]

    for i, p in enumerate(players):
        y = roster_start_y + i * roster_gap
        is_flex = (p["pos"] == "FLX")
        box_bg = (38, 20, 30, 240) if is_flex else (15, 23, 42, 230)
        box_border = C_ORANGE if is_flex else (38, 54, 82)

        # Draw card container
        draw.rounded_rectangle([SAFE_LEFT, y, SAFE_RIGHT, y + 60], radius=8, fill=box_bg, outline=box_border, width=2 if is_flex else 1)

        # Pos Pill
        draw.rounded_rectangle([SAFE_LEFT + 10, y + 10, SAFE_LEFT + 55, y + 50], radius=5, fill=(10, 14, 23), outline=p["color"], width=1)
        draw.text((SAFE_LEFT + 16, y + 21), p["pos"], font=get_font(13, bold=True), fill=p["color"])

        # Name & Meta
        draw.text((SAFE_LEFT + 68, y + 10), p["name"], font=get_font(17, bold=True), fill=C_WHITE)
        draw.text((SAFE_LEFT + 68, y + 34), p["meta"], font=get_font(12, bold=False), fill=C_MUTED if not is_flex else C_ORANGE)

        # Right Tag
        tag_bg = (50, 15, 20) if is_flex else (20, 30, 50)
        draw.rounded_rectangle([SAFE_RIGHT - 125, y + 16, SAFE_RIGHT - 12, y + 44], radius=4, fill=tag_bg, outline=p["color"], width=1)
        draw.text((SAFE_RIGHT - 118, y + 23), p["tag"], font=get_font(10, bold=True), fill=p["color"])

    # Bottom Callout Box (inside safe margin)
    bot_y = roster_start_y + 9 * roster_gap + 12
    draw.rounded_rectangle([SAFE_LEFT, bot_y, SAFE_RIGHT, bot_y + 80], radius=10, fill=(10, 25, 45, 240), outline=C_CYAN, width=1)
    draw.text((SAFE_LEFT + 18, bot_y + 14), "⚡ LATE-SWAP PROTOCOL ACTIVE", font=get_font(14, bold=True), fill=C_CYAN)
    draw.text((SAFE_LEFT + 18, bot_y + 36), "FLEX is live until 4:25 PM ET. If leading, hold Wilson.\nIf trailing, pivot to high-ceiling tournament leverage!", font=get_font(11, bold=False), fill=C_WHITE)

    # Domain Branding at the bottom of safe zone
    draw.text((SAFE_LEFT + 130, bot_y + 92), "galaxysportsedge.com", font=get_font(14, bold=True), fill=C_CYAN)

    out_path = os.path.join(OUTPUT_DIR, "gse_week4_vertical_dfs_reel.png")
    img.convert("RGB").save(out_path, "PNG", quality=95)
    print(f"Created vertical card: {out_path}")
    return out_path

def create_vertical_law9_reel_card():
    img = Image.new("RGBA", (WIDTH, HEIGHT), (5, 8, 17, 255))
    draw = ImageDraw.Draw(img)

    for y in range(0, HEIGHT, 40):
        draw.line([(0, y), (WIDTH, y)], fill=(15, 23, 42, 100), width=1)
    for x in range(0, WIDTH, 40):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 23, 42, 100), width=1)

    glow_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_overlay)
    glow_draw.ellipse([WIDTH // 2 - 250, 100, WIDTH // 2 + 250, 400], fill=(255, 85, 0, 25))
    glow_draw.ellipse([WIDTH // 2 - 200, 650, WIDTH // 2 + 200, 1050], fill=(0, 240, 255, 20))
    img = Image.alpha_composite(img, glow_overlay)
    draw = ImageDraw.Draw(img)

    SAFE_LEFT = 75
    SAFE_RIGHT = WIDTH - 75

    pill_y = 125
    draw.rounded_rectangle([SAFE_LEFT, pill_y, SAFE_RIGHT, pill_y + 40], radius=20, fill=(13, 20, 36, 230), outline=C_ORANGE, width=1)
    draw.text((SAFE_LEFT + 25, pill_y + 10), "GALAXY SPORTS EDGE", font=get_font(15, bold=True), fill=C_ORANGE)
    draw.text((SAFE_RIGHT - 180, pill_y + 11), "WE DETECT. YOU DECIDE.", font=get_font(12, bold=False), fill=C_WHITE)

    head_y = 180
    draw.text((SAFE_LEFT, head_y), "MARKET MICROSTRUCTURE", font=get_font(20, bold=True), fill=C_CYAN)
    draw.text((SAFE_LEFT, head_y + 28), "LAW 9 AUDIT REPORT", font=get_font(30, bold=True), fill=C_WHITE)
    draw.text((SAFE_LEFT, head_y + 68), "ZERO-TRUST BETTING BOARD", font=get_font(22, bold=True), fill=C_ORANGE)

    banner_y = head_y + 105
    draw.rounded_rectangle([SAFE_LEFT, banner_y, SAFE_RIGHT, banner_y + 45], radius=6, fill=(35, 15, 20), outline=C_ORANGE, width=1)
    draw.text((SAFE_LEFT + 20, banner_y + 12), "🛡️ UNANIMOUS PRE-GAME FAIL-CLOSED ABSTAIN", font=get_font(13, bold=True), fill=C_ORANGE)

    cards = [
        {"title": "DAL @ HOU (48.5 O/U)", "note": "Overround inside 4.3% vig. Key-3 balancing.", "badge": "ABSTAIN"},
        {"title": "TEN @ BAL (-11.5 SPREAD)", "note": "NWS 50% drizzle, NOT deluge. High variance.", "badge": "ABSTAIN"},
        {"title": "JAX @ CIN (51.5 TOTAL)", "note": "Public magnet. Money/ticket splits unverified.", "badge": "ABSTAIN"},
        {"title": "DERRICK HENRY (98.5 RUSH)", "note": "CQR Width 46.2 > 40 Cap. 95% LCB is -28.6.", "badge": "ABSTAIN"},
        {"title": "DRAKE MAYE (231.5 PASS)", "note": "Season mean 195.0 yds. 95% LCB is -68.5 yds.", "badge": "ABSTAIN"},
        {"title": "PARKER WASHINGTON (73.5 REC)", "note": "Mean is 73.7. Edge +0.2 yds. LCB is -23.6 yds.", "badge": "ABSTAIN"},
        {"title": "TREY McBRIDE (6.5 REC)", "note": "Juiced to -147 (59.5%). Kelly f* = 0.", "badge": "ABSTAIN"},
    ]

    card_start_y = 350
    card_gap = 78

    for i, c in enumerate(cards):
        y = card_start_y + i * card_gap
        draw.rounded_rectangle([SAFE_LEFT, y, SAFE_RIGHT, y + 68], radius=8, fill=(15, 23, 42, 230), outline=(38, 54, 82), width=1)
        draw.text((SAFE_LEFT + 15, y + 12), c["title"], font=get_font(15, bold=True), fill=C_WHITE)
        draw.text((SAFE_LEFT + 15, y + 38), c["note"], font=get_font(11, bold=False), fill=C_MUTED)

        draw.rounded_rectangle([SAFE_RIGHT - 110, y + 18, SAFE_RIGHT - 15, y + 50], radius=4, fill=(50, 15, 20), outline=C_ORANGE, width=1)
        draw.text((SAFE_RIGHT - 98, y + 26), c["badge"], font=get_font(12, bold=True), fill=C_ORANGE)

    bot_y = card_start_y + 7 * card_gap + 15
    draw.rounded_rectangle([SAFE_LEFT, bot_y, SAFE_RIGHT, bot_y + 75], radius=10, fill=(10, 20, 35, 240), outline=C_ORANGE, width=1)
    draw.text((SAFE_LEFT + 18, bot_y + 14), "CAPITAL PRESERVATION IS VICTORY", font=get_font(13, bold=True), fill=C_ORANGE)
    draw.text((SAFE_LEFT + 18, bot_y + 36), "Zero picks forced. $0.00 risked on uncertified tout claims.\nLive second-half jump-diffusion engine on standby.", font=get_font(11, bold=False), fill=C_WHITE)

    draw.text((SAFE_LEFT + 130, bot_y + 88), "galaxysportsedge.com", font=get_font(14, bold=True), fill=C_CYAN)

    out_path = os.path.join(OUTPUT_DIR, "gse_week4_vertical_law9_reel.png")
    img.convert("RGB").save(out_path, "PNG", quality=95)
    print(f"Created vertical Law 9 card: {out_path}")
    return out_path

if __name__ == "__main__":
    create_vertical_dfs_reel_card()
    create_vertical_law9_reel_card()
