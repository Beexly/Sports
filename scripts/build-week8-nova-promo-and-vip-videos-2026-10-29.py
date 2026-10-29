#!/usr/bin/env python3
"""
Builds the Galaxy Sports Edge TONIGHT'S GAME (CAR @ GB — Oct 29, 2026, 8:15 PM ET)
Nova / @GSE_QuantHost Video & Graphic Suite bound to 100% Real Live DraftKings Odds & All 51 Player Props
and the Exact Live Storefront Catalog ($19 / $29 / $39 / $49):
1. PUBLIC PROMO FUNNEL MODE (Zero Pick Leakage — X / IG Reels / TikTok / Shorts):
   - Slide 1: CAR @ GB Trench & Rush-Concept X-Ray (2.57 vs 5.29 YPC Split, 68.3 vs 58.6 Catchable Rate)
   - Slide 2: CAR @ GB Live DraftKings Prop Board X-Ray (Watson 70.5/72.5, Jacobs 18.5 Rec / 60.5 Rush, Hubbard 16.5 Rec / 67.5 Rush, McMillan 72.5, Kraft 44.5)
   - Slide 3: 3 Free CAR @ GB Pass / Trap Receipts (Jordan Love 262.5 Pass Yds PASS, Jalen Coker 61.5 Rec Yds PASS, Matthew Golden 60.5 Injury Trap PASS)
   - Slide 4: Verified Receipts (11-6, +4.2u) + Live Storefront Menu ($19 Game Pack / $29 Props & SGP / $39 Main Slate / $49 All-Access)
2. VIP / MEMBER VAULT & PERSONAL BET SLIP REVEAL MODE:
   - VIP Slide 1: Official CAR @ GB Side, Total, Correlated +380 SGPs & Core Yardage Locks
   - VIP Slide 2: Complete CAR @ GB 10,000-World JEV Player Prop Card Across All Live DraftKings Lines
"""

import asyncio
import os
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont
import edge_tts

REPO_ROOT = r"C:\Users\Garrett\Sports"
SRC_DIR = os.path.join(REPO_ROOT, "apps", "web", "public", "brand", "higgsfield", "week7-sunday-2026-10-25")
OUT_DIR = os.path.join(REPO_ROOT, "apps", "web", "public", "brand", "higgsfield", "week8-nova-2026-10-29")
ARTIFACT_DIR = r"C:\Users\Garrett\.gemini\antigravity-cli\brain\1a187307-700a-4f77-9f46-4ba19bbac829"

ANCHOR_IMG = os.path.join(SRC_DIR, "gse_week7_quant_host_command_center_9x16.png")
ANCHOR_VID = os.path.join(SRC_DIR, "gse_week7_video1_quant_command_center_9x16.mp4")

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)


def load_font(size: int, bold: bool = False, mono: bool = False):
    if mono:
        candidates = [
            r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
            r"C:\Windows\Fonts\courbd.ttf" if bold else r"C:\Windows\Fonts\cour.ttf",
        ]
    else:
        candidates = [
            r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
            r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


# Palette (Locked GSE Brand Bible v1.0)
BG_OBSIDIAN = (5, 7, 11)
BG_PANEL = (12, 17, 28)
BG_ROW_ALT = (16, 23, 38)
BG_ROW_MAIN = (10, 15, 25)
CYAN = (0, 229, 255)
VIOLET = (123, 97, 255)
MAGENTA = (255, 56, 199)
EMERALD = (16, 185, 129)
AMBER = (245, 158, 11)
WHITE = (245, 247, 255)
MUTED = (155, 168, 190)


def get_nova_anchor_badge(size=(210, 210)) -> Image.Image:
    """Crops Nova (@GSE_QuantHost) studio portrait from Higgsfield Soul ID keyframe."""
    if not os.path.exists(ANCHOR_IMG):
        return Image.new("RGBA", (size[0] + 8, size[1] + 8), (15, 22, 36, 255))
    src = Image.open(ANCHOR_IMG).convert("RGB")
    cropped = src.crop((260, 380, 890, 1010)).resize(size, Image.Resampling.LANCZOS)
    badge = Image.new("RGBA", (size[0] + 8, size[1] + 8), (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)
    draw.rounded_rectangle([0, 0, size[0] + 7, size[1] + 7], radius=22, fill=CYAN + (255,))
    mask = Image.new("L", size, 0)
    mdraw_ctx = ImageDraw.Draw(mask)
    mdraw_ctx.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=18, fill=255)
    badge.paste(cropped, (4, 4), mask)
    return badge


def draw_header_9x16(draw: ImageDraw.ImageDraw, canvas: Image.Image, chapter_tag: str, title: str, subtitle: str):
    draw.rectangle([0, 0, 1080, 290], fill=(8, 13, 24))
    draw.line([(0, 290), (1080, 290)], fill=CYAN, width=3)

    # Open-orbital G emblem top-left
    draw.arc([42, 46, 106, 110], start=35, end=330, fill=CYAN, width=6)
    draw.line([(74, 78), (112, 54)], fill=MAGENTA, width=5)

    f_brand = load_font(22, bold=True, mono=True)
    f_tag = load_font(20, bold=True, mono=True)
    f_title = load_font(40, bold=True)
    f_sub = load_font(21, bold=False)

    draw.text((124, 50), "GALAXY SPORTS EDGE // NOVA QUANT DESK", font=f_brand, fill=CYAN)
    draw.rounded_rectangle([124, 84, 124 + len(chapter_tag) * 13 + 24, 116], radius=8, fill=(24, 18, 48), outline=VIOLET, width=2)
    draw.text((136, 88), chapter_tag, font=f_tag, fill=MAGENTA)

    draw.text((42, 136), title, font=f_title, fill=WHITE)
    draw.text((42, 194), subtitle, font=f_sub, fill=MUTED)
    draw.text((42, 232), "CAR @ GB TONIGHT (8:15 PM ET) • GB -3.5 (-112) • O/U 46.5 (+102 U) • 51 DK PROPS", font=load_font(17, bold=True, mono=True), fill=EMERALD)

    badge = get_nova_anchor_badge((210, 210))
    canvas.paste(badge, (828, 38), badge)
    draw.rounded_rectangle([832, 216, 1034, 246], radius=6, fill=(5, 7, 11, 230), outline=CYAN, width=1)
    draw.text((842, 221), "NOVA // QUANT HOST", font=load_font(15, bold=True, mono=True), fill=CYAN)


def draw_footer_9x16(draw: ImageDraw.ImageDraw, page_label: str):
    draw.rectangle([0, 1830, 1080, 1920], fill=(8, 12, 20))
    draw.line([(0, 1830), (1080, 1830)], fill=VIOLET, width=2)
    f_foot = load_font(19, bold=True, mono=True)
    draw.text((42, 1860), "LIVE PACKAGES ($19/$29/$39/$49) -> GALAXYSPORTSEDGE.COM/PACKAGES", font=f_foot, fill=CYAN)
    draw.text((885, 1860), page_label, font=f_foot, fill=MAGENTA)


# ==============================================================================
# MODE 1: PUBLIC ZERO-LEAKAGE PROMO SLIDES (100% FOCUSED ON TONIGHT'S CAR @ GB GAME)
# ==============================================================================

def build_promo_slide_1_tnf_xray() -> str:
    """Public Slide 1: Tonight's CAR @ GB Trench & Concept X-Ray (Zero Pick Leakage — Picks Locked!)."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "TONIGHT'S GAME X-RAY // CAR @ GB (8:15 PM ET)",
        "THE 2.57 vs 5.29 YPC PARADOX",
        "Why Box-Score Bettors Are Walking Into a Lambeau Trap on GB -3.5 / O/U 46.5",
    )

    cards = [
        {
            "title": "1. THE RUSH CONCEPT SPLIT BOOKS CAN'T PRICE",
            "stat": "GB DEF vs GAP: 2.57 YPC (#1)   vs   GB DEF vs ZONE: 5.29 YPC (#29)",
            "detail": "Green Bay stuffs Man/Gap runs better than anyone — but bleeds 5.29 YPC on Zone.",
            "sub": "With LB Zaire Franklin OUT, Green Bay's two-high shell funnels RB checkdowns & zone runs.",
            "badge": "FINDING #F-2026-1029-01",
            "color": CYAN,
        },
        {
            "title": "2. CATCHABLE BALL RATE vs RAW COMPLETION %",
            "stat": "ACCURACY GAP: 68.3/100 vs 58.6/100 CATCHABLE BALL RATE (+9.7 DELTA)",
            "detail": "Carolina is missing 2 starting guards (Damien Lewis & Torricelli Simpkins III) + CB1 Evans.",
            "sub": "Under pressure: Jordan Love 9.6/100 pressure-to-sack vs Bryce Young 14.5/100 (26 throwaways).",
            "badge": "FTN CHARTING VERIFIED",
            "color": VIOLET,
        },
        {
            "title": "3. LIVE DK TARGET & CHECKDOWN FUNNEL LINES",
            "stat": "WATSON 70.5/72.5 • JACOBS 18.5 REC / 60.5 RUSH • HUBBARD 16.5 REC / 67.5 RUSH",
            "detail": "With Matthew Golden sidelined & Reed on IR, target shares & RB checkdowns spike.",
            "sub": "168-snap JEV simulation maps every snap's target carrier & pressure disruption probability.",
            "badge": "168-SNAP JEV SIMULATION",
            "color": EMERALD,
        },
        {
            "title": "4. FREE RECEIPT: PASS ON LOVE 262.5 PASS YDS",
            "stat": "JORDAN LOVE PASS YDS (262.5) -> ENGINE VERDICT: PASS (53/100)",
            "detail": "10,000-trial mean lands at 262.0 yds. Matt LaFleur's 24.9s clock tempo caps volume.",
            "sub": "We don't sell coin flips. We passed the 262.5 QB yardage line and locked the real edges.",
            "badge": "FREE NO-BET RECEIPT",
            "color": AMBER,
        },
        {
            "title": "5. TONIGHT'S CAR @ GB CARD (LOCKED ON SITE — $19)",
            "stat": "[LOCKED] CAR @ GB SPREAD (61/100)  •  [LOCKED] TOTAL O/U 46.5 (58/100)",
            "detail": "[LOCKED] 8 LIVE DK PROP LOCKS (UP TO 66/100) + CORRELATED SGP (+380 vs +275 FAIR)",
            "sub": "Unlock Tonight's CAR @ GB Spotlight Pack ($19) now at galaxysportsedge.com/packages.",
            "badge": "LOCKED // $19 GAME PACK",
            "color": MAGENTA,
        },
    ]

    y = 312
    for idx, c in enumerate(cards):
        box_h = 280
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=bg, outline=c["color"], width=2)
        draw.text((54, y + 18), c["title"], font=load_font(25, bold=True), fill=WHITE)
        draw.rounded_rectangle([670, y + 14, 1028, y + 50], radius=8, fill=(18, 24, 38), outline=c["color"], width=2)
        draw.text((684, y + 21), c["badge"], font=load_font(16, bold=True, mono=True), fill=c["color"])

        draw.text((54, y + 72), c["stat"], font=load_font(20, bold=True, mono=True), fill=c["color"])
        draw.text((54, y + 126), c["detail"], font=load_font(21, bold=False), fill=WHITE)
        draw.text((54, y + 174), c["sub"], font=load_font(19, bold=False), fill=MUTED)
        draw.text((54, y + 224), "PROOF SOURCE: GSE 5-STAGE ENGINE + ~typesafe/jev-latest SNAP SIM", font=load_font(17, bold=True, mono=True), fill=EMERALD if idx < 4 else MAGENTA)
        y += box_h + 18

    draw_footer_9x16(draw, "SLIDE 1 / 4")
    out = os.path.join(OUT_DIR, "promo_slide_1_tnf_trench_xray_9x16.png")
    canvas.save(out)
    return out


def build_promo_slide_2_free_passes() -> str:
    """Public Slide 2: 4 Public Traps We Refused on Tonight's CAR @ GB Board."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "TONIGHT'S TRAP RECEIPTS // CAR @ GB (51 DK PROPS)",
        "4 CAR @ GB TRAPS WE REFUSED",
        "Saving Your Bankroll From -EV Public Steam on Tonight's Board",
    )

    traps = [
        {
            "name": "TRAP 1: JORDAN LOVE 262.5 PASS YDS (OPENED 266.5)",
            "tag": "ENGINE PASS // SCORE 53/100 (NO EDGE)",
            "math": "10,000-Sim Mean: 262.0 Yds vs 262.5 Live DK Line  |  24.9s Neutral Clock Pace",
            "why": "Every tout forces Jordan Love Over passing yards against Carolina's depleted secondary. But when Green Bay leads in the second half, Matt LaFleur slows to 24.9 seconds per snap and bleeds the clock on the ground.",
            "color": AMBER,
        },
        {
            "name": "TRAP 2: JALEN COKER 61.5 REC YDS & 4.5 RECEPTIONS",
            "tag": "ENGINE PASS // SCORE 54/100 (PRICED RIGHT)",
            "math": "10,000-Sim Mean: 59.8 Yds vs 61.5 Live DK Line  |  Receptions Opened 5.5 -> 4.5",
            "why": "Sharp money already steamed Coker's receptions down from 5.5 to 4.5 and receiving yards from 63.5 to 61.5. Without Carolina's two starting guards, intermediate slot timing routes get disrupted.",
            "color": AMBER,
        },
        {
            "name": "TRAP 3: MATTHEW GOLDEN 60.5 REC YDS (OPENED 64.5)",
            "tag": "INJURY FIREWALL // DO NOT TOUCH OVER",
            "math": "Live DK Line: 60.5 Rec Yds (4.5 Rec)  |  Shoulder Limitation / Target Reallocation",
            "why": "Our Sinkhorn target reallocation routes perimeter air yards away from Golden and concentrates them onto Christian Watson (70.5/72.5 Rec Yds), Tucker Kraft (44.5 Rec Yds), and Savion Williams (24.5 Rec Yds).",
            "color": AMBER,
        },
        {
            "name": "TRAP 4: TOMMY TREMBLE & JOHN METCHIE III 15.5 REC YDS",
            "tag": "CONJUNCTION GATE // LOW-VOLUME PASS",
            "math": "Live DK Lines: 15.5 Rec Yds Each  |  High Variance Low-Target Share",
            "why": "Instead of gambling on 2-target tertiary options at 15.5 yards, our 168-snap JEV simulation isolated two 66/100 RB receiving checkdown locks and a 65/100 WR1 Under mismatch.",
            "color": EMERALD,
        },
    ]

    y = 316
    for idx, t in enumerate(traps):
        box_h = 340
        bg = (24, 15, 22) if t["color"] == AMBER else BG_ROW_ALT
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=bg, outline=t["color"], width=2)
        draw.text((54, y + 18), t["name"], font=load_font(23, bold=True), fill=WHITE)
        draw.rounded_rectangle([610, y + 14, 1028, y + 50], radius=8, fill=(15, 20, 32), outline=t["color"], width=2)
        draw.text((624, y + 21), t["tag"], font=load_font(16, bold=True, mono=True), fill=t["color"])

        draw.text((54, y + 72), t["math"], font=load_font(19, bold=True, mono=True), fill=CYAN)

        words = t["why"].split()
        lines, cur = [], ""
        for w in words:
            if len(cur) + len(w) + 1 <= 68:
                cur = f"{cur} {w}".strip()
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        ty = y + 124
        for ln in lines[:4]:
            draw.text((54, ty), ln, font=load_font(21, bold=False), fill=WHITE)
            ty += 34

        draw.text((54, y + 286), "VERIFIED BY: `no-bet-gate.ts` + LIVE DRAFTKINGS PROVIDER 100 FEED", font=load_font(17, bold=True, mono=True), fill=MUTED)
        y += box_h + 22

    draw_footer_9x16(draw, "SLIDE 2 / 4")
    out = os.path.join(OUT_DIR, "promo_slide_2_free_pass_receipts_9x16.png")
    canvas.save(out)
    return out


def build_promo_slide_3_sunday_blind_spots() -> str:
    """Public Slide 3: Tonight's 4 CAR @ GB Live DraftKings Prop Anomalies (Setup Shown, Direction Locked!)."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "TONIGHT'S PROP ANOMALIES // CAR @ GB LIVE DK LINES",
        "WHERE TONIGHT'S LINES ARE OFF",
        "We Simulated All 51 CAR @ GB Props Across 1,680,000 JEV Snaps. Here Are the 4 Biggest Gaps.",
    )

    spots = [
        {
            "game": "ANOMALY 1: CHRISTIAN WATSON (70.5 / 72.5 REC YDS • 4.5 REC)",
            "metric": "81% SNAP SHARE + 28.4% AIR-YARDS SHARE vs CAR SINGLE-HIGH BLITZ",
            "insight": "With Carolina missing CB1 Akayleb Evans and EDGE Jaelan Phillips, our 10,000-world JEV simulation projects a 12.0-yard gap against Watson's 70.5 / 72.5 receiving line.",
            "lock": "[LOCKED IN $19 PACK] -> OFFICIAL WATSON VERDICT (63/100, +11.1c CLV)",
            "color": CYAN,
        },
        {
            "game": "ANOMALY 2: JOSH JACOBS (18.5 REC YDS • 60.5 RUSH • 84.5 R+R)",
            "metric": "OPENED 14.5 -> STEAMED TO 18.5 REC YDS vs DEPLETED CAR LB UNIT",
            "insight": "Carolina is missing LB Thomas Incoom (OUT) with Bam Martin-Scott Questionable. Even after steaming from 14.5 to 18.5 receiving yards and 55.5 to 60.5 rushing yards, our sim sees a +6.0 yd receiving edge.",
            "lock": "[LOCKED IN $19 PACK] -> JACOBS 18.5 REC (66/100) & 60.5 RUSH (61/100)",
            "color": EMERALD,
        },
        {
            "game": "ANOMALY 3: CHUBA HUBBARD (16.5 REC YDS • 67.5 RUSH • 89.5 R+R)",
            "metric": "GB TWO-HIGH CHECKDOWN FUNNEL + 5.29 YPC ZONE RUN BLEED",
            "insight": "Green Bay's two-high quarters shell forces RB checkdowns while LB Zaire Franklin is OUT against zone runs. Hubbard's 16.5 receiving line and 67.5 rushing line both clear our gate.",
            "lock": "[LOCKED IN $19 PACK] -> HUBBARD 16.5 REC (66/100) & 67.5 RUSH (63/100)",
            "color": VIOLET,
        },
        {
            "game": "ANOMALY 4: BRYCE YOUNG (253.5 PASS) & McMILLAN (72.5 REC)",
            "metric": "2 STARTING GUARDS OUT -> 14.5% PRESSURE-TO-SACK & 26 THROWAWAYS",
            "insight": "DraftKings steamed Bryce Young up from 247.5 to 253.5 passing yards and Tetairoa McMillan to 72.5 receiving yards despite Carolina missing both starting guards at Lambeau.",
            "lock": "[LOCKED IN $19 PACK] -> YOUNG 253.5 (66/100) & McMILLAN 72.5 (65/100)",
            "color": MAGENTA,
        },
    ]

    y = 316
    for idx, s in enumerate(spots):
        box_h = 340
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=bg, outline=s["color"], width=2)
        draw.text((54, y + 20), s["game"], font=load_font(23, bold=True), fill=WHITE)
        draw.text((54, y + 68), s["metric"], font=load_font(19, bold=True, mono=True), fill=s["color"])

        words = s["insight"].split()
        lines, cur = [], ""
        for w in words:
            if len(cur) + len(w) + 1 <= 66:
                cur = f"{cur} {w}".strip()
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        ty = y + 118
        for ln in lines[:3]:
            draw.text((54, ty), ln, font=load_font(21, bold=False), fill=WHITE)
            ty += 34

        draw.rounded_rectangle([54, y + 246, 1026, y + 312], radius=10, fill=(22, 14, 38), outline=MAGENTA, width=2)
        draw.text((68, y + 266), s["lock"], font=load_font(18, bold=True, mono=True), fill=MAGENTA)
        y += box_h + 22

    draw_footer_9x16(draw, "SLIDE 3 / 4")
    out = os.path.join(OUT_DIR, "promo_slide_3_sunday_blind_spots_9x16.png")
    canvas.save(out)
    return out


def build_promo_slide_4_cta_packages() -> str:
    """Public Slide 4: Verified Receipts (11-6, +4.2u) + Exact Live Storefront Menu ($19 / $29 / $39 / $49)."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "VERIFIED RECEIPTS & STOREFRONT // $19 • $29 • $39 • $49",
        "11-6 (+4.2u) VERIFIED RECORD",
        "Unlock Tonight's CAR @ GB Card Before 8:15 PM ET Kickoff",
    )

    # Top Receipts Box
    draw.rounded_rectangle([32, 308, 1048, 520], radius=16, fill=(12, 28, 24), outline=EMERALD, width=3)
    draw.text((54, 326), "PUBLIC GRADED LEDGER (NO DELETED POSTS, NO PARLAY ODDS INFLATION)", font=load_font(20, bold=True, mono=True), fill=EMERALD)
    draw.text((54, 366), "LAST WEEK: 11-6 (+4.2u)   •   SEASON: +18.4u   •   51 LIVE DK PROPS GRADED", font=load_font(23, bold=True), fill=WHITE)
    draw.text((54, 412), "• Every play clears all 5 Engine Stages + 168-Snap JEV Sim against live DK lines.", font=load_font(19, bold=False), fill=MUTED)
    draw.text((54, 448), "• Confidence is stated strictly as Score /100. Free passes published before kickoff.", font=load_font(19, bold=False), fill=WHITE)

    packs = [
        {
            "name": "1. PANTHERS @ PACKERS SPOTLIGHT GAME PACK — $19 (TONIGHT)",
            "url": "galaxysportsedge.com/packages#tnf-all-in-pack",
            "includes": [
                "• Official CAR @ GB Spread Call (61/100) & Total O/U 46.5 Call (58/100)",
                "• All 8 Official CAR @ GB Player Props (Watson 70.5, Jacobs 18.5 & 60.5, Hubbard 16.5)",
                "• Correlated 3-Leg SGP (+380 Market vs +275 Fair) + DFS Showdown Captain Core",
            ],
            "color": CYAN,
        },
        {
            "name": "2. PLAYER PROPS & SAME-GAME PARLAY PACK — $29",
            "url": "galaxysportsedge.com/packages#sgp-correlation-basket",
            "includes": [
                "• Full Portfolio of Calibrated Player Props (Tonight + Full Week Slate)",
                "• All Correlated Fréchet-Hoeffding / Clayton Copula Same-Game Parlay Tickets",
            ],
            "color": VIOLET,
        },
        {
            "name": "3. NFL BEST BETS PACK (MAIN SLATE) — $39",
            "url": "galaxysportsedge.com/packages#sunday-nfl-5pct-slate",
            "includes": [
                "• Every High-Conviction Spread & Total Lock + Full 9-Game Pass Audit",
                "• Complete Slate Player Prop Card Across Every Window",
            ],
            "color": MAGENTA,
        },
        {
            "name": "4. FULL WEEKLY ALL-ACCESS PASS (ALL 14 GAMES + DFS) — $49",
            "url": "galaxysportsedge.com/packages#week8-all-access",
            "includes": [
                "• Every Game Across All Windows (Tonight's CAR @ GB + Sunday + SNF + MNF)",
                "• All Props, All Correlated SGPs, and Full DraftKings / FanDuel Stack Blueprints",
            ],
            "color": EMERALD,
        },
    ]

    y = 540
    for p in packs:
        box_h = 296 if len(p["includes"]) == 3 else 258
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=BG_ROW_ALT, outline=p["color"], width=2)
        draw.text((54, y + 18), p["name"], font=load_font(23, bold=True), fill=WHITE)
        draw.text((54, y + 56), f"LIVE CHECKOUT -> {p['url']}", font=load_font(18, bold=True, mono=True), fill=p["color"])
        iy = y + 98
        for inc in p["includes"]:
            draw.text((54, iy), inc, font=load_font(19, bold=False), fill=WHITE)
            iy += 38
        y += box_h + 18

    draw_footer_9x16(draw, "SLIDE 4 / 4")
    out = os.path.join(OUT_DIR, "promo_slide_4_verified_receipts_cta_9x16.png")
    canvas.save(out)
    return out


# ==============================================================================
# MODE 2: VIP MEMBER-ONLY / PERSONAL BET CARD SLIDES (100% TONIGHT'S CAR @ GB GAME)
# ==============================================================================

def build_vip_slide_1_tnf_unlocked() -> str:
    """VIP Member Slide 1: Unlocked Official CAR @ GB Side, Total, Top Props & SGPs."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "VIP MEMBER VAULT // TONIGHT'S CAR @ GB CARD (PART 1)",
        "OFFICIAL CAR @ GB BET CARD",
        "Tonight 8:15 PM ET • Live DraftKings Lines • Do Not Share Publicly Pre-Kickoff",
    )

    plays = [
        {
            "slot": "OFFICIAL SIDE LOCK (1.5u • LIVE DK: GB -3.5 at -112)",
            "pick": "GREEN BAY PACKERS -3.5 (-112)  [SCORE: 61/100]",
            "metrics": "Fair Spread: GB -5.3  |  Edge: +8.6c CLV  |  10k Sim Median: GB 24, CAR 18",
            "why": "89% GB OL continuity vs CAR missing 2 starting guards (Lewis, Simpkins) + CB1 Evans.",
            "color": EMERALD,
        },
        {
            "slot": "OFFICIAL TOTAL LOCK (1.0u • LIVE DK: O/U 46.5, UNDER +102)",
            "pick": "CAR @ GB UNDER 46.5 (+102)  [SCORE: 58/100]",
            "metrics": "Fair Total: 42.4  |  Edge: +5.6c CLV  |  Plus-Money +102 Price on DraftKings",
            "why": "Matt LaFleur's 24.9s neutral snap tempo + CAR interior OL collapse compresses scoring.",
            "color": CYAN,
        },
        {
            "slot": "OFFICIAL WR1 PROP LOCK (1.25u • LIVE DK: 70.5 / 72.5 REC YDS)",
            "pick": "CHRISTIAN WATSON OVER 70.5 REC YDS (-110)  [SCORE: 63/100]",
            "metrics": "10k Sim Mean: 82.5 Yds (IQR 57.7-100.3)  |  CLV: +11.1c  |  Also Playable at 72.5",
            "why": "With Golden sidelined & Reed on IR, Watson commands 28.4% air-yards share vs CAR blitz.",
            "color": EMERALD,
        },
        {
            "slot": "OFFICIAL RB1 PROP LOCKS (1.25u • LIVE DK: 18.5 REC & 60.5 RUSH)",
            "pick": "JOSH JACOBS OVER 18.5 REC YDS [66/100] & OVER 60.5 RUSH YDS [61/100]",
            "metrics": "10k Sim Means: 24.5 Rec Yds (+13.4c CLV)  &  68.1 Rush Yds (+9.0c CLV) | R+R 84.5 OVER",
            "why": "CAR missing 2 LBs (Incoom OUT, Martin-Scott Q); flat checkdowns + 2H clock-bleed carries.",
            "color": CYAN,
        },
        {
            "slot": "OFFICIAL CORRELATED 3-LEG SGP TICKETS (+380 MARKET vs +275 FAIR)",
            "pick": "SGP A: GB -3.5 + UNDER 46.5 + WATSON OVER 70.5 REC YDS (+380)",
            "metrics": "SGP B: GB -3.5 + UNDER 46.5 + JACOBS OVER 18.5 REC YDS (+380) | Joint Prob: 26.7%",
            "why": "Clayton Copula captures positive correlation between GB lead script & checkdown/WR1 funnel.",
            "color": MAGENTA,
        },
    ]

    y = 312
    for idx, p in enumerate(plays):
        box_h = 280
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=bg, outline=p["color"], width=2)
        draw.text((54, y + 18), p["slot"], font=load_font(20, bold=True, mono=True), fill=p["color"])
        draw.text((54, y + 60), p["pick"], font=load_font(24, bold=True), fill=WHITE)
        draw.text((54, y + 116), p["metrics"], font=load_font(19, bold=True, mono=True), fill=MAGENTA if p["color"] == EMERALD else CYAN)
        draw.text((54, y + 166), p["why"], font=load_font(20, bold=False), fill=WHITE)
        draw.text((54, y + 224), "STATUS: CONJUNCTION GATE PASSED // LIVE DRAFTKINGS LINE VERIFIED", font=load_font(17, bold=True, mono=True), fill=MUTED)
        y += box_h + 18

    draw_footer_9x16(draw, "VIP 1 / 2")
    out = os.path.join(OUT_DIR, "vip_slide_1_tnf_unlocked_9x16.png")
    canvas.save(out)
    return out


def build_vip_slide_2_sunday_unlocked() -> str:
    """VIP Member Slide 2: Complete CAR @ GB Player Prop Card Across All Live DraftKings Lines."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "VIP MEMBER VAULT // TONIGHT'S CAR @ GB PROPS (PART 2)",
        "FULL CAR @ GB PROP MATRIX",
        "Every Official CAR @ GB Player Prop Call & Pass Receipt on Live DraftKings Lines",
    )

    items = [
        ("PROP LOCK #4 (1.25u)", "CHUBA HUBBARD OVER 16.5 REC YDS (-110)", "Score 66/100 | 10k Mean: 24.6 Yds (+13.6c CLV) | GB Two-High RB Checkdown Funnel", EMERALD),
        ("PROP LOCK #5 (1.0u)", "BRYCE YOUNG UNDER 253.5 PASS YDS (-110)", "Score 66/100 | 10k Mean: 229.2 Yds (+13.4c CLV) | 2 Guards OUT + 14.5% Pressure-to-Sack", EMERALD),
        ("PROP LOCK #6 (1.0u)", "TETAIROA McMILLAN UNDER 72.5 REC YDS (-110)", "Score 65/100 | 10k Mean: 61.4 Yds (+12.7c CLV) | Interior Pressure Caps Deep Shots", CYAN),
        ("PROP LOCK #7 (1.0u)", "CHUBA HUBBARD OVER 67.5 RUSH YDS (-110)", "Score 63/100 | 10k Mean: 77.6 Yds (+10.4c CLV) | GB #29 vs Zone Runs (5.29 YPC, Franklin OUT)", CYAN),
        ("PROP LOCK #8 (1.0u)", "TUCKER KRAFT OVER 44.5 REC YDS (-110)", "Score 62/100 | 10k Mean: 50.6 Yds (+9.8c CLV) | 88% Snap Share vs Depleted CAR LBs", MAGENTA),
        ("PROP LOCK #9 (0.75u)", "SAVION WILLIAMS OVER 24.5 REC YDS (-110)", "Score 60/100 | 10k Mean: 32.8 Yds | Expanded WR2 Snaps (60% W7) With Golden Sidelined", MAGENTA),
        ("FREE PASS RECEIPT", "JORDAN LOVE 262.5 PASS YDS -> PASS (53/100)", "10k Mean: 262.0 Yds | Matt LaFleur 24.9s Clock Tempo Bleeds Q4 Pass Volume", AMBER),
        ("FREE PASS RECEIPT", "JALEN COKER 61.5 REC YDS & GOLDEN 60.5 -> PASS", "Coker 10k Mean: 59.8 Yds (54/100) | Golden Sidelined/Limited (Do Not Bet Over)", AMBER),
    ]

    y = 310
    for idx, (slot, pick, meta, col) in enumerate(items):
        box_h = 172
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=14, fill=bg, outline=col, width=2)
        draw.text((54, y + 14), slot, font=load_font(18, bold=True, mono=True), fill=col)
        draw.text((340, y + 12), pick, font=load_font(23, bold=True), fill=WHITE)
        draw.text((54, y + 68), meta, font=load_font(19, bold=False), fill=CYAN if col != CYAN else WHITE)
        draw.text((54, y + 118), "TONIGHT'S CAR @ GB VIP CARD // GALAXYSPORTSEDGE.COM/PACKAGES ($19/$29/$39/$49)", font=load_font(16, bold=True, mono=True), fill=MUTED)
        y += box_h + 14

    draw_footer_9x16(draw, "VIP 2 / 2")
    out = os.path.join(OUT_DIR, "vip_slide_2_sunday_unlocked_9x16.png")
    canvas.save(out)
    return out


async def synth_voiceover(text: str, out_mp3: str):
    comm = edge_tts.Communicate(text, voice="en-US-AvaNeural", rate="+5%")
    await comm.save(out_mp3)


def get_audio_duration(path: str) -> float:
    res = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(res.stdout.strip())


def render_segment_mp4(slide_png: str, voice_mp3: str, out_mp4: str):
    """Renders a 1080x1920 30fps segment with the slide, live Nova Higgsfield video PIP in top-right, and voiceover."""
    dur = get_audio_duration(voice_mp3) + 0.5
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-t", f"{dur:.2f}", "-i", slide_png,
        "-stream_loop", "-1", "-t", f"{dur:.2f}", "-i", ANCHOR_VID,
        "-i", voice_mp3,
        "-f", "lavfi", "-t", f"{dur:.2f}", "-i", "aevalsrc=0.03*sin(2*PI*55*t)+0.015*sin(2*PI*110*t):s=44100",
        "-filter_complex",
        "[1:v]crop=420:420:150:240,scale=202:202,fps=30[pip];"
        "[0:v]fps=30[bg];"
        "[bg][pip]overlay=832:42:shortest=1[v];"
        "[2:a]aresample=44100,volume=1.35[vo];"
        "[3:a]aresample=44100,volume=0.35[bed];"
        "[vo][bed]amix=inputs=2:duration=first:dropout_transition=1[a]",
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-t", f"{dur:.2f}",
        out_mp4,
    ]
    subprocess.run(cmd, check=True)


def concat_mp4s(inputs: list[str], out_mp4: str):
    list_file = out_mp4 + ".txt"
    with open(list_file, "w", encoding="utf-8") as f:
        for p in inputs:
            f.write(f"file '{p}'\n")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", out_mp4],
        check=True,
    )
    os.remove(list_file)


async def main():
    print("Building Tonight's CAR @ GB Public Zero-Leakage Promo Slides + VIP Member Slides with Nova (@GSE_QuantHost)...")
    p1 = build_promo_slide_1_tnf_xray()
    p2 = build_promo_slide_2_free_passes()
    p3 = build_promo_slide_3_sunday_blind_spots()
    p4 = build_promo_slide_4_cta_packages()

    v1 = build_vip_slide_1_tnf_unlocked()
    v2 = build_vip_slide_2_sunday_unlocked()

    promo_scripts = [
        (
            p1,
            "I'm Nova at the Galaxy Sports Edge Quant Desk. Before you bet Carolina and Green Bay tonight at 8:15 Eastern, look at the number the sportsbooks hope you miss: "
            "Green Bay allows 2.57 yards per carry on gap runs, number one in the NFL, but 5.29 yards per carry on zone runs, twenty-ninth in the league, with linebacker Zaire Franklin out. "
            "Meanwhile Carolina is missing two starting guards and cornerback Akayleb Evans, giving Jordan Love a 68.3 to 58.6 catchable ball rate advantage under pressure. "
            "Here is your free pass receipt for tonight: we passed on Jordan Love's 262.5 passing yards prop at a 53 out of 100 coin flip because Matt LaFleur's 24.9-second tempo bleeds the second-half clock. "
            "Our official 61 out of 100 spread call, 58 out of 100 total on 46.5, eight live DraftKings player props, and our plus 380 Same Game Parlay are locked right now in the 19-dollar Spotlight Pack at galaxysportsedge dot com slash packages.",
            "promo_seg1_tnf.mp4",
        ),
        (
            p2,
            "We ran all 51 live DraftKings player props for Carolina at Green Bay tonight through 1.68 million JEV snaps, and we prove our discipline by showing you the four traps we refused for free. "
            "Trap one: Jordan Love 262.5 passing yards—our 10,000-trial mean lands at 262.0. "
            "Trap two: Jalen Coker at 61.5 receiving yards and 4.5 receptions—already steamed down from 63.5 and 5.5. "
            "Trap three: Matthew Golden at 60.5 receiving yards with a shoulder limitation reallocating perimeter targets. "
            "And trap four: chasing low-volume 15.5-yard coin flips on Tommy Tremble and John Metchie.",
            "promo_seg2_traps.mp4",
        ),
        (
            p3,
            "Where are the real statistical mispricings on tonight's Panthers at Packers board? "
            "First, Christian Watson at 70.5 receiving yards commands an 81 percent snap share and 28.4 percent air-yards share against Carolina's blitz. "
            "Second, Josh Jacobs steamed from 14.5 to 18.5 receiving yards and sits at 60.5 rushing yards against a Carolina front missing two linebackers. "
            "Third, Chuba Hubbard at 16.5 receiving yards and 67.5 rushing yards attacks Green Bay's two-high checkdown funnel and 5.29 yards-per-carry zone bleed. "
            "And fourth, Bryce Young at 253.5 passing yards and Tetairoa McMillan at 72.5 receiving yards face Lambeau pressure without two starting guards.",
            "promo_seg3_sunday.mp4",
        ),
        (
            p4,
            "Every single week, we grade our wins and our losses in public in units against the Shin de-vigged closing line—11 and 6 for plus 4.2 units last week, and plus 18.4 units on the season. "
            "We never give away active member picks on social media. "
            "Unlock tonight's Panthers at Packers Game Pack for 19 dollars, the Player Props and SGP Pack for 29 dollars, the Main Slate Best Bets Pack for 39 dollars, or the Full Weekly All-Access Pass for 49 dollars right now at galaxysportsedge dot com slash packages.",
            "promo_seg4_cta.mp4",
        ),
    ]

    vip_scripts = [
        (
            v1,
            "Welcome inside the Galaxy Sports Edge VIP Member Vault. Here is Part One of your unlocked official card for Carolina at Green Bay tonight on live DraftKings lines: "
            "Official Side Lock: Green Bay Packers minus 3.5 at minus 112, score 61 out of 100, with our fair spread at Green Bay minus 5.3. "
            "Official Total Lock: Under 46.5 at plus 102, score 58 out of 100, with our fair total at 42.4. "
            "Official WR1 Prop Lock: Christian Watson Over 70.5 receiving yards at 63 out of 100, projecting at 82.5 yards—also playable at 72.5. "
            "Official RB1 Dual Locks: Josh Jacobs Over 18.5 receiving yards at 66 out of 100, projecting at 24.5 yards, and Over 60.5 rushing yards at 61 out of 100, projecting at 68.1 yards. "
            "Official Same-Game Parlays at plus 380 versus our plus 275 fair price: Packers minus 3.5, Under 46.5, and either Christian Watson Over 70.5 receiving yards or Josh Jacobs Over 18.5 receiving yards.",
            "vip_seg1_tnf.mp4",
        ),
        (
            v2,
            "And here is Part Two of your unlocked Carolina at Green Bay Player Prop Matrix for tonight: "
            "Chuba Hubbard Over 16.5 receiving yards at 66 out of 100, projecting at 24.6 yards against Green Bay's two-high checkdown funnel, and Hubbard Over 67.5 rushing yards at 63 out of 100, projecting at 77.6 yards against Green Bay's 5.29 yards-per-carry zone bleed. "
            "Bryce Young Under 253.5 passing yards at 66 out of 100, projecting at 229.2 yards behind two missing starting guards, and Tetairoa McMillan Under 72.5 receiving yards at 65 out of 100, projecting at 61.4 yards. "
            "Plus Tucker Kraft Over 44.5 receiving yards at 62 out of 100 and Savion Williams Over 24.5 receiving yards at 60 out of 100. Let's cash tonight's game.",
            "vip_seg2_sunday.mp4",
        ),
    ]

    promo_segs = []
    for idx, (slide_png, text, fname) in enumerate(promo_scripts, 1):
        mp3 = os.path.join(OUT_DIR, f"promo_vo_{idx}.mp3")
        seg = os.path.join(OUT_DIR, fname)
        print(f"Synthesizing Public Promo VO {idx}/4...")
        await synth_voiceover(text, mp3)
        print(f"Rendering Public Promo Video Segment {idx}/4...")
        render_segment_mp4(slide_png, mp3, seg)
        promo_segs.append(seg)
        os.remove(mp3)

    vip_segs = []
    for idx, (slide_png, text, fname) in enumerate(vip_scripts, 1):
        mp3 = os.path.join(OUT_DIR, f"vip_vo_{idx}.mp3")
        seg = os.path.join(OUT_DIR, fname)
        print(f"Synthesizing VIP Member VO {idx}/2...")
        await synth_voiceover(text, mp3)
        print(f"Rendering VIP Member Video Segment {idx}/2...")
        render_segment_mp4(slide_png, mp3, seg)
        vip_segs.append(seg)
        os.remove(mp3)

    # Standalone Reels + Master Videos
    reel_tnf_promo = os.path.join(OUT_DIR, "nova_reel_1_PUBLIC_TNF_PROMO_ZERO_LEAKAGE_9x16.mp4")
    reel_sunday_promo = os.path.join(OUT_DIR, "nova_reel_2_PUBLIC_SUNDAY_BLINDSPOTS_PROMO_9x16.mp4")
    master_public_promo = os.path.join(OUT_DIR, "gse_week8_NOVA_PUBLIC_PROMO_MASTER_9x16.mp4")
    master_vip_reveal = os.path.join(OUT_DIR, "gse_week8_NOVA_VIP_MEMBER_PICKS_REVEAL_9x16.mp4")

    concat_mp4s([promo_segs[0], promo_segs[3]], reel_tnf_promo)
    concat_mp4s([promo_segs[1], promo_segs[2], promo_segs[3]], reel_sunday_promo)
    concat_mp4s(promo_segs, master_public_promo)
    concat_mp4s(vip_segs, master_vip_reveal)

    for s in promo_segs + vip_segs:
        if os.path.exists(s):
            os.remove(s)

    for fname in os.listdir(OUT_DIR):
        if fname.endswith((".png", ".mp4")):
            shutil.copy2(os.path.join(OUT_DIR, fname), os.path.join(ARTIFACT_DIR, fname))

    print("ALL NOVA PUBLIC PROMO & VIP REVEAL VIDEOS + BOARDS FOR TONIGHT'S CAR @ GB GAME BUILT SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(main())
