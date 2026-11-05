#!/usr/bin/env python3
"""
Humanized Paywall-Protected Social & Chalkboard Renderer for Week 9 TNF (JAX @ BAL).
- Public Social Assets (ZERO free picks leaked beyond 1 teaser; ZERO robot jargon):
  1. C:\\Users\\Garrett\\Downloads\\TNF-JAX-BAL-X-CARD.png (1200x675 — 1 Free Teaser + 9 Locked Plays)
  2. C:\\Users\\Garrett\\Downloads\\TNF-IG-SLIDE-1.png .. TNF-IG-SLIDE-4.png (1080x1350 — Matchup Story + Locked Pack CTA)
  3. C:\\Users\\Garrett\\Downloads\\TNF-JAX-BAL-SCHEME-BREAKDOWN.gif (1200x675 — Chalkboard Scheme Teaser + Locked Pack CTA)
- Private Card for Garrett & His Dad Only (NOT for social posting):
  4. C:\\Users\\Garrett\\Downloads\\PRIVATE-GARRETT-DAD-TOP10-CONFIDENCE.png (1080x1350)
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Tuple

from PIL import Image, ImageDraw, ImageFont

DOWNLOADS_DIR = Path(r"C:\c\wt-week8-forensic\apps\web\public\social\tnf_week9")
ARTIFACT_DIR = Path(r"C:\Users\Garrett\.gemini\antigravity-cli\brain\5197728e-0087-4fdd-81c0-5069895c77e1")
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

BG_DARK = (8, 9, 12)          # #08090C
BG_PANEL = (15, 18, 25)       # #0F1219
BG_CARD = (21, 25, 34)        # #151922
BORDER_SUBTLE = (38, 45, 61)  # #262D3D
TEXT_PRIMARY = (242, 244, 248)
TEXT_MUTED = (168, 177, 194)
ACCENT_CYAN = (0, 212, 255)
ACCENT_GOLD = (245, 196, 81)
ACCENT_GREEN = (34, 197, 94)
ACCENT_RED = (239, 68, 68)


def load_font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    font_dir = Path(r"C:\Windows\Fonts")
    if mono:
        candidates = ["consolab.ttf", "consola.ttf"] if bold else ["consola.ttf", "cour.ttf"]
    elif bold:
        candidates = ["bahnschrift.ttf", "arialbd.ttf", "calibrib.ttf"]
    else:
        candidates = ["calibri.ttf", "arial.ttf", "bahnschrift.ttf"]
    for name in candidates:
        p = font_dir / name
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size=size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_rounded_box(
    draw: ImageDraw.ImageDraw,
    box: Tuple[int, int, int, int],
    fill: Tuple[int, int, int],
    outline: Tuple[int, int, int] = BORDER_SUBTLE,
    width: int = 1,
    radius: int = 10,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


TOP_10_PRIVATE_PICKS: List[Dict[str, Any]] = [
    {
        "rank": 1,
        "player": "Kyle Hamilton (BAL S)",
        "pick": "OVER 6.5 Tackles + Assists (or OVER 3.5 Solo Tackles)",
        "conf": "88/100",
        "proj": "8.0 Projected (5.5 Solo, 2.5 Ast)",
        "reason": "Lines up near the line of scrimmage and cleans up almost every short pass and outside run.",
    },
    {
        "rank": 2,
        "player": "Roquan Smith (BAL LB)",
        "pick": "OVER 8.5 Tackles + Assists",
        "conf": "88/100",
        "proj": "9.5 Projected Tackles + Ast",
        "reason": "Baltimore plays light boxes to stop deep passes, funneling every inside run straight into Roquan.",
    },
    {
        "rank": 3,
        "player": "Brian Thomas Jr. (JAX WR)",
        "pick": "OVER 12.5 Receiving Yards (or OVER 1.5 Receptions)",
        "conf": "88/100",
        "proj": "24.1 Projected Yds (2.1 Catches)",
        "reason": "Can clear this number on a single intermediate throw over the middle against two-high coverage.",
    },
    {
        "rank": 4,
        "player": "Zay Flowers (BAL WR)",
        "pick": "UNDER 4.5 Receptions",
        "conf": "88/100",
        "proj": "2.9 Projected Receptions",
        "reason": "With undrafted rookie Joe Fagnano starting at QB against a 31% blitz, outside receiver volume drops.",
    },
    {
        "rank": 5,
        "player": "Trevor Lawrence (JAX QB)",
        "pick": "OVER 11.5 Rushing Yards (or OVER 3.5 Carries)",
        "conf": "88/100",
        "proj": "17.3 Projected Rush Yds (4.8 Carries)",
        "reason": "Baltimore drops two deep safeties on 60% of snaps, leaving wide-open scramble lanes up the middle.",
    },
    {
        "rank": 6,
        "player": "Joe Fagnano (BAL QB)",
        "pick": "OVER 0.5 Interceptions",
        "conf": "88/100",
        "proj": "1.2 Projected INTs",
        "reason": "Undrafted rookie making his prime-time start while trailing in the second half against heavy pressure.",
    },
    {
        "rank": 7,
        "player": "Mark Andrews (BAL TE)",
        "pick": "OVER 2.5 Receptions (and OVER 18.5 Rec Yds)",
        "conf": "88/100",
        "proj": "3.7 Projected Catches (27.7 Yds)",
        "reason": "When Jacksonville brings heat, Andrews over the middle is a rookie quarterback's #1 safety valve.",
    },
    {
        "rank": 8,
        "player": "Parker Washington (JAX WR)",
        "pick": "UNDER 63.5 Receiving Yards",
        "conf": "84/100",
        "proj": "52.5 Projected Rec Yds",
        "reason": "Jacksonville playing ahead in the second half shifts the offense toward running the ball and bleeding clock.",
    },
    {
        "rank": 9,
        "player": "Jakobi Meyers (JAX WR)",
        "pick": "UNDER 40.5 Receiving Yards",
        "conf": "82/100",
        "proj": "33.9 Projected Rec Yds",
        "reason": "Baltimore's two-high coverage caps outside routes while Jacksonville leans on the run game.",
    },
    {
        "rank": 10,
        "player": "Derrick Henry (BAL RB)",
        "pick": "OVER 67.5 Rushing Yards (and OVER 16.5 Carries)",
        "conf": "69/100",
        "proj": "73.8 Projected Rush Yds (18.6 Carries)",
        "reason": "Baltimore cannot ask a rookie QB to drop back 35 times tonight; the game plan runs through feeding Henry.",
    },
]


def render_x_card() -> Path:
    """Renders 1200x675 X Tweet #1 Teaser Card — NO free picks leaked beyond 1 teaser."""
    w, h = 1200, 675
    img = Image.new("RGB", (w, h), BG_DARK)
    draw = ImageDraw.Draw(img)

    f_title = load_font(26, bold=True)
    f_sub = load_font(15, bold=False, mono=True)
    f_sec = load_font(18, bold=True)
    f_body = load_font(15, bold=False)
    f_body_b = load_font(16, bold=True)
    f_mono = load_font(14, bold=True, mono=True)

    # Top Header Bar
    draw_rounded_box(draw, (20, 16, w - 20, 92), BG_PANEL, BORDER_SUBTLE, width=1, radius=10)
    draw.rectangle((20, 16, 26, 92), fill=ACCENT_CYAN)
    draw.text((40, 26), "THURSDAY NIGHT FOOTBALL: JACKSONVILLE AT BALTIMORE", fill=TEXT_PRIMARY, font=f_title)
    draw.text(
        (40, 60),
        "FILM, TRENCH MATCHUPS & GAME-SCRIPT BREAKDOWN · GALAXYSPORTSEDGE.COM",
        fill=ACCENT_CYAN,
        font=f_sub,
    )

    # Official Record Badge
    draw_rounded_box(draw, (w - 360, 28, w - 36, 80), (24, 32, 24), ACCENT_GREEN, width=2, radius=8)
    draw.text((w - 344, 36), "VERIFIED SEASON RECORD", fill=ACCENT_GREEN, font=f_mono)
    draw.text((w - 344, 56), "62-23-1 · +26.50 UNITS", fill=TEXT_PRIMARY, font=f_mono)

    # Left Column: Why We Pass the Steamed Spread
    draw_rounded_box(draw, (20, 108, 520, 615), BG_PANEL, BORDER_SUBTLE, width=1, radius=10)
    draw.text((38, 124), "1. WHY WE'RE PASSING THE -7.5 SPREAD", fill=ACCENT_GOLD, font=f_sec)

    left_cards = [
        (
            "DON'T CHASE A STEAMED NUMBER (-3.5 TO -7.5)",
            "The time to bet Jacksonville was earlier this week at -3.5.",
            "At -7.5 on the road on a short week, the value is gone.",
            "Forcing action on a dead spread is how bankrolls bleed.",
            ACCENT_RED,
        ),
        (
            "ROOKIE QB STARTING FOR BALTIMORE",
            "With Lamar Jackson (IR) and Tyler Huntley (out for season)",
            "sidelined, undrafted rookie Joe Fagnano starts against a",
            "Jacksonville defense that blitzes 31% of the time.",
            ACCENT_GOLD,
        ),
        (
            "TWO-HIGH COVERAGE VS LIGHT BOXES",
            "Baltimore drops two deep safeties on 60% of snaps and keeps",
            "5 or fewer in the box on 78% of dropbacks, opening up",
            "underneath throws, QB scrambles, and early-down runs.",
            ACCENT_CYAN,
        ),
    ]
    y_cursor = 160
    for title, l1, l2, l3, col in left_cards:
        draw_rounded_box(draw, (34, y_cursor, 506, y_cursor + 132), BG_CARD, BORDER_SUBTLE, width=1, radius=8)
        draw.rectangle((34, y_cursor, 40, y_cursor + 132), fill=col)
        draw.text((50, y_cursor + 12), title, fill=col, font=f_body_b)
        draw.text((50, y_cursor + 40), l1, fill=TEXT_PRIMARY, font=f_body)
        draw.text((50, y_cursor + 64), l2, fill=TEXT_MUTED, font=f_body)
        draw.text((50, y_cursor + 88), l3, fill=TEXT_MUTED, font=f_body)
        y_cursor += 146

    # Right Column: 1 Free Read + Locked TNF Pack
    draw_rounded_box(draw, (536, 108, w - 20, 615), BG_PANEL, BORDER_SUBTLE, width=1, radius=10)
    draw.text((554, 124), "2. TONIGHT'S TNF BOARD (1 FREE READ + 9 LOCKED PLAYS)", fill=ACCENT_GREEN, font=f_sec)

    # Free Teaser Box
    draw_rounded_box(draw, (552, 160, w - 36, 256), BG_CARD, ACCENT_GREEN, width=2, radius=8)
    draw_rounded_box(draw, (566, 174, 670, 240), (16, 40, 28), ACCENT_GREEN, width=1, radius=6)
    draw.text((578, 184), "FREE READ", fill=ACCENT_GREEN, font=f_mono)
    draw.text((586, 208), "88/100", fill=TEXT_PRIMARY, font=f_mono)
    draw.text((684, 174), "Mark Andrews (BAL TE) · OVER 2.5 Receptions", fill=TEXT_PRIMARY, font=f_body_b)
    draw.text((684, 200), "When Jacksonville brings a 31% blitz against a rookie QB,", fill=TEXT_MUTED, font=f_body)
    draw.text((684, 222), "Andrews over the middle is his #1 panic button.", fill=TEXT_MUTED, font=f_body)

    # Locked Rows (Redacted so we NEVER give away the card for free!)
    locked_rows = [
        ("88/100", "LOCKED DEFENSIVE TACKLE FUNNEL PROP #1", "Baltimore Box/Slot Defender · Unlock Inside TNF Pack"),
        ("88/100", "LOCKED DEFENSIVE TACKLE FUNNEL PROP #2", "Middle-of-Field Run Funnel · Unlock Inside TNF Pack"),
        ("88/100", "LOCKED RECEIVING MATCHUP PROP #3", "Two-High Coverage Beater · Unlock Inside TNF Pack"),
        ("88/100", "LOCKED QB SCRAMBLE / RUSHING PROP #4", "Light-Box Scramble Lane · Unlock Inside TNF Pack"),
        ("LOCKED", "3-LEG GAME-SCRIPT SGP + DK SHOWDOWN CAPTAIN CORE", "Full 10-Play TNF Board, Parlays & Optimal DFS Lineups"),
    ]
    ry = 272
    for badge, title, sub in locked_rows:
        draw_rounded_box(draw, (552, ry, w - 36, ry + 58), BG_CARD, BORDER_SUBTLE, width=1, radius=8)
        draw_rounded_box(draw, (566, ry + 10, 650, ry + 48), (35, 30, 18), ACCENT_GOLD, width=1, radius=6)
        draw.text((580, ry + 20), badge, fill=ACCENT_GOLD, font=f_mono)
        draw.text((666, ry + 10), f"[LOCKED] {title}", fill=ACCENT_GOLD, font=f_body_b)
        draw.text((666, ry + 32), sub, fill=TEXT_MUTED, font=f_body)
        ry += 66

    # Footer
    draw.text(
        (28, 634),
        "UNLOCK ALL 10 TNF PLAYS, 3-LEG SGP & SHOWDOWN LINEUPS AT GALAXYSPORTSEDGE.COM/PACKAGES",
        fill=ACCENT_GOLD,
        font=f_sub,
    )

    out_path = DOWNLOADS_DIR / "TNF-JAX-BAL-X-CARD.png"
    img.save(out_path, format="PNG")
    return out_path


def render_ig_slides() -> List[Path]:
    """Renders 4-Slide 1080x1350 Instagram Carousel — Matchup education + Paywall CTA (Zero leaked picks)."""
    slides_data = [
        (
            "SLIDE 1 OF 4 · SPREAD DISCIPLINE",
            "WHY WE'RE PASSING JACKSONVILLE -7.5",
            [
                ("THE VALUE WAS AT -3.5 EARLIER THIS WEEK", "Chasing a steamed -7.5 road favorite on a short week just to have action on a side is how bankrolls bleed."),
                ("WE DON'T FORCE DEAD SPREADS", "When the main line moves past its fair number, we pass the side and attack the player props and game script."),
                ("VERIFIED SEASON RECORD: 62-23-1 (+26.50u)", "Every play is tracked, graded, and backed by real film and matchup discipline."),
            ],
        ),
        (
            "SLIDE 2 OF 4 · BALTIMORE OFFENSE",
            "UNDRAFTED ROOKIE QB VS 31% BLITZ",
            [
                ("JOE FAGNANO STARTS AT QB FOR BALTIMORE", "With Lamar Jackson on IR and Tyler Huntley out for the season, Baltimore has to protect an undrafted rookie QB."),
                ("HEAVY GROUND SCRIPT + QUICK HOT THROWS", "Baltimore cannot ask a rookie to drop back 35 times. Expect heavy early-down runs and quick throws over the middle."),
                ("FREE TEASER: MARK ANDREWS OVER 2.5 RECEPTIONS", "When Jacksonville brings blitz heat, Andrews over the middle is Fagnano's #1 safety valve."),
            ],
        ),
        (
            "SLIDE 3 OF 4 · JACKSONVILLE OFFENSE",
            "ATTACKING BALTIMORE'S TWO-HIGH SHELL",
            [
                ("TWO DEEP SAFETIES ON 60% OF SNAPS", "Baltimore plays two-high coverage and keeps 5 or fewer defenders in the box on 78% of dropbacks."),
                ("WHAT THAT OPENS UP ON THE FIELD", "Light boxes invite early-down rushing, quarterback scrambles up the middle, and high-volume tackle funnels for Baltimore's linebackers and safeties."),
                ("9 MORE HIGH-CONVICTION PLAYS LOCKED TONIGHT", "Rated up to 88/100 inside tonight's TNF Pack."),
            ],
        ),
        (
            "SLIDE 4 OF 4 · UNLOCK TONIGHT'S TNF PACK",
            "WHAT'S INSIDE TONIGHT'S TNF PACK",
            [
                ("ALL 10 HIGH-CONVICTION TNF PROP PLAYS", "Includes five 88/100 rated plays across rushing, receiving, and defensive tackle funnels."),
                ("TONIGHT'S 3-LEG CORRELATED SAME-GAME PARLAY", "Built around the exact same game script so every leg works together instead of fighting each other."),
                ("DRAFTKINGS & FANDUEL SHOWDOWN LINEUPS", "Cash high-floor + tournament Captain builds with the 5:45 PM CT inactive RB pivot built in."),
            ],
        ),
    ]

    paths: List[Path] = []
    f_kicker = load_font(18, bold=True, mono=True)
    f_title = load_font(38, bold=True)
    f_card_t = load_font(22, bold=True)
    f_card_b = load_font(20, bold=False)
    f_cta = load_font(22, bold=True, mono=True)

    for idx, (kicker, title, cards) in enumerate(slides_data, start=1):
        img = Image.new("RGB", (1080, 1350), BG_DARK)
        draw = ImageDraw.Draw(img)

        draw_rounded_box(draw, (40, 40, 1040, 220), BG_PANEL, BORDER_SUBTLE, width=1, radius=14)
        draw.rectangle((40, 40, 50, 220), fill=ACCENT_CYAN)
        draw.text((74, 68), kicker, fill=ACCENT_CYAN, font=f_kicker)
        draw.text((74, 112), title, fill=TEXT_PRIMARY, font=f_title)

        y = 260
        for c_title, c_body in cards:
            draw_rounded_box(draw, (40, y, 1040, y + 270), BG_CARD, BORDER_SUBTLE, width=1, radius=14)
            draw.rectangle((40, y, 48, y + 270), fill=ACCENT_GOLD)
            draw.text((74, y + 32), c_title, fill=ACCENT_GOLD, font=f_card_t)
            # Wrap body text
            words = c_body.split()
            lines: List[str] = []
            cur = ""
            for w_word in words:
                test = f"{cur} {w_word}".strip()
                if len(test) <= 62:
                    cur = test
                else:
                    lines.append(cur)
                    cur = w_word
            if cur:
                lines.append(cur)
            ty = y + 86
            for ln in lines:
                draw.text((74, ty), ln, fill=TEXT_PRIMARY, font=f_card_b)
                ty += 34
            y += 305

        draw_rounded_box(draw, (40, 1190, 1040, 1300), (24, 32, 24), ACCENT_GREEN, width=2, radius=14)
        draw.text(
            (74, 1230),
            "UNLOCK THE FULL TNF PACK -> GALAXYSPORTSEDGE.COM/PACKAGES",
            fill=ACCENT_GREEN,
            font=f_cta,
        )

        out = DOWNLOADS_DIR / f"TNF-IG-SLIDE-{idx}.png"
        img.save(out, format="PNG")
        paths.append(out)

    return paths


def render_scheme_gif() -> Path:
    """Renders 24-frame chalkboard telestration GIF — shows the scheme + locks the full card."""
    w, h = 1200, 675
    frames: List[Image.Image] = []
    f_title = load_font(24, bold=True)
    f_sub = load_font(15, bold=True, mono=True)
    f_label = load_font(16, bold=True)

    for step in range(24):
        prog = step / 23.0
        img = Image.new("RGB", (w, h), BG_DARK)
        draw = ImageDraw.Draw(img)

        draw_rounded_box(draw, (20, 16, w - 20, 84), BG_PANEL, BORDER_SUBTLE, width=1, radius=10)
        draw.text((40, 28), "TNF FILM & SCHEME BREAKDOWN: JACKSONVILLE AT BALTIMORE", fill=TEXT_PRIMARY, font=f_title)
        draw.text((40, 56), "VERIFIED RECORD: 62-23-1 (+26.50u) · FULL TNF PACK AT GALAXYSPORTSEDGE.COM", fill=ACCENT_CYAN, font=f_sub)

        # Left Chalkboard: BAL Two-High Safety Split
        draw_rounded_box(draw, (20, 100, 585, 595), (12, 26, 20), BORDER_SUBTLE, width=1, radius=10)
        draw.text((40, 116), "1. BALTIMORE TWO-HIGH SHELL -> MIDDLE FIELD OPEN", fill=ACCENT_GREEN, font=f_label)
        for yd in range(180, 560, 60):
            draw.line((40, yd, 565, yd), fill=(28, 52, 38), width=1)
        # Safeties backing out wide
        s_offset = int(prog * 55)
        draw.ellipse((180 - s_offset, 220 - int(prog * 25), 210 - s_offset, 250 - int(prog * 25)), outline=ACCENT_RED, width=3)
        draw.ellipse((390 + s_offset, 220 - int(prog * 25), 420 + s_offset, 250 - int(prog * 25)), outline=ACCENT_RED, width=3)
        # QB middle lane arrow
        qb_y = 480 - int(prog * 170)
        draw.line((302, 480, 302, qb_y), fill=ACCENT_GREEN, width=5)
        draw.ellipse((288, 468, 316, 496), fill=ACCENT_CYAN)
        draw.text((44, 535), "Two deep safeties + light box opens middle scramble & run lanes", fill=TEXT_PRIMARY, font=f_label)

        # Right Chalkboard: JAX 31% Blitz -> Andrews Hot Route
        draw_rounded_box(draw, (605, 100, w - 20, 595), (20, 16, 28), BORDER_SUBTLE, width=1, radius=10)
        draw.text((625, 116), "2. JACKSONVILLE 31% BLITZ -> MARK ANDREWS HOT ROUTE", fill=ACCENT_GOLD, font=f_label)
        for yd in range(180, 560, 60):
            draw.line((625, yd, w - 40, yd), fill=(42, 34, 56), width=1)
        # Blitzers crashing in
        b_y = 330 + int(prog * 110)
        for bx in (740, 830, 960, 1050):
            draw.line((bx, 330, bx, b_y), fill=ACCENT_RED, width=4)
        # TE Mark Andrews hot route over middle
        te_x = 980 - int(prog * 85)
        te_y = 380 - int(prog * 75)
        draw.line((980, 380, te_x, te_y), fill=ACCENT_GOLD, width=5)
        draw.text((625, 535), "FREE TEASER: Mark Andrews OVER 2.5 Receptions (Hot-Route Valve)", fill=ACCENT_GOLD, font=f_label)

        # Bottom CTA Banner
        draw_rounded_box(draw, (20, 608, w - 20, 660), BG_PANEL, ACCENT_GOLD, width=2, radius=8)
        draw.text(
            (40, 625),
            "UNLOCK ALL 10 TNF PLAYS, 3-LEG SGP & DK SHOWDOWN LINEUPS -> GALAXYSPORTSEDGE.COM/PACKAGES",
            fill=ACCENT_GOLD,
            font=f_sub,
        )
        frames.append(img)

    out_gif = DOWNLOADS_DIR / "TNF-JAX-BAL-SCHEME-BREAKDOWN.gif"
    frames[0].save(
        out_gif,
        save_all=True,
        append_images=frames[1:],
        duration=140,
        loop=0,
         format="GIF",
    )
    return out_gif


def render_private_top10_for_garrett_and_dad() -> Path:
    """Renders PRIVATE Top-10 Confidence Sheet for Garrett & His Dad ONLY (marked PRIVATE)."""
    w, h = 1080, 1350
    img = Image.new("RGB", (w, h), BG_DARK)
    draw = ImageDraw.Draw(img)

    f_title = load_font(28, bold=True)
    f_sub = load_font(15, bold=True, mono=True)
    f_row_b = load_font(18, bold=True)
    f_row = load_font(15, bold=False)
    f_mono = load_font(16, bold=True, mono=True)

    draw_rounded_box(draw, (24, 20, w - 24, 110), BG_PANEL, ACCENT_RED, width=2, radius=10)
    draw.text((44, 32), "PRIVATE SHEET (GARRETT & DAD ONLY - DO NOT POST ON SOCIALS)", fill=ACCENT_RED, font=f_sub)
    draw.text((44, 58), "TNF JAX @ BAL: TOP 10 PICKS RANKED BY CONFIDENCE", fill=TEXT_PRIMARY, font=f_title)

    y = 126
    for item in TOP_10_PRIVATE_PICKS:
        draw_rounded_box(draw, (24, y, w - 24, y + 108), BG_CARD, BORDER_SUBTLE, width=1, radius=8)
        draw_rounded_box(draw, (38, y + 16, 132, y + 92), (16, 40, 28), ACCENT_GREEN, width=1, radius=6)
        draw.text((52, y + 28), f"#{item['rank']}", fill=ACCENT_GOLD, font=f_mono)
        draw.text((48, y + 54), item["conf"], fill=ACCENT_GREEN, font=f_mono)

        draw.text((150, y + 14), f"{item['player']}  ·  {item['pick']}", fill=TEXT_PRIMARY, font=f_row_b)
        draw.text((150, y + 44), f"Projection: {item['proj']}", fill=ACCENT_CYAN, font=f_row)
        draw.text((150, y + 70), item["reason"], fill=TEXT_MUTED, font=f_row)
        y += 118

    out = ARTIFACT_DIR / "PRIVATE-GARRETT-DAD-TOP10-CONFIDENCE.png"
    img.save(out, format="PNG")
    public_leak = DOWNLOADS_DIR / "PRIVATE-GARRETT-DAD-TOP10-CONFIDENCE.png"
    if public_leak.exists():
        public_leak.unlink()
    return out


def main() -> None:
    import shutil
    x_card = render_x_card()
    ig_slides = render_ig_slides()
    gif_path = render_scheme_gif()
    private_card = render_private_top10_for_garrett_and_dad()
    for p in [x_card, *ig_slides, gif_path]:
        shutil.copy2(p, ARTIFACT_DIR / p.name)
    print(f"Rendered X Teaser Card: {x_card}")
    for s in ig_slides:
        print(f"Rendered IG Teaser Slide: {s}")
    print(f"Rendered Chalkboard Teaser GIF: {gif_path}")
    print(f"Rendered Private Family Sheet: {private_card}")


if __name__ == "__main__":
    main()
