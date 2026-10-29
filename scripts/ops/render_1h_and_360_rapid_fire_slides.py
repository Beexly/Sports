#!/usr/bin/env python3
"""
Fast renderer for Tonight's CAR @ GB 1st Half (1H), Halftime / 2nd Half (2H), and 360-Degree Board Slides.
Produces:
  1. promo_slide_5_1h_and_360_blitz_9x16.png (Public Zero-Leakage 1H/2H & 360° Promo Slide)
  2. vip_slide_3_1h_and_2h_halftime_unlocked_9x16.png (VIP Unlocked 1H & Halftime/2H Rapid-Fire Card)
  3. Updates promo_slide_4_verified_receipts_cta_9x16.png and vip_slide_2_sunday_unlocked_9x16.png
"""
import importlib.util
import os
import shutil
from PIL import Image, ImageDraw

REPO_ROOT = r"C:\Users\Garrett\Sports"
ARTIFACT_DIR = r"C:\Users\Garrett\.gemini\antigravity-cli\brain\1a187307-700a-4f77-9f46-4ba19bbac829"
OUT_DIR = os.path.join(REPO_ROOT, "apps", "web", "public", "brand", "higgsfield", "week8-nova-2026-10-29")
VIP_DIR = os.path.join(REPO_ROOT, "data", "content-os", "vip-vault", "week8-nova-2026-10-29")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(VIP_DIR, exist_ok=True)

spec = importlib.util.spec_from_file_location(
    "nova_builder",
    os.path.join(REPO_ROOT, "scripts", "build-week8-nova-promo-and-vip-videos-2026-10-29.py"),
)
nb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(nb)


def build_promo_slide_5_1h_and_360_blitz() -> str:
    """Public Zero-Leakage 1H / Halftime / 360° Board Promo Slide."""
    canvas = Image.new("RGB", (1080, 1920), nb.BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    nb.draw_header_9x16(
        draw,
        canvas,
        "GALAXY SPORTS EDGE // 1H & HALFTIME + 360° BOARD",
        "1H & 2H SCRIPT BLITZ",
        "Tonight's CAR @ GB • 85 Markets Graded • 16-5 (+10.45u) New Engine",
    )

    # Top Record Banner
    draw.rounded_rectangle([32, 308, 1048, 438], radius=16, fill=nb.BG_ROW_ALT, outline=nb.EMERALD, width=3)
    draw.text((54, 324), "OFFICIAL NEW ENGINE VERIFIED RECORD — THAT'S IT!", font=nb.load_font(20, bold=True, mono=True), fill=nb.EMERALD)
    draw.text((54, 358), "16-5 (76.2% WIN RATE)  •  +10.45 UNITS (+49.8% ROI)", font=nb.load_font(29, bold=True), fill=nb.WHITE)
    draw.text((54, 404), "Every Market Graded: 1Q • 1H • 2H • 3Q/4Q • Kicking • IDP Sacks & Tackles • INTs • TDs", font=nb.load_font(18, bold=False), fill=nb.CYAN)

    spots = [
        (
            "1. FIRST-HALF (1H) SCRIPT & KEY-NUMBER STEAM",
            "GB 61.8% 1H PASS RATE (#4) vs CAR 47.5% PRESSURE ALLOWED (#32)",
            "• Carolina's 1H Team Total steamed from 9.5 across the key 10-pt number to 10.5",
            "• Matt LaFleur scripts Q1/1H play-action bootlegs & crossers before 2H clock-drain",
            "• 9 Official 1H Locks (Spread, Team Total, Total, 6 Player Props) Live Now",
            nb.EMERALD,
        ),
        (
            "2. HALFTIME / SECOND-HALF (2H) CLOCK-BLEED COLLAPSE",
            "OPPONENTS LEADING CAR BY 8+ RUN THE BALL 89.3% OF THE TIME (L3)!",
            "• Statrankings + @SamHoppen: CAR allows just 10.7% pass rate when trailing 8+ L3",
            "• Green Bay ranks #8 in NFL Clock-Drain Rate (12.2% of drives consume 5+ mins)",
            "• Official 2H Total (23.0), 3Q Total (9.5) & 4Q Total (13.5) Locks Inside",
            nb.CYAN,
        ),
        (
            "3. 360° KICKING, DEFENSE / IDP SACKS & QB INT MATRIX",
            "39.2% COMBINED RED-ZONE FG STALL RATE + 0.25 SACK THRESHOLDS",
            "• Kicking: Both kickers projected for 2.0+ FGs Made on 3rd-and-short RZ stalls",
            "• IDP: Tackles+Assists dropped a full tackle (7.5->6.5 & 5.5->4.5) + 0.25 Sack edges",
            "• Unlock for $19 (Spotlight) / $29 (Props+SGP) / $39 / $49 at galaxysportsedge.com",
            nb.MAGENTA,
        ),
    ]

    y = 458
    for title, sub, b1, b2, b3, col in spots:
        box_h = 376
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=nb.BG_ROW_ALT, outline=col, width=2)
        draw.text((54, y + 18), title, font=nb.load_font(21, bold=True, mono=True), fill=col)
        draw.text((54, y + 58), sub, font=nb.load_font(22, bold=True), fill=nb.WHITE)
        draw.text((54, y + 114), b1, font=nb.load_font(20, bold=False), fill=nb.WHITE)
        draw.text((54, y + 162), b2, font=nb.load_font(20, bold=False), fill=nb.WHITE)
        draw.text((54, y + 210), b3, font=nb.load_font(20, bold=True), fill=nb.CYAN if col != nb.CYAN else nb.EMERALD)
        draw.rounded_rectangle([54, y + 268, 1026, y + 350], radius=10, fill=(22, 16, 38), outline=nb.AMBER, width=2)
        draw.text((74, y + 282), "VIP LOCKED -> GALAXYSPORTSEDGE.COM/PACKAGES ($19 / $29 / $39 / $49)", font=nb.load_font(19, bold=True, mono=True), fill=nb.AMBER)
        draw.text((74, y + 314), "Instant access to all 1Q, 1H, Halftime/2H, Kicking, IDP, INT & TD Locks.", font=nb.load_font(18, bold=False), fill=nb.WHITE)
        y += box_h + 20

    nb.draw_footer_9x16(draw, "1H / 2H PROMO")
    out = os.path.join(OUT_DIR, "promo_slide_5_1h_and_360_blitz_9x16.png")
    canvas.save(out)
    shutil.copy2(out, os.path.join(ARTIFACT_DIR, "promo_slide_5_1h_and_360_blitz_9x16.png"))
    return out


def build_vip_slide_3_1h_and_2h_unlocked() -> str:
    """VIP Member Slide 3: Dedicated 1st Half (1H) & Halftime / 2nd Half (2H) Rapid-Fire Bet Card."""
    canvas = Image.new("RGB", (1080, 1920), nb.BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    nb.draw_header_9x16(
        draw,
        canvas,
        "VIP MEMBER VAULT // 1H & HALFTIME (2H) RAPID-FIRE CARD",
        "1ST HALF & 2ND HALF LOCKS",
        "Fire 1H Locks Now • Fire 2H/3Q/4Q Locks Before Halftime Ends • 16-5 (+10.45u)",
    )

    items = [
        ("1H SIDE & TT LOCKS", "PACKERS 1H -2.5 (-110)  &  CAR 1H TT UNDER 10.5 (-115)", "Scores: 65/100 & 66/100 | 10k 1H Mean: GB 13.3 - CAR 8.9 | CAR TT Steamed 9.5 -> 10.5!", nb.EMERALD),
        ("1H TOTAL LOCK", "1ST HALF TOTAL UNDER 23.5 (-110)  [SCORE: 58/100]", "10k 1H Mean: 22.2 Pts (+6.4c CLV) | Also: 1Q Total UNDER 9.5 (-112) & GB 1Q -0.5 (-115)", nb.CYAN),
        ("1Q & 1H TE LOCKS", "TUCKER KRAFT O 6.5 1Q REC YDS (-114) & O 20.5 1H YDS", "Scores: 68/100 & 64/100 | 10k Means: 11.4 1Q Yds & 26.8 1H Yds | GB 61.8% 1H Pass Rate (#4)", nb.EMERALD),
        ("1H WR1 ZONE LOCK", "CHRISTIAN WATSON OVER 34.5 1H REC YDS (-110) [63/100]", "10k 1H Mean: 42.4 Yds (+10.9c CLV) | 2.5 YPRR vs Zone (#17) vs CAR 90.6% L4 Zone Coverage", nb.EMERALD),
        ("1H QB FADE LOCK", "BRYCE YOUNG UNDER 123.5 1H PASS YDS (-110) [64/100]", "Steamed +6 Yds (117.5 -> 123.5) | 10k 1H Mean: 110.8 Yds vs 47.5% Pressure Rate (#32)", nb.CYAN),
        ("1H RB CHECKDOWNS", "HUBBARD O 6.5 1H REC YDS (-110) & JACOBS O 7.5 1H REC", "Scores: 63/100 & 62/100 | 10k 1H Means: Hubbard 10.8 Yds, Jacobs 11.6 Yds | McMillan U 32.5 1H", nb.CYAN),
        ("HALFTIME / 2H LOCK", "2ND HALF TOTAL UNDER 23.0 (-110)  [SCORE: 60/100]", "10k 2H Mean: 20.9 Pts (+8.2c CLV) | Opponents leading CAR 8+ run the ball 89.3% L3!", nb.MAGENTA),
        ("3Q & 4Q LOCKS", "3Q UNDER 9.5 (-115) • GB 3Q -0.5 • 4Q UNDER 13.5 (-110)", "Scores: 58/100 & 60/100 | 10k Means: 3Q 8.6 Pts, 4Q 12.3 Pts | GB #8 NFL Clock-Drain (12.2%)", nb.MAGENTA),
    ]

    y = 310
    for idx, (slot, pick, meta, col) in enumerate(items):
        box_h = 172
        bg = nb.BG_ROW_ALT if idx % 2 == 0 else nb.BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=14, fill=bg, outline=col, width=2)
        draw.text((54, y + 14), slot, font=nb.load_font(18, bold=True, mono=True), fill=col)
        draw.text((310, y + 12), pick, font=nb.load_font(21, bold=True), fill=nb.WHITE)
        draw.text((54, y + 68), meta, font=nb.load_font(18, bold=False), fill=nb.CYAN if col != nb.CYAN else nb.WHITE)
        draw.text((54, y + 118), "NEW ENGINE RECORD: 16-5 (76.2%) • +10.45u // LIVE DRAFTKINGS LINES VERIFIED", font=nb.load_font(16, bold=True, mono=True), fill=nb.MUTED)
        y += box_h + 14

    nb.draw_footer_9x16(draw, "VIP 3 / 3 (1H & 2H)")
    out = os.path.join(VIP_DIR, "vip_slide_3_1h_and_2h_halftime_unlocked_9x16.png")
    canvas.save(out)
    shutil.copy2(out, os.path.join(ARTIFACT_DIR, "vip_slide_3_1h_and_2h_halftime_unlocked_9x16.png"))
    return out


if __name__ == "__main__":
    p4 = nb.build_promo_slide_4_cta_packages()
    shutil.copy2(p4, os.path.join(ARTIFACT_DIR, "promo_slide_4_verified_receipts_cta_9x16.png"))
    v1 = nb.build_vip_slide_1_tnf_unlocked()
    v2 = nb.build_vip_slide_2_sunday_unlocked()
    p5 = build_promo_slide_5_1h_and_360_blitz()
    v3 = build_vip_slide_3_1h_and_2h_unlocked()
    print("Rendered:")
    for f in [p4, p5, v1, v2, v3]:
        print(" ->", f)
