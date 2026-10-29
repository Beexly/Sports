#!/usr/bin/env python3
"""
Builds the Galaxy Sports Edge Week 8 (Oct 29, 2026) Nova / @GSE_QuantHost Video & Graphic Suite
in TWO synchronized modes:
1. PUBLIC PROMO FUNNEL MODE (Zero Pick Leakage — X / IG Reels / TikTok / Shorts):
   - Nova (@GSE_QuantHost) presents the frontier 168-snap JEV + 10,000-trial telemetry X-Ray,
     gives away FREE Pass/Trap Receipts (Jordan Love 236.5 Pass Yds PASS, Tony Pollard mirage PASS),
     audits the 11-6 (+4.2u) public ledger, and drives traffic to galaxysportsedge.com/packages
     with all active sides, totals, props, and SGPs REDACTED / LOCKED.
2. VIP / MEMBER VAULT & POST-LOCK REVEAL MODE:
   - Nova (@GSE_QuantHost) presents the unlocked official card for paying members (or post-kickoff
     receipt grading).
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
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=18, fill=255)
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
    draw.text((42, 232), "168-SNAP JEV SIM + 10K TRAJECTORIES + SHIN DE-VIG + 5-STAGE GATE", font=load_font(18, bold=True, mono=True), fill=EMERALD)

    badge = get_nova_anchor_badge((210, 210))
    canvas.paste(badge, (828, 38), badge)
    draw.rounded_rectangle([832, 216, 1034, 246], radius=6, fill=(5, 7, 11, 230), outline=CYAN, width=1)
    draw.text((842, 221), "NOVA // QUANT HOST", font=load_font(15, bold=True, mono=True), fill=CYAN)


def draw_footer_9x16(draw: ImageDraw.ImageDraw, page_label: str):
    draw.rectangle([0, 1830, 1080, 1920], fill=(8, 12, 20))
    draw.line([(0, 1830), (1080, 1830)], fill=VIOLET, width=2)
    f_foot = load_font(19, bold=True, mono=True)
    draw.text((42, 1860), "UNLOCK OFFICIAL PICKS -> GALAXYSPORTSEDGE.COM/PACKAGES", font=f_foot, fill=CYAN)
    draw.text((870, 1860), page_label, font=f_foot, fill=MAGENTA)


# ==============================================================================
# MODE 1: PUBLIC ZERO-LEAKAGE PROMO SLIDES (4 SLIDES)
# ==============================================================================

def build_promo_slide_1_tnf_xray() -> str:
    """Public Slide 1: CAR @ GB Trench & Concept X-Ray (Zero Pick Leakage — Picks Locked!)."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "TNF X-RAY // OCT 29, 2026 (PUBLIC BRIEFING)",
        "THE 2.57 vs 5.29 YPC PARADOX",
        "Why Box-Score Bettors Are Walking Into a Lambeau Trap Tonight",
    )

    cards = [
        {
            "title": "1. THE RUSH CONCEPT SPLIT BOOKS CAN'T PRICE",
            "stat": "GAP / POWER: 2.57 YPC (29th)   vs   INSIDE/OUTSIDE ZONE: 5.29 YPC (2nd)",
            "detail": "Same running back. Same offensive line. 2.72 YPC gap based purely on concept.",
            "sub": "Green Bay runs 64.2% Zone concepts; Carolina's front allows +1.8 YBC on Zone.",
            "badge": "FINDING #F-2026-1029-01",
            "color": CYAN,
        },
        {
            "title": "2. CATCHABLE BALL RATE vs RAW COMPLETION %",
            "stat": "ACCURACY GAP: 68.3 vs 58.6 CATCHABLE BALL RATE (+9.7 DELTA)",
            "detail": "Box scores show a 2.1% completion gap because of 5 dropped vertical throws.",
            "sub": "FTN charting isolates throw placement from receiver drops in 16 mph Lambeau wind.",
            "badge": "FTN CHARTING VERIFIED",
            "color": VIOLET,
        },
        {
            "title": "3. TRENCH CONTINUITY vs BLITZ EXPOSURE",
            "stat": "GB OL CONTINUITY: 89.0% (4th)   vs   CAR BLITZ RATE: 27.6% (11th)",
            "detail": "Against clean 5-man protection, Carolina's blitzes create a 24.4% explosive play rate.",
            "sub": "Cholesky-whitened Stage 4 overlay shifts win probability by +6.4% over raw market.",
            "badge": "168-SNAP JEV SIMULATION",
            "color": EMERALD,
        },
        {
            "title": "4. FREE RECEIPT: PASS ON LOVE 236.5 YDS",
            "stat": "JORDAN LOVE PASS YDS (236.5) -> ENGINE VERDICT: PASS (51/100)",
            "detail": "10,000-trial median lands at 238.1 yds (+0.6% raw edge). After -114 vig, it's -EV.",
            "sub": "We don't sell coin flips. We passed the QB yardage trap and locked the real edges.",
            "badge": "FREE NO-BET RECEIPT",
            "color": AMBER,
        },
        {
            "title": "5. OFFICIAL TNF ALL-IN CARD (LOCKED ON SITE)",
            "stat": "[LOCKED] TNF SPREAD (61/100)  •  [LOCKED] TNF TOTAL (58/100)",
            "detail": "[LOCKED] 2 TARGET-FUNNEL PROP LOCKS (66/100 & 62/100) + CORRELATED SGP (+380)",
            "sub": "Unlock all 4 official TNF plays + SGP now at galaxysportsedge.com/packages ($15).",
            "badge": "LOCKED // VIP PACK",
            "color": MAGENTA,
        },
    ]

    y = 312
    for idx, c in enumerate(cards):
        box_h = 280
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=bg, outline=c["color"], width=2)
        draw.text((54, y + 18), c["title"], font=load_font(25, bold=True), fill=WHITE)
        draw.rounded_rectangle([690, y + 14, 1028, y + 50], radius=8, fill=(18, 24, 38), outline=c["color"], width=2)
        draw.text((706, y + 21), c["badge"], font=load_font(17, bold=True, mono=True), fill=c["color"])

        draw.text((54, y + 72), c["stat"], font=load_font(22, bold=True, mono=True), fill=c["color"])
        draw.text((54, y + 126), c["detail"], font=load_font(21, bold=False), fill=WHITE)
        draw.text((54, y + 174), c["sub"], font=load_font(19, bold=False), fill=MUTED)
        draw.text((54, y + 224), "PROOF SOURCE: GSE 5-STAGE ENGINE + ~typesafe/jev-latest SNAP SIM", font=load_font(17, bold=True, mono=True), fill=EMERALD if idx < 4 else MAGENTA)
        y += box_h + 18

    draw_footer_9x16(draw, "SLIDE 1 / 4")
    out = os.path.join(OUT_DIR, "promo_slide_1_tnf_trench_xray_9x16.png")
    canvas.save(out)
    return out


def build_promo_slide_2_free_passes() -> str:
    """Public Slide 2: Free Pass & Box-Score Mirage Receipts (Why Pass Discipline Beats Touts)."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "FREE TRAP RECEIPTS // WEEK 8 SLATE",
        "4 PUBLIC TRAPS WE REFUSED",
        "Saving Your Bankroll From -EV Public Steam Before Selling You a Single Pick",
    )

    traps = [
        {
            "name": "TRAP 1: JORDAN LOVE 236.5 PASS YDS",
            "tag": "ENGINE PASS // SCORE 51/100 (NO EDGE)",
            "math": "10,000-Sim Median: 238.1 Yds  |  De-Vigged Edge: +0.6% (Fails 3.0% Gate)",
            "why": "Every tout is forcing a QB prop tonight. Once green-zone rush scripts kick in inside the 12-yard line, Love's pass attempts cap at 30.8. Our real 66/100 & 62/100 props are in the receiving funnel.",
            "color": AMBER,
        },
        {
            "name": "TRAP 2: TONY POLLARD 3-TD MIRAGE",
            "tag": "ENGINE FADE // 2-MINUTE SNAPS GONE",
            "math": "Snap Reality: Tyjae Spears Logged 65.0% of 2-Minute & 3rd-Down Snaps",
            "why": "Casual bettors see Pollard's 3 TDs last week and slam his Over. Tape shows 2 of those TDs came on 1-yard DPI penalties while Spears took over the passing-down role.",
            "color": AMBER,
        },
        {
            "name": "TRAP 3: ROMEO DOUBS TD REGRESSION",
            "tag": "ENGINE PASS // 21.0% TARGET SHARE CAP",
            "math": "Air-Yards Share: Flat at 19.4%  |  Slot vs Perimeter Split Favors Teammates",
            "why": "Public is chasing last week's box-score touchdown. Our 168-snap JEV target carrier distribution routes the high-leverage chain-moving targets elsewhere tonight.",
            "color": AMBER,
        },
        {
            "name": "TRAP 4: 9 OF 13 SUNDAY GAMES REFUSED",
            "tag": "CONJUNCTION GATE // 69.2% REJECTION",
            "math": "13 Games Simulated -> 9 Games Marked PASS (Edge < 2.5% vs Shin Close)",
            "why": "Touts sell action on every game because boredom pays their bills. Our 5-Stage Conjunction Gate killed 9 Sunday games and isolated ONLY the 4 true structural mispricings.",
            "color": EMERALD,
        },
    ]

    y = 316
    for idx, t in enumerate(traps):
        box_h = 340
        bg = (24, 15, 22) if t["color"] == AMBER else BG_ROW_ALT
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=bg, outline=t["color"], width=2)
        draw.text((54, y + 18), t["name"], font=load_font(25, bold=True), fill=WHITE)
        draw.rounded_rectangle([600, y + 14, 1028, y + 50], radius=8, fill=(15, 20, 32), outline=t["color"], width=2)
        draw.text((616, y + 21), t["tag"], font=load_font(17, bold=True, mono=True), fill=t["color"])

        draw.text((54, y + 72), t["math"], font=load_font(21, bold=True, mono=True), fill=CYAN)

        # Wrap why text cleanly
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

        draw.text((54, y + 286), "VERIFIED BY: `no-bet-gate.ts` + `x-situational-80-rules.ts`", font=load_font(17, bold=True, mono=True), fill=MUTED)
        y += box_h + 22

    draw_footer_9x16(draw, "SLIDE 2 / 4")
    out = os.path.join(OUT_DIR, "promo_slide_2_free_pass_receipts_9x16.png")
    canvas.save(out)
    return out


def build_promo_slide_3_sunday_blind_spots() -> str:
    """Public Slide 3: 3 Week 8 Sunday Market Blind Spots (Setup Shown, Official Picks Locked!)."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "SUNDAY BLIND SPOTS // 4 SURVIVING GAMES",
        "WHERE THE SUNDAY LINE IS WRONG",
        "We Killed 9 Games. Here Is the Telemetry Inside the 4 That Survived.",
    )

    spots = [
        {
            "game": "BLIND SPOT 1: TB @ DET (FORD FIELD DOME)",
            "metric": "12 MISSED TACKLES FORCED ON 70% RUSH SHARE vs 2-HIGH QUARTERS",
            "insight": "Tampa Bay's defense is priced on season-long pass EPA, hiding a bottom-5 tackling grade against motion-adjusted gap/zone duos indoors.",
            "lock": "[LOCKED IN SUNDAY PACK] -> OFFICIAL SIDE (65/100) + RB RECEIVING PROP (62/100)",
            "color": CYAN,
        },
        {
            "game": "BLIND SPOT 2: BUF @ CAR / HIGH-TOTAL PACE ANOMALY",
            "metric": "68.4% NEUTRAL PROE + 24.2s SNAP PACE vs SOFT ZONE SHELL",
            "insight": "When two top-8 neutral pass-rate-over-expected offenses meet without weather resistance, 10,000-trial clock compression creates a +5.5% tail over the key number.",
            "lock": "[LOCKED IN SUNDAY PACK] -> OFFICIAL TOTAL LOCK (63/100) + CORRELATED STACK",
            "color": EMERALD,
        },
        {
            "game": "BLIND SPOT 3: DAL @ DEN (MILE HIGH ALTITUDE TRENCH)",
            "metric": "47.0% EDGE PRESSURE RATE vs IMMOBILE POCKET + SECOND-HALF FATIGUE",
            "insight": "Stage 4 `restFatigue` + `pressure` Cholesky overlay triggers its largest altitude trench adjustment of Week 8 (+4.8% post-vig edge).",
            "lock": "[LOCKED IN SUNDAY PACK] -> OFFICIAL SPREAD LOCK (60/100) + PASS RUSH SCRIPT",
            "color": VIOLET,
        },
        {
            "game": "BLIND SPOT 4: ALPHA WR TARGET FUNNEL (32.0% TARGET SHARE)",
            "metric": "32.0% FIRST-READ SHARE + 2.84 YPRR vs SINGLE-HIGH COVERAGE",
            "insight": "Our highest-graded Sunday player prop clears the book line by +7.4 yards in our Negative-Binomial / Gamma target-catch-YAC simulation.",
            "lock": "[LOCKED IN SUNDAY PACK] -> #1 SUNDAY WR PROP LOCK (64/100)",
            "color": MAGENTA,
        },
    ]

    y = 316
    for idx, s in enumerate(spots):
        box_h = 340
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=bg, outline=s["color"], width=2)
        draw.text((54, y + 20), s["game"], font=load_font(26, bold=True), fill=WHITE)
        draw.text((54, y + 68), s["metric"], font=load_font(20, bold=True, mono=True), fill=s["color"])

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
        draw.text((72, y + 266), s["lock"], font=load_font(19, bold=True, mono=True), fill=MAGENTA)
        y += box_h + 22

    draw_footer_9x16(draw, "SLIDE 3 / 4")
    out = os.path.join(OUT_DIR, "promo_slide_3_sunday_blind_spots_9x16.png")
    canvas.save(out)
    return out


def build_promo_slide_4_cta_packages() -> str:
    """Public Slide 4: Verified Receipts (11-6, +4.2u) + Live Package Funnel Menu."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "VERIFIED RECEIPTS & PACKAGES // LIVE NOW",
        "11-6 (+4.2u) VERIFIED RECORD",
        "Every Win & Loss Graded in Units Against Shin De-Vigged Closing Lines",
    )

    # Top Receipts Box
    draw.rounded_rectangle([32, 314, 1048, 560], radius=16, fill=(12, 28, 24), outline=EMERALD, width=3)
    draw.text((54, 334), "PUBLIC GRADED LEDGER (NO DELETED POSTS, NO PARLAY ODDS INFLATION)", font=load_font(21, bold=True, mono=True), fill=EMERALD)
    draw.text((54, 380), "11-6 (+4.2u) LAST WEEK   •   +1.8% AVG CLV   •   0 FABRICATED CLAIMS", font=load_font(25, bold=True), fill=WHITE)
    draw.text((54, 430), "• Every play must clear all 5 Engine Stages + 168-Snap JEV Simulation.", font=load_font(20, bold=False), fill=MUTED)
    draw.text((54, 468), "• Confidence is always stated as Score /100 (never fake 90% win claims).", font=load_font(20, bold=False), fill=MUTED)
    draw.text((54, 506), "• If the edge is under +2.5% after de-vigging, we publish PASS for free.", font=load_font(20, bold=False), fill=WHITE)

    packs = [
        {
            "name": "1. TNF ALL-IN PACK — $15 (INSTANT UNLOCK)",
            "url": "galaxysportsedge.com/packages#tnf-all-in-pack",
            "includes": [
                "• Official CAR @ GB Side Lock (Score 61/100, +6.4% Edge)",
                "• Official CAR @ GB Total Lock (Score 58/100, +4.9% Edge)",
                "• Both TNF Target-Funnel Player Prop Locks (66/100 & 62/100)",
                "• Official 3-Leg Clayton Copula TNF SGP (+380 vs +295 Fair)",
            ],
            "color": CYAN,
        },
        {
            "name": "2. SUNDAY FULL SLATE PACK — $39 (MOST POPULAR)",
            "url": "galaxysportsedge.com/packages#sunday-full-slate",
            "includes": [
                "• All 4 Conjunction-Gate Certified Sunday Sides & Totals (65/100 Top Lock)",
                "• All 6 Negative-Binomial / Gamma Sunday Player Prop Locks",
                "• Full 9-Game 'Why We Passed' Protection Report & Injury Pivots",
                "• Correlated Sunday Same-Game Parlay Card",
            ],
            "color": MAGENTA,
        },
        {
            "name": "3. ALL-IN WEEK 8 PASS — $49 (COMPLETE ACCESS)",
            "url": "galaxysportsedge.com/packages#week-pass",
            "includes": [
                "• Every TNF + Sunday + MNF Side, Total, Prop, and Copula SGP",
                "• Complete 168-Snap JEV Dossiers + DFS Optimizer & Line-Move Alerts",
            ],
            "color": EMERALD,
        },
    ]

    y = 590
    for p in packs:
        box_h = 370 if len(p["includes"]) == 4 else 310
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=BG_ROW_ALT, outline=p["color"], width=2)
        draw.text((54, y + 20), p["name"], font=load_font(26, bold=True), fill=WHITE)
        draw.text((54, y + 62), f"LIVE CHECKOUT -> {p['url']}", font=load_font(20, bold=True, mono=True), fill=p["color"])
        iy = y + 110
        for inc in p["includes"]:
            draw.text((54, iy), inc, font=load_font(21, bold=False), fill=WHITE)
            iy += 42
        y += box_h + 24

    draw_footer_9x16(draw, "SLIDE 4 / 4")
    out = os.path.join(OUT_DIR, "promo_slide_4_verified_receipts_cta_9x16.png")
    canvas.save(out)
    return out


# ==============================================================================
# MODE 2: VIP MEMBER-ONLY / POST-LOCK OFFICIAL REVEAL SLIDES (2 SLIDES)
# ==============================================================================

def build_vip_slide_1_tnf_unlocked() -> str:
    """VIP Member Slide 1: Unlocked Official CAR @ GB Card + Correlated +380 SGP."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "VIP MEMBER VAULT // TNF ALL-IN PACK UNLOCKED",
        "OFFICIAL CAR @ GB BET CARD",
        "5-Stage Engine + 168-Snap JEV Simulation • Do Not Share Publicly Pre-Kickoff",
    )

    plays = [
        {
            "slot": "OFFICIAL SIDE LOCK (1.5u)",
            "pick": "GREEN BAY PACKERS -3.5 (-110)",
            "metrics": "Model Cover: 58.8%  |  De-Vig Market: 52.4%  |  Edge: +6.4%  |  Score: 61/100",
            "why": "89% GB OL continuity neutralizes Carolina's 27.6% blitz rate; 5.29 YPC Zone advantage controls script.",
            "color": EMERALD,
        },
        {
            "slot": "OFFICIAL TOTAL LOCK (1.0u)",
            "pick": "CAR @ GB UNDER 47.5 (-110)",
            "metrics": "Model Under: 57.3%  |  De-Vig Market: 52.4%  |  Edge: +4.9%  |  Score: 58/100",
            "why": "16 mph Lambeau crosswind + Carolina's 29.8s clock-bleed run script compresses total plays to 121.4.",
            "color": CYAN,
        },
        {
            "slot": "OFFICIAL PROP LOCK #1 (1.25u)",
            "pick": "CHUBA HUBBARD OVER 14.5 REC YDS (-115)",
            "metrics": "10k Sim Median: 21.4 Yds  |  Edge: +9.2%  |  Score: 66/100 (HIGHEST TNF EDGE)",
            "why": "Trailing script in Q2-Q4 forces Bryce Young into 6.4 RB checkdowns against Green Bay's two-high shell.",
            "color": EMERALD,
        },
        {
            "slot": "OFFICIAL PROP LOCK #2 (1.0u)",
            "pick": "CHRISTIAN WATSON OVER 56.5 REC YDS (-110)",
            "metrics": "10k Sim Median: 66.8 Yds  |  Edge: +7.1%  |  Score: 62/100",
            "why": "Carolina's single-high blitz leaves 1-on-1 perimeter shots; Watson owns a 28.4% air-yards share vs blitz.",
            "color": CYAN,
        },
        {
            "slot": "OFFICIAL CLAYTON COPULA SGP (0.5u)",
            "pick": "PACKERS -3.5 + UNDER 47.5 + HUBBARD OVER 14.5 REC YDS (+380)",
            "metrics": "Book Odds: +380 (20.8% Implied)  |  Copula True Prob: 25.3% (+295 Fair)  |  EV: +21.6%",
            "why": "Books price Packers -3.5 and Hubbard receiving as independent, missing the trailing checkdown correlation.",
            "color": MAGENTA,
        },
    ]

    y = 312
    for idx, p in enumerate(plays):
        box_h = 280
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=bg, outline=p["color"], width=2)
        draw.text((54, y + 18), p["slot"], font=load_font(22, bold=True, mono=True), fill=p["color"])
        draw.text((54, y + 60), p["pick"], font=load_font(30, bold=True), fill=WHITE)
        draw.text((54, y + 116), p["metrics"], font=load_font(20, bold=True, mono=True), fill=MAGENTA if p["color"] == EMERALD else CYAN)
        draw.text((54, y + 166), p["why"], font=load_font(20, bold=False), fill=WHITE)
        draw.text((54, y + 224), "STATUS: CONJUNCTION GATE PASSED // `publishAllowed: true` (VIP ONLY)", font=load_font(17, bold=True, mono=True), fill=MUTED)
        y += box_h + 18

    draw_footer_9x16(draw, "VIP 1 / 2")
    out = os.path.join(OUT_DIR, "vip_slide_1_tnf_unlocked_9x16.png")
    canvas.save(out)
    return out


def build_vip_slide_2_sunday_unlocked() -> str:
    """VIP Member Slide 2: Unlocked Official Sunday Week 8 Sides, Totals & Top Props."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "VIP MEMBER VAULT // SUNDAY FULL SLATE UNLOCKED",
        "OFFICIAL SUNDAY WEEK 8 CARD",
        "The 4 Surviving Games + 4 Top Prop Locks (9 Games Marked PASS)",
    )

    items = [
        ("SIDE LOCK #1 (1.5u)", "DETROIT LIONS -3 (-110) vs TB", "Edge +7.8% | Score 65/100 | 12 Missed Tackles on 70% Rush Share Indoors", EMERALD),
        ("TOTAL LOCK #1 (1.25u)", "BUF @ CAR OVER 54.5 (-110)", "Edge +5.5% | Score 63/100 | 68.4% Neutral PROE + Fast Track Shootout", EMERALD),
        ("SIDE LOCK #2 (1.0u)", "DENVER BRONCOS -2.5 (-110) vs DAL", "Edge +4.8% | Score 60/100 | 47% Edge Pressure vs Immobile Pocket at Altitude", CYAN),
        ("SIDE LOCK #3 (1.0u)", "ATLANTA FALCONS -4.5 (-110) vs MIA", "Edge +4.4% | Score 59/100 | 62.5% Pass Funnel + Bijan Robinson Script Control", CYAN),
        ("PROP LOCK #1 (1.25u)", "PUKA NACUA OVER 78.5 REC YDS (-110)", "Edge +8.6% | Score 64/100 | 32% First-Read Target Share + 2.84 YPRR", MAGENTA),
        ("PROP LOCK #2 (1.0u)", "JAHMYR GIBBS OVER 28.5 REC YDS (-115)", "Edge +7.4% | Score 62/100 | TB Linebacker Coverage Mismatch Indoors", MAGENTA),
        ("PROP LOCK #3 (1.0u)", "JAMES COOK OVER 64.5 RUSH YDS (-110)", "Edge +6.8% | Score 61/100 | Light 6-Man Boxes vs Two-High Shell", VIOLET),
        ("PROP LOCK #4 (1.0u)", "COURTLAND SUTTON OVER 54.5 REC YDS (-110)", "Edge +6.2% | Score 60/100 | 38% Air-Yards Share vs Dallas Man Coverage", VIOLET),
    ]

    y = 310
    for idx, (slot, pick, meta, col) in enumerate(items):
        box_h = 172
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=14, fill=bg, outline=col, width=2)
        draw.text((54, y + 14), slot, font=load_font(19, bold=True, mono=True), fill=col)
        draw.text((380, y + 12), pick, font=load_font(25, bold=True), fill=WHITE)
        draw.text((54, y + 68), meta, font=load_font(20, bold=False), fill=CYAN if col != CYAN else WHITE)
        draw.text((54, y + 118), "VIP MEMBER ACCESS // GALAXYSPORTSEDGE.COM/PACKAGES", font=load_font(16, bold=True, mono=True), fill=MUTED)
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
    print("Building 4 Public Zero-Leakage Promo Slides + 2 VIP Member Slides with Nova (@GSE_QuantHost)...")
    p1 = build_promo_slide_1_tnf_xray()
    p2 = build_promo_slide_2_free_passes()
    p3 = build_promo_slide_3_sunday_blind_spots()
    p4 = build_promo_slide_4_cta_packages()

    v1 = build_vip_slide_1_tnf_unlocked()
    v2 = build_vip_slide_2_sunday_unlocked()

    promo_scripts = [
        (
            p1,
            "I'm Nova at the Galaxy Sports Edge Quant Desk. Before you bet Carolina and Green Bay tonight, look at the number the sportsbooks hope you miss: "
            "2.57 yards per carry on gap runs versus 5.29 yards per carry on zone runs. Same running back, same offensive line, a 2.7-yard split driven purely by concept. "
            "Add a 68.3 to 58.6 catchable ball rate advantage after stripping out five receiver drops, and 89 percent offensive line continuity against a 27.6 percent blitz rate. "
            "Here is your free pass receipt: we passed on Jordan Love's 236.5 passing yards prop at a 51 out of 100 coin flip. "
            "Our official 61 out of 100 spread lock, 58 out of 100 total, two receiving funnel props, and our plus 380 correlated Same Game Parlay are locked right now in the TNF All-In Pack at galaxysportsedge dot com slash packages.",
            "promo_seg1_tnf.mp4",
        ),
        (
            p2,
            "Want to know why most bettors lose? Because touts sell action on every game. At Galaxy Sports Edge, we prove our edge by showing you what we refused to bet for free. "
            "Trap one: Jordan Love 236.5 passing yards—our 10,000-trial median lands at 238.1, a negative-EV coin flip after juice. "
            "Trap two: Tony Pollard's three-touchdown box-score mirage—Tyjae Spears quietly took 65 percent of the two-minute snaps. "
            "Trap three: Romeo Doubs touchdown chasing on a flat 21 percent target share. "
            "And across Sunday's 13-game Week 8 board, our five-stage conjunction gate rejected nine entire games as no-bet passes.",
            "promo_seg2_traps.mp4",
        ),
        (
            p3,
            "Only four Sunday games survived our five-stage engine gate. "
            "In Tampa Bay at Detroit indoors, our charting isolated 12 missed tackles forced on a 70 percent rush share against two-high quarters coverage. "
            "In Buffalo at Carolina, two top-eight neutral pass-rate offenses create a 5.5 percent tail over the key total number. "
            "In Dallas at Denver, a 47 percent edge pressure rate hits an immobile pocket at altitude. "
            "And our number-one Sunday receiver prop holds a 32 percent first-read target share that clears the book line by 7.4 yards.",
            "promo_seg3_sunday.mp4",
        ),
        (
            p4,
            "Every single week, we grade our wins and our losses in public in units against the Shin de-vigged closing line—11 and 6 for plus 4.2 units last week, zero deleted posts. "
            "We never give away active member picks on social media. "
            "Unlock tonight's TNF All-In Pack for 15 dollars, the Sunday Full Slate Pack for 39 dollars, or the complete All-In Week Pass for 49 dollars right now at galaxysportsedge dot com slash packages.",
            "promo_seg4_cta.mp4",
        ),
    ]

    vip_scripts = [
        (
            v1,
            "Welcome inside the Galaxy Sports Edge VIP Member Vault. Here is your unlocked Thursday Night Football All-In Card for Carolina at Green Bay: "
            "Official Side Lock: Green Bay Packers minus 3.5 at minus 110, score 61 out of 100, with a plus 6.4 percent edge over the de-vigged market. "
            "Official Total Lock: Under 47.5 at minus 110, score 58 out of 100. "
            "Official Player Props: Chuba Hubbard Over 14.5 receiving yards at 66 out of 100—our highest edge tonight on trailing checkdown script—and Christian Watson Over 56.5 receiving yards at 62 out of 100 against Carolina's single-high blitz. "
            "Official Clayton Copula Same-Game Parlay: Packers minus 3.5, Under 47.5, and Hubbard Over 14.5 receiving yards at plus 380 versus our plus 295 fair price, a plus 21.6 percent expected value.",
            "vip_seg1_tnf.mp4",
        ),
        (
            v2,
            "And here is your unlocked Week 8 Sunday Full Slate Member Card—the four games that cleared our conjunction gate: "
            "Detroit Lions minus 3 at 65 out of 100, Bills-Panthers Over 54.5 at 63 out of 100, Denver Broncos minus 2.5 at 60 out of 100, and Atlanta Falcons minus 4.5 at 59 out of 100. "
            "Top four Sunday player props: Puka Nacua Over 78.5 receiving yards at 64 out of 100, Jahmyr Gibbs Over 28.5 receiving yards at 62 out of 100, James Cook Over 64.5 rushing yards at 61 out of 100, and Courtland Sutton Over 54.5 receiving yards at 60 out of 100. Let's cash this slate.",
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

    print("ALL NOVA PUBLIC PROMO & VIP REVEAL VIDEOS + BOARDS BUILT SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(main())
