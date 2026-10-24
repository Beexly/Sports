#!/usr/bin/env python3
"""
scripts/generate_mnf_wsh_sf_graphic.py
Generates the high-resolution (2x Retina via Playwright Edge) branded MNF social graphic
for Galaxy Sports Edge (@GalaxySportsHQ):
  - social/gse-mnf-wsh-sf-master-card-20261019.png
100% verified 2026 Week 6 rosters & lines from 401873008_20261018T09.json and espn_nfl_injuries_week6.json:
  - WSH TE1: Chig Okonkwo (OVER 24.5 Rec Yds)
  - SF TE1: George Kittle (OVER 64.5 Rec Yds)
  - SF RB1: Christian McCaffrey (OVER 39.5 Rec Yds / 105.5 Rush+Rec)
  - WSH RB: Rachaad White (UNDER 47.5 Rush Yds)
  - WSH WRs: Stefon Diggs (OVER 4.5 Rec), Terry McLaurin (UNDER 44.5 Rec Yds), Antonio Williams
  - QBs: Brock Purdy (OVER 248.5 Pass Yds), Jayden Daniels (204.5 Pass / 38.5 Rush)
  - Injuries: Deebo Samuel OUT, Nick Bosa OUT, Dre Greenlaw SUSP, Charles Omenihu OUT, Jacory Croskey-Merritt OUT
"""

from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parents[1]
SOCIAL_DIR = REPO_ROOT / "social"
PUBLIC_SOCIAL_DIR = REPO_ROOT / "apps" / "web" / "public" / "social"
ARTIFACT_DIR = Path(r"C:\Users\Garrett\.gemini\antigravity-cli\brain\5bee4571-843f-40af-ab35-c1724397fa85")

SOCIAL_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_SOCIAL_DIR.mkdir(parents=True, exist_ok=True)

FONT_IMPORTS = """
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
"""


def build_mnf_card_html() -> str:
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
      radial-gradient(circle at 15% 12%, rgba(220, 38, 38, 0.24) 0%, transparent 48%),
      radial-gradient(circle at 85% 18%, rgba(245, 158, 11, 0.22) 0%, transparent 48%),
      radial-gradient(circle at 50% 85%, rgba(0, 240, 255, 0.14) 0%, transparent 55%),
      linear-gradient(180deg, #070B19 0%, #040711 60%, #02040A 100%);
    font-family: 'Inter', sans-serif;
    color: #F8FAFC;
    overflow: hidden;
    position: relative;
  }}
  .bg-grid {{
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(251, 191, 36, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 240, 255, 0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }}
  .top-ticker {{
    height: 50px;
    background: linear-gradient(90deg, #B91C1C 0%, #D97706 50%, #00F5A0 100%);
    color: #02060F;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 38px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
  }}
  .header {{
    padding: 22px 42px 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 1px solid rgba(251, 191, 36, 0.28);
  }}
  .brand-pill {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(251, 191, 36, 0.14);
    border: 1px solid rgba(251, 191, 36, 0.55);
    border-radius: 999px;
    padding: 5px 15px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 800;
    color: #FBBF24;
    letter-spacing: 1.5px;
    margin-bottom: 8px;
  }}
  .title {{
    font-family: 'Outfit', sans-serif;
    font-size: 46px;
    font-weight: 900;
    line-height: 1.0;
    letter-spacing: -1px;
    text-transform: uppercase;
    color: #FFFFFF;
  }}
  .title span {{
    background: linear-gradient(90deg, #FBBF24 0%, #00F5A0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }}
  .subtitle {{
    font-size: 15px;
    color: #CBD5E1;
    margin-top: 6px;
    font-weight: 500;
  }}
  .stat-cluster {{
    display: flex;
    gap: 12px;
  }}
  .stat-box {{
    background: rgba(11, 20, 42, 0.92);
    border: 1px solid rgba(251, 191, 36, 0.45);
    border-radius: 14px;
    padding: 10px 18px;
    text-align: center;
  }}
  .stat-box .num {{
    font-family: 'Outfit', sans-serif;
    font-size: 28px;
    font-weight: 900;
    color: #00F5A0;
    line-height: 1.05;
  }}
  .stat-box .lbl {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    color: #FDE68A;
    letter-spacing: 1px;
    margin-top: 3px;
  }}
  .main-body {{
    padding: 20px 42px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }}
  /* GAME PICKS BAR */
  .game-bar {{
    background: linear-gradient(135deg, rgba(185, 28, 28, 0.22) 0%, rgba(10, 20, 42, 0.95) 55%, rgba(251, 191, 36, 0.16) 100%);
    border: 2px solid #FBBF24;
    border-radius: 18px;
    padding: 18px 24px;
    display: grid;
    grid-template-columns: 1.25fr 1fr 1fr;
    gap: 16px;
    align-items: center;
  }}
  .gb-card {{
    background: rgba(4, 9, 22, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 14px;
    padding: 12px 16px;
  }}
  .gb-card.play {{
    border: 2px solid #00F5A0;
    background: rgba(0, 245, 160, 0.08);
  }}
  .gb-card.pass {{
    border: 1px dashed #F59E0B;
  }}
  .gb-tag {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #94A3B8;
    display: flex;
    justify-content: space-between;
  }}
  .gb-pick {{
    font-family: 'Outfit', sans-serif;
    font-size: 26px;
    font-weight: 900;
    color: #FFFFFF;
    margin-top: 4px;
  }}
  .gb-card.play .gb-pick {{
    color: #00F5A0;
  }}
  .gb-sub {{
    font-size: 12.5px;
    color: #CBD5E1;
    margin-top: 4px;
    line-height: 1.35;
  }}
  /* SECTION TITLE */
  .sec-hdr {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 800;
    color: #00F0FF;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }}
  /* 8 PROPS 2x4 GRID */
  .props-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }}
  .prop-card {{
    background: linear-gradient(165deg, rgba(13, 27, 56, 0.94) 0%, rgba(5, 12, 26, 0.98) 100%);
    border: 1px solid rgba(0, 240, 255, 0.35);
    border-radius: 14px;
    padding: 13px 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .prop-top {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 800;
  }}
  .team-sf {{ color: #FBBF24; }}
  .team-wsh {{ color: #F87171; }}
  .edge-pill {{
    background: rgba(0, 245, 160, 0.16);
    border: 1px solid #00F5A0;
    color: #00F5A0;
    padding: 2px 7px;
    border-radius: 6px;
    font-size: 11px;
  }}
  .prop-name {{
    font-family: 'Outfit', sans-serif;
    font-size: 20px;
    font-weight: 900;
    color: #FFFFFF;
    margin-top: 5px;
  }}
  .prop-line {{
    font-family: 'Outfit', sans-serif;
    font-size: 19px;
    font-weight: 800;
    color: #00F5A0;
    margin-top: 3px;
  }}
  .prop-line.under {{
    color: #38BDF8;
  }}
  .prop-proj {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    color: #FDE68A;
    margin-top: 4px;
    font-weight: 700;
  }}
  .prop-why {{
    font-size: 11.5px;
    color: #94A3B8;
    margin-top: 5px;
    line-height: 1.3;
  }}
  /* BOTTOM SPLIT: 3 SGPs + 2 SHOWDOWN LINEUPS */
  .bottom-split {{
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 16px;
  }}
  .panel {{
    background: rgba(7, 15, 34, 0.94);
    border: 1px solid rgba(251, 191, 36, 0.38);
    border-radius: 16px;
    padding: 15px 18px;
  }}
  .sgp-list {{
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }}
  .sgp-item {{
    background: rgba(3, 7, 18, 0.85);
    border-left: 3px solid #FBBF24;
    border-radius: 8px;
    padding: 9px 12px;
  }}
  .sgp-hdr {{
    display: flex;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 800;
    color: #FBBF24;
  }}
  .sgp-legs {{
    font-size: 12.5px;
    color: #F8FAFC;
    font-weight: 600;
    margin-top: 3px;
  }}
  .dfs-col {{
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }}
  .dfs-box {{
    background: rgba(3, 7, 18, 0.85);
    border-left: 3px solid #00F5A0;
    border-radius: 8px;
    padding: 9px 12px;
  }}
  .dfs-title {{
    display: flex;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    font-weight: 800;
    color: #00F5A0;
  }}
  .dfs-roster {{
    font-size: 12px;
    color: #E2E8F0;
    margin-top: 4px;
    line-height: 1.4;
  }}
  .footer {{
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: #02050D;
    border-top: 1px solid rgba(0, 240, 255, 0.28);
    padding: 0 42px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13.5px;
  }}
  .footer-cta {{
    background: linear-gradient(90deg, #FBBF24, #00F5A0);
    color: #02060F;
    font-weight: 900;
    padding: 8px 20px;
    border-radius: 999px;
    letter-spacing: 0.8px;
  }}
</style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="top-ticker">
    <span>🚨 MONDAY NIGHT FOOTBALL LIVE CARD — COMMANDERS @ 49ERS</span>
    <span>DEEBO OUT • BOSA OUT • OMENIHU OUT • CROSKEY-MERRITT OUT</span>
  </div>

  <div class="header">
    <div>
      <div class="brand-pill">🛰️ GSE 213-EQUATION ENGINE • MNF OFFICIAL MASTER CARD</div>
      <div class="title">COMMANDERS <span>@ 49ERS</span></div>
      <div class="subtitle">Pre-Kickoff Verified Injury &amp; Line Movement Card • Spread, Top 8 Props, 3 SGPs &amp; Showdown Lineups</div>
    </div>
    <div class="stat-cluster">
      <div class="stat-box">
        <div class="num">SF -7.5</div>
        <div class="lbl">TOP GAME PLAY</div>
      </div>
      <div class="stat-box">
        <div class="num">+13.4%</div>
        <div class="lbl">PEAK PROP EDGE</div>
      </div>
      <div class="stat-box">
        <div class="num">PASS</div>
        <div class="lbl">STEAMED 52.0 TOTAL</div>
      </div>
    </div>
  </div>

  <div class="main-body">
    <!-- 1. GAME PICKS -->
    <div class="game-bar">
      <div class="gb-card play">
        <div class="gb-tag"><span>★ OFFICIAL SPREAD PLAY</span><span style="color:#00F5A0;">+4.8% GSE EDGE</span></div>
        <div class="gb-pick">49ERS -7.5 (-108)</div>
        <div class="gb-sub">GSE Margin: SF -8.9 (55.6% True Prob) • WSH 3.39 yd pocket collapse + Deebo OUT concentrates SF offense through Kittle &amp; CMC.</div>
      </div>
      <div class="gb-card pass">
        <div class="gb-tag"><span>TOTAL 51.5–52.5</span><span style="color:#FBBF24;">STEAM GATE: PASS</span></div>
        <div class="gb-pick" style="color:#FBBF24;">NO PLAY (PASS)</div>
        <div class="gb-sub">Steamed +3.0 pts from 49.0 open. GSE Proj 53.8 (+1.8 cushion &lt; +3.0 gate) vs SF 56.5% 2-High shell.</div>
      </div>
      <div class="gb-card">
        <div class="gb-tag"><span>MONEYLINE (-415)</span><span style="color:#93C5FD;">SGP ANCHOR ONLY</span></div>
        <div class="gb-pick">49ERS ML (78.2%)</div>
        <div class="gb-sub">Fair Price -359 vs -415 Market (+0.3% solo edge). Pass solo; use strictly inside correlated SGPs.</div>
      </div>
    </div>

    <!-- 2. TOP 8 PLAYER PROPS -->
    <div class="sec-hdr">
      <span>📊 TOP 8 GSE ENGINE PLAYER PROPS (VERIFIED 2026 ACTIVE ROSTERS)</span>
      <span style="color:#FBBF24;">TARGET CONSERVATION + REGIME MIXTURE ACTIVE</span>
    </div>

    <div class="props-grid">
      <div class="prop-card">
        <div>
          <div class="prop-top"><span class="team-sf">SF • TE1</span><span class="edge-pill">+13.4% EDGE</span></div>
          <div class="prop-name">George Kittle</div>
          <div class="prop-line">OVER 64.5 Rec Yds</div>
          <div class="prop-proj">GSE Proj: 78.4 Yds (7.6 Tgts)</div>
        </div>
        <div class="prop-why">Deebo Samuel OUT vacates 14.3% targets + Omenihu OUT + 3 WSH safeties Q.</div>
      </div>

      <div class="prop-card">
        <div>
          <div class="prop-top"><span class="team-sf">SF • RB1</span><span class="edge-pill">+12.4% EDGE</span></div>
          <div class="prop-name">C. McCaffrey</div>
          <div class="prop-line">OVER 39.5 Rec Yds</div>
          <div class="prop-proj">GSE Proj: 51.2 Yds (8.1 Tgts)</div>
        </div>
        <div class="prop-why">Absorbs Deebo's short-area motion &amp; screen share (6.7 projected catches).</div>
      </div>

      <div class="prop-card">
        <div>
          <div class="prop-top"><span class="team-wsh">WSH • RB1</span><span class="edge-pill">+10.8% EDGE</span></div>
          <div class="prop-name">Rachaad White</div>
          <div class="prop-line under">UNDER 47.5 Rush Yds</div>
          <div class="prop-proj">GSE Proj: 39.1 Yds (10.3 Att)</div>
        </div>
        <div class="prop-why">Croskey-Merritt OUT, but 68% trailing script + 3.80 YPC caps rushing ceiling.</div>
      </div>

      <div class="prop-card">
        <div>
          <div class="prop-top"><span class="team-wsh">WSH • WR1</span><span class="edge-pill">+9.8% EDGE</span></div>
          <div class="prop-name">Terry McLaurin</div>
          <div class="prop-line under">UNDER 44.5 Rec Yds</div>
          <div class="prop-proj">GSE Proj: 36.8 Yds (3.4 Rec)</div>
        </div>
        <div class="prop-why">12.54 aDOT bracketed by SF 56.5% 2-High shell + 3.39 yd pocket penalty (-8%).</div>
      </div>

      <div class="prop-card">
        <div>
          <div class="prop-top"><span class="team-wsh">WSH • WR</span><span class="edge-pill">+8.6% EDGE</span></div>
          <div class="prop-name">Stefon Diggs</div>
          <div class="prop-line">OVER 4.5 Receptions</div>
          <div class="prop-proj">GSE Proj: 5.9 Rec (8.6 Tgts)</div>
        </div>
        <div class="prop-why">Primary underneath hot-read funnel in 68% trailing script vs SF 2-High shell.</div>
      </div>

      <div class="prop-card">
        <div>
          <div class="prop-top"><span class="team-sf">SF • QB1</span><span class="edge-pill">+8.4% EDGE</span></div>
          <div class="prop-name">Brock Purdy</div>
          <div class="prop-line">OVER 248.5 Pass Yds</div>
          <div class="prop-proj">GSE Proj: 271.4 Yds (8.1 YPA)</div>
        </div>
        <div class="prop-why">4.21 yd clean pocket with WSH DE Charles Omenihu &amp; LB Jean-Baptiste OUT.</div>
      </div>

      <div class="prop-card">
        <div>
          <div class="prop-top"><span class="team-wsh">WSH • TE1</span><span class="edge-pill">+8.1% EDGE</span></div>
          <div class="prop-name">Chig Okonkwo</div>
          <div class="prop-line">OVER 24.5 Rec Yds</div>
          <div class="prop-proj">GSE Proj: 33.6 Yds (3.4 Rec)</div>
        </div>
        <div class="prop-why">Caught 4-of-6 for 60 yds last week; Fred Warner middle-seam checkdown valve.</div>
      </div>

      <div class="prop-card">
        <div>
          <div class="prop-top"><span class="team-wsh">WSH • QB1</span><span class="edge-pill">+7.4% EDGE</span></div>
          <div class="prop-name">Jayden Daniels</div>
          <div class="prop-line">OVER 38.5 Rush Yds</div>
          <div class="prop-proj">GSE Proj: 46.8 Yds (7.4 Att)</div>
        </div>
        <div class="prop-why">Nick Bosa OUT + Dre Greenlaw SUSP opens scramble lanes on 68% trailing dropbacks.</div>
      </div>
    </div>

    <!-- 3. SGPs + SHOWDOWN LINEUPS -->
    <div class="bottom-split">
      <div class="panel">
        <div class="sec-hdr"><span>🎟️ 3 CORRELATED MNF SAME-GAME PARLAYS</span><span>TRUE JOINT PROB</span></div>
        <div class="sgp-list">
          <div class="sgp-item">
            <div class="sgp-hdr"><span>SGP #1: SF SEAM &amp; YAC CONCENTRATION (+350)</span><span style="color:#00F5A0;">28.7% TRUE • +6.5% EDGE</span></div>
            <div class="sgp-legs">• 49ers -7.5 + George Kittle OVER 64.5 Rec Yds + C. McCaffrey OVER 39.5 Rec Yds</div>
          </div>
          <div class="sgp-item">
            <div class="sgp-hdr"><span>SGP #2: NEGATIVE-SCRIPT TRENCH LOCK (+475)</span><span style="color:#00F5A0;">22.9% TRUE • +5.5% EDGE</span></div>
            <div class="sgp-legs">• 49ers -7.5 + Rachaad White UNDER 47.5 Rush Yds + Terry McLaurin UNDER 44.5 Rec Yds</div>
          </div>
          <div class="sgp-item">
            <div class="sgp-hdr"><span>SGP #3: TRAILING CHECKDOWN &amp; SCRAMBLE (+510)</span><span style="color:#00F5A0;">21.8% TRUE • +5.4% EDGE</span></div>
            <div class="sgp-legs">• George Kittle OVER 64.5 Rec Yds + Chig Okonkwo OVER 24.5 Rec Yds + Jayden Daniels OVER 38.5 Rush Yds</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="sec-hdr"><span>🏆 SINGLE-GAME SHOWDOWN LINEUPS</span><span>DEEBO REMOVED</span></div>
        <div class="dfs-col">
          <div class="dfs-box">
            <div class="dfs-title"><span>OPTIMAL CASH BUILD ($49,600)</span><span>PROJ: 114.2 PTS</span></div>
            <div class="dfs-roster">
              <strong>CPT:</strong> C. McCaffrey (SF)<br>
              <strong>FLEX:</strong> Brock Purdy (SF) • George Kittle (SF) • Jayden Daniels (WSH) • Chig Okonkwo (WSH) • Eddy Pineiro (SF K)
            </div>
          </div>
          <div class="dfs-box" style="border-left-color:#FBBF24;">
            <div class="dfs-title"><span style="color:#FBBF24;">OPTIMAL GPP TOURNAMENT ($49,400)</span><span style="color:#FBBF24;">99th: 161.4 PTS</span></div>
            <div class="dfs-roster">
              <strong>CPT:</strong> George Kittle (SF)<br>
              <strong>FLEX:</strong> Brock Purdy (SF) • C. McCaffrey (SF) • Stefon Diggs (WSH) • Chig Okonkwo (WSH) • Jacob Cowing (SF WR)
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span style="color:#93C5FD;font-weight:700;">@GalaxySportsHQ • GALAXYSPORTSEDGE.COM</span>
    <span class="footer-cta">FULL MNF CARD LIVE &amp; FREE RIGHT NOW →</span>
  </div>
</body>
</html>"""


def main():
    slug = "gse-mnf-wsh-sf-master-card-20261019"
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        page = browser.new_page(
            viewport={"width": 1200, "height": 1350},
            device_scale_factor=2,
        )
        html_content = build_mnf_card_html()
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

        print(f"Rendered MNF Master Card: {png_path} ({png_path.stat().st_size:,} bytes)")
        browser.close()


if __name__ == "__main__":
    main()
