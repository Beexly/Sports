#!/usr/bin/env python3
"""
scripts/generate_week6_social_graphics.py
Generates 4 COMPLETELY UNIQUE, distinct, high-resolution (2x Retina via Playwright Edge)
branded promotional social graphics for Galaxy Sports Edge (@GalaxySportsHQ):
  1. gse-week6-late-snf-mnf-master-board-20261018.png
     -> "BROADCAST 5-GAME SLATE MATRIX" (Midnight Blue & Electric Cyan 2x2+1 Split Grid with Scoreboard Tiles & GSE Edge Rings)
  2. gse-week6-snf-lambeau-hammer-20261018.png
     -> "SUNDAY NIGHT IN LAMBEAU: COWBOYS VS PACKERS" (Lambeau Emerald Green & Championship Gold Primetime Stadium Poster)
  3. gse-week6-top10-player-props-20261018.png
     -> "GSE ENGINE TOP 10 PROPS LEADERBOARD" (Carbon Slate & Neon Lime Horizontal Bar-Chart Dashboard showing Market Line vs GSE Projection)
  4. gse-week6-copula-sgp-parlay-card-20261018.png
     -> "OFFICIAL PARLAY & SGP BET SLIP PORTFOLIO" (Royal Amethyst & Gold Perforated Sportsbook Ticket Stubs in a 2x3 Grid)

100% GSE Engine & GSE Edge branded — ZERO third-party or internal pipeline acronyms.
"""

from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parents[1]
SOCIAL_DIR = REPO_ROOT / "social"
PUBLIC_SOCIAL_DIR = REPO_ROOT / "apps" / "web" / "public" / "social"
ARTIFACT_DIR = Path(r"C:\Users\Garrett\.gemini\antigravity-cli\brain\3fbdbf6a-cb00-4bb3-aa52-7ab90f521344")

SOCIAL_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_SOCIAL_DIR.mkdir(parents=True, exist_ok=True)

FONT_IMPORTS = """
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
"""


def build_graphic_1_html() -> str:
    """
    GRAPHIC 1: THE 5-GAME SLATE MATRIX (Broadcast Scoreboard 2x2 + 1 Hero Split-Grid)
    Palette: Deep Broadcast Navy (#030816 -> #07142B), Electric Cyan (#00F0FF), Royal Blue (#2563EB), Neon Mint (#00F5A0)
    Layout: Top Broadcast Ticker Bar + 2x2 Matchup Scoreboard Grid + Full-Width SNF/MNF Primetime Anchor Tile
    """
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
{FONT_IMPORTS}
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1200px;
    height: 1350px;
    background: radial-gradient(circle at 18% 12%, #0C254E 0%, #050D1E 52%, #02060F 100%);
    font-family: 'Inter', sans-serif;
    color: #F8FAFC;
    overflow: hidden;
    position: relative;
  }}
  /* Perspective grid overlay */
  .bg-grid {{
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }}
  .top-ticker {{
    height: 54px;
    background: linear-gradient(90deg, #00F0FF 0%, #0072FF 50%, #00F5A0 100%);
    color: #02060F;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 36px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }}
  .header {{
    padding: 28px 44px 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 1px solid rgba(0, 240, 255, 0.22);
  }}
  .brand-pill {{
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(0, 240, 255, 0.12);
    border: 1px solid rgba(0, 240, 255, 0.45);
    border-radius: 999px;
    padding: 6px 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: #00F0FF;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
  }}
  .title {{
    font-family: 'Outfit', sans-serif;
    font-size: 52px;
    font-weight: 900;
    line-height: 1.0;
    letter-spacing: -1px;
    text-transform: uppercase;
    background: linear-gradient(90deg, #FFFFFF 0%, #93C5FD 60%, #00F0FF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }}
  .subtitle {{
    font-size: 17px;
    color: #94A3B8;
    margin-top: 8px;
    font-weight: 500;
  }}
  .stat-cluster {{
    display: flex;
    gap: 14px;
  }}
  .stat-box {{
    background: rgba(9, 24, 52, 0.9);
    border: 1px solid rgba(0, 240, 255, 0.35);
    border-radius: 14px;
    padding: 12px 20px;
    text-align: center;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }}
  .stat-box .num {{
    font-family: 'Outfit', sans-serif;
    font-size: 32px;
    font-weight: 900;
    color: #00F5A0;
    line-height: 1;
  }}
  .stat-box .lbl {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #93C5FD;
    letter-spacing: 1.2px;
    margin-top: 4px;
  }}
  /* 2x2 Grid for first 4 games + 1 Full-Width Hero Card for SNF */
  .matrix-container {{
    padding: 24px 44px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }}
  .snf-spotlight {{
    background: linear-gradient(135deg, rgba(0, 240, 255, 0.16) 0%, rgba(10, 28, 62, 0.95) 55%, rgba(0, 245, 160, 0.14) 100%);
    border: 2px solid #00F0FF;
    border-radius: 20px;
    padding: 22px 28px;
    position: relative;
    box-shadow: 0 12px 35px rgba(0, 240, 255, 0.15);
    display: grid;
    grid-template-columns: 310px 1fr 195px;
    gap: 24px;
    align-items: center;
  }}
  .window-tag {{
    display: inline-block;
    background: #00F0FF;
    color: #02060F;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 800;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }}
  .matchup-big {{
    font-family: 'Outfit', sans-serif;
    font-size: 34px;
    font-weight: 900;
    color: #FFFFFF;
    letter-spacing: -0.5px;
    line-height: 1.05;
  }}
  .venue-sub {{
    font-size: 14px;
    color: #93C5FD;
    margin-top: 6px;
    font-weight: 600;
  }}
  .markets-3col {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }}
  .mkt-pill {{
    background: rgba(3, 10, 26, 0.85);
    border: 1px solid rgba(147, 197, 253, 0.3);
    border-radius: 12px;
    padding: 12px 14px;
  }}
  .mkt-pill.primary {{
    border-color: #00F5A0;
    background: rgba(0, 245, 160, 0.09);
  }}
  .mkt-type {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #94A3B8;
    font-weight: 700;
    letter-spacing: 1px;
  }}
  .mkt-pick {{
    font-family: 'Outfit', sans-serif;
    font-size: 21px;
    font-weight: 800;
    color: #FFFFFF;
    margin-top: 4px;
  }}
  .mkt-pill.primary .mkt-pick {{
    color: #00F5A0;
  }}
  .mkt-edge {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #00F0FF;
    margin-top: 4px;
    font-weight: 700;
  }}
  .edge-gauge {{
    background: rgba(3, 10, 26, 0.9);
    border: 2px solid #00F5A0;
    border-radius: 16px;
    padding: 14px;
    text-align: center;
  }}
  .edge-gauge .gse-lbl {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #00F5A0;
    letter-spacing: 1.5px;
    font-weight: 800;
  }}
  .edge-gauge .gse-val {{
    font-family: 'Outfit', sans-serif;
    font-size: 38px;
    font-weight: 900;
    color: #FFFFFF;
    line-height: 1.05;
    margin: 4px 0;
  }}
  .edge-gauge .gse-score {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #00F0FF;
    font-weight: 700;
  }}
  .grid-2x2 {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }}
  .game-tile {{
    background: linear-gradient(165deg, rgba(12, 31, 68, 0.92) 0%, rgba(5, 14, 34, 0.96) 100%);
    border: 1px solid rgba(0, 240, 255, 0.32);
    border-radius: 18px;
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
    box-shadow: 0 10px 28px rgba(0,0,0,0.45);
  }}
  .tile-top {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }}
  .tile-matchup {{
    font-family: 'Outfit', sans-serif;
    font-size: 27px;
    font-weight: 900;
    color: #FFFFFF;
    margin-top: 4px;
  }}
  .tile-badge {{
    background: rgba(0, 245, 160, 0.14);
    border: 1px solid #00F5A0;
    border-radius: 12px;
    padding: 8px 14px;
    text-align: right;
  }}
  .tile-badge .e-num {{
    font-family: 'Outfit', sans-serif;
    font-size: 24px;
    font-weight: 900;
    color: #00F5A0;
    line-height: 1;
  }}
  .tile-badge .e-lbl {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #E2E8F0;
    letter-spacing: 1px;
    margin-top: 3px;
  }}
  .tile-note {{
    font-size: 13.5px;
    color: #CBD5E1;
    line-height: 1.4;
    background: rgba(2, 6, 15, 0.65);
    border-left: 3px solid #00F0FF;
    padding: 8px 12px;
    border-radius: 0 8px 8px 0;
  }}
  .footer {{
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 68px;
    background: rgba(2, 6, 15, 0.95);
    border-top: 1px solid rgba(0, 240, 255, 0.25);
    padding: 0 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
  }}
  .footer-left {{
    color: #93C5FD;
    font-weight: 700;
  }}
  .footer-cta {{
    background: linear-gradient(90deg, #00F0FF, #00F5A0);
    color: #02060F;
    font-weight: 800;
    padding: 9px 22px;
    border-radius: 999px;
    letter-spacing: 1px;
  }}
</style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="top-ticker">
    <span>⚡ GALAXY SPORTS EDGE — POST-12PM KICKOFF LIVE BOARD</span>
    <span>5 REMAINING GAMES • 15 OFFICIAL PLAYS • 100% FREE ACCESS</span>
  </div>

  <div class="header">
    <div>
      <div class="brand-pill">🛰️ GSE ENGINE OFFICIAL SLATE MATRIX</div>
      <div class="title">LATE SUNDAY + SNF + MNF</div>
      <div class="subtitle">Every Remaining Spread, Total &amp; Moneyline Powered Exclusively by the GSE Engine</div>
    </div>
    <div class="stat-cluster">
      <div class="stat-box">
        <div class="num">15 / 15</div>
        <div class="lbl">PLAYS UNLOCKED</div>
      </div>
      <div class="stat-box">
        <div class="num">+10.8%</div>
        <div class="lbl">PEAK GSE EDGE</div>
      </div>
      <div class="stat-box">
        <div class="num">$0</div>
        <div class="lbl">100% FREE TODAY</div>
      </div>
    </div>
  </div>

  <div class="matrix-container">
    <!-- HERO SPOTLIGHT: SUNDAY NIGHT FOOTBALL -->
    <div class="snf-spotlight">
      <div>
        <span class="window-tag" style="background:#00F5A0;">★ SNF FEATURE • 7:20 PM CST</span>
        <div class="matchup-big">COWBOYS @ PACKERS</div>
        <div class="venue-sub">Lambeau Field • #1 Play of the Night</div>
        <div style="margin-top:8px; font-size:13px; color:#E2E8F0;">
          Josh Jacobs OUT + Micah Parsons &amp; Hargrave OUT — GSE Engine projects a 56.5-point primetime track meet.
        </div>
      </div>
      <div class="markets-3col">
        <div class="mkt-pill primary">
          <div class="mkt-type">TOTAL PLAY</div>
          <div class="mkt-pick">OVER 53.5</div>
          <div class="mkt-edge">GSE Proj: 56.5 Pts</div>
        </div>
        <div class="mkt-pill primary">
          <div class="mkt-type">SPREAD PLAY</div>
          <div class="mkt-pick">PACKERS -1.5</div>
          <div class="mkt-edge">GSE Margin: +4.5</div>
        </div>
        <div class="mkt-pill">
          <div class="mkt-type">MONEYLINE</div>
          <div class="mkt-pick">PACKERS -125</div>
          <div class="mkt-edge">GSE Win: 61.2%</div>
        </div>
      </div>
      <div class="edge-gauge">
        <div class="gse-lbl">GSE EDGE</div>
        <div class="gse-val">+10.8%</div>
        <div class="gse-score">GSE SCORE 69/100</div>
      </div>
    </div>

    <!-- 2x2 SCOREBOARD FOR OTHER 4 REMAINING GAMES -->
    <div class="grid-2x2">
      <!-- TILE 1: ARI @ LAR -->
      <div class="game-tile">
        <div class="tile-top">
          <div>
            <span class="window-tag">3:05 PM CST • SOFI DOME</span>
            <div class="tile-matchup">CARDINALS @ RAMS</div>
          </div>
          <div class="tile-badge">
            <div class="e-num">+10.5%</div>
            <div class="e-lbl">GSE EDGE • 69/100</div>
          </div>
        </div>
        <div class="markets-3col">
          <div class="mkt-pill primary">
            <div class="mkt-type">TOTAL</div>
            <div class="mkt-pick">OVER 51.5</div>
            <div class="mkt-edge">Proj: 54.8 Pts</div>
          </div>
          <div class="mkt-pill">
            <div class="mkt-type">SPREAD</div>
            <div class="mkt-pick">RAMS -12.5</div>
            <div class="mkt-edge">Edge +10.2%</div>
          </div>
          <div class="mkt-pill">
            <div class="mkt-type">MONEYLINE</div>
            <div class="mkt-pick">RAMS -750</div>
            <div class="mkt-edge">Win: 88.5%</div>
          </div>
        </div>
        <div class="tile-note">
          Puka Nacua (112.3 yds/G) &amp; Davante Adams (88.2 yds/G) attack an Arizona secondary missing both starting safeties indoors.
        </div>
      </div>

      <!-- TILE 2: BUF @ LV -->
      <div class="game-tile">
        <div class="tile-top">
          <div>
            <span class="window-tag">3:25 PM CST • ALLEGIANT DOME</span>
            <div class="tile-matchup">BILLS @ RAIDERS</div>
          </div>
          <div class="tile-badge">
            <div class="e-num">+10.4%</div>
            <div class="e-lbl">GSE EDGE • 69/100</div>
          </div>
        </div>
        <div class="markets-3col">
          <div class="mkt-pill primary">
            <div class="mkt-type">TOTAL</div>
            <div class="mkt-pick">OVER 53.5</div>
            <div class="mkt-edge">Proj: 56.2 Pts</div>
          </div>
          <div class="mkt-pill">
            <div class="mkt-type">SPREAD</div>
            <div class="mkt-pick">BILLS -5.5</div>
            <div class="mkt-edge">Edge +10.3%</div>
          </div>
          <div class="mkt-pill">
            <div class="mkt-type">MONEYLINE</div>
            <div class="mkt-pick">BILLS -245</div>
            <div class="mkt-edge">Win: 73.8%</div>
          </div>
        </div>
        <div class="tile-note">
          Josh Allen + James Cook (106.4 rush yds/G) on a fast indoor Vegas track against a Raiders interior missing DT Tonka Hemingway.
        </div>
      </div>

      <!-- TILE 3: LAC @ KC -->
      <div class="game-tile">
        <div class="tile-top">
          <div>
            <span class="window-tag">3:25 PM CST • ARROWHEAD</span>
            <div class="tile-matchup">CHARGERS @ CHIEFS</div>
          </div>
          <div class="tile-badge">
            <div class="e-num">+10.6%</div>
            <div class="e-lbl">GSE EDGE • 69/100</div>
          </div>
        </div>
        <div class="markets-3col">
          <div class="mkt-pill primary">
            <div class="mkt-type">SPREAD</div>
            <div class="mkt-pick">CHIEFS -7.5</div>
            <div class="mkt-edge">14d Bye Rest</div>
          </div>
          <div class="mkt-pill primary">
            <div class="mkt-type">TOTAL</div>
            <div class="mkt-pick">UNDER 41.5</div>
            <div class="mkt-edge">Proj: 38.0 Pts</div>
          </div>
          <div class="mkt-pill">
            <div class="mkt-type">MONEYLINE</div>
            <div class="mkt-pick">CHIEFS -360</div>
            <div class="mkt-edge">Win: 79.5%</div>
          </div>
        </div>
        <div class="tile-note">
          Chiefs off Week 5 bye (14d rest) with Kenneth Walker III (134.2 rush yds/G) vs Chargers OL missing All-Pro LT Joe Alt.
        </div>
      </div>

      <!-- TILE 4: WSH @ SF -->
      <div class="game-tile">
        <div class="tile-top">
          <div>
            <span class="window-tag" style="background:#38BDF8;">MON 7:15 PM CST • MNF</span>
            <div class="tile-matchup">COMMANDERS @ 49ERS</div>
          </div>
          <div class="tile-badge">
            <div class="e-num">+10.4%</div>
            <div class="e-lbl">GSE EDGE • 68/100</div>
          </div>
        </div>
        <div class="markets-3col">
          <div class="mkt-pill primary">
            <div class="mkt-type">SPREAD</div>
            <div class="mkt-pick">49ERS -7.5</div>
            <div class="mkt-edge">61.7% Motion</div>
          </div>
          <div class="mkt-pill">
            <div class="mkt-type">TOTAL</div>
            <div class="mkt-pick">OVER 50.5</div>
            <div class="mkt-edge">Proj: 54.0 Pts</div>
          </div>
          <div class="mkt-pill">
            <div class="mkt-type">MONEYLINE</div>
            <div class="mkt-pick">49ERS -355</div>
            <div class="mkt-edge">Win: 79.2%</div>
          </div>
        </div>
        <div class="tile-note">
          Brock Purdy, CMC &amp; George Kittle (Deebo OUT) dissect a Washington defense missing Charles Omenihu with 3 safeties Questionable.
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">@GalaxySportsHQ • GALAXYSPORTSEDGE.COM/PICKS</div>
    <div class="footer-cta">ALL 15 PLAYS LIVE &amp; FREE RIGHT NOW →</div>
  </div>
</body>
</html>"""


def build_graphic_2_html() -> str:
    """
    GRAPHIC 2: SUNDAY NIGHT IN LAMBEAU: COWBOYS @ PACKERS (Primetime Emerald & Gold Poster)
    Palette: Lambeau Stadium Emerald (#03180E -> #072B1A), Championship Gold (#F59E0B / #FBBF24), Warm Ivory (#FFFBEB)
    Layout: Giant Centered Primetime Matchup Banner + 2-Column Side/Total Showcase + 3 Spotlight Player Props + Perforated Gold SGP Ticket
    """
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
{FONT_IMPORTS}
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1200px;
    height: 1350px;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.24) 0%, transparent 55%),
      radial-gradient(circle at 85% 80%, rgba(16, 185, 129, 0.20) 0%, transparent 50%),
      linear-gradient(180deg, #041F13 0%, #03140C 60%, #020C07 100%);
    font-family: 'Inter', sans-serif;
    color: #FFFBEB;
    overflow: hidden;
    position: relative;
  }}
  /* Yard-line field markings in background */
  .field-lines {{
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.03) 0px,
      rgba(255, 255, 255, 0.03) 2px,
      transparent 2px,
      transparent 90px
    );
    pointer-events: none;
  }}
  .gold-frame {{
    position: absolute;
    inset: 22px;
    border: 2px solid rgba(251, 191, 36, 0.35);
    border-radius: 26px;
    pointer-events: none;
  }}
  .hero-header {{
    text-align: center;
    padding: 46px 60px 24px;
    position: relative;
  }}
  .snf-crown {{
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(90deg, #F59E0B, #FDE68A, #F59E0B);
    color: #03140C;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 900;
    font-size: 14px;
    padding: 7px 22px;
    border-radius: 999px;
    letter-spacing: 2px;
    text-transform: uppercase;
    box-shadow: 0 6px 24px rgba(245, 158, 11, 0.4);
  }}
  .matchup-poster {{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 28px;
    margin-top: 18px;
  }}
  .team-block {{
    text-align: center;
  }}
  .team-city {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    color: #FCD34D;
    letter-spacing: 3px;
    font-weight: 700;
  }}
  .team-name {{
    font-family: 'Outfit', sans-serif;
    font-size: 64px;
    font-weight: 900;
    letter-spacing: -1.5px;
    line-height: 0.95;
    color: #FFFFFF;
    text-shadow: 0 6px 20px rgba(0,0,0,0.6);
  }}
  .vs-circle {{
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: rgba(251, 191, 36, 0.15);
    border: 2px solid #FBBF24;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Outfit', sans-serif;
    font-weight: 900;
    font-size: 24px;
    color: #FBBF24;
  }}
  .sub-meta {{
    margin-top: 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    color: #A7F3D0;
    letter-spacing: 1px;
  }}
  .content-wrap {{
    padding: 0 54px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }}
  /* Two Giant Main Plays */
  .main-plays-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
  }}
  .hammer-card {{
    background: linear-gradient(155deg, rgba(8, 53, 32, 0.95) 0%, rgba(4, 28, 17, 0.98) 100%);
    border: 2px solid #FBBF24;
    border-radius: 22px;
    padding: 24px 28px;
    position: relative;
    box-shadow: 0 14px 36px rgba(0,0,0,0.55);
  }}
  .hammer-tag {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 800;
    color: #FBBF24;
    letter-spacing: 1.5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .hammer-pick {{
    font-family: 'Outfit', sans-serif;
    font-size: 46px;
    font-weight: 900;
    color: #FFFFFF;
    margin: 8px 0 6px;
    letter-spacing: -1px;
  }}
  .hammer-proj {{
    display: inline-block;
    background: rgba(251, 191, 36, 0.16);
    border: 1px solid rgba(251, 191, 36, 0.5);
    color: #FDE68A;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 8px;
    margin-bottom: 12px;
  }}
  .hammer-why {{
    font-size: 14.5px;
    line-height: 1.45;
    color: #D1FAE5;
  }}
  /* 3 Player Props Row */
  .section-bar {{
    display: flex;
    align-items: center;
    gap: 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 800;
    color: #FBBF24;
    letter-spacing: 2px;
    text-transform: uppercase;
  }}
  .section-bar::after {{
    content: "";
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, rgba(251,191,36,0.5), transparent);
  }}
  .props-3col {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }}
  .prop-poster-card {{
    background: rgba(6, 38, 23, 0.9);
    border: 1px solid rgba(52, 211, 153, 0.45);
    border-radius: 18px;
    padding: 18px 20px;
  }}
  .prop-role {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #34D399;
    font-weight: 800;
  }}
  .prop-player {{
    font-family: 'Outfit', sans-serif;
    font-size: 24px;
    font-weight: 900;
    color: #FFFFFF;
    margin-top: 2px;
  }}
  .prop-line {{
    font-family: 'Outfit', sans-serif;
    font-size: 26px;
    font-weight: 900;
    color: #FBBF24;
    margin: 8px 0 4px;
  }}
  .prop-delta {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #A7F3D0;
    font-weight: 700;
  }}
  .prop-note {{
    font-size: 13px;
    color: #CBD5E1;
    margin-top: 8px;
    line-height: 1.35;
  }}
  /* Golden Perforated SGP Ticket Stub */
  .sgp-stub {{
    background: linear-gradient(90deg, #1E1303 0%, #2E1D04 50%, #1E1303 100%);
    border: 2px dashed #FBBF24;
    border-radius: 20px;
    padding: 22px 30px;
    display: grid;
    grid-template-columns: 1fr 220px;
    align-items: center;
    gap: 24px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6);
  }}
  .sgp-title {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #FBBF24;
    font-weight: 800;
    letter-spacing: 2px;
  }}
  .sgp-legs {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 20px;
    margin-top: 10px;
    font-family: 'Outfit', sans-serif;
    font-size: 19px;
    font-weight: 800;
    color: #FFFFFF;
  }}
  .sgp-payout-box {{
    background: linear-gradient(135deg, #F59E0B, #FBBF24);
    color: #03140C;
    border-radius: 16px;
    padding: 16px;
    text-align: center;
  }}
  .sgp-odds {{
    font-family: 'Outfit', sans-serif;
    font-size: 46px;
    font-weight: 900;
    line-height: 1;
  }}
  .sgp-sub {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 800;
    margin-top: 4px;
  }}
  .poster-footer {{
    position: absolute;
    bottom: 34px;
    left: 54px;
    right: 54px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: #A7F3D0;
  }}
</style>
</head>
<body>
  <div class="field-lines"></div>
  <div class="gold-frame"></div>

  <div class="hero-header">
    <div class="snf-crown">👑 SUNDAY NIGHT FOOTBALL • GSE ENGINE #1 HAMMER OF WEEK 6</div>
    <div class="matchup-poster">
      <div class="team-block">
        <div class="team-city">DALLAS</div>
        <div class="team-name">COWBOYS</div>
      </div>
      <div class="vs-circle">AT</div>
      <div class="team-block">
        <div class="team-city">GREEN BAY</div>
        <div class="team-name">PACKERS</div>
      </div>
    </div>
    <div class="sub-meta">7:20 PM CST • LAMBEAU FIELD • NBC / PEACOCK • 100% FREE CARD</div>
  </div>

  <div class="content-wrap">
    <!-- 2 MAIN GAME PLAYS -->
    <div class="main-plays-grid">
      <div class="hammer-card">
        <div class="hammer-tag">
          <span>🔥 #1 TOTAL OF THE SLATE</span>
          <span>GSE SCORE 69/100</span>
        </div>
        <div class="hammer-pick">OVER 53.5 (-110)</div>
        <div class="hammer-proj">GSE ENGINE PROJECTION: 56.5 PTS (+10.8% GSE EDGE)</div>
        <div class="hammer-why">
          Both defenses enter missing their top pass-rush &amp; coverage anchors (Micah Parsons OUT, Javon Hargrave IR, DeMarvion Overshown OUT, Cobie Durant OUT). With RB Josh Jacobs OUT, Green Bay shifts into an aggressive 4-wideout passing script.
        </div>
      </div>

      <div class="hammer-card">
        <div class="hammer-tag">
          <span>🧀 PRIMETIME SIDE &amp; ML</span>
          <span>GSE SCORE 69/100</span>
        </div>
        <div class="hammer-pick">PACKERS -1.5 (-110)</div>
        <div class="hammer-proj">GSE ENGINE MARGIN: GB BY +4.5 PTS (+10.5% GSE EDGE)</div>
        <div class="hammer-why">
          Green Bay owns the cleanest pocket in football (5.31 yds average depth) while Dallas travels north without Overshown or Durant. Also playable outright on <strong>Packers ML (-125, 61.2% GSE Win Prob)</strong>.
        </div>
      </div>
    </div>

    <!-- 3 PRIMETIME PROPS -->
    <div class="section-bar">🎯 GSE ENGINE SNF PLAYER PROP PROJECTIONS</div>
    <div class="props-3col">
      <div class="prop-poster-card">
        <div class="prop-role">GB QUARTERBACK</div>
        <div class="prop-player">JORDAN LOVE</div>
        <div class="prop-line">OVER 263.5 PASS YDS</div>
        <div class="prop-delta">GSE PROJ: 288.5 YDS (+25.0 YD CUSHION)</div>
        <div class="prop-note">Josh Jacobs OUT forces 38+ dropbacks behind Green Bay's #1 pass-blocking pocket.</div>
      </div>

      <div class="prop-poster-card">
        <div class="prop-role">GB WIDE RECEIVER</div>
        <div class="prop-player">CHRISTIAN WATSON</div>
        <div class="prop-line">OVER 74.5 REC YDS</div>
        <div class="prop-delta">GSE PROJ: 86.2 YDS (+11.7 YD CUSHION)</div>
        <div class="prop-note">Averaging 94.8 yds/gm with 5 TDs in 2026; faces Dallas missing CB Cobie Durant.</div>
      </div>

      <div class="prop-poster-card">
        <div class="prop-role">DAL WIDE RECEIVER</div>
        <div class="prop-player">CEEDEE LAMB</div>
        <div class="prop-line">OVER 86.5 REC YDS</div>
        <div class="prop-delta">GSE PROJ: 97.4 YDS (+10.9 YD CUSHION)</div>
        <div class="prop-note">51 targets in 5 games (101.4 yds/gm); GB missing Micah Parsons &amp; CB Benjamin St-Juste.</div>
      </div>
    </div>

    <!-- GOLDEN SGP TICKET -->
    <div class="sgp-stub">
      <div>
        <div class="sgp-title">🎟️ OFFICIAL SNF LAMBEAU SHOOTOUT SAME-GAME PARLAY</div>
        <div class="sgp-legs">
          <div>✔ DAL @ GB OVER 53.5 TOTAL PTS</div>
          <div>✔ JORDAN LOVE OVER 263.5 PASS YDS</div>
          <div>✔ CHRISTIAN WATSON OVER 74.5 REC YDS</div>
          <div>✔ CEEDEE LAMB OVER 86.5 REC YDS</div>
        </div>
      </div>
      <div class="sgp-payout-box">
        <div class="sgp-odds">+485</div>
        <div class="sgp-sub">+61.3% GSE EDGE</div>
      </div>
    </div>
  </div>

  <div class="poster-footer">
    <span>@GalaxySportsHQ • 100% POWERED BY THE GSE ENGINE</span>
    <span style="color:#FBBF24; font-weight:800;">FULL SNF CARD FREE AT GALAXYSPORTSEDGE.COM →</span>
  </div>
</body>
</html>"""


def build_graphic_3_html() -> str:
    """
    GRAPHIC 3: GSE ENGINE TOP 10 PROPS LEADERBOARD (Visual Bar-Chart & Projection Delta Theme)
    Palette: Carbon Slate (#090A0F -> #11131C), Neon Chartreuse/Lime (#CCFF00 / #10B981), Crisp White
    Layout: Data-Viz Horizontal Comparison Table where every prop has a visual Book Line vs GSE Projection Bar & Yardage Cushion Pill
    """
    props = [
        ("01", "TYLER HIGBEE", "LAR • TE", "ARI @ LAR (3:05 PM)", "OVER 31.5 REC YDS", 31.5, 44.6, "+13.1 YDS", "74.5%", 65, 92),
        ("02", "JORDAN LOVE", "GB • QB", "DAL @ GB (7:20 PM SNF)", "OVER 263.5 PASS YDS", 263.5, 288.5, "+25.0 YDS", "68.4%", 74, 96),
        ("03", "KENNETH WALKER III", "KC • RB", "LAC @ KC (3:25 PM)", "OVER 90.5 RUSH YDS", 90.5, 107.4, "+16.9 YDS", "74.0%", 70, 94),
        ("04", "KHALIL SHAKIR", "BUF • WR", "BUF @ LV (3:25 PM)", "OVER 38.5 REC YDS", 38.5, 49.1, "+10.6 YDS", "69.9%", 68, 90),
        ("05", "CHRISTIAN WATSON", "GB • WR", "DAL @ GB (7:20 PM SNF)", "OVER 74.5 REC YDS", 74.5, 86.2, "+11.7 YDS", "65.5%", 72, 89),
        ("06", "DAVANTE ADAMS", "LAR • WR", "ARI @ LAR (3:05 PM)", "OVER 57.5 REC YDS", 57.5, 74.6, "+17.1 YDS", "71.6%", 66, 91),
        ("07", "CEEDEE LAMB", "DAL • WR", "DAL @ GB (7:20 PM SNF)", "OVER 86.5 REC YDS", 86.5, 97.4, "+10.9 YDS", "64.0%", 75, 88),
        ("08", "BROCK PURDY", "SF • QB", "WSH @ SF (MON 7:15 PM)", "OVER 258.5 PASS YDS", 258.5, 275.0, "+16.5 YDS", "63.7%", 76, 91),
        ("09", "GEORGE KITTLE", "SF • TE", "WSH @ SF (MON 7:15 PM)", "OVER 58.5 REC YDS", 58.5, 67.8, "+9.3 YDS", "65.4%", 71, 86),
        ("10", "JAMES COOK", "BUF • RB", "BUF @ LV (3:25 PM)", "OVER 93.5 RUSH YDS", 93.5, 106.4, "+12.9 YDS", "62.8%", 73, 88),
    ]

    rows_html = ""
    for rank, player, pos, game, play_str, line_v, proj_v, cushion, win_pct, bar_book, bar_gse in props:
        rows_html += f"""
        <div class="prop-row">
          <div class="rank-cell">{rank}</div>
          <div class="player-cell">
            <div class="p-name">{player} <span class="p-pos">{pos}</span></div>
            <div class="p-game">{game}</div>
          </div>
          <div class="pick-cell">{play_str}</div>
          <div class="chart-cell">
            <div class="bars-wrap">
              <div class="bar-line-row">
                <span class="b-lbl">BOOK</span>
                <div class="bar-track"><div class="bar-fill-book" style="width:{bar_book}%;"></div></div>
                <span class="b-val">{line_v}</span>
              </div>
              <div class="bar-line-row">
                <span class="b-lbl gse">GSE</span>
                <div class="bar-track"><div class="bar-fill-gse" style="width:{bar_gse}%;"></div></div>
                <span class="b-val gse">{proj_v}</span>
              </div>
            </div>
          </div>
          <div class="cushion-cell">
            <div class="cush-pill">{cushion}</div>
            <div class="win-sub">{win_pct} HIT PROB</div>
          </div>
        </div>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
{FONT_IMPORTS}
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1200px;
    height: 1350px;
    background: linear-gradient(180deg, #090B10 0%, #0E121B 100%);
    font-family: 'Inter', sans-serif;
    color: #F8FAFC;
    overflow: hidden;
    position: relative;
  }}
  .top-accent {{
    height: 10px;
    background: linear-gradient(90deg, #CCFF00 0%, #10B981 50%, #CCFF00 100%);
  }}
  .header {{
    padding: 28px 44px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(204, 255, 0, 0.2);
  }}
  .kicker {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 800;
    color: #CCFF00;
    letter-spacing: 2px;
    text-transform: uppercase;
  }}
  .title {{
    font-family: 'Outfit', sans-serif;
    font-size: 46px;
    font-weight: 900;
    color: #FFFFFF;
    letter-spacing: -1px;
    line-height: 1.05;
    margin-top: 4px;
  }}
  .title span {{
    color: #CCFF00;
  }}
  .legend-box {{
    background: #141926;
    border: 1px solid rgba(204, 255, 0, 0.35);
    border-radius: 14px;
    padding: 14px 20px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
  }}
  .legend-item {{
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 4px 0;
  }}
  .dot-book {{ width: 12px; height: 12px; border-radius: 3px; background: #475569; }}
  .dot-gse {{ width: 12px; height: 12px; border-radius: 3px; background: #CCFF00; }}

  .col-headers {{
    display: grid;
    grid-template-columns: 54px 270px 235px 1fr 165px;
    gap: 14px;
    padding: 14px 44px 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 800;
    color: #94A3B8;
    letter-spacing: 1.5px;
  }}
  .rows-container {{
    padding: 0 44px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }}
  .prop-row {{
    display: grid;
    grid-template-columns: 54px 270px 235px 1fr 165px;
    gap: 14px;
    align-items: center;
    background: #131824;
    border: 1px solid rgba(255,255,255,0.08);
    border-left: 4px solid #CCFF00;
    border-radius: 12px;
    padding: 11px 16px;
  }}
  .rank-cell {{
    font-family: 'Outfit', sans-serif;
    font-size: 26px;
    font-weight: 900;
    color: #CCFF00;
    text-align: center;
  }}
  .p-name {{
    font-family: 'Outfit', sans-serif;
    font-size: 20px;
    font-weight: 800;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    gap: 8px;
  }}
  .p-pos {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    background: rgba(204, 255, 0, 0.14);
    color: #CCFF00;
    padding: 2px 7px;
    border-radius: 4px;
    font-weight: 700;
  }}
  .p-game {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    color: #94A3B8;
    margin-top: 3px;
  }}
  .pick-cell {{
    font-family: 'Outfit', sans-serif;
    font-size: 19px;
    font-weight: 800;
    color: #F8FAFC;
    background: rgba(255,255,255,0.04);
    padding: 8px 12px;
    border-radius: 8px;
    text-align: center;
    border: 1px solid rgba(255,255,255,0.08);
  }}
  .bars-wrap {{
    display: flex;
    flex-direction: column;
    gap: 6px;
  }}
  .bar-line-row {{
    display: grid;
    grid-template-columns: 42px 1fr 48px;
    align-items: center;
    gap: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }}
  .b-lbl {{ color: #64748B; font-weight: 700; }}
  .b-lbl.gse {{ color: #CCFF00; font-weight: 800; }}
  .bar-track {{
    height: 10px;
    background: #090B10;
    border-radius: 999px;
    overflow: hidden;
  }}
  .bar-fill-book {{
    height: 100%;
    background: #475569;
    border-radius: 999px;
  }}
  .bar-fill-gse {{
    height: 100%;
    background: linear-gradient(90deg, #10B981, #CCFF00);
    border-radius: 999px;
  }}
  .b-val {{ color: #94A3B8; font-weight: 700; text-align: right; }}
  .b-val.gse {{ color: #CCFF00; font-weight: 800; }}
  .cushion-cell {{
    text-align: right;
  }}
  .cush-pill {{
    display: inline-block;
    background: rgba(204, 255, 0, 0.16);
    border: 1px solid #CCFF00;
    color: #CCFF00;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 6px;
  }}
  .win-sub {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #10B981;
    margin-top: 4px;
    font-weight: 700;
  }}
  .footer {{
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 62px;
    background: #06080C;
    border-top: 1px solid rgba(204, 255, 0, 0.25);
    padding: 0 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13.5px;
  }}
</style>
</head>
<body>
  <div class="top-accent"></div>
  <div class="header">
    <div>
      <div class="kicker">📊 GSE ENGINE PROJECTION DELTA LEADERBOARD</div>
      <div class="title">TOP 10 PLAYER PROPS <span>• LATE SUN + SNF + MNF</span></div>
    </div>
    <div class="legend-box">
      <div class="legend-item"><span class="dot-book"></span> <span>SPORTSBOOK LINE</span></div>
      <div class="legend-item"><span class="dot-gse"></span> <span style="color:#CCFF00;font-weight:800;">GSE ENGINE PROJECTION</span></div>
    </div>
  </div>

  <div class="col-headers">
    <div>RANK</div>
    <div>PLAYER / MATCHUP</div>
    <div style="text-align:center;">OFFICIAL PLAY</div>
    <div>BOOK LINE VS. GSE ENGINE PROJECTION</div>
    <div style="text-align:right;">GSE CUSHION</div>
  </div>

  <div class="rows-container">
    {rows_html}
  </div>

  <div class="footer">
    <span style="color:#94A3B8;font-weight:700;">@GalaxySportsHQ • ALL PROJECTIONS POWERED BY THE GSE ENGINE</span>
    <span style="color:#CCFF00;font-weight:800;">FULL PROP CARD FREE AT GALAXYSPORTSEDGE.COM/SGP-PROJECTIONS →</span>
  </div>
</body>
</html>"""


def build_graphic_4_html() -> str:
    """
    GRAPHIC 4: OFFICIAL PARLAY & SGP BET SLIP PORTFOLIO (Perforated Sportsbook Ticket Stubs in 2x3 Grid)
    Palette: Royal Amethyst & Obsidian (#0D0618 -> #1A0B2E), Electric Gold (#FBBF24), Neon Magenta/Violet (#C084FC / #E879F9)
    Layout: 6 Realistic Perforated Betting Ticket Slips (2 Columns x 3 Rows) with Tear Notches, Barcode Strips & Payout Multipliers
    """
    tickets = [
        (
            "TICKET #01 • SNF PRIMETIME SGP",
            "COWBOYS @ PACKERS (7:20 PM CST)",
            "+485",
            "+61.3% GSE EDGE",
            [
                "DAL @ GB Game Total OVER 53.5 (-110)",
                "Jordan Love OVER 263.5 Pass Yds (-115)",
                "Christian Watson OVER 74.5 Rec Yds (-115)",
                "CeeDee Lamb OVER 86.5 Rec Yds (-115)",
            ],
            "gold",
        ),
        (
            "TICKET #02 • SOFI INDOOR SGP",
            "CARDINALS @ RAMS (3:05 PM CST)",
            "+475",
            "+60.5% GSE EDGE",
            [
                "ARI @ LAR Game Total OVER 51.5 (-110)",
                "Tyler Higbee OVER 31.5 Rec Yds (-115)",
                "Davante Adams OVER 57.5 Rec Yds (-115)",
                "Puka Nacua OVER 94.5 Rec Yds (-115)",
            ],
            "violet",
        ),
        (
            "TICKET #03 • ALLEGIANT DOME SGP",
            "BILLS @ RAIDERS (3:25 PM CST)",
            "+460",
            "+43.7% GSE EDGE",
            [
                "BUF @ LV Game Total OVER 53.5 (-110)",
                "Khalil Shakir OVER 38.5 Rec Yds (-115)",
                "James Cook OVER 93.5 Rush Yds (-115)",
                "Josh Allen OVER 239.5 Pass Yds (-115)",
            ],
            "violet",
        ),
        (
            "TICKET #04 • ARROWHEAD BYE SCRIPT SGP",
            "CHARGERS @ CHIEFS (3:25 PM CST)",
            "+425",
            "+51.2% GSE EDGE",
            [
                "Kansas City Chiefs -7.5 Spread (-110)",
                "LAC @ KC Game Total UNDER 41.5 (-110)",
                "Kenneth Walker III OVER 90.5 Rush Yds (-115)",
                "Post-Bye Clock Control Trench Script",
            ],
            "violet",
        ),
        (
            "TICKET #05 • MONDAY NIGHT CLOSER SGP",
            "COMMANDERS @ 49ERS (MON 7:15 PM CST)",
            "+450",
            "+61.6% GSE EDGE",
            [
                "San Francisco 49ers -7.5 Spread (-110)",
                "WSH @ SF Game Total OVER 50.5 (-110)",
                "Brock Purdy OVER 258.5 Pass Yds (-115)",
                "George Kittle OVER 58.5 Rec Yds (-115)",
            ],
            "violet",
        ),
        (
            "TICKET #06 • CROSS-GAME BOARD SWEEP",
            "LATE SUNDAY + SNF + MNF PARLAY",
            "+1228",
            "4-LEG HEAVYWEIGHT SWEEP",
            [
                "Buffalo Bills -5.5 (-110) @ Raiders",
                "Kansas City Chiefs -7.5 (-110) vs Chargers",
                "DAL @ GB SNF Total OVER 53.5 (-110)",
                "San Francisco 49ers -7.5 (-110) vs WSH",
            ],
            "gold",
        ),
    ]

    cards_html = ""
    for code, title, odds, edge_lbl, legs, theme in tickets:
        legs_html = "".join(
            f'<div class="t-leg"><span class="chk">✔</span><span>{leg}</span></div>'
            for leg in legs
        )
        cls = "ticket-card gold" if theme == "gold" else "ticket-card"
        cards_html += f"""
        <div class="{cls}">
          <div class="notch-left"></div>
          <div class="notch-right"></div>
          <div class="t-head">
            <div>
              <div class="t-code">{code}</div>
              <div class="t-title">{title}</div>
            </div>
            <div class="t-odds-box">
              <div class="t-odds">{odds}</div>
              <div class="t-edge">{edge_lbl}</div>
            </div>
          </div>
          <div class="t-divider"></div>
          <div class="t-legs">
            {legs_html}
          </div>
          <div class="t-barcode">
            <span>||| || |||| | ||| |||| || | ||| ||||</span>
            <span>VERIFIED BY GSE ENGINE</span>
          </div>
        </div>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
{FONT_IMPORTS}
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1200px;
    height: 1350px;
    background:
      radial-gradient(circle at 85% 15%, rgba(192, 132, 252, 0.22) 0%, transparent 45%),
      radial-gradient(circle at 15% 85%, rgba(251, 191, 36, 0.18) 0%, transparent 45%),
      linear-gradient(160deg, #0B0514 0%, #150926 55%, #090410 100%);
    font-family: 'Inter', sans-serif;
    color: #FAF5FF;
    overflow: hidden;
    position: relative;
  }}
  .header {{
    padding: 34px 48px 22px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 1px solid rgba(192, 132, 252, 0.28);
  }}
  .badge {{
    display: inline-block;
    background: rgba(251, 191, 36, 0.16);
    border: 1px solid #FBBF24;
    color: #FBBF24;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 800;
    padding: 5px 14px;
    border-radius: 999px;
    letter-spacing: 1.5px;
    margin-bottom: 8px;
  }}
  .title {{
    font-family: 'Outfit', sans-serif;
    font-size: 48px;
    font-weight: 900;
    letter-spacing: -1px;
    line-height: 1;
    color: #FFFFFF;
  }}
  .title span {{
    color: #FBBF24;
  }}
  .sub {{
    font-size: 16px;
    color: #D8B4FE;
    margin-top: 6px;
    font-weight: 500;
  }}
  .summary-pill {{
    background: rgba(26, 12, 46, 0.9);
    border: 1px solid #C084FC;
    border-radius: 16px;
    padding: 14px 22px;
    text-align: right;
  }}
  .summary-pill .big {{
    font-family: 'Outfit', sans-serif;
    font-size: 30px;
    font-weight: 900;
    color: #FBBF24;
  }}
  .summary-pill .sm {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #E9D5FF;
    letter-spacing: 1px;
  }}

  .tickets-grid {{
    padding: 26px 48px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
  }}
  .ticket-card {{
    background: linear-gradient(180deg, #1B0E30 0%, #120821 100%);
    border: 1.5px solid rgba(192, 132, 252, 0.45);
    border-radius: 20px;
    padding: 20px 24px 16px;
    position: relative;
    box-shadow: 0 12px 30px rgba(0,0,0,0.5);
    overflow: hidden;
  }}
  .ticket-card.gold {{
    background: linear-gradient(180deg, #271705 0%, #170D02 100%);
    border: 2px solid #FBBF24;
  }}
  .notch-left, .notch-right {{
    position: absolute;
    top: 86px;
    width: 20px;
    height: 20px;
    background: #0D0618;
    border-radius: 50%;
    border: 1.5px solid rgba(192, 132, 252, 0.45);
  }}
  .ticket-card.gold .notch-left, .ticket-card.gold .notch-right {{
    border-color: #FBBF24;
  }}
  .notch-left {{ left: -11px; }}
  .notch-right {{ right: -11px; }}

  .t-head {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }}
  .t-code {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 800;
    color: #C084FC;
    letter-spacing: 1.2px;
  }}
  .ticket-card.gold .t-code {{
    color: #FBBF24;
  }}
  .t-title {{
    font-family: 'Outfit', sans-serif;
    font-size: 22px;
    font-weight: 900;
    color: #FFFFFF;
    margin-top: 3px;
  }}
  .t-odds-box {{
    text-align: right;
  }}
  .t-odds {{
    font-family: 'Outfit', sans-serif;
    font-size: 34px;
    font-weight: 900;
    color: #FBBF24;
    line-height: 1;
  }}
  .t-edge {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    color: #34D399;
    font-weight: 800;
    margin-top: 3px;
  }}
  .t-divider {{
    margin: 14px 0;
    border-top: 1.5px dashed rgba(192, 132, 252, 0.35);
  }}
  .ticket-card.gold .t-divider {{
    border-top-color: rgba(251, 191, 36, 0.5);
  }}
  .t-legs {{
    display: flex;
    flex-direction: column;
    gap: 8px;
  }}
  .t-leg {{
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 700;
    color: #F3E8FF;
  }}
  .chk {{
    color: #34D399;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 900;
  }}
  .t-barcode {{
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    color: #94A3B8;
    letter-spacing: 1px;
  }}
  .footer {{
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 64px;
    background: #07030D;
    border-top: 1px solid rgba(192, 132, 252, 0.3);
    padding: 0 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
  }}
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="badge">🎟️ GSE ENGINE CORRELATED SGP &amp; PARLAY TICKETS</div>
      <div class="title">OFFICIAL PARLAY SLIP <span>PORTFOLIO</span></div>
      <div class="sub">Game-Script Matched Same-Game Parlays &amp; Multi-Game Tickets Across All 5 Remaining Games</div>
    </div>
    <div class="summary-pill">
      <div class="big">6 OFFICIAL SLIPS</div>
      <div class="sm">UP TO +1228 ODDS • 100% FREE</div>
    </div>
  </div>

  <div class="tickets-grid">
    {cards_html}
  </div>

  <div class="footer">
    <span style="color:#D8B4FE;font-weight:700;">@GalaxySportsHQ • BUILT EXCLUSIVELY BY THE GSE ENGINE</span>
    <span style="color:#FBBF24;font-weight:800;">ALL PARLAYS FREE AT GALAXYSPORTSEDGE.COM/SGP-PROJECTIONS →</span>
  </div>
</body>
</html>"""


GRAPHICS = [
    ("gse-week6-late-snf-mnf-master-board-20261018", build_graphic_1_html),
    ("gse-week6-snf-lambeau-hammer-20261018", build_graphic_2_html),
    ("gse-week6-top10-player-props-20261018", build_graphic_3_html),
    ("gse-week6-copula-sgp-parlay-card-20261018", build_graphic_4_html),
]


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        page = browser.new_page(
            viewport={"width": 1200, "height": 1350},
            device_scale_factor=2,
        )
        for slug, builder in GRAPHICS:
            html_content = builder()
            html_path = SOCIAL_DIR / f"{slug}.html"
            html_path.write_text(html_content, encoding="utf-8")

            page.set_content(html_content, wait_until="networkidle")
            page.wait_for_timeout(400)

            png_path = SOCIAL_DIR / f"{slug}.png"
            page.screenshot(path=str(png_path), full_page=False)

            pub_png = PUBLIC_SOCIAL_DIR / f"{slug}.png"
            shutil.copy2(png_path, pub_png)

            if ARTIFACT_DIR.exists():
                art_png = ARTIFACT_DIR / f"{slug}.png"
                shutil.copy2(png_path, art_png)

            print(f"Rendered unique graphic: {png_path.name} ({png_path.stat().st_size:,} bytes)")
        browser.close()


if __name__ == "__main__":
    main()
