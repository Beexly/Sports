#!/usr/bin/env python3
"""
screens.py — generates the design review harness.

WHY GENERATED RATHER THAN HAND-WRITTEN:
The harness has to repeat the FIELD token values. Hand-copying them into a
second artefact guarantees that when a token changes, the review instrument
keeps showing the old colour and the review passes on a palette the app no
longer uses. So the tokens are declared once, here, read from the same values
as `src/theme/tokens.ts`, and the frames are emitted from them.

Mirrors: app/(tabs)/index.tsx, app/(tabs)/picks.tsx, app/(tabs)/calibration.tsx,
src/components/PickCard.tsx, src/components/signals.tsx, src/components/states.tsx.

Run:  python3 preview/screens.py > preview/screens.html
"""

# ── FIELD tokens, verbatim from src/theme/tokens.ts ──────────────────────────
T = {
    "carbon": "#08090C",
    "eclipse": "#12141A",
    "titanium": "#191C23",
    "mineral": "#23262E",
    "mineral_hi": "#31353F",
    "bone": "#EDE8E0",
    "fog": "#C4BFB6",
    "mist": "#8F8A82",
    "ember": "#FF4D2E",
    "ember_glow": "#FF7A5C",
    "ember_ink": "#1A0703",
    "iris": "#9AA8E8",
    "verify": "#5FD9A3",
    "alert": "#FF6470",
    "caution": "#FFB454",
    "paper": "#F7F8FB",
    "paper_raised": "#FFFFFF",
    "paper_border": "#D9DEE7",
    "paper_ink": "#0E1320",
    "paper_ink1": "#3A4356",
    "paper_ink2": "#5B6678",
    "paper_accent": "#B0118C",
    "paper_wayfind": "#5B43C9",
    "paper_verify": "#0B6B46",
    "paper_alert": "#C0122F",
    "paper_caution": "#9A4D00",
}


def css() -> str:
    v = {f"--{k.replace('_', '-')}": val for k, val in T.items()}
    root = "\n".join(f"  {k}: {val};" for k, val in v.items())
    return f"""
:root {{
{root}
  --f-body: Inter, -apple-system, system-ui, sans-serif;
  --f-arch: "Barlow Condensed", Inter, sans-serif;
  --r-xs: 3px; --r-sm: 6px; --r-md: 10px; --r-lg: 14px;
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{
  background: #000;
  font-family: var(--f-body);
  -webkit-font-smoothing: antialiased;
  padding: 32px;
  display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start;
}}
.phone {{
  width: 393px; background: var(--carbon);
  border: 1px solid #26282e; border-radius: 28px; overflow: hidden;
  display: flex; flex-direction: column; flex: none;
}}
.label {{
  font-family: var(--f-body); font-size: 11px; letter-spacing: 1.9px;
  text-transform: uppercase; color: var(--mist);
  padding: 10px 16px; border-bottom: 1px solid var(--mineral);
  background: #0b0c10;
}}
.viewport {{ height: 852px; overflow: hidden; display: flex; flex-direction: column; }}
.scroll {{ overflow: hidden; flex: 1; }}
.pad {{ padding: 16px; }}

.eyebrow {{
  font-size: 12px; line-height: 16px; font-weight: 500;
  letter-spacing: 1.9px; text-transform: uppercase;
}}
.eyebrow.sm {{ font-size: 11px; letter-spacing: 1.6px; }}
.meta {{ color: var(--mist); }}
.fog {{ color: var(--fog); }}
.bone {{ color: var(--bone); }}
.iris {{ color: var(--iris); }}
.ember {{ color: var(--ember); }}
.verify {{ color: var(--verify); }}
.alert {{ color: var(--alert); }}
.caution {{ color: var(--caution); }}

.arch {{ font-family: var(--f-arch); font-weight: 900; letter-spacing: -0.4px; }}
.h-arch {{ font-family: var(--f-arch); font-weight: 900; font-size: 44px; line-height: 42px; color: var(--bone); letter-spacing: -0.4px; }}
.h-disp {{ font-size: 24px; line-height: 30px; font-weight: 600; color: var(--bone); letter-spacing: -0.4px; }}
.h-disp-sm {{ font-size: 20px; line-height: 26px; font-weight: 600; color: var(--bone); }}

.body {{ font-size: 15px; line-height: 23px; color: var(--bone); }}
.body-sm {{ font-size: 13px; line-height: 20px; color: var(--fog); }}
.body-xs {{ font-size: 12px; line-height: 17px; color: var(--mist); }}
.num {{ font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }}

.card {{
  background: var(--eclipse); border: 1px solid var(--mineral);
  border-radius: var(--r-md); padding: 16px;
}}
.card.accent {{ border-color: var(--ember); }}
.row {{ display: flex; align-items: center; }}
.row.between {{ justify-content: space-between; }}
.row.baseline {{ align-items: baseline; }}
.gap-1 {{ gap: 4px; }} .gap-2 {{ gap: 8px; }} .gap-3 {{ gap: 12px; }}
.gap-4 {{ gap: 16px; }} .gap-6 {{ gap: 24px; }} .gap-8 {{ gap: 32px; }}
.stack > * + * {{ margin-top: 12px; }}
.wrap {{ flex-wrap: wrap; }}
.divider {{ height: 1px; background: var(--mineral); }}
.s4 {{ height: 16px; }} .s3 {{ height: 12px; }} .s2 {{ height: 8px; }} .s6 {{ height: 24px; }}

.pill {{
  display: inline-flex; align-items: center; gap: 4px;
  border: 1px solid; border-radius: var(--r-xs);
  padding: 2px 8px; font-size: 11px; letter-spacing: 1.6px;
  text-transform: uppercase; font-weight: 500;
}}
.pill.neutral {{ color: var(--fog); border-color: rgba(196,191,182,.45); }}
.pill.accent {{ color: var(--ember); border-color: rgba(255,77,46,.45); }}
.pill.verify {{ color: var(--verify); border-color: rgba(95,217,163,.45); }}
.pill.alert {{ color: var(--alert); border-color: rgba(255,100,112,.45); }}
.pill.caution {{ color: var(--caution); border-color: rgba(255,180,84,.45); }}
.pill.solid-verify {{ background: rgba(95,217,163,.14); }}
.pill.solid-alert {{ background: rgba(255,100,112,.14); }}

.bar {{ height: 6px; border-radius: 3px; background: rgba(196,191,182,.16); overflow: hidden; }}
.bar > i {{ display: block; height: 6px; border-radius: 3px; }}
.bar.thin {{ height: 4px; }} .bar.thin > i {{ height: 4px; }}

.tabs {{
  display: flex; border-top: 1px solid var(--mineral);
  background: var(--eclipse); height: 60px; align-items: center;
}}
.tab {{
  flex: 1; text-align: center; font-size: 10px; letter-spacing: .6px;
  text-transform: uppercase; color: var(--mist); font-weight: 500;
}}
.tab.on {{ color: var(--iris); }}
.tab span {{ display: block; font-size: 13px; font-weight: 600; margin-bottom: 2px; }}
.tab.on span {{ color: var(--iris); }}

.btn {{
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; padding: 0 20px; border-radius: var(--r-sm);
  font-size: 13px; letter-spacing: 1.9px; text-transform: uppercase;
  font-weight: 500;
}}
.btn.primary {{ background: var(--ember); color: var(--ember-ink); border: 1px solid var(--ember); }}
.btn.secondary {{ color: var(--bone); border: 1px solid var(--mineral-hi); }}
.btn.ghost {{ color: var(--fog); border: 1px solid transparent; }}
.btn.destructive {{ color: var(--alert); border: 1px solid rgba(255,100,112,.5); }}

.quote {{
  border-left: 2px solid var(--caution); padding-left: 12px;
}}

/* Paper reading mode — the token file scopes this to dense data surfaces. */
.phone.paper {{ background: var(--paper); }}
.paper .card {{ background: var(--paper-raised); border-color: var(--paper-border); }}
.paper .bone, .paper .h-arch, .paper .h-disp, .paper .h-disp-sm {{ color: var(--paper-ink); }}
.paper .body-xs {{ color: var(--paper-ink2); }}
.paper .quote {{ border-color: var(--paper-caution); }}
.paper .pill.accent {{ color: var(--paper-accent); border-color: rgba(176,17,140,.45); }}
.paper .pill.verify {{ color: var(--paper-verify); border-color: rgba(11,107,70,.45); }}
.paper .pill.alert {{ color: var(--paper-alert); border-color: rgba(192,18,47,.45); }}
.paper .pill.caution {{ color: var(--paper-caution); border-color: rgba(154,77,0,.45); }}
.paper .num {{ color: var(--paper-ink); }}
.paper .eyebrow.meta {{ color: var(--paper-ink2); }}
.paper .meta {{ color: var(--paper-ink2); }}
.paper .fog, .paper .body {{ color: var(--paper-ink1); }}
.paper .iris {{ color: var(--paper-wayfind); }}
.paper .ember {{ color: var(--paper-accent); }}
.paper .verify {{ color: var(--paper-verify); }}
.paper .alert {{ color: var(--paper-alert); }}
.paper .divider {{ background: var(--paper-border); }}
.paper .tabs {{ background: var(--paper-raised); border-color: var(--paper-border); }}
.paper .label {{ background: var(--paper); border-color: var(--paper-border); color: var(--paper-ink2); }}
.paper .bar {{ background: rgba(14,19,32,.12); }}
.paper .pill.neutral {{ color: var(--paper-ink2); border-color: rgba(14,19,32,.25); }}
"""


MARK = """<svg width="{s}" height="{s}" viewBox="0 0 64 64" fill="none">
<circle cx="32" cy="32" r="27" stroke="#3A3F4B" stroke-width="2"/>
<ellipse cx="32" cy="32" rx="27" ry="10" stroke="#EDE8E0" stroke-width="1.8"
         opacity=".5" transform="rotate(-24 32 32)"/>
<path d="M53 21.5 A27 27 0 0 1 46 52" stroke="#EDE8E0" stroke-width="5"/>
<circle cx="32" cy="32" r="7" fill="#EDE8E0"/>
<circle cx="10" cy="40" r="3.5" fill="#FF4D2E"/>
</svg>"""


def tabs(active: str) -> str:
    out = []
    for key, letter, name in [
        ("board", "B", "Board"),
        ("picks", "P", "Picks"),
        ("cal", "C", "Calibration"),
        ("brief", "D", "Brief"),
        ("more", "M", "More"),
    ]:
        on = " on" if key == active else ""
        out.append(f'<div class="tab{on}"><span>{letter}</span>{name}</div>')
    return f'<div class="tabs">{"".join(out)}</div>'


def phone(title: str, body: str, active: str, cls: str = "") -> str:
    return f"""<div class="phone {cls}">
  <div class="label">{title}</div>
  <div class="viewport">
    <div class="scroll">{body}</div>
    {tabs(active)}
  </div>
</div>"""


# ── Frame 1: Board ───────────────────────────────────────────────────────────
def frame_board() -> str:
    return phone(
        "Board — app/(tabs)/index.tsx",
        f"""
<div class="pad">
  <div class="row between baseline">
    <div>
      <div class="eyebrow iris">Board</div>
      <div class="h-arch" style="margin-top:4px">THE GATE</div>
    </div>
    <div class="num fog" style="font-size:18px;font-weight:600">v5.2.8</div>
  </div>
  <div class="divider" style="margin-top:12px"></div>
  <div class="s4"></div>

  <div class="card">
    <div class="row between gap-6">
      <div><div class="eyebrow meta">Sports</div><div class="num bone" style="font-size:24px;font-weight:600">6</div></div>
      <div><div class="eyebrow meta">Books polled</div><div class="num alert" style="font-size:24px;font-weight:600">0</div></div>
    </div>
    <div class="s4"></div>
    <div class="row between gap-6">
      <div><div class="eyebrow meta">Open picks</div><div class="num bone" style="font-size:24px;font-weight:600">3</div></div>
      <div><div class="eyebrow meta">Gated today</div><div class="num bone" style="font-size:24px;font-weight:600">7</div></div>
    </div>
    <div class="s3"></div><div class="divider"></div><div class="s2"></div>
    <div class="body-sm alert">No sportsbook is pricing a game we cover right now, so there is nothing to evaluate. This is a data condition, not a quiet slate.</div>
    <div class="s3"></div><div class="divider"></div><div class="s2"></div>
    <div class="body-xs">Last refresh Sep 15, 2:40 PM</div>
  </div>

  <div class="s4"></div>
  <div class="body-xs">Data as of Sep 15, 2:40 PM (12 min ago)</div>

  <div class="s6"></div>
  <div class="eyebrow iris">Published</div>
  <div class="s3"></div>

  <div class="card" style="padding:0">
    <div class="pad">
      <div class="row between">
        <div class="row gap-2"><div class="eyebrow iris">NFL</div><div class="pill accent">Published</div></div>
        <div class="eyebrow meta sm">18 min ago</div>
      </div>
      <div class="s2"></div>
      <div class="body" style="font-size:17px">PIT @ ATL</div>
      <div class="s2"></div>
      <div class="eyebrow meta sm">Spread</div>
      <div class="s3"></div>
      <div class="row gap-6 baseline">
        <div><div class="eyebrow meta sm">Edge Index</div><div class="num bone" style="font-size:14px;font-weight:500">14.2</div></div>
        <div><div class="eyebrow meta sm">Confidence</div><div class="num bone" style="font-size:14px;font-weight:500">72/100</div></div>
      </div>
    </div>
  </div>

  <div class="s3"></div>
  <div class="card" style="padding:0">
    <div class="pad">
      <div class="row between">
        <div class="row gap-2"><div class="eyebrow iris">MLB</div><div class="pill neutral">Gated</div></div>
        <div class="eyebrow meta sm">41 min ago</div>
      </div>
      <div class="s2"></div>
      <div class="body" style="font-size:17px">TOR @ BOS</div>
      <div class="s2"></div>
      <div class="eyebrow meta sm">Run line</div>
      <div class="s3"></div>
      <div class="row gap-6 baseline">
        <div><div class="eyebrow meta sm">Edge Index</div><div class="num fog" style="font-size:14px;font-weight:500">0.4</div></div>
        <div><div class="eyebrow meta sm">Confidence</div><div class="pill neutral">Pro</div></div>
      </div>
      <div class="s3"></div>
      <div class="body-sm" style="color:var(--fog)">Depth too thin to publish. Two of fourteen books reporting.</div>
    </div>
  </div>
</div>
""",
        "board",
    )


# ── Frame 2: Pick card, full anatomy ─────────────────────────────────────────
def frame_pick() -> str:
    return phone(
        "PickCard — src/components/PickCard.tsx",
        f"""
<div class="pad">
  <div class="eyebrow iris">Picks</div>
  <div class="h-arch" style="margin-top:4px">THE PASS LIST</div>
  <div class="divider" style="margin-top:12px"></div>
  <div class="s4"></div>

  <div class="card accent">
    <div class="row between">
      <div class="row gap-2"><div class="eyebrow iris">NFL</div><div class="pill accent">Premium</div></div>
      <div class="row gap-2">
        <div class="pill accent">Featured</div>
        <div class="pill neutral">Pending</div>
      </div>
    </div>
    <div class="s3"></div>
    <div class="h-disp-sm">Atlanta Falcons −3.0</div>
    <div class="s2"></div>
    <div class="body-sm">Pittsburgh Steelers @ Atlanta Falcons · Sep 16, 12:00 AM</div>
    <div class="s3"></div>
    <div class="row gap-2"><div class="eyebrow meta">Line</div><div class="num bone" style="font-size:18px;font-weight:600">−3.0</div></div>
    <div class="s4"></div>

    <div class="eyebrow meta">Confidence</div>
    <div class="row gap-2 baseline"><div class="num ember" style="font-size:24px;font-weight:600">72/100</div></div>
    <div class="s2"></div>
    <div class="bar"><i style="width:72%;background:var(--ember);opacity:.6"></i></div>

    <div class="s4"></div><div class="divider"></div><div class="s3"></div>

    <div class="row gap-6 wrap">
      <div><div class="eyebrow meta sm">Edge Index</div><div class="num bone" style="font-size:18px;font-weight:600">14.2</div></div>
      <div>
        <div class="row gap-2 baseline"><div class="eyebrow meta sm">Market implied</div><div class="num bone" style="font-size:14px;font-weight:500">48.7%</div></div>
        <div class="body-xs" style="margin-top:2px">De-vigged across 11 books at publish</div>
      </div>
      <div>
        <div class="eyebrow meta sm">Expected CLV</div>
        <div class="num bone" style="font-size:14px;font-weight:500">+0.2257</div>
        <div class="body-xs" style="margin-top:2px">probability points</div>
      </div>
      <div><div class="eyebrow meta sm">Data quality</div><div class="num verify" style="font-size:14px;font-weight:500">96</div></div>
    </div>

    <div class="s4"></div>
    <div class="eyebrow meta">Factor breakdown</div>
    <div class="s2"></div>

    <div class="row between baseline"><div class="body-sm">Market shape</div><div class="num ember" style="font-size:12px">+0.4200</div></div>
    <div class="bar thin" style="margin-top:3px"><i style="width:88%;background:var(--ember)"></i></div>
    <div class="s2"></div>
    <div class="row between baseline"><div class="body-sm">Consensus</div><div class="num ember" style="font-size:12px">+0.3100</div></div>
    <div class="bar thin" style="margin-top:3px"><i style="width:65%;background:var(--ember)"></i></div>
    <div class="s2"></div>
    <div class="row between baseline"><div class="body-sm">Rest advantage</div><div class="num alert" style="font-size:12px">−0.1800</div></div>
    <div class="bar thin" style="margin-top:3px"><i style="width:38%;background:var(--alert)"></i></div>
    <div class="s2"></div>
    <div class="row between baseline"><div class="body-sm">Volatility penalty</div><div class="num alert" style="font-size:12px">−0.0900</div></div>
    <div class="bar thin" style="margin-top:3px"><i style="width:19%;background:var(--alert)"></i></div>

    <div class="s4"></div>
    <div class="quote">
      <div class="eyebrow meta">What would change this</div>
      <div class="body-sm">Rest advantage is the heaviest factor against this pick. If it moves the other way, this read is wrong.</div>
    </div>

    <div class="s4"></div><div class="divider"></div><div class="s3"></div>

    <div class="row between" style="align-items:flex-end">
      <div class="body-xs">Data as of Sep 15, 2:40 PM (12 min ago)</div>
      <div class="eyebrow meta sm">Solid play</div>
    </div>
    <div class="s3"></div>
    <div class="row gap-2 wrap">
      <div class="pill neutral">Moderate</div>
      <div class="pill neutral">Receipt 4f9c21ab</div>
      <div class="pill neutral">Audit available</div>
    </div>
    <div class="s4"></div>
    <div class="row gap-3">
      <div class="btn primary">Follow</div>
      <div class="btn secondary">Factor trail</div>
    </div>
  </div>
</div>
""",
        "picks",
    )


# ── Frame 3: Calibration ─────────────────────────────────────────────────────
def frame_calibration() -> str:
    pts = [(0.5, 0.52, "50–64", 41), (0.72, 0.58, "65–79", 63), (0.9, 0.64, "80–100", 38)]
    plot, pad = 300, 34
    def x(p): return pad + p * (plot - 2 * pad)
    def y(p): return 16 + (1 - p) * (plot - 2 * pad)
    grid = "".join(
        f'<line x1="{pad}" y1="{y(g)}" x2="{plot-pad}" y2="{y(g)}" stroke="rgba(35,38,46,.2)"/>'
        f'<line x1="{x(g)}" y1="16" x2="{x(g)}" y2="{plot-pad}" stroke="rgba(35,38,46,.2)"/>'
        for g in [0, .25, .5, .75, 1]
    )
    labels = "".join(
        f'<text x="{x(g)}" y="{plot-pad+16}" fill="#8F8A82" font-size="9" text-anchor="middle">{int(g*100)}</text>'
        f'<text x="{pad-8}" y="{y(g)+3}" fill="#8F8A82" font-size="9" text-anchor="end">{int(g*100)}</text>'
        for g in [0, .25, .5, .75, 1]
    )
    path = " ".join(f'{"M" if i == 0 else "L"} {x(p)} {y(o)}' for i, (p, o, _, _) in enumerate(pts))
    dots = "".join(
        f'<circle cx="{x(p)}" cy="{y(o)}" r="5" fill="#12141A" stroke="#9AA8E8" stroke-width="1.5"/>'
        f'<text x="{x(p)}" y="{y(o)-10}" fill="#C4BFB6" font-size="9" text-anchor="middle">{int(o*100)}% n={n}</text>'
        for p, o, _, n in pts
    )
    return phone(
        "Calibration — app/(tabs)/calibration.tsx",
        f"""
<div class="pad">
  <div class="eyebrow iris">Calibration</div>
  <div class="h-arch" style="margin-top:4px">DOES IT KNOW?</div>
  <div class="divider" style="margin-top:12px"></div>
  <div class="s4"></div>

  <div class="card">
    <div class="eyebrow meta">Does higher confidence win more?</div>
    <div class="s2"></div>
    <div class="row gap-2"><div class="num alert" style="font-size:14px">▼</div><div class="body" style="font-size:17px;color:var(--alert)">Higher confidence is winning less. Under review</div></div>
    <div class="s2"></div>
    <div class="body-sm">50–64 wins 52.0%, 80–100 wins 64.0%.</div>
  </div>

  <div class="s4"></div>
  <div class="row between"><div class="eyebrow iris">Reliability</div><div class="eyebrow meta sm">142 settled</div></div>
  <div class="s3"></div>
  <div class="card">
    <div class="eyebrow meta">Observed vs predicted</div>
    <div class="eyebrow meta sm" style="margin-top:2px">Diagonal is perfect calibration</div>
    <div class="s2"></div>
    <svg width="{plot}" height="{plot}" viewBox="0 0 {plot} {plot}">
      {grid}
      <line x1="{x(0)}" y1="{y(0)}" x2="{x(1)}" y2="{y(1)}" stroke="#8F8A82" stroke-width="1" stroke-dasharray="4 4"/>
      {labels}
      <path d="{path}" fill="none" stroke="#9AA8E8" stroke-width="1.5"/>
      {dots}
    </svg>
  </div>

  <div class="s4"></div>
  <div class="card">
    <div class="row between baseline"><div class="eyebrow meta">Brier score</div><div class="num bone" style="font-size:18px;font-weight:600">0.2381</div></div>
    <div class="s2"></div>
    <div class="body-sm">Better than a coin flip. Calibration is holding.</div>
    <div class="s2"></div>
    <div class="body-xs">A constant 0.5 forecast scores 0.25. Lower is better.</div>
  </div>

  <div class="s4"></div>
  <div class="eyebrow iris">Bands</div>
  <div class="s3"></div>
  <div class="card">
    <div class="row between baseline"><div class="eyebrow meta sm">Band 80–100</div><div class="num bone" style="font-size:14px">64.0%</div></div>
    <div class="s2"></div>
    <div class="bar" style="height:8px"><i style="width:64%;height:8px;background:var(--iris)"></i></div>
    <div class="s2"></div>
    <div class="row between"><div class="body-xs">Expected 90.0%</div><div class="body-xs fog">−26.0%</div></div>
  </div>
  <div class="s2"></div>
  <div class="card">
    <div class="row between baseline"><div class="eyebrow meta sm">Band 20–34</div><div class="pill neutral">18/30</div></div>
    <div class="s2"></div>
    <div class="body-xs">Collecting. A rate from 18 decided picks would not mean anything yet.</div>
  </div>
</div>
""",
        "cal",
    )


# ── Frame 4: States ──────────────────────────────────────────────────────────
def frame_states() -> str:
    return phone(
        "States — src/components/states.tsx",
        f"""
<div class="pad">
  <div class="eyebrow iris">States</div>
  <div class="h-arch" style="margin-top:4px">HONEST EMPTY</div>
  <div class="divider" style="margin-top:12px"></div>
  <div class="s4"></div>

  <div class="card">
    <div class="eyebrow iris">Quiet slate</div>
    <div class="s2"></div>
    <div class="h-disp-sm">Nothing published on this slate.</div>
    <div class="s3"></div>
    <div class="body-sm">The engine ran and did not find an edge it could stand behind. That is the product working as designed.</div>
    <div class="s3"></div><div class="divider"></div><div class="s2"></div>
    <div class="body-xs">3 rows withheld before this list was built.</div>
    <div class="s4"></div>
    <div class="btn secondary">Check again</div>
  </div>

  <div class="s4"></div>
  <div class="card">
    <div class="eyebrow iris">Awaiting fresh data</div>
    <div class="s2"></div>
    <div class="h-disp-sm">We do not publish on a stale slate.</div>
    <div class="s3"></div>
    <div class="body-sm">The last ingestion has not landed inside its refresh window, so the board is dark rather than showing you a line we cannot stand behind.</div>
    <div class="s4"></div>
    <div class="btn secondary">Check again</div>
  </div>

  <div class="s4"></div>
  <div class="card">
    <div class="eyebrow alert">Unavailable</div>
    <div class="s2"></div>
    <div class="h-disp-sm">A connection problem, not a verdict.</div>
    <div class="s3"></div>
    <div class="body-sm">No connection. Showing the last data we received.</div>
    <div class="s2"></div>
    <div class="body-xs">The graded record behind this surface is unchanged by us not being able to reach it.</div>
    <div class="s4"></div>
    <div class="btn secondary">Try again</div>
  </div>

  <div class="s4"></div>
  <div class="card">
    <div class="eyebrow iris">Collecting</div>
    <div class="s2"></div>
    <div class="row baseline gap-1"><div class="body" style="font-size:17px">12</div><div class="body-sm">/ 30 settled picks</div></div>
    <div class="s3"></div>
    <div class="bar thin"><i style="width:40%;background:var(--iris)"></i></div>
    <div class="s3"></div>
    <div class="body-sm">We publish the curve at 30 settled picks. Below that a line would say more about the sample than about the model.</div>
  </div>
</div>
""",
        "board",
    )


# ── Frame 5: Withheld + redaction (the trust rules made visible) ─────────────
def frame_trust() -> str:
    return phone(
        "Trust rules — picks.tsx + signals.tsx",
        f"""
<div class="pad">
  <div class="eyebrow iris">Trust rules</div>
  <div class="h-arch" style="margin-top:4px">WHAT WE WITHHOLD</div>
  <div class="divider" style="margin-top:12px"></div>
  <div class="s4"></div>

  <div class="card">
    <div class="row gap-2"><div class="pill caution">Withheld</div><div class="eyebrow meta sm">3 rows removed</div></div>
    <div class="s2"></div>
    <div class="body-sm">2 priced worse than the book by our own estimate. We do not offer a bet we can see is bad.</div>
    <div class="s2"></div>
    <div class="body-sm">1 not refreshed inside the staleness window. A stale line is not an actionable one.</div>
    <div class="s2"></div>
    <div class="body-xs">Withheld rows still settle and still count in the record. Hiding a row we should have passed on is honest; erasing it from our results would not be.</div>
  </div>

  <div class="s4"></div>
  <div class="card">
    <div class="row between"><div class="eyebrow meta">Confidence</div><div class="pill neutral">Pro</div></div>
    <div class="s3"></div>
    <div class="row between"><div class="eyebrow meta">Confidence</div><div class="num muted" style="color:var(--mist)">—</div></div>
    <div class="s3"></div>
    <div class="body-xs">A redacted field shows a tier label, never a zero — a zero reads as a bad score rather than as a boundary.</div>
  </div>

  <div class="s4"></div>
  <div class="card">
    <div><div class="pill caution">No book price attached</div>
    <div class="eyebrow meta sm" style="margin-top:6px">Model signal only</div></div>
    <div class="s3"></div>
    <div class="body-sm">This is a model signal with no sportsbook behind it. There is no line to take and no price to compare against, which is why the implied-probability row is empty rather than estimated.</div>
  </div>

  <div class="s4"></div>
  <div class="card">
    <div class="row between"><div class="eyebrow meta sm">Settlement</div><div class="row gap-2">
      <div class="pill verify solid-verify">W Win</div>
      <div class="pill alert solid-alert">L Loss</div>
      <div class="pill neutral">P Push</div>
      <div class="pill neutral" style="color:var(--mist)">V Void</div>
    </div></div>
    <div class="s3"></div>
    <div class="body-xs">Monograms, never a bare tick or cross. Colour is never the only carrier of the outcome.</div>
  </div>

  <div class="s4"></div>
  <div class="card">
    <div class="eyebrow meta">How this list is ordered</div>
    <div class="s2"></div>
    <div class="body-sm">By the engine&apos;s own expected closing line value first, then price difference, then Edge Index. Never by confidence — measured on 2026-09-13, the highest-confidence pick on the board carried the smallest edge on it.</div>
  </div>
</div>
""",
        "picks",
    )


# ── Frame 6: Paper reading mode ──────────────────────────────────────────────
def frame_paper() -> str:
    inner = frame_pick()
    start = inner.index('<div class="viewport">')
    body = inner[inner.index('<div class="scroll">') + len('<div class="scroll">'): inner.rindex("</div>\n  </div>\n</div>")]
    return phone(
        "Paper reading mode — scoped to dense surfaces",
        body,
        "picks",
        cls="paper",
    )


def main() -> None:
    frames = [
        frame_board(),
        frame_pick(),
        frame_calibration(),
        frame_states(),
        frame_trust(),
        frame_paper(),
    ]
    print(
        f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>GSE iOS — design review harness</title>
<style>{css()}</style></head>
<body>
{''.join(frames)}
</body></html>"""
    )


if __name__ == "__main__":
    main()
