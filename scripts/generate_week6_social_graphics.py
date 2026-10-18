#!/usr/bin/env python3
"""
scripts/generate_week6_social_graphics.py
Generates 4 official Galaxy Sports Edge 1080x1350 (4:5 X/Instagram optimal) SVG + Retina PNG
graphics for the Week 6 Late Sunday + Sunday Night Football + Monday Night Football FREE Unlock:
1. gse-week6-late-snf-mnf-master-board-20261018.{svg,png} — All 5 Games (15 Plays: Spreads, Totals, MLs)
2. gse-week6-snf-lambeau-hammer-20261018.{svg,png} — SNF DAL @ GB Hammer (#1 JEV 0.91 Spot)
3. gse-week6-top10-player-props-20261018.{svg,png} — Top 10 DraftKings Player Props Board
4. gse-week6-copula-sgp-parlay-card-20261018.{svg,png} — 5 Empirical Copula SGPs & 4 Cross-Game Parlays
"""

import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent
SOCIAL_DIR = REPO_ROOT / "social"
PUBLIC_SOCIAL_DIR = REPO_ROOT / "apps" / "web" / "public" / "social"
ARTIFACT_DIR = Path(r"C:\Users\Garrett\.gemini\antigravity-cli\brain\3fbdbf6a-cb00-4bb3-aa52-7ab90f521344")

COMMON_DEFS_AND_HEADER = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350" role="img">
  <defs>
    <radialGradient id="cosmic-ul" cx="0%" cy="0%" r="90%">
      <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.30"/>
      <stop offset="40%" stop-color="#7A5CFF" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#050608" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cosmic-lr" cx="100%" cy="100%" r="90%">
      <stop offset="0%" stop-color="#FF2DD6" stop-opacity="0.34"/>
      <stop offset="40%" stop-color="#7A5CFF" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#050608" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="card-glass" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141824" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#0A0D14" stop-opacity="0.96"/>
    </linearGradient>
    <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00E5FF"/>
      <stop offset="100%" stop-color="#7A5CFF"/>
    </linearGradient>
    <linearGradient id="magenta-glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF2DD6"/>
      <stop offset="100%" stop-color="#7A5CFF"/>
    </linearGradient>
    <linearGradient id="gold-glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFB800"/>
      <stop offset="100%" stop-color="#FF2DD6"/>
    </linearGradient>
    <linearGradient id="green-glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00E676"/>
      <stop offset="100%" stop-color="#00E5FF"/>
    </linearGradient>
  </defs>

  <!-- Deep Obsidian Canvas -->
  <rect width="1080" height="1350" fill="#050608"/>
  <rect width="1080" height="1350" fill="url(#cosmic-ul)"/>
  <rect width="1080" height="1350" fill="url(#cosmic-lr)"/>

  <!-- Star Accents -->
  <circle cx="140" cy="180" r="1.4" fill="#F6F7FA" fill-opacity="0.6"/>
  <circle cx="920" cy="140" r="1.6" fill="#00E5FF" fill-opacity="0.8"/>
  <circle cx="980" cy="420" r="1.2" fill="#FF2DD6" fill-opacity="0.6"/>
  <circle cx="80" cy="980" r="1.5" fill="#F6F7FA" fill-opacity="0.5"/>
  <circle cx="990" cy="1120" r="1.3" fill="#7A5CFF" fill-opacity="0.7"/>

  <!-- HEADER & BRANDING -->
  <g transform="translate(60, 48)">
    <g transform="translate(0, 0)">
      <path d="M 8 46 A 24 24 0 1 0 54 42" fill="none" stroke="#F6F7FA" stroke-width="3" stroke-linecap="round"/>
      <line x1="4" y1="12" x2="58" y2="60" stroke="#F6F7FA" stroke-width="3" stroke-linecap="round"/>
      <circle cx="36" cy="31" r="5" fill="#FF2DD6"/>
      <circle cx="36" cy="31" r="11" fill="none" stroke="#FF2DD6" stroke-opacity="0.4" stroke-width="1"/>
    </g>
    <text x="80" y="32" font-family="'Segoe UI', 'Arial Black', sans-serif" font-weight="900" font-size="34" letter-spacing="7" fill="#F6F7FA">GALAXY</text>
    <text x="262" y="32" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="20" letter-spacing="5" fill="#00E5FF">SPORTS EDGE</text>
    <g transform="translate(680, 4)">
      <rect width="280" height="36" rx="18" fill="#00E676" fill-opacity="0.14" stroke="#00E676" stroke-width="1.5"/>
      <circle cx="20" cy="18" r="5" fill="#00E676"/>
      <text x="36" y="23" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="800" letter-spacing="1.5" fill="#00E676">100% FREE BOARD UNLOCK</text>
    </g>
  </g>
  <line x1="60" y1="108" x2="1020" y2="108" stroke="#F6F7FA" stroke-opacity="0.14" stroke-width="1"/>
"""

COMMON_FOOTER = """
  <line x1="60" y1="1240" x2="1020" y2="1240" stroke="#F6F7FA" stroke-opacity="0.14" stroke-width="1"/>
  <text x="60" y="1272" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="700" letter-spacing="2.5" fill="#8089A0">BUILT BY GARRETT BAXLEY · FOUNDER</text>
  <text x="60" y="1298" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="800" letter-spacing="2" fill="#00E5FF">GALAXYSPORTSEDGE.COM/PICKS · ALL PLAYS FREE TODAY</text>
  <text x="1020" y="1272" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="700" letter-spacing="2" fill="#8089A0">VALIDATED BY JEV &amp; GSE ENGINE v5.3.0</text>
  <text x="1020" y="1298" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="700" letter-spacing="1.5" fill="#FF2DD6">14-KEY SOVEREIGN SIGNAL PLANE · EMPIRICAL COPULA</text>
</svg>
"""


def build_svg_1_master_board() -> str:
    games = [
        {
            "y": 225,
            "stroke": "url(#magenta-glow)",
            "bar": "#FF2DD6",
            "tag": "7:20 PM CST · SNF HAMMER",
            "tag_color": "#FF2DD6",
            "matchup": "COWBOYS @ PACKERS",
            "main_plays": "OVER 53.5 (-110)  |  PACKERS -1.5 (-110)  |  GB ML (-125)",
            "badge": "EDGE 69.7",
            "reason1": "> #1 JEV Spot (0.91) · Jordan Love #1 Pocket (5.31 yd) & #1 QBR (71.5) · GB #2 SOE (+0.404 yd)",
            "reason2": "> Jacobs OUT -> Watson (94.8 yds/gm) & Lamb (101.4 yds/gm) vs Parsons & Overshown OUT",
        },
        {
            "y": 420,
            "stroke": "url(#cyan-glow)",
            "bar": "#00E5FF",
            "tag": "3:25 PM CST · ARROWHEAD",
            "tag_color": "#00E5FF",
            "matchup": "CHARGERS @ CHIEFS",
            "main_plays": "CHIEFS -7.5 (-110)  |  UNDER 41.5 (-110)  |  KC ML (-360)",
            "badge": "EDGE 69.4",
            "reason1": "> KC off Week 5 Bye (14d rest vs 7d) · Kenneth Walker III 134.2 rush yds/gm (+211.8 RYOE)",
            "reason2": "> Chargers missing All-Pro LT Joe Alt (OUT), G Kayode Awosika (OUT) & CB Donte Jackson (OUT)",
        },
        {
            "y": 615,
            "stroke": "url(#green-glow)",
            "bar": "#00E676",
            "tag": "3:05 PM CST · SOFI INDOOR",
            "tag_color": "#00E676",
            "matchup": "CARDINALS @ RAMS",
            "main_plays": "OVER 51.5 (-110)  |  RAMS -12.5 (-110)  |  LAR ML (-750)",
            "badge": "EDGE 69.3",
            "reason1": "> Rams #1 Late-Window Motion (52.55%) · Stafford 66.0 QBR · Nacua (112.3/gm) + Adams (88.2/gm)",
            "reason2": "> Arizona missing 2 starting safeties (Andrew Wingard OUT, Wydett Williams Jr. OUT)",
        },
        {
            "y": 810,
            "stroke": "url(#gold-glow)",
            "bar": "#FFB800",
            "tag": "3:25 PM CST · ALLEGIANT DOME",
            "tag_color": "#FFB800",
            "matchup": "BILLS @ RAIDERS",
            "main_plays": "OVER 53.5 (-110)  |  BILLS -5.5 (-110)  |  BUF ML (-245)",
            "badge": "EDGE 69.0",
            "reason1": "> Josh Allen 66.0 QBR & 4.44 yd Pocket · James Cook 106.4 rush yds/gm (+88.5 RYOE)",
            "reason2": "> Khalil Shakir #1 NFL Separation (4.03 yds) + Jeanty 506 scrimmage yds vs LV DT Hemingway OUT",
        },
        {
            "y": 1005,
            "stroke": "url(#cyan-glow)",
            "bar": "#7A5CFF",
            "tag": "MON 7:15 PM CST · MNF CLOSER",
            "tag_color": "#00E5FF",
            "matchup": "COMMANDERS @ 49ERS",
            "main_plays": "49ERS -7.5 (-110)  |  OVER 50.5 (-110)  |  SF ML (-355)",
            "badge": "EDGE 70.4",
            "reason1": "> Brock Purdy #1 NFL CPOE (+10.5%) · Shanahan #1 Motion (61.68%) · CMC 423 scrimmage yds",
            "reason2": "> Washington missing DE Charles Omenihu (OUT) + 3 Safeties (Cross, Owens, Butler) Questionable",
        },
    ]

    body = """
  <g transform="translate(60, 130)">
    <text x="0" y="20" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="700" letter-spacing="3" fill="#00E5FF">NFL WEEK 6 · LATE SUNDAY + SUNDAY NIGHT + MONDAY NIGHT</text>
    <text x="0" y="62" font-family="'Segoe UI', 'Arial Black', sans-serif" font-weight="900" font-size="34" fill="#F6F7FA" letter-spacing="1">REMAINING 5-GAME MASTER BOARD</text>
    <g transform="translate(720, 14)">
      <rect width="240" height="50" rx="10" fill="#FF2DD6" fill-opacity="0.14" stroke="#FF2DD6" stroke-width="1.5"/>
      <text x="120" y="22" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="700" letter-spacing="1.5" fill="#FF2DD6" text-anchor="middle">VERIFIED LIVE PICKS</text>
      <text x="120" y="42" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="18" font-weight="900" fill="#F6F7FA" text-anchor="middle">15 / 15 UNLOCKED FREE</text>
    </g>
  </g>
"""
    for g in games:
        body += f"""
  <g transform="translate(60, {g['y']})">
    <rect width="960" height="175" rx="14" fill="url(#card-glass)" stroke="{g['stroke']}" stroke-width="2"/>
    <rect x="0" y="0" width="8" height="175" rx="4" fill="{g['bar']}"/>
    <rect x="26" y="18" width="235" height="24" rx="5" fill="{g['tag_color']}" fill-opacity="0.16"/>
    <text x="143" y="35" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="800" letter-spacing="1" fill="{g['tag_color']}" text-anchor="middle">{g['tag']}</text>
    <text x="278" y="36" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="22" font-weight="900" fill="#F6F7FA" letter-spacing="1">{g['matchup']}</text>
    <rect x="805" y="16" width="130" height="36" rx="8" fill="{g['tag_color']}" fill-opacity="0.18" stroke="{g['tag_color']}" stroke-width="1.5"/>
    <text x="870" y="39" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="16" font-weight="900" fill="{g['tag_color']}" text-anchor="middle">{g['badge']}</text>
    <text x="26" y="82" font-family="'Segoe UI', 'Arial Black', sans-serif" font-weight="900" font-size="26" fill="#00E5FF" letter-spacing="0.5">{g['main_plays']}</text>
    <text x="26" y="122" font-family="Consolas, 'Courier New', monospace" font-size="13.5" font-weight="600" fill="#F6F7FA">{g['reason1']}</text>
    <text x="26" y="148" font-family="Consolas, 'Courier New', monospace" font-size="13.5" font-weight="600" fill="#B8C0D4">{g['reason2']}</text>
  </g>
"""
    return COMMON_DEFS_AND_HEADER + body + COMMON_FOOTER


def build_svg_2_snf_hammer() -> str:
    cards = [
        {
            "y": 235,
            "stroke": "url(#cyan-glow)",
            "bar": "#00E5FF",
            "tag": "MAX CONVICTION TOTAL",
            "tag_color": "#00E5FF",
            "sub": "SUNDAY NIGHT FOOTBALL · LAMBEAU FIELD",
            "play": "OVER 53.5 POINTS (-110)",
            "badge": "EDGE 69.7",
            "r1": "> Jordan Love ranks #1 in NFL Pocket Depth (5.31 yds) & #1 in Total QBR (71.5)",
            "r2": "> Both defenses missing alpha disruptors: Micah Parsons (OUT), Hargrave (IR), Overshown (OUT)",
        },
        {
            "y": 405,
            "stroke": "url(#green-glow)",
            "bar": "#00E676",
            "tag": "PRIMETIME SIDE & ML",
            "tag_color": "#00E676",
            "sub": "14-KEY SOVEREIGN SIGNAL PLANE (+3.70% LIFT)",
            "play": "PACKERS -1.5 (-110) & ML (-125)",
            "badge": "JEV 0.91",
            "r1": "> Green Bay ranks #2 in NFL Separation Over Expectation (+0.404 yds) vs Dallas -0.056 yds",
            "r2": "> Josh Jacobs OUT shifts LaFleur into high-PROE dropback offense vs depleted Dallas secondary",
        },
        {
            "y": 575,
            "stroke": "url(#magenta-glow)",
            "bar": "#FF2DD6",
            "tag": "QB PASSING VOLUME",
            "tag_color": "#FF2DD6",
            "sub": "DRAFTKINGS LIVE PROP · MODEL MU = 288.5 YDS",
            "play": "JORDAN LOVE OVER 263.5 PASS YDS",
            "badge": "P = 68.4%",
            "r1": "> Cleanest pocket in football (5.31 yds) + neutral pass rate spike with RB Josh Jacobs ruled OUT",
            "r2": "> +25.0 yard model cushion over the live 263.5 line (-115) in a projected 55.5-point track meet",
        },
        {
            "y": 745,
            "stroke": "url(#gold-glow)",
            "bar": "#FFB800",
            "tag": "DEEP PERIMETER ALPHA",
            "tag_color": "#FFB800",
            "sub": "DRAFTKINGS LIVE PROP · MODEL MU = 86.4 YDS",
            "play": "CHRISTIAN WATSON OVER 74.5 REC YDS",
            "badge": "P = 66.2%",
            "r1": "> Averaging 94.8 rec yds/gm (474 yds, 5 TDs in 5 GP) with 16.9 aDOT & 38.2% air-yard share",
            "r2": "> Attacks a Dallas secondary missing starting CB Cobie Durant (OUT) and LB DeMarvion Overshown",
        },
        {
            "y": 915,
            "stroke": "url(#cyan-glow)",
            "bar": "#7A5CFF",
            "tag": "COWBOYS ALPHA BRING-BACK",
            "tag_color": "#00E5FF",
            "sub": "DRAFTKINGS LIVE PROP · MODEL MU = 97.5 YDS",
            "play": "CEEDEE LAMB OVER 86.5 REC YDS",
            "badge": "P = 64.9%",
            "r1": "> 507 rec yds on 51 targets in 5 GP (101.4 yds/gm, 31.8% target share) + +0.312 yd SOE",
            "r2": "> Green Bay missing Edge Micah Parsons (OUT), DT Javon Hargrave (IR) & CB Benjamin St-Juste (OUT)",
        },
    ]

    body = """
  <g transform="translate(60, 130)">
    <text x="0" y="20" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="700" letter-spacing="3" fill="#FF2DD6">SUNDAY NIGHT FOOTBALL · 7:20 PM CST · LAMBEAU FIELD</text>
    <text x="0" y="62" font-family="'Segoe UI', 'Arial Black', sans-serif" font-weight="900" font-size="36" fill="#F6F7FA" letter-spacing="1">COWBOYS <tspan fill="#00E5FF">@</tspan> PACKERS HAMMER</text>
    <g transform="translate(710, 14)">
      <rect width="250" height="50" rx="10" fill="#00E5FF" fill-opacity="0.14" stroke="#00E5FF" stroke-width="1.5"/>
      <text x="125" y="22" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="700" letter-spacing="1.5" fill="#00E5FF" text-anchor="middle">PRIMETIME RANKING</text>
      <text x="125" y="42" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="18" font-weight="900" fill="#F6F7FA" text-anchor="middle">#1 JEV SPOT (0.91)</text>
    </g>
  </g>
"""
    for c in cards:
        body += f"""
  <g transform="translate(60, {c['y']})">
    <rect width="960" height="152" rx="14" fill="url(#card-glass)" stroke="{c['stroke']}" stroke-width="2"/>
    <rect x="0" y="0" width="8" height="152" rx="4" fill="{c['bar']}"/>
    <rect x="26" y="16" width="195" height="24" rx="5" fill="{c['tag_color']}" fill-opacity="0.16"/>
    <text x="123" y="33" font-family="Consolas, 'Courier New', monospace" font-size="11.5" font-weight="800" letter-spacing="1" fill="{c['tag_color']}" text-anchor="middle">{c['tag']}</text>
    <text x="236" y="33" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="700" fill="#8089A0">{c['sub']}</text>
    <rect x="805" y="16" width="130" height="36" rx="8" fill="{g_col if False else c['tag_color']}" fill-opacity="0.18" stroke="{c['tag_color']}" stroke-width="1.5"/>
    <text x="870" y="39" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="16" font-weight="900" fill="{c['tag_color']}" text-anchor="middle">{c['badge']}</text>
    <text x="26" y="78" font-family="'Segoe UI', 'Arial Black', sans-serif" font-weight="900" font-size="31" fill="#F6F7FA" letter-spacing="0.5">{c['play']}</text>
    <text x="26" y="112" font-family="Consolas, 'Courier New', monospace" font-size="13.5" font-weight="600" fill="#00E5FF">{c['r1']}</text>
    <text x="26" y="136" font-family="Consolas, 'Courier New', monospace" font-size="13.5" font-weight="600" fill="#B8C0D4">{c['r2']}</text>
  </g>
"""
    body += """
  <g transform="translate(60, 1088)">
    <rect width="960" height="130" rx="14" fill="url(#card-glass)" stroke="url(#gold-glow)" stroke-width="2"/>
    <rect x="0" y="0" width="8" height="130" rx="4" fill="#FFB800"/>
    <text x="28" y="32" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="800" letter-spacing="2" fill="#FFB800">EMPIRICAL COPULA SNF SAME-GAME PARLAY · BOOK +485 vs MODEL FAIR +184 (+105.8% EV)</text>
    <text x="28" y="68" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="24" font-weight="900" fill="#F6F7FA">OVER 53.5 + LOVE O263.5 PASS + WATSON O74.5 REC + LAMB O86.5 REC</text>
    <text x="28" y="102" font-family="Consolas, 'Courier New', monospace" font-size="13.5" font-weight="600" fill="#00E676">&gt; Joint Copula Win Prob: 35.2% (Naive Indep: 24.5%) · +10.7% Positive Covariance Shootout Boost</text>
  </g>
"""
    return COMMON_DEFS_AND_HEADER + body + COMMON_FOOTER


def build_svg_3_top10_props() -> str:
    props = [
        ("1. TYLER HIGBEE (LAR TE)", "OVER 31.5 REC YDS (-115)", "MODEL: 44.6 YDS", "56.0 yds/gm in 2026 · ARI down 2 safeties", "#00E5FF"),
        ("2. JORDAN LOVE (GB QB)", "OVER 263.5 PASS YDS (-115)", "MODEL: 288.5 YDS", "#1 NFL Pocket (5.31 yd) & QBR (71.5) · Jacobs OUT", "#FF2DD6"),
        ("3. KENNETH WALKER III (KC RB)", "OVER 104.5 RUSH YDS (-115)", "MODEL: 121.4 YDS", "134.2 rush yds/gm (+211.8 RYOE) · Post-bye bellcow", "#00E676"),
        ("4. KHALIL SHAKIR (BUF WR)", "OVER 38.5 REC YDS (-115)", "MODEL: 49.1 YDS", "#1 NFL Separation (4.03 yds) & +1.53 YAC/OE", "#FFB800"),
        ("5. CHRISTIAN WATSON (GB WR)", "OVER 74.5 REC YDS (-115)", "MODEL: 86.4 YDS", "94.8 rec yds/gm (5 TDs) · DAL CB Durant OUT", "#FF2DD6"),
        ("6. DAVANTE ADAMS (LAR WR)", "OVER 66.5 REC YDS (-115)", "MODEL: 78.2 YDS", "88.2 yds/gm on 45 targets · 36.4% air yard share", "#00E5FF"),
        ("7. CEEDEE LAMB (DAL WR)", "OVER 86.5 REC YDS (-115)", "MODEL: 97.5 YDS", "101.4 yds/gm (51 tgts) · GB Parsons & St-Juste OUT", "#00E676"),
        ("8. BROCK PURDY (SF QB)", "OVER 261.5 PASS YDS (-115)", "MODEL: 279.0 YDS", "#1 NFL CPOE (+10.5%) · 61.7% motion vs WSH DBs", "#FFB800"),
        ("9. GEORGE KITTLE (SF TE)", "OVER 51.5 REC YDS (-115)", "MODEL: 62.8 YDS", "68.0 yds/gm · +0.299 yd SOE & 72.7% catch rate", "#00E5FF"),
        ("10. JAMES COOK (BUF RB)", "OVER 93.5 RUSH YDS (-115)", "MODEL: 106.4 YDS", "106.4 rush yds/gm (+88.5 RYOE) · LV Hemingway OUT", "#00E676"),
    ]

    body = """
  <g transform="translate(60, 130)">
    <text x="0" y="20" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="700" letter-spacing="3" fill="#00E676">DRAFTKINGS LIVE LINES · 2026 NGS TRACKING &amp; TARGET SHARES</text>
    <text x="0" y="62" font-family="'Segoe UI', 'Arial Black', sans-serif" font-weight="900" font-size="36" fill="#F6F7FA" letter-spacing="1">TOP 10 PLAYER PROPS BOARD</text>
    <g transform="translate(710, 14)">
      <rect width="250" height="50" rx="10" fill="#00E676" fill-opacity="0.14" stroke="#00E676" stroke-width="1.5"/>
      <text x="125" y="22" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="700" letter-spacing="1.5" fill="#00E676" text-anchor="middle">LATE SUN + SNF + MNF</text>
      <text x="125" y="42" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="18" font-weight="900" fill="#F6F7FA" text-anchor="middle">10 / 10 VERIFIED OVER</text>
    </g>
  </g>
"""
    for idx, (player, line_str, model_str, reason_str, col) in enumerate(props):
        col_idx = idx % 2
        row_idx = idx // 2
        x = 60 if col_idx == 0 else 550
        y = 225 + row_idx * 198
        body += f"""
  <g transform="translate({x}, {y})">
    <rect width="470" height="178" rx="12" fill="url(#card-glass)" stroke="{col}" stroke-opacity="0.7" stroke-width="1.8"/>
    <rect x="0" y="0" width="6" height="178" rx="3" fill="{col}"/>
    <text x="20" y="33" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="16.2" font-weight="900" fill="#F6F7FA">{player}</text>
    <rect x="318" y="14" width="136" height="28" rx="6" fill="{col}" fill-opacity="0.18" stroke="{col}" stroke-width="1.2"/>
    <text x="386" y="33" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="800" fill="{col}" text-anchor="middle">{model_str}</text>
    <text x="20" y="76" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="24" font-weight="900" fill="{col}">{line_str}</text>
    <line x1="20" y1="96" x2="448" y2="96" stroke="#F6F7FA" stroke-opacity="0.1" stroke-width="1"/>
    <text x="20" y="126" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="600" fill="#F6F7FA">&gt; {reason_str}</text>
    <text x="20" y="154" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="700" fill="#8089A0">SOVEREIGN SIGNAL PLANE VERIFIED · 1.25U</text>
  </g>
"""
    return COMMON_DEFS_AND_HEADER + body + COMMON_FOOTER


def build_svg_4_sgp_parlays() -> str:
    sgps = [
        ("SGP #1 · DAL @ GB SNF SHOOTOUT", "BOOK +485  |  MODEL FAIR +184  |  35.2% COPULA PROB", "Over 53.5 + Jordan Love O263.5 Pass Yds + Christian Watson O74.5 Rec Yds + CeeDee Lamb O86.5 Rec Yds", "#FF2DD6"),
        ("SGP #2 · ARI @ LAR SOFI INDOOR", "BOOK +475  |  MODEL FAIR +205  |  32.8% COPULA PROB", "Over 51.5 + Tyler Higbee O31.5 Rec Yds + Davante Adams O66.5 Rec Yds + Puka Nacua O95.5 Rec Yds", "#00E5FF"),
        ("SGP #3 · BUF @ LV ALLEGIANT DOME", "BOOK +460  |  MODEL FAIR +189  |  34.7% COPULA PROB", "Over 53.5 + Khalil Shakir O38.5 Rec Yds + James Cook O93.5 Rush Yds + Josh Allen O239.5 Pass Yds", "#FFB800"),
        ("SGP #4 · LAC @ KC TRENCH SCRIPT", "BOOK +425  |  MODEL FAIR +192  |  34.2% COPULA PROB", "Chiefs -7.5 + LAC @ KC Under 41.5 + Kenneth Walker III O104.5 Rush Yds (134.2 yds/gm vs Joe Alt OUT)", "#00E676"),
        ("SGP #5 · WSH @ SF MNF CLOSER", "BOOK +450  |  MODEL FAIR +190  |  34.5% COPULA PROB", "49ers -7.5 + Over 50.5 + Brock Purdy O261.5 Pass Yds (+10.5% CPOE) + George Kittle O51.5 Rec Yds", "#00E5FF"),
    ]

    body = """
  <g transform="translate(60, 130)">
    <text x="0" y="20" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="700" letter-spacing="3" fill="#FFB800">EMPIRICAL COPULA SGP ENGINE &amp; CROSS-GAME PARLAY PORTFOLIO</text>
    <text x="0" y="62" font-family="'Segoe UI', 'Arial Black', sans-serif" font-weight="900" font-size="35" fill="#F6F7FA" letter-spacing="1">SGPs &amp; PARLAY TICKETS (FREE)</text>
    <g transform="translate(700, 14)">
      <rect width="260" height="50" rx="10" fill="#FFB800" fill-opacity="0.14" stroke="#FFB800" stroke-width="1.5"/>
      <text x="130" y="22" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="700" letter-spacing="1.5" fill="#FFB800" text-anchor="middle">GAUSSIAN COPULA PRICED</text>
      <text x="130" y="42" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="18" font-weight="900" fill="#F6F7FA" text-anchor="middle">+80% TO +105% SGP EV</text>
    </g>
  </g>
"""
    for i, (title, sub, legs, col) in enumerate(sgps):
        y = 220 + i * 145
        body += f"""
  <g transform="translate(60, {y})">
    <rect width="960" height="128" rx="12" fill="url(#card-glass)" stroke="{col}" stroke-width="1.8"/>
    <rect x="0" y="0" width="8" height="128" rx="4" fill="{col}"/>
    <text x="26" y="34" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="20" font-weight="900" fill="#F6F7FA">{title}</text>
    <text x="935" y="34" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="800" fill="{col}" text-anchor="end">{sub}</text>
    <line x1="26" y1="48" x2="935" y2="48" stroke="#F6F7FA" stroke-opacity="0.1" stroke-width="1"/>
    <text x="26" y="79" font-family="'Segoe UI', Arial, sans-serif" font-size="16.5" font-weight="800" fill="#00E5FF">{legs}</text>
    <text x="26" y="108" font-family="Consolas, 'Courier New', monospace" font-size="12.5" font-weight="600" fill="#B8C0D4">&gt; Positive within-game covariance exploits flat sportsbook SGP multiplier</text>
  </g>
"""
    body += """
  <g transform="translate(60, 955)">
    <rect width="960" height="260" rx="14" fill="url(#card-glass)" stroke="url(#green-glow)" stroke-width="2"/>
    <rect x="0" y="0" width="8" height="260" rx="4" fill="#00E676"/>
    <text x="28" y="36" font-family="'Segoe UI', 'Arial Black', sans-serif" font-size="22" font-weight="900" fill="#00E676" letter-spacing="1">4 OFFICIAL CROSS-GAME PARLAY TICKETS (LATE SUN + SNF + MNF)</text>
    <text x="28" y="76" font-family="'Segoe UI', Arial, sans-serif" font-size="19" font-weight="800" fill="#F6F7FA">1. 3-Leg Heavyweight ML Parlay (+235): <tspan fill="#00E5FF">Bills ML (-245) + Chiefs ML (-360) + Packers ML (-125)</tspan></text>
    <text x="28" y="118" font-family="'Segoe UI', Arial, sans-serif" font-size="19" font-weight="800" fill="#F6F7FA">2. 3-Leg Indoor + Lambeau Overs (+595): <tspan fill="#FF2DD6">ARI@LAR O51.5 + BUF@LV O53.5 + DAL@GB O53.5</tspan></text>
    <text x="28" y="160" font-family="'Segoe UI', Arial, sans-serif" font-size="19" font-weight="800" fill="#F6F7FA">3. 3-Leg Trench &amp; Bye Spreads (+595): <tspan fill="#FFB800">Chiefs -7.5 (-110) + Bills -5.5 (-110) + 49ers -7.5 (-110)</tspan></text>
    <text x="28" y="202" font-family="'Segoe UI', Arial, sans-serif" font-size="19" font-weight="800" fill="#F6F7FA">4. 4-Leg Primetime Sweep (+1228): <tspan fill="#00E676">Bills -5.5 + Chiefs -7.5 + DAL@GB Over 53.5 + 49ers -7.5</tspan></text>
    <text x="28" y="238" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="700" fill="#8089A0">&gt; Full Interactive SGP &amp; Parlay Card Live FREE at galaxysportsedge.com/sgp-projections</text>
  </g>
"""
    return COMMON_DEFS_AND_HEADER + body + COMMON_FOOTER


def main():
    SOCIAL_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_SOCIAL_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    cards = [
        ("gse-week6-late-snf-mnf-master-board-20261018", build_svg_1_master_board()),
        ("gse-week6-snf-lambeau-hammer-20261018", build_svg_2_snf_hammer()),
        ("gse-week6-top10-player-props-20261018", build_svg_3_top10_props()),
        ("gse-week6-copula-sgp-parlay-card-20261018", build_svg_4_sgp_parlays()),
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        page = browser.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=2)
        for name, svg_content in cards:
            svg_path = SOCIAL_DIR / f"{name}.svg"
            png_path = SOCIAL_DIR / f"{name}.png"
            svg_path.write_text(svg_content, encoding="utf-8")

            html = f"""<!DOCTYPE html>
            <html>
            <head><style>body,html{{margin:0;padding:0;width:1080px;height:1350px;overflow:hidden;background:#050608;}}</style></head>
            <body>{svg_content}</body>
            </html>"""
            page.set_content(html)
            page.screenshot(path=str(png_path), full_page=False)

            shutil.copy2(svg_path, PUBLIC_SOCIAL_DIR / f"{name}.svg")
            shutil.copy2(png_path, PUBLIC_SOCIAL_DIR / f"{name}.png")
            shutil.copy2(png_path, ARTIFACT_DIR / f"{name}.png")
            print(f"Generated {png_path} ({png_path.stat().st_size:,} bytes)")
        browser.close()


if __name__ == "__main__":
    main()
