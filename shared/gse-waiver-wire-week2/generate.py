#!/usr/bin/env python3
"""
Galaxy Sports Edge — Week 2 Waiver Wire graphics generator.
Emits one HTML file per asset. Rendered to PNG via the in-app browser.

Brand authority: apps/web/components/brand/logo-mark-inline.tsx (mark),
apps/web/styles/design-tokens.css (FIELD palette).
"""
import os, random

OUT = "/var/minis/shared/gse-waiver-wire-week2/graphics"
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- brand tokens
GROUND, PANEL, LIFT = "#08090C", "#12141A", "#191C23"
BORDER, BORDER_HI = "#23262E", "#31353F"
BONE, FOG, MIST = "#EDE8E0", "#C4BFB6", "#8F8A82"
EMBER, EMBER_GLOW = "#FF4D2E", "#FF7A5C"
IRIS = "#9AA8E8"

MARK_RING, MARK_BLADE, MARK_CORE, MARK_PING = BORDER_HI, BONE, BONE, EMBER


def mark(size=44):
    """Canonical 2026 Galaxy signal mark, ported from logo-mark-inline.tsx."""
    return f'''<svg width="{size}" height="{size}" viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <circle cx="32" cy="32" r="27" fill="none" stroke="{MARK_RING}" stroke-width="2"/>
  <ellipse cx="32" cy="32" rx="27" ry="10" fill="none" stroke="{MARK_BLADE}"
           stroke-width="1.8" transform="rotate(-24 32 32)" opacity="0.5"/>
  <path d="M53 21.5 A27 27 0 0 1 46 52" fill="none" stroke="{MARK_BLADE}" stroke-width="5"/>
  <circle cx="32" cy="32" r="7" fill="{MARK_CORE}"/>
  <circle cx="10" cy="40" r="3.5" fill="{MARK_PING}"/>
</svg>'''


def stars(n, w, h, seed):
    r = random.Random(seed)
    out = []
    for _ in range(n):
        x, y = r.uniform(0, w), r.uniform(0, h)
        rad = r.choice([0.7, 0.9, 1.1, 1.4, 1.9])
        op = round(r.uniform(0.06, 0.42), 3)
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rad}" fill="{BONE}" opacity="{op}"/>')
    return "".join(out)


def nebula(w, h, seed, ember_at="86% 84%", iris_at="14% 10%"):
    return f'''<div class="bg"></div>
<svg class="stars" viewBox="0 0 {w} {h}" preserveAspectRatio="none">{stars(150, w, h, seed)}</svg>
<svg class="orbits" viewBox="0 0 {w} {h}" preserveAspectRatio="none">
  <ellipse cx="{w*0.5:.0f}" cy="{h*0.52:.0f}" rx="{w*0.62:.0f}" ry="{h*0.30:.0f}"
           fill="none" stroke="{BONE}" stroke-opacity="0.045" stroke-width="1.5"/>
  <ellipse cx="{w*0.5:.0f}" cy="{h*0.52:.0f}" rx="{w*0.44:.0f}" ry="{h*0.20:.0f}"
           fill="none" stroke="{BONE}" stroke-opacity="0.035" stroke-width="1.5"/>
</svg>'''


BASE_CSS = f'''
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{background:{GROUND};color:{BONE};
  font-family:Inter,'Helvetica Neue',system-ui,sans-serif;
  -webkit-font-smoothing:antialiased}}
.disp{{font-family:'Barlow Condensed',Inter,sans-serif;font-weight:700;
  text-transform:uppercase;line-height:0.88;letter-spacing:-0.005em}}
.eyebrow{{font-size:17px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;
  color:{MIST}}}
.num{{font-family:'Barlow Condensed',Inter,sans-serif;font-weight:600;
  font-variant-numeric:tabular-nums;line-height:0.9}}
.stars,.orbits{{position:absolute;inset:0;width:100%;height:100%}}
.bg{{position:absolute;inset:0;background:
  radial-gradient(900px 760px at 14% 8%, rgba(154,168,232,0.13), transparent 70%),
  radial-gradient(860px 860px at 88% 86%, rgba(255,77,46,0.145), transparent 72%),
  radial-gradient(1400px 1000px at 50% 45%, rgba(35,38,46,0.60), transparent 82%),
  {GROUND}}}
.vignette{{position:absolute;inset:0;background:
  radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)}}
'''


# ---------------------------------------------------------------- card payloads
CARDS = [
    dict(rank="01", first="Kyle", last="Monangai", team="Chicago Bears", abbr="CHI",
         accent="#C83803", pos="Running Back",
         stats=[("10", "ATT"), ("100", "YDS"), ("1", "TD")],
         note="Including a 61-yard TD run",
         verdict="True 1B in an elite run game. Bid 25 to 30 percent."),
    dict(rank="02", first="Blake", last="Corum", team="Los Angeles Rams", abbr="LAR",
         accent="#FFA300", pos="Running Back",
         stats=[("10", "ATT"), ("54", "YDS")],
         note="Near 50/50 split with Kyren Williams",
         verdict="Elite handcuff, fringe flex. Bid 10 to 15 percent."),
    dict(rank="03", first="Emmett", last="Johnson", team="Kansas City Chiefs", abbr="KC",
         accent="#E31837", pos="Running Back",
         stats=[("8", "ATT"), ("24", "YDS"), ("2", "REC"), ("44", "REC YDS")],
         note="Clear RB2 behind Kenneth Walker III",
         verdict="Premium handcuff stash. Bid 8 to 12 percent."),
    dict(rank="04", first="Kaelon", last="Black", team="San Francisco 49ers", abbr="SF",
         accent="#B3995D", pos="Running Back",
         stats=[("14", "ATT"), ("65", "YDS"), ("1", "REC"), ("5", "REC YDS")],
         note="Out-carried McCaffrey 14 to 10",
         verdict="Designed 1B behind McCaffrey. Bid 10 to 15 percent."),
    dict(rank="05", first="Tyler", last="Allgeier", team="Arizona Cardinals", abbr="ARI",
         accent="#FFB612", pos="Running Back",
         stats=[("17", "ATT"), ("61", "YDS"), ("2", "REC"), ("9", "REC YDS")],
         note="17 to 11 carry edge over Jeremiyah Love",
         verdict="Volume floor, low ceiling. Bid 6 to 10 percent."),
    dict(rank="06", first="Emari", last="Demercado", team="Dallas Cowboys", abbr="DAL",
         accent="#869397", pos="Running Back",
         stats=[("2", "ATT"), ("7", "YDS")],
         note="Played 5 snaps. New competition signed",
         verdict="Deep bench only. Bid 1 to 3 percent."),
]


def card_html(c, seed):
    W, H = 1080, 1350
    tiles = "".join(f'''<div class="tile">
      <div class="num" style="font-size:{96 if len(c['stats'])>2 else 116}px">{v}</div>
      <div class="tlabel">{l}</div></div>''' for v, l in c["stats"])
    return f'''<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="../fonts/local-fonts.css">
<style>{BASE_CSS}
body{{width:{W}px;height:{H}px;overflow:hidden}}
.card{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:{GROUND}}}
.rail{{position:absolute;top:0;left:0;right:0;height:9px;background:{c['accent']};z-index:5}}
.edge{{position:absolute;top:9px;left:0;width:9px;height:100%;
  background:linear-gradient(180deg,{c['accent']},transparent 55%);opacity:.35;z-index:5}}
.content{{position:relative;z-index:4;height:100%;display:flex;flex-direction:column;
  padding:70px 76px 60px}}
.top{{display:flex;align-items:center;justify-content:space-between}}
.lock{{display:flex;align-items:center;gap:16px}}
.word{{font-size:19px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;
  color:{BONE};white-space:nowrap}}
.right{{font-size:17px;font-weight:600;letter-spacing:0.2em;color:{MIST};
  text-transform:uppercase;white-space:nowrap}}
.mid{{margin-top:100px;flex:1}}
.pos{{display:flex;align-items:center;gap:18px}}
.chip{{padding:5px 13px 6px;border:1px solid {BORDER_HI};border-radius:2px;
  font-size:15px;font-weight:600;letter-spacing:0.2em;color:{FOG};text-transform:uppercase}}
.name{{font-size:166px;margin-top:24px}}
.name .ln{{display:block}}
.team{{margin-top:26px;font-size:27px;font-weight:600;letter-spacing:0.14em;
  text-transform:uppercase;color:{FOG}}}
.team span{{color:{MIST}}}
.stats{{display:flex;margin-top:64px;border-top:1px solid {BORDER};
  border-bottom:1px solid {BORDER};padding:34px 0}}
.tile{{flex:1;padding:0 4px}}
.tile+.tile{{border-left:1px solid {BORDER};padding-left:34px}}
.tlabel{{margin-top:12px;font-size:15px;font-weight:600;letter-spacing:0.22em;
  color:{MIST};text-transform:uppercase}}
.note{{margin-top:22px;font-size:23px;color:{MIST};font-weight:500}}
.note b{{color:{c['accent']};font-weight:600}}
.verdict{{margin-top:auto;display:flex;gap:22px;align-items:flex-start;
  border-top:1px solid {BORDER};padding-top:38px}}
.vrail{{width:6px;align-self:stretch;background:{EMBER};flex:none}}
.vtext{{font-size:32px;font-weight:600;line-height:1.28;color:{BONE};
  letter-spacing:-0.01em}}
.bottom{{display:flex;align-items:center;justify-content:space-between;margin-top:44px}}
.tag{{font-size:18px;font-weight:700;letter-spacing:0.24em;color:{FOG};
  text-transform:uppercase;white-space:nowrap}}
.site{{font-size:15px;font-weight:600;letter-spacing:0.18em;color:{MIST};
  text-transform:uppercase;white-space:nowrap}}
</style></head><body><div class="card">
 {nebula(W, H, seed)}
 <div class="vignette"></div><div class="rail"></div><div class="edge"></div>
 <div class="content">
  <div class="top">
    <div class="lock">{mark(46)}<div class="word">Galaxy Sports Edge</div></div>
    <div class="right">Week 2 / {c['abbr']}</div>
  </div>
  <div class="mid">
    <div class="pos"><div class="eyebrow" style="color:{EMBER}">Priority add {c['rank']}</div>
      <div class="chip">{c['pos']}</div></div>
    <div class="disp name"><span class="ln">{c['first']}</span>
      <span class="ln">{c['last']}</span></div>
    <div class="team">{c['team']} <span>/ {c['abbr']}</span></div>
    <div class="stats">{tiles}</div>
    <div class="note">{c['note']}</div>
  </div>
  <div class="verdict"><div class="vrail"></div><div class="vtext">{c['verdict']}</div></div>
  <div class="bottom">
    <div style="display:flex;align-items:center;gap:14px">{mark(32)}
      <div class="tag">We detect. You decide.</div></div>
    <div class="site">galaxysportsedge.com</div>
  </div>
 </div>
</div></body></html>'''


def header_html():
    W, H = 1600, 900
    return f'''<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="../fonts/local-fonts.css">
<style>{BASE_CSS}
body{{width:{W}px;height:{H}px;overflow:hidden}}
.card{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:{GROUND}}}
.rail{{position:absolute;top:0;left:0;right:0;height:10px;
  background:linear-gradient(90deg,{EMBER} 0%,{EMBER} 34%,{IRIS} 34%,{IRIS} 62%,{BORDER_HI} 62%)}}
.content{{position:relative;z-index:4;height:100%;display:flex;flex-direction:column;
  padding:78px 96px 66px}}
.top{{display:flex;align-items:center;justify-content:space-between}}
.lock{{display:flex;align-items:center;gap:20px}}
.word{{font-size:26px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase}}
.right{{font-size:20px;font-weight:600;letter-spacing:0.22em;color:{MIST};
  text-transform:uppercase}}
.mid{{margin-top:104px}}
.kicker{{display:flex;align-items:center;gap:20px}}
.chip{{padding:6px 15px 7px;border:1px solid {BORDER_HI};border-radius:2px;font-size:17px;
  font-weight:600;letter-spacing:0.22em;color:{FOG};text-transform:uppercase}}
h1{{font-size:132px;margin-top:30px}}
h1 .ln{{display:block}}
.sub{{margin-top:38px;font-size:29px;line-height:1.45;color:{FOG};font-weight:500;
  max-width:1150px}}
.sub b{{color:{BONE};font-weight:600}}
.bottom{{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;
  border-top:1px solid {BORDER};padding-top:32px}}
.tag{{font-size:22px;font-weight:700;letter-spacing:0.24em;color:{FOG};
  text-transform:uppercase}}
.ranks{{text-align:right;font-size:17px;font-weight:600;letter-spacing:0.2em;
  color:{MIST};text-transform:uppercase;line-height:1.7}}
</style></head><body><div class="card">
 {nebula(W, H, 7)}
 <div class="vignette"></div><div class="rail"></div>
 <div class="content">
  <div class="top">
    <div class="lock">{mark(62)}<div class="word">Galaxy Sports Edge</div></div>
    <div class="right">Fantasy Football / Week 2</div>
  </div>
  <div class="mid">
    <div class="kicker"><div class="eyebrow" style="color:{EMBER}">Waiver Wire</div>
      <div class="chip">Six RBs Ranked</div></div>
    <h1 class="disp"><span class="ln">The Handcuff Economy</span>
      <span class="ln">Is Wide Open</span></h1>
    <div class="sub">Six running backs we would actually pay for this week, plus the
      receiver and quarterback adds your league is <b>already bidding on</b>.</div>
  </div>
  <div class="bottom">
    <div style="display:flex;align-items:center;gap:18px">{mark(44)}
      <div class="tag">We detect. You decide.</div></div>
    <div class="ranks">01 to 06 ranked<br>Stat lines: ESPN Week 1 box scores</div>
  </div>
 </div>
</div></body></html>'''


def main():
    files = {}
    files["00-header-week2-waiver-wire.html"] = header_html()
    for i, c in enumerate(CARDS, start=10):
        files[f"{i}-rb-{c['last'].lower()}.html"] = card_html(c, seed=i * 13)
    for name, html in files.items():
        with open(os.path.join(OUT, name), "w") as f:
            f.write(html)
    print(f"wrote {len(files)} files to {OUT}")
    for n in files:
        print(" ", n)


if __name__ == "__main__":
    main()