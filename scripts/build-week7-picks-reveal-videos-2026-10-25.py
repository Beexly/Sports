#!/usr/bin/env python3
"""
Builds the Galaxy Sports Edge Week 7 NFL Sunday Complete Picks Reveal Video Suite
(October 25, 2026 — National Tight Ends Day).

Features:
- Modest, professional studio quant anchor PIP (cropped strictly to head/shoulders in leather jacket
  from Higgsfield Kling v3.0 clip `gse_week7_video1_quant_command_center_9x16.mp4`).
- Crystal-clear 1080p dark-mode obsidian (#05070B) broadcast HUD telemetry boards with Orbital Cyan (#00E5FF),
  Ultraviolet (#7B61FF), Plasma Magenta (#FF38C7), and Emerald Play (#10B981) typography.
- Full spoken Neural Voiceover narration (`edge-tts` `en-US-AvaNeural`) reading every actual game pick,
  player prop, National Tight Ends Day play, injury/steam pass, SGP, and Garrett & Dad's $50,000 Cash DFS lineup.
- Never formats confidence as a percentage — strictly `XX/100`.
"""

import asyncio
import os
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import edge_tts

OUT_DIR = r"C:\Users\Garrett\Sports\apps\web\public\brand\higgsfield\week7-sunday-2026-10-25"
ARTIFACT_DIR = r"C:\Users\Garrett\.gemini\antigravity-cli\brain\d000bbd4-91ab-4dfe-9515-c1173c8bba1d"
ANCHOR_IMG = os.path.join(OUT_DIR, "gse_week7_quant_host_command_center_9x16.png")
ANCHOR_VID = os.path.join(OUT_DIR, "gse_week7_video1_quant_command_center_9x16.mp4")

os.makedirs(OUT_DIR, exist_ok=True)

# Clean up the previous overly sexualized tunnel/war-room files so only professional broadcast assets remain
for stale in [
    "gse_week7_quant_host_stadium_tunnel_9x16.png",
    "gse_week7_quant_host_war_room_16x9.png",
    "gse_week7_video2_stadium_tunnel_walk_9x16.mp4",
    "gse_week7_video2_stadium_tunnel_walk_9x16_thumb.webp",
    "gse_week7_video3_war_room_cinematic_16x9.mp4",
    "gse_week7_sunday_master_supercut_9x16.mp4",
]:
    for d in (OUT_DIR, ARTIFACT_DIR):
        p = os.path.join(d, stale)
        if os.path.exists(p):
            try:
                os.remove(p)
            except OSError:
                pass


def load_font(size: int, bold: bool = False, mono: bool = False):
    candidates = []
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


# Palette
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


def get_modest_anchor_badge(size=(210, 210)) -> Image.Image:
    """Crops strictly head & leather-jacket shoulders from Keyframe 1 (100% modest studio portrait)."""
    if not os.path.exists(ANCHOR_IMG):
        img = Image.new("RGB", size, (15, 22, 36))
        return img
    src = Image.open(ANCHOR_IMG).convert("RGB")
    # Crop strictly face + leather jacket shoulders: x=260..890, y=380..1010 (630x630 square)
    cropped = src.crop((260, 380, 890, 1010)).resize(size, Image.Resampling.LANCZOS)
    # Add rounded border in Orbital Cyan
    badge = Image.new("RGBA", (size[0] + 8, size[1] + 8), (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)
    draw.rounded_rectangle([0, 0, size[0] + 7, size[1] + 7], radius=22, fill=CYAN + (255,))
    mask = Image.new("L", size, 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=18, fill=255)
    badge.paste(cropped, (4, 4), mask)
    return badge


def draw_header_9x16(draw: ImageDraw.ImageDraw, canvas: Image.Image, chapter_tag: str, title: str, subtitle: str):
    # Subtle top gradient glow
    draw.rectangle([0, 0, 1080, 290], fill=(8, 13, 24))
    draw.line([(0, 290), (1080, 290)], fill=CYAN, width=3)

    # Open-orbital G emblem top-left
    draw.arc([42, 46, 106, 110], start=35, end=330, fill=CYAN, width=6)
    draw.line([(74, 78), (112, 54)], fill=MAGENTA, width=5)

    f_brand = load_font(22, bold=True, mono=True)
    f_tag = load_font(20, bold=True, mono=True)
    f_title = load_font(42, bold=True)
    f_sub = load_font(22, bold=False)

    draw.text((124, 50), "GALAXY SPORTS EDGE // ENGINE v5.3", font=f_brand, fill=CYAN)
    draw.rounded_rectangle([124, 84, 124 + len(chapter_tag) * 13 + 24, 116], radius=8, fill=(24, 18, 48), outline=VIOLET, width=2)
    draw.text((136, 88), chapter_tag, font=f_tag, fill=MAGENTA)

    draw.text((42, 136), title, font=f_title, fill=WHITE)
    draw.text((42, 194), subtitle, font=f_sub, fill=MUTED)
    draw.text((42, 232), "10,000-TRIAL MARKOV + SHIN DE-VIG + 6 GATES + LIVE ~typesafe/jev-latest", font=load_font(18, bold=True, mono=True), fill=EMERALD)

    # Paste modest studio quant anchor badge at top-right (leave space for video PIP overlay too)
    badge = get_modest_anchor_badge((210, 210))
    canvas.paste(badge, (828, 38), badge)
    draw.rounded_rectangle([832, 216, 1034, 246], radius=6, fill=(5, 7, 11, 230), outline=CYAN, width=1)
    draw.text((846, 221), "LIVE QUANT DESK", font=load_font(16, bold=True, mono=True), fill=CYAN)


def draw_footer_9x16(draw: ImageDraw.ImageDraw, page_label: str):
    draw.rectangle([0, 1830, 1080, 1920], fill=(8, 12, 20))
    draw.line([(0, 1830), (1080, 1830)], fill=VIOLET, width=2)
    f_foot = load_font(20, bold=True, mono=True)
    draw.text((42, 1860), "WE'RE NOT AI. WE'RE MATH YOU CAN READ. // CONFIDENCE = SCORE /100", font=f_foot, fill=MUTED)
    draw.text((860, 1860), page_label, font=f_foot, fill=CYAN)


def build_slide_1_games_top() -> str:
    """Slide 1: Top 6 High-Conviction Week 7 Game Plays (Spreads, Totals, Moneylines)."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "SUNDAY OCT 25, 2026 // PART 1 OF 6",
        "WEEK 7 GAME PICKS (TOP LOCKS)",
        "Verified Live DraftKings Lines • Shin Fair Prob • JEV Certified",
    )

    games = [
        {
            "matchup": "KC @ SEA (SNF 7:20 PM)",
            "proj": "Proj: KC 23.6 - SEA 21.3 (KC -2.3, Tot 44.9)",
            "plays": "PLAY: KC +3 (-120)  |  PLAY: KC ML +124  |  PLAY: OVER 42.5 (-110)",
            "metrics": "Spread Edge +13.33% • EV +20.26% • ML Edge +14.43% • Score 84/100",
            "why": "Undefeated 5-0 KC (+1.682 shrunk YBC/rush vs SEA 0.848) + K. Walker revenge; Charbonnet OUT.",
            "badge": "JEV: CERTIFIED (84/100)",
            "color": EMERALD,
        },
        {
            "matchup": "MIA @ NYJ (12:00 PM CT)",
            "proj": "Proj: NYJ 22.0 - MIA 20.6 (NYJ -1.4, Tot 42.6)",
            "plays": "PLAY: MIA +3.5 (-105)  |  PLAY: MIA ML +180  |  PLAY: OVER 39.5 (-102)",
            "metrics": "Spread Edge +7.31% • EV +9.67% • Total Edge +11.51% • Score 84/100",
            "why": "Breece Hall Questionable (Quad, DK props pulled); MIA +0.16 EPA/play vs NYJ 43.3% blitz.",
            "badge": "JEV: CERTIFIED (84/100)",
            "color": EMERALD,
        },
        {
            "matchup": "DEN @ ARI (3:05 PM CT)",
            "proj": "Proj: DEN 23.5 - ARI 21.3 (DEN -2.1, Tot 44.8)",
            "plays": "PLAY: ARI +4.5 (-105)  |  PLAY: ARI ML +195  |  PLAY: OVER 42.5 (-120)",
            "metrics": "Spread Edge +8.29% • EV +11.59% • ML Edge +11.88% • Score 84/100",
            "why": "State Farm Stadium dome; DEN 0-5 ATS as favorite while Jacoby Brissett funnels to Trey McBride.",
            "badge": "JEV: CERTIFIED (84/100)",
            "color": EMERALD,
        },
        {
            "matchup": "NYG @ HOU (12:00 PM — LIVE AT NRG!)",
            "proj": "Proj: HOU 26.4 - NYG 19.2 (HOU -7.2, Tot 45.6)",
            "plays": "PLAY: NYG +10.5 (-112)  |  PLAY: OVER 42.5 (-112)  |  SPRINKLE: NYG ML +400",
            "metrics": "Spread Edge +9.30% • EV +13.10% • Total Edge +9.02% • Score 83/100",
            "why": "HOU wins by ~7.2 in 10k sims (70.7% win prob), leaving massive +9.3% backdoor value on +10.5 & Over 42.5.",
            "badge": "NRG STADIUM LOCK (83/100)",
            "color": CYAN,
        },
        {
            "matchup": "IND @ MIN (12:00 PM CT)",
            "proj": "Proj: MIN 25.6 - IND 18.8 (MIN -6.8, Tot 44.4)",
            "plays": "PLAY: OVER 41.5 (-110)  |  VALUE: IND ML +270  |  SPREAD: PASS (+0.23%)",
            "metrics": "Total Edge +8.90% • Total EV +14.80% • ML Edge +5.45% • Score 78/100",
            "why": "Indoor U.S. Bank Stadium fast track projects 44.4 pts (+2.9 pts over 41.5 key total); Spread is a PASS.",
            "badge": "JEV: CERTIFIED (78/100)",
            "color": EMERALD,
        },
        {
            "matchup": "PIT @ NO (8:30 AM PARIS)",
            "proj": "Proj: PIT 24.8 - NO 19.3 (PIT -5.5, Tot 44.1)",
            "plays": "PLAY: PIT -3 (-105)  |  PLAY: PIT ML -155  |  PLAY: OVER 43.5 (-102)",
            "metrics": "Spread Edge +8.56% • EV +12.11% • ML Edge +7.42% • Score 77/100",
            "why": "Baranchik shrunk YBC/rush edge +0.3732 PIT vs NO + T.J. Watt vs rookie Tyler Shough (36.3% blitz).",
            "badge": "JEV: CERTIFIED (77/100)",
            "color": EMERALD,
        },
    ]

    y = 314
    f_m = load_font(27, bold=True)
    f_b = load_font(19, bold=True, mono=True)
    f_p = load_font(23, bold=True, mono=True)
    f_sub = load_font(20, bold=False)
    f_why = load_font(19, bold=False)

    for idx, g in enumerate(games):
        box_h = 232
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=16, fill=bg, outline=g["color"], width=2)
        draw.text((54, y + 16), g["matchup"], font=f_m, fill=WHITE)
        draw.rounded_rectangle([710, y + 14, 1028, y + 48], radius=8, fill=(18, 32, 28), outline=g["color"], width=2)
        draw.text((724, y + 20), g["badge"], font=f_b, fill=g["color"])

        draw.text((54, y + 56), g["proj"], font=f_sub, fill=MUTED)
        draw.text((54, y + 92), g["plays"], font=f_p, fill=CYAN)
        draw.text((54, y + 132), g["metrics"], font=f_b, fill=MAGENTA)
        draw.text((54, y + 172), g["why"], font=f_why, fill=WHITE)
        y += box_h + 16

    draw_footer_9x16(draw, "SLIDE 1 / 6")
    out = os.path.join(OUT_DIR, "board_1_games_top_9x16.png")
    canvas.save(out)
    return out


def build_slide_2_games_remaining() -> str:
    """Slide 2: Remaining 7 Week 7 Games (CAR, DET, CIN, PHI, TEN, LAR, and SF@ATL Pass)."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "SUNDAY OCT 25, 2026 // PART 2 OF 6",
        "FULL 13-GAME BOARD & PASSES",
        "Every Remaining Sunday & Monday Matchup + Strict Pass Discipline",
    )

    games = [
        {
            "matchup": "TB @ CAR (12:00 PM CT)",
            "proj": "Proj: CAR 25.4 - TB 21.8 (CAR -3.6, Tot 47.2)  |  DK: CAR -3, O/U 44.5",
            "plays": "PLAY: CAR -3 (-102) [Edge +3.60%]  |  PLAY: OVER 44.5 (-110) [Edge +8.48%]",
            "why": "Emeka Egbuka OUT for TB; CAR #4 offense in Footballguys (25.4 pts) with McMillan, Coker & Hubbard.",
            "badge": "SCORE 77/100 • CERTIFIED",
            "color": EMERALD,
        },
        {
            "matchup": "GB @ DET (12:00 PM CT — FORD FIELD DOME)",
            "proj": "Proj: DET 29.4 - GB 24.8 (DET -4.7, Tot 54.2)  |  DK: DET -3.5, O/U 55.5",
            "plays": "PLAY: DET -3.5 (+100) [Edge +5.80%, EV +7.06%]  |  PLAY: UNDER 55.5 (-110) [Edge +4.11%]",
            "why": "Jahmyr Gibbs 80% snaps (Montgomery OUT) controls clock; DET covers -3.5 at +100 while staying under 55.5.",
            "badge": "SCORE 71/100 • CERTIFIED",
            "color": EMERALD,
        },
        {
            "matchup": "CIN @ BAL (12:00 PM CT — LAMAR JACKSON OUT)",
            "proj": "Proj: CIN 25.9 - BAL 21.4 (CIN -4.5, Tot 47.3)  |  DK: CIN -3, O/U 46.5",
            "plays": "PLAY: CIN -3 (-105) [Edge +5.51%]  |  PLAY: CIN ML -148 [Edge +5.68%]  |  PLAY: OVER 46.5",
            "why": "Lamar Jackson OUT (Tyler Huntley starting); Joe Burrow + Ja'Marr Chase vs depleted BAL secondary.",
            "badge": "SCORE 70/100 • CERTIFIED",
            "color": EMERALD,
        },
        {
            "matchup": "DAL @ PHI (MON 7:15 PM CT — JALEN HURTS IR)",
            "proj": "Proj: DAL 23.8 - PHI 20.6 (DAL -3.2, Tot 44.4)  |  DK: DAL -4.5, O/U 43.5",
            "plays": "PLAY: PHI ML +170 [Edge +5.48%]  |  LEAN: PHI +4.5 (-112) [Edge +3.44%]  |  TOT: PASS",
            "why": "Market over-steamed DAL from -2.5 to -4.5 on Hurts IR news; Saquon + Vic Fangio keep PHI live at home.",
            "badge": "SCORE 70/100 • CERTIFIED",
            "color": CYAN,
        },
        {
            "matchup": "CLE @ TEN (12:00 PM CT)",
            "proj": "Proj: CLE 19.6 - TEN 19.1 (CLE -0.5, Tot 38.6)  |  DK: CLE -1.5, O/U 36.5",
            "plays": "PLAY: OVER 36.5 (-118) [Edge +4.73%]  |  LEAN: TEN +1.5 (-110) & TEN ML +110",
            "why": "Cam Ward vs Shedeur Sanders; total steamed down too far to 36.5 vs our 38.6 median projection.",
            "badge": "SCORE 68/100 • CERTIFIED",
            "color": CYAN,
        },
        {
            "matchup": "LAR @ LV (3:25 PM CT — PUKA PROPS PULLED)",
            "proj": "Proj: LAR 26.0 - LV 21.9 (LAR -4.1, Tot 47.9)  |  DK: LAR -3.5, O/U 48.5",
            "plays": "PLAY: LAR -3.5 (+100) [Edge +4.18%, EV +3.81%]  |  TOTAL & ML: PASS",
            "why": "LAR +1.085 shrunk YBC/rush trench advantage with Kyren Williams + Jared Verse vs LV OL.",
            "badge": "SCORE 67/100 • CERTIFIED",
            "color": CYAN,
        },
        {
            "matchup": "SF @ ATL (12:00 PM CT — HONEST PASS DISCIPLINE)",
            "proj": "Proj: SF 26.8 - ATL 23.7 (SF -3.1, Tot 50.5)  |  DK: SF -2.5, O/U 50.5",
            "plays": "SPREAD: PASS (+0.77% Edge)  |  TOTAL: PASS (+1.04% Edge)  |  LEAN: SF ML -142",
            "why": "Line is razor-sharp (50.5 proj vs 50.5 DK). We PASS the game side/total and attack SF player props!",
            "badge": "SCORE 64/100 • ENGINE PASS",
            "color": AMBER,
        },
    ]

    y = 308
    f_m = load_font(24, bold=True)
    f_b = load_font(18, bold=True, mono=True)
    f_p = load_font(21, bold=True, mono=True)
    f_sub = load_font(18, bold=False)

    for idx, g in enumerate(games):
        box_h = 198
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=14, fill=bg, outline=g["color"], width=2)
        draw.text((52, y + 14), g["matchup"], font=f_m, fill=WHITE)
        draw.rounded_rectangle([720, y + 12, 1028, y + 44], radius=8, fill=(18, 24, 36), outline=g["color"], width=1)
        draw.text((734, y + 17), g["badge"], font=f_b, fill=g["color"])
        draw.text((52, y + 52), g["proj"], font=f_sub, fill=MUTED)
        draw.text((52, y + 86), g["plays"], font=f_p, fill=CYAN)
        draw.text((52, y + 124), g["why"], font=f_sub, fill=WHITE)
        y += box_h + 14

    draw_footer_9x16(draw, "SLIDE 2 / 6")
    out = os.path.join(OUT_DIR, "board_2_games_remaining_9x16.png")
    canvas.save(out)
    return out


def build_slide_3_top_props() -> str:
    """Slide 3: Top 14 Highest-Edge WR/RB/QB Player Props (Score 85/100)."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "SUNDAY OCT 25, 2026 // PART 3 OF 6",
        "TOP 14 PLAYER PROPS (85/100)",
        "Negative-Binomial / Gamma Target-Catch-YAC Quantiles vs Live DK",
    )

    props = [
        ("Brandin Cooks (SF WR)", "OVER 24.5 Rec Yds (-115)", "Mean 42.4 (P90 71.4)", "Edge +29.08% | EV +49.1%", "Evans/Deebo OUT, Kirk Q-Calf • JEV CERTIFIED"),
        ("Jordan Watkins (SF WR)", "OVER 23.5 Rec Yds (-110)", "Mean 39.4 (P90 66.9)", "Edge +27.34% | EV +46.8%", "76% W6 snaps (+41.7% shock) • 85/100"),
        ("Ashton Jeanty (LV RB) *NEW*", "OVER 26.5 Rec Yds (-109)", "Mean 38.9 (P90 61.6)", "Edge +25.68% | EV +43.6%", "41.8 rec yds/gm (15.3 yds > line) • JEV CERTIFIED"),
        ("Zay Flowers (BAL WR)", "UNDER 63.5 Rec Yds (-112)", "Mean 51.9 (P50 46.9)", "Edge +24.98% | EV +41.9%", "Lamar Jackson OUT -> Huntley compressed pass"),
        ("Chris Godwin Jr. (TB WR)", "OVER 46.5 Rec Yds (-113)", "Mean 64.5 (P90 97.8)", "Edge +24.48% | EV +40.8%", "Emeka Egbuka OUT; 90% snaps, 7.2 tgt/gm"),
        ("Keenan Allen (IND WR)", "OVER 41.5 Rec Yds (-109)", "Mean 56.4 (P90 85.7)", "Edge +23.46% | EV +39.6%", "Tyler Warren OUT; unsteamed vs Downs 50.5"),
        ("Kyren Williams (LAR RB)", "OVER 69.5 Rush Yds (-110)", "Mean 84.0 (P90 116.3)", "Edge +22.75% | EV +38.0%", "Puka props pulled; +1.085 YBC/rush edge"),
        ("Ja'Marr Chase (CIN WR)", "OVER 81.5 Rec Yds (-114)", "Mean 107.5 (P90 158.4)", "Edge +22.71% | EV +37.3%", "104.2 yds/gm & 8.8 rec/gm vs BAL"),
        ("Tre Tucker (LV WR) *NEW*", "OVER 42.5 Rec Yds (-112)", "Mean 60.4 (P90 96.2)", "Edge +21.90% | EV +36.1%", "89% snaps, 61.8 yds/gm • JEV CERTIFIED"),
        ("Malik Nabers (NYG WR) *NRG*", "OVER 68.5 Rec Yds (-113)", "Mean 89.4 (P90 131.9)", "Edge +21.78% | EV +35.7%", "82.3 yds/gm & 6.8 rec/gm Live at Texans Game!"),
        ("Tyler Shough (NO QB)", "UNDER 221.5 Pass Yds (-114)", "Mean 196.5 (P50 191.2)", "Edge +21.17% | EV +34.2%", "Rookie vs PIT pass rush (36.3% blitz rate)"),
        ("Bucky Irving (TB RB)", "OVER 65.5 Rush Yds (-109)", "Mean 75.8 (P90 105.5)", "Edge +18.31% | EV +29.7%", "78% W6 snaps, 80.2 rush yds/gm • JEV CERTIFIED"),
        ("Chuba Hubbard (CAR RB)", "OVER 68.5 Rush Yds (-109)", "Mean 78.4 (P90 110.1)", "Edge +16.67% | EV +26.6%", "CAR -3 home scripts • JEV CERTIFIED"),
        ("CeeDee Lamb (DAL WR)", "OVER 83.5 Rec Yds (-112)", "Mean 103.6 (P90 151.6)", "Edge +17.16% | EV +27.1%", "96.2 yds/gm & 8.0 rec/gm MNF • JEV CERTIFIED"),
    ]

    y = 304
    f_name = load_font(21, bold=True)
    f_line = load_font(20, bold=True, mono=True)
    f_meta = load_font(17, bold=False, mono=True)
    f_why = load_font(17, bold=False)

    for idx, (player, line, quant, edge, why) in enumerate(props):
        box_h = 98
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        border = EMERALD if "CERTIFIED" in why or "*NRG*" in player else CYAN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=10, fill=bg, outline=border, width=2)
        draw.text((48, y + 10), player, font=f_name, fill=WHITE)
        draw.text((430, y + 10), line, font=f_line, fill=CYAN)
        draw.text((775, y + 10), edge, font=f_meta, fill=MAGENTA)
        draw.text((48, y + 52), f"{quant}  •  {why}", font=f_why, fill=MUTED)
        y += box_h + 10

    draw_footer_9x16(draw, "SLIDE 3 / 6")
    out = os.path.join(OUT_DIR, "board_3_top_props_9x16.png")
    canvas.save(out)
    return out


def build_slide_4_te_day_and_remaining_props() -> str:
    """Slide 4: National Tight Ends Day 8-Pack + Remaining 11 Qualified Props (All 33 Total)."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "SUNDAY OCT 25, 2026 // PART 4 OF 6",
        "NATIONAL TE DAY 8-PACK + PROPS",
        "All 8 National Tight Ends Day Plays + Remaining 11 Qualified Props",
    )

    # Section A: National Tight Ends Day 8-Pack
    draw.rounded_rectangle([32, 306, 1048, 350], radius=8, fill=(28, 16, 48), outline=MAGENTA, width=2)
    draw.text((48, 315), "NATIONAL TIGHT ENDS DAY 8-PACK (HISTORICAL +22% TE TARGET SHARE BOOST)", font=load_font(21, bold=True, mono=True), fill=MAGENTA)

    te_props = [
        ("1. George Kittle (SF TE)", "OVER 71.5 Rec Yds (-113)", "Mean 92.3 | Edge +20.73% | EV +33.7% | 89% snaps, Evans/Deebo OUT (85/100)"),
        ("2. Travis Kelce (KC TE)", "OVER 44.5 Rec Yds (-111)", "Mean 56.8 | Edge +16.06% | EV +25.2% | Rashee Rice OUT, SNF vs SEA (85/100)"),
        ("3. Isaiah Likely (NYG TE)", "OVER 49.5 Rec Yds (-109)", "Mean 62.2 | Edge +15.49% | EV +24.6% | 91% snaps, Theo Johnson OUT — LIVE AT NRG! (84/100)"),
        ("4. Sam LaPorta (DET TE)", "OVER 49.5 Rec Yds (-111)", "Mean 61.6 | Edge +14.79% | EV +22.8% | 63.2 yds/gm, 55.5 dome total • JEV CERTIFIED (84/100)"),
        ("5. Trey McBride (ARI TE)", "OVER 61.5 Rec Yds (-110)", "Mean 70.6 | Edge +14.23% | EV +21.7% | 8.2 rec/gm, reverse-steamed down 4 yds (83/100)"),
        ("6. Brock Bowers (LV TE)", "OVER 70.5 Rec Yds (-112)", "Mean 81.9 | Edge +13.79% | EV +20.8% | 98% snaps, 95.5 yds/gm #1 Overall TE (82/100)"),
        ("7. Cade Otton (TB TE)", "OVER 39.5 Rec Yds (-111)", "Mean 49.3 | Edge +13.26% | EV +19.8% | 93% snaps, Egbuka OUT • JEV CERTIFIED (81/100)"),
        ("8. T.J. Hockenson (MIN TE)", "OVER 35.5 Rec Yds (-115)", "Mean 44.6 | Edge +12.90% | EV +18.9% | #4 TE (+0.63 EPA/tgt), dropped 3 yds from open (81/100)"),
    ]

    y = 360
    f_p = load_font(19, bold=True)
    f_l = load_font(19, bold=True, mono=True)
    f_m = load_font(16, bold=False)

    for idx, (p, l, m) in enumerate(te_props):
        box_h = 74
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=8, fill=bg, outline=VIOLET, width=1)
        draw.text((48, y + 8), p, font=f_p, fill=WHITE)
        draw.text((430, y + 8), l, font=f_l, fill=CYAN)
        draw.text((48, y + 40), m, font=f_m, fill=MUTED)
        y += box_h + 8

    # Section B: Remaining 11 Qualified Props (completing all 33!)
    draw.rounded_rectangle([32, y + 6, 1048, y + 46], radius=8, fill=(14, 32, 36), outline=CYAN, width=2)
    draw.text((48, y + 14), "MORE QUALIFIED PROPS (COMPLETING ALL 33 VERIFIED PLAYS)", font=load_font(20, bold=True, mono=True), fill=CYAN)
    y += 56

    rest_props = [
        ("Christian Watson (GB WR) *NEW*", "OVER 77.5 Rec Yds (-114) | Mean 89.5 | Edge +17.01% | EV +26.3% | 94% snaps vs DET 31st WR D (85/100)"),
        ("Jaxon Smith-Njigba (SEA WR)", "OVER 72.5 Rec Yds (-112) | Mean 86.7 | Edge +15.86% | EV +24.6% | Charbonnet OUT -> pass funnel (85/100)"),
        ("Jaylen Warren (PIT RB)", "OVER 67.5 Rush Yds (-112) | Mean 77.4 | Edge +15.69% | EV +24.3% | PIT +0.3732 YBC edge in Paris (85/100)"),
        ("Jahmyr Gibbs (DET RB)", "OVER 74.5 Rush Yds (-110) | Mean 84.9 | Edge +15.39% | EV +23.9% | Montgomery OUT, 80% snaps (84/100)"),
        ("Derrick Henry (BAL RB)", "OVER 79.5 Rush Yds (-111) | Mean 90.0 | Edge +14.80% | EV +22.8% | Lamar OUT -> 22+ carries (84/100)"),
        ("Drake London (ATL WR)", "OVER 70.5 Rec Yds (-114) | Mean 84.5 | Edge +14.31% | EV +21.6% | 91% snaps, 86.2 yds/gm (83/100)"),
        ("Kenneth Walker III (KC RB)", "OVER 68.5 Rush Yds (-114) | Mean 77.4 | Edge +14.01% | EV +21.1% | Seattle revenge homecoming (82/100)"),
        ("Germie Bernard (PIT WR)", "OVER 54.5 Rec Yds (-112) | Mean 64.9 | Edge +13.21% | EV +19.7% | 92% snaps (+21% shock) (81/100)"),
        ("Garrett Wilson (NYJ WR)", "OVER 68.5 Rec Yds (-112) | Mean 79.3 | Edge +12.19% | EV +17.7% | Breece Q-Quad -> pass lean (80/100)"),
        ("Jalen Coker (CAR WR) *NEW*", "OVER 68.5 Rec Yds (-113) | Mean 79.1 | Edge +11.88% | EV +17.0% | 93% snaps, 79.8 yds/gm (80/100)"),
        ("Matthew Golden (GB WR) & D. Boston (CLE)", "Golden OVER 74.5 (-111, +11.61% Edge, 80/100)  •  Denzel Boston OVER 52.5 (-113, +10.01% Edge, 78/100)"),
    ]

    for idx, (p, desc) in enumerate(rest_props):
        box_h = 62
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=6, fill=bg, outline=(35, 50, 75), width=1)
        draw.text((46, y + 6), p, font=load_font(17, bold=True), fill=WHITE)
        draw.text((46, y + 32), desc, font=load_font(15, bold=False, mono=True), fill=CYAN)
        y += box_h + 6

    draw_footer_9x16(draw, "SLIDE 4 / 6")
    out = os.path.join(OUT_DIR, "board_4_te_day_and_props_9x16.png")
    canvas.save(out)
    return out


def build_slide_5_passes_and_sgps() -> str:
    """Slide 5: Engine Injury/Steam Traps Refused + All 6 Approved Copula SGPs."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "SUNDAY OCT 25, 2026 // PART 5 OF 6",
        "INJURY TRAPS REFUSED + 6 SGPs",
        "Why We Passed Puka, Breece, Kirk & Kraft + Clayton Copula SGPs",
    )

    draw.rounded_rectangle([32, 306, 1048, 348], radius=8, fill=(45, 18, 24), outline=AMBER, width=2)
    draw.text((48, 314), "ENGINE INJURY & STEAM REFUSALS (DO NOT BET THESE 6 TRAPS!)", font=load_font(20, bold=True, mono=True), fill=AMBER)

    passes = [
        ("Puka Nacua (LAR WR)", "DK YARDAGE PROPS PULLED", "SiriusXM Oct 22-24 mid-week practice exit (hip/hernia/calf). Pivot -> Bowers O70.5 & Kyren O69.5."),
        ("Breece Hall (NYJ RB)", "QUESTIONABLE (QUAD)", "0.7 FP proj (RB73), DK rushing props pulled. Pivot -> Braelon Allen (87% W6 snaps, +26.4% shock)."),
        ("Christian Kirk (SF WR)", "QUESTIONABLE (CALF) / IR", "ESPN IR tag + Q-Calf (6.7 proj). Pivot -> George Kittle O71.5, Brandin Cooks O24.5, Watkins O23.5."),
        ("Josh Downs (IND WR)", "STEAMED +8 YDS (42.5->50.5)", "Public steamed Downs 8 yds on Warren OUT. Pivot -> unsteamed Keenan Allen OVER 41.5 (-109)."),
        ("Tucker Kraft (GB TE)", "STEAMED +10 YDS (40.5->50.5)", "National TE Day public trap 9 yds above his 41.5 avg. Pivot -> Sam LaPorta OVER 49.5 (-111)."),
        ("Dallas Goedert (PHI TE)", "Q (KNEE) + STEAMED +6 YDS", "Hurts IR (Tanner McKee backup QB) + steamed 42.5 -> 48.5. Engine passes."),
    ]

    y = 358
    for idx, (p, tag, reason) in enumerate(passes):
        box_h = 74
        bg = (24, 14, 20) if idx % 2 == 0 else (18, 12, 18)
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=8, fill=bg, outline=AMBER, width=1)
        draw.text((48, y + 8), f"PASS: {p}", font=load_font(19, bold=True), fill=WHITE)
        draw.text((420, y + 8), tag, font=load_font(18, bold=True, mono=True), fill=AMBER)
        draw.text((48, y + 40), reason, font=load_font(16, bold=False), fill=MUTED)
        y += box_h + 8

    # Section B: 6 Approved Copula SGPs
    draw.rounded_rectangle([32, y + 8, 1048, y + 50], radius=8, fill=(14, 34, 28), outline=EMERALD, width=2)
    draw.text((48, y + 16), "6 APPROVED CLAYTON COPULA SGPs & TE DAY PARLAY (`sgp-copula.ts`)", font=load_font(20, bold=True, mono=True), fill=EMERALD)
    y += 60

    sgps = [
        ("1. TEXANS GAME LIVE SWEAT SGP (NYG @ HOU — LIVE AT NRG!)", "NYG +10.5 (-112) + OVER 42.5 (-112) + Isaiah Likely OVER 49.5 Rec Yds (-109)", "Book +450 vs Fair +354  •  Edge +3.85%  •  EV +21.21% (Or add Malik Nabers OVER 68.5 Rec Yds!)"),
        ("2. PARIS TRENCH CONTROL SGP (PIT @ NO — 8:30 AM CT)", "PIT -3 (-105) + Jaylen Warren OVER 67.5 Rush Yds (-112) + Tyler Shough UNDER 221.5 Pass Yds", "Book +475 vs Fair +389  •  Copula RB-DEF (theta +0.18)  •  Edge +3.03%  •  EV +17.46%"),
        ("3. BENGALS ROAD ALPHA SGP (CIN @ BAL — 12:00 PM CT)", "CIN -3 (-105) + Ja'Marr Chase OVER 81.5 Rec Yds (-114) + Derrick Henry OVER 79.5 Rush Yds", "Book +460 vs Fair +348  •  Lamar Jackson OUT  •  Edge +4.47%  •  EV +25.03%"),
        ("4. RAMS TRENCH & BOWERS SGP (LAR @ LV — PUKA PIVOT)", "LAR -3.5 (+100) + Kyren Williams OVER 69.5 Rush Yds (-110) + Brock Bowers OVER 70.5 Rec Yds", "Book +485 vs Fair +362  •  Puka Props Pulled Pivot  •  Edge +4.12%  •  EV +26.40%"),
        ("5. CHIEFS UNDEFEATED ROAD DOG SNF SGP (KC @ SEA — 7:20 PM)", "KC +3 (-120) + Kenneth Walker III OVER 68.5 Rush Yds (-114) + JSN OVER 72.5 Rec Yds (-112)", "Book +465 vs Fair +396  •  5-0 KC Road Underdog + Walker Homecoming  •  EV +14.04%"),
        ("6. NATIONAL TIGHT ENDS DAY 4-LEG VOLUME PARLAY (+1240)", "George Kittle O71.5 + Brock Bowers O70.5 + Isaiah Likely O49.5 + Trey McBride O61.5", "DK Boosted +1240 (Standard +1128) vs Fair +587 (14.56% prob)  •  EV +95.1%"),
    ]

    for idx, (title, legs, ev) in enumerate(sgps):
        box_h = 108
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        border = MAGENTA if "NATIONAL" in title or "TEXANS" in title else EMERALD
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=10, fill=bg, outline=border, width=2)
        draw.text((48, y + 10), title, font=load_font(19, bold=True), fill=WHITE)
        draw.text((48, y + 40), legs, font=load_font(18, bold=True, mono=True), fill=CYAN)
        draw.text((48, y + 72), ev, font=load_font(17, bold=False, mono=True), fill=EMERALD)
        y += box_h + 10

    draw_footer_9x16(draw, "SLIDE 5 / 6")
    out = os.path.join(OUT_DIR, "board_5_passes_and_sgps_9x16.png")
    canvas.save(out)
    return out


def build_slide_6_dad_and_garrett_dfs() -> str:
    """Slide 6: Garrett & Dad's 50-Person Cash Game DFS Slate (Sun Noon - Mon Night + Main Slate Swap)."""
    canvas = Image.new("RGB", (1080, 1920), BG_OBSIDIAN)
    draw = ImageDraw.Draw(canvas)
    draw_header_9x16(
        draw,
        canvas,
        "SUNDAY OCT 25, 2026 // PART 6 OF 6",
        "GARRETT & DAD'S 50-MAN CASH DFS",
        "Exact $50,000 Cap • 157.60 Proj Pts • 95.0 Floor • 10k Correlated Sim",
    )

    draw.rounded_rectangle([32, 306, 1048, 362], radius=10, fill=(14, 34, 28), outline=EMERALD, width=2)
    draw.text((48, 314), "OPTION A: SUN NOON – MON NIGHT SLATE (12 GAMES, INCLUDES SNF & MNF)", font=load_font(20, bold=True, mono=True), fill=EMERALD)
    draw.text((48, 338), "Salary: $50,000 ($0 Rem) | Proj: 157.60 Pts | Cash Floor: 95.0 | 10k Sim Mean: 157.7 (P90: 193.7)", font=load_font(16, bold=False, mono=True), fill=WHITE)

    lineup = [
        ("QB", "Jordan Love", "GB @ DET (Sun 12:00)", "$6,800", "21.46 Pts", "Floor 13.5 / Ceil 32.5", "55.5 dome total at Ford Field; #1 QB proj vs DET 31st WR D"),
        ("RB1", "Jahmyr Gibbs", "GB @ DET (Sun 12:00)", "$7,800", "26.20 Pts", "Floor 16.5 / Ceil 37.5", "David Montgomery OUT (IR); 80% W6 snaps, #1 overall RB lock"),
        ("RB2", "Kenneth Walker III", "KC @ SEA (Sun 7:20 SNF)", "$6,700", "20.05 Pts", "Floor 13.2 / Ceil 30.5", "80% W6 snaps (+20% shock), Seattle homecoming behind KC OL"),
        ("WR1", "Christian Watson", "GB @ DET (Sun 12:00)", "$5,900", "17.50 Pts", "Floor 10.0 / Ceil 29.0", "94% W6 snaps (+21.4% shock), 89.7 yds/gm stacked w/ Love"),
        ("WR2", "Jalen Coker", "TB @ CAR (Sun 12:00)", "$4,900", "15.80 Pts", "Floor 9.0 / Ceil 25.5", "93% W6 snaps (+19.0% shock), 6.0 rec/gm & 79.8 yds/gm (3.22x)"),
        ("WR3", "Brandin Cooks", "SF @ ATL (Sun 12:00)", "$4,200", "12.80 Pts", "Floor 7.8 / Ceil 21.5", "Evans & Deebo OUT + Kirk Q-Calf; +26% snap shock in 50.5 dome"),
        ("TE", "George Kittle", "SF @ ATL (Sun 12:00)", "$5,900", "17.80 Pts", "Floor 11.5 / Ceil 28.5", "National TE Day Alpha: 89% snaps, 84.2 yds/gm (#1 SF target)"),
        ("FLEX", "Isaiah Likely", "NYG @ HOU (LIVE AT NRG!)", "$4,500", "14.81 Pts", "Floor 8.5 / Ceil 24.0", "Double-TE Cash Lock! Theo Johnson OUT -> 91% snaps at $4,500"),
        ("DST", "Jets DST", "MIA @ NYJ (Sun 12:00)", "$3,200", "10.09 Pts", "Floor 4.0 / Ceil 17.5", "39.5 low total at MetLife; unlocks exact $50,000 cap"),
    ]

    y = 374
    for idx, (pos, name, game, sal, proj, fl_cl, why) in enumerate(lineup):
        box_h = 110
        bg = BG_ROW_ALT if idx % 2 == 0 else BG_ROW_MAIN
        border = CYAN if pos in ("TE", "FLEX") else (45, 65, 95)
        draw.rounded_rectangle([32, y, 1048, y + box_h], radius=10, fill=bg, outline=border, width=2)
        draw.rounded_rectangle([46, y + 12, 126, y + 48], radius=6, fill=(20, 32, 52), outline=CYAN, width=1)
        draw.text((58, y + 18), pos, font=load_font(20, bold=True, mono=True), fill=CYAN)
        draw.text((142, y + 12), name, font=load_font(24, bold=True), fill=WHITE)
        draw.text((460, y + 16), game, font=load_font(18, bold=False), fill=MUTED)
        draw.text((770, y + 14), f"{sal}  •  {proj}", font=load_font(21, bold=True, mono=True), fill=EMERALD)
        draw.text((48, y + 54), f"{fl_cl}   |   {why}", font=load_font(17, bold=False), fill=WHITE)
        y += box_h + 10

    # Option B Box at bottom
    draw.rounded_rectangle([32, y + 6, 1048, 1814], radius=12, fill=(24, 18, 44), outline=MAGENTA, width=2)
    draw.text((48, y + 16), "OPTION B: IF CONTEST IS SUNDAY MAIN SLATE ONLY (10 GAMES, NO SNF/MNF)", font=load_font(21, bold=True, mono=True), fill=MAGENTA)
    draw.text((48, y + 50), "2-Player Swap (Keep other 7 identical):  RB2 Kenneth Walker ($6,700) -> Braelon Allen ($5,200, 14.60 pts, 87% snaps)", font=load_font(18, bold=True), fill=WHITE)
    draw.text((48, y + 80), "                                         WR3 Brandin Cooks ($4,200)  -> Matthew Golden ($5,600, 17.10 pts, 86% snaps)", font=load_font(18, bold=True), fill=WHITE)
    draw.text((48, y + 114), "Main Slate Result: Exact $50,000 Salary  •  156.50 Projected Pts  •  92.0 Floor  •  156.5 Correlated 10k-Sim Mean", font=load_font(18, bold=True, mono=True), fill=CYAN)

    draw_footer_9x16(draw, "SLIDE 6 / 6")
    out = os.path.join(OUT_DIR, "board_6_dad_and_garrett_dfs_9x16.png")
    canvas.save(out)
    return out


async def synth_voiceover(text: str, out_mp3: str):
    comm = edge_tts.Communicate(text, voice="en-US-AvaNeural", rate="+6%")
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
    """Renders a 1080x1920 30fps segment with the slide, live modest studio anchor PIP in top-right, and voiceover + subtle sub-bass."""
    dur = get_audio_duration(voice_mp3) + 0.6
    # Overlay live Kling v3.0 anchor video (cropped strictly to modest head/shoulders: 420x420 at x=150,y=240 of 720x1280 video)
    # scaled to 202x202 at (832, 42) right inside the cyan frame!
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


def build_widescreen_16x9_from_slides(slides: list[str], audio_mp4: str, out_16x9_mp4: str):
    """Creates a 1920x1080 widescreen broadcast version showing pairs of slides side-by-side synced to the master audio."""
    # Extract master audio from the 9:16 master video
    dur = get_audio_duration(audio_mp4)
    pair1 = Image.new("RGB", (1920, 1080), BG_OBSIDIAN)
    pair2 = Image.new("RGB", (1920, 1080), BG_OBSIDIAN)
    pair3 = Image.new("RGB", (1920, 1080), BG_OBSIDIAN)

    def make_pair(s_left: str, s_right: str, title: str, out_p: str):
        im = Image.new("RGB", (1920, 1080), BG_OBSIDIAN)
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 1920, 68], fill=(8, 13, 24))
        d.line([(0, 68), (1920, 68)], fill=CYAN, width=2)
        d.text((32, 18), f"GALAXY SPORTS EDGE // WEEK 7 SUNDAY MASTER SLATE REVEAL — {title}", font=load_font(26, bold=True, mono=True), fill=CYAN)
        im_l = Image.open(s_left).resize((550, 978), Image.Resampling.LANCZOS)
        im_r = Image.open(s_right).resize((550, 978), Image.Resampling.LANCZOS)
        im.paste(im_l, (80, 84))
        im.paste(im_r, (670, 84))
        # Right sidebar summary + modest anchor portrait
        d.rounded_rectangle([1260, 84, 1860, 1062], radius=16, fill=(10, 16, 28), outline=VIOLET, width=2)
        badge = get_modest_anchor_badge((320, 320))
        im.paste(badge, (1400, 110), badge)
        d.text((1300, 460), "LIVE ENGINE TELEMETRY", font=load_font(26, bold=True, mono=True), fill=MAGENTA)
        summary_lines = [
            "• 13 NFL Week 7 Games Simulated",
            "  (10,000 Markov Trials / Game)",
            "• 33 Live DraftKings Props Verified",
            "  (Negative-Binomial/Gamma Quantiles)",
            "• National Tight Ends Day 8-Pack",
            "  (Kittle, Bowers, Likely, McBride,",
            "   LaPorta, Kelce, Otton, Hockenson)",
            "• 6 injury/steam traps REFUSED",
            "  (Puka Nacua, Breece Hall, Kirk,",
            "   Josh Downs, Tucker Kraft, Goedert)",
            "• 6 Clayton Copula SGPs Approved",
            "• Garrett & Dad $50k Cash Lineup:",
            "  Love, Gibbs, Walker/B.Allen, Watson,",
            "  Coker, Cooks/Golden, Kittle, Likely,",
            "  Jets DST -> 157.60 Proj Pts",
            "• Arbitrated by ~typesafe/jev-latest",
        ]
        sy = 510
        for sl in summary_lines:
            d.text((1290, sy), sl, font=load_font(20, bold=False), fill=WHITE if "•" in sl else MUTED)
            sy += 31
        im.save(out_p)

    p1_path = os.path.join(OUT_DIR, "wide_pair_1_games.png")
    p2_path = os.path.join(OUT_DIR, "wide_pair_2_props.png")
    p3_path = os.path.join(OUT_DIR, "wide_pair_3_sgp_dfs.png")
    make_pair(slides[0], slides[1], "ALL 13 GAME PICKS & PROJECTIONS", p1_path)
    make_pair(slides[2], slides[3], "ALL 33 PLAYER PROPS & NATIONAL TE DAY", p2_path)
    make_pair(slides[4], slides[5], "INJURY PASSES, 6 COPULA SGPs & DAD'S CASH DFS", p3_path)

    seg_dur = dur / 3.0
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-t", f"{seg_dur:.2f}", "-i", p1_path,
        "-loop", "1", "-t", f"{seg_dur:.2f}", "-i", p2_path,
        "-loop", "1", "-t", f"{seg_dur:.2f}", "-i", p3_path,
        "-i", audio_mp4,
        "-filter_complex",
        "[0:v]fps=30[v0];[1:v]fps=30[v1];[2:v]fps=30[v2];"
        "[v0][v1][v2]concat=n=3:v=1:a=0[v]",
        "-map", "[v]", "-map", "3:a",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
        "-c:a", "copy", "-shortest",
        out_16x9_mp4,
    ]
    subprocess.run(cmd, check=True)


async def main():
    print("Building 6 high-resolution 1080p broadcast boards...")
    s1 = build_slide_1_games_top()
    s2 = build_slide_2_games_remaining()
    s3 = build_slide_3_top_props()
    s4 = build_slide_4_te_day_and_remaining_props()
    s5 = build_slide_5_passes_and_sgps()
    s6 = build_slide_6_dad_and_garrett_dfs()

    vo_scripts = [
        (
            s1,
            "Welcome to the Galaxy Sports Edge Week 7 Sunday Master Slate for October 25th, National Tight Ends Day. "
            "Every pick is backed by 10,000 Markov simulations, Shin de-vigging, and live JEV arbitration. "
            "Here are our top six game locks: "
            "On Sunday Night Football, undefeated Kansas City plus 3, KC moneyline plus 124, and Over 42.5 at a score of 84 out of 100. "
            "Miami plus 3.5, moneyline plus 180, and Over 39.5 against the Jets with Breece Hall questionable, score 84 out of 100. "
            "Arizona plus 4.5, moneyline plus 195, and Over 42.5 vs Denver, score 84 out of 100. "
            "Live at NRG Stadium for the Texans game, take Giants plus 10.5 and Over 42.5, score 83 out of 100. "
            "Colts-Vikings Over 41.5 indoors at 78 out of 100, and Pittsburgh minus 3 and Over 43.5 in Paris at 77 out of 100.",
            "seg1.mp4",
        ),
        (
            s2,
            "Completing the 13-game board: "
            "Carolina minus 3 and Over 44.5 vs Tampa Bay with Emeka Egbuka out, score 77 out of 100. "
            "Detroit minus 3.5 at even money and Under 55.5 against Green Bay inside Ford Field, score 71 out of 100. "
            "Cincinnati minus 3, moneyline minus 148, and Over 46.5 at Baltimore with Lamar Jackson out, score 70 out of 100. "
            "On Monday Night Football with Jalen Hurts on injured reserve, Philadelphia moneyline plus 170 and plus 4.5 lean, score 70 out of 100. "
            "Cleveland-Tennessee Over 36.5 at 68 out of 100, Rams minus 3.5 at even money at 67 out of 100, "
            "and in 49ers-Falcons we exercise strict pass discipline on the 50.5 spread and total and attack player props instead.",
            "seg2.mp4",
        ),
        (
            s3,
            "Now for our highest-edge Week 7 player props, all scoring 85 out of 100: "
            "With Mike Evans and Deebo Samuel out and Christian Kirk questionable with a calf injury, 49ers receivers Brandin Cooks Over 24.5 receiving yards and Jordan Watkins Over 23.5 are our top two edges on the board. "
            "From our final Intel Master pass: Raiders running back Ashton Jeanty Over 26.5 receiving yards at plus 43.6 percent EV, and Tre Tucker Over 42.5 receiving yards. "
            "Zay Flowers Under 63.5 receiving yards with backup Tyler Huntley starting. "
            "Chris Godwin Over 46.5 receiving yards with Egbuka out. "
            "Keenan Allen Over 41.5 unsteamed receiving yards with Tyler Warren out. "
            "Kyren Williams Over 69.5 rushing yards, Ja'Marr Chase Over 81.5 receiving yards, "
            "Malik Nabers Over 68.5 receiving yards live at NRG Stadium, Tyler Shough Under 221.5 passing yards, "
            "plus Bucky Irving Over 65.5 rushing, Chuba Hubbard Over 68.5 rushing, and CeeDee Lamb Over 83.5 receiving.",
            "seg3.mp4",
        ),
        (
            s4,
            "For National Tight Ends Day, our 8-pack is led by George Kittle Over 71.5 receiving yards, "
            "Travis Kelce Over 44.5, Isaiah Likely Over 49.5 live at NRG Stadium with Theo Johnson out, "
            "Sam LaPorta Over 49.5, Trey McBride Over 61.5, Brock Bowers Over 70.5, Cade Otton Over 39.5, and T.J. Hockenson Over 35.5. "
            "Rounding out all 33 qualified props: Christian Watson Over 77.5 and Matthew Golden Over 74.5 against Detroit's 31st-ranked receiver defense, "
            "Jaxon Smith-Njigba Over 72.5, Jaylen Warren Over 67.5 rushing, Jahmyr Gibbs Over 74.5 rushing, Derrick Henry Over 79.5 rushing, "
            "Drake London Over 70.5, Kenneth Walker Over 68.5 rushing, Germie Bernard Over 54.5, Garrett Wilson Over 68.5, Jalen Coker Over 68.5, and Denzel Boston Over 52.5.",
            "seg4.mp4",
        ),
        (
            s5,
            "Six injury and steam traps our engine explicitly refused: "
            "First, Puka Nacua exited practice mid-week and DraftKings pulled his yardage props—we pivoted to Brock Bowers Over 70.5 and Kyren Williams Over 69.5. "
            "Second, Breece Hall is questionable with a quad and pulled props—pivot to Braelon Allen at an 87 percent snap share. "
            "Third, pass on injured Christian Kirk, and pass on steamed lines for Josh Downs at 50.5, Tucker Kraft at 50.5, and Dallas Goedert at 48.5. "
            "Our six approved Clayton Copula Same-Game Parlays are the Texans Game Live Sweat SGP at plus 450, Paris Trench Control at plus 475, "
            "Bengals Road Alpha at plus 460, Rams Trench and Bowers at plus 485, Chiefs Road Dog SNF at plus 465, "
            "and our National Tight Ends Day 4-Leg Parlay with Kittle, Bowers, Likely, and McBride at plus 1240.",
            "seg5.mp4",
        ),
        (
            s6,
            "Finally, here is Garrett and Dad's 50-person Cash Game DraftKings lineup at an exact 50,000 dollar salary and 157.6 projected points: "
            "Quarterback Jordan Love at 6,800. "
            "Running backs Jahmyr Gibbs at 7,800 with Montgomery out, and Kenneth Walker at 6,700 in his Seattle homecoming. "
            "Wide receivers Christian Watson at 5,900, Jalen Coker at 4,900, and Brandin Cooks at 4,200. "
            "Double Tight End cash lock for National Tight Ends Day: George Kittle at 5,900 and Isaiah Likely in the Flex at 4,500 live at NRG Stadium, plus Jets Defense at 3,200. "
            "If your contest is Sunday Main Slate only, swap Kenneth Walker and Brandin Cooks for Braelon Allen at 5,200 and Matthew Golden at 5,600 for an exact 50,000 dollars and 156.5 points. Have a great time at the Texans game!",
            "seg6.mp4",
        ),
    ]

    seg_files = []
    for idx, (slide_path, script_text, seg_name) in enumerate(vo_scripts, 1):
        mp3_path = os.path.join(OUT_DIR, f"vo_{idx}.mp3")
        seg_mp4 = os.path.join(OUT_DIR, seg_name)
        print(f"Synthesizing voiceover {idx}/6...")
        await synth_voiceover(script_text, mp3_path)
        print(f"Rendering video segment {idx}/6 ({seg_name})...")
        render_segment_mp4(slide_path, mp3_path, seg_mp4)
        seg_files.append(seg_mp4)
        os.remove(mp3_path)

    # Build the 3 Chapter Videos + 1 Complete Master 9:16 Video + 1 Complete Master 16:9 Video
    v_games = os.path.join(OUT_DIR, "gse_week7_reveal_1_all_13_game_picks_9x16.mp4")
    v_props = os.path.join(OUT_DIR, "gse_week7_reveal_2_all_33_props_and_te_day_9x16.mp4")
    v_sgp_dfs = os.path.join(OUT_DIR, "gse_week7_reveal_3_sgps_and_dad_dfs_cash_9x16.mp4")
    v_master_9x16 = os.path.join(OUT_DIR, "gse_week7_MASTER_COMPLETE_SLATE_REVEAL_9x16.mp4")
    v_master_16x9 = os.path.join(OUT_DIR, "gse_week7_MASTER_COMPLETE_SLATE_REVEAL_16x9.mp4")

    concat_mp4s([seg_files[0], seg_files[1]], v_games)
    concat_mp4s([seg_files[2], seg_files[3]], v_props)
    concat_mp4s([seg_files[4], seg_files[5]], v_sgp_dfs)
    concat_mp4s(seg_files, v_master_9x16)
    build_widescreen_16x9_from_slides([s1, s2, s3, s4, s5, s6], v_master_9x16, v_master_16x9)

    for seg in seg_files:
        if os.path.exists(seg):
            os.remove(seg)

    # Copy all final PNG boards and MP4 reveal videos to ARTIFACT_DIR
    for fname in os.listdir(OUT_DIR):
        if fname.startswith(("board_", "wide_pair_", "gse_week7_reveal_", "gse_week7_MASTER_")):
            shutil.copy2(os.path.join(OUT_DIR, fname), os.path.join(ARTIFACT_DIR, fname))

    print("ALL PICK REVEAL VIDEOS & BOARDS COMPLETED!")


if __name__ == "__main__":
    asyncio.run(main())
