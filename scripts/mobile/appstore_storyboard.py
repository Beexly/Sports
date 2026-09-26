#!/usr/bin/env python3
"""
appstore_storyboard.py — generate the App Store preview frames.

WHAT THIS PRODUCES
  Six single-screen HTML pages at 430x932 logical pixels. Rendered in the Minis
  browser at a 3x device scale that is exactly 1290x2796, which is the App Store
  Connect size for a 6.9 inch iPhone preview.

WHY IT IS A STORYBOARD AND NOT THE PREVIEW VIDEO
  An App Store preview must show the ACTUAL app running. The app has never been
  built on this machine, so a video assembled from these frames would be a
  misrepresentation if submitted.

  So this generates the animatic: it proves the caption copy, the ordering, the
  pacing and the composition, and the same script re-renders against real
  simulator screenshots by swapping the background image. That is the honest use
  of it, and it is stated in docs/mobile/store/SUBMISSION.md rather than implied.

USAGE
  python3 scripts/appstore_storyboard.py            # writes preview/store/*.html
"""

from __future__ import annotations

import os
import pathlib

# ── FIELD tokens, from apps/mobile/src/theme/tokens.ts ───────────────────────
CARBON = "#08090C"
ECLIPSE = "#12141A"
MINERAL = "#23262E"
BONE = "#EDE8E0"
FOG = "#C4BFB6"
MIST = "#8F8A82"
EMBER = "#FF4D2E"
IRIS = "#9AA8E8"

WIDTH = 430
HEIGHT = 932

MARK = """<svg width="{s}" height="{s}" viewBox="0 0 64 64" fill="none">
<circle cx="32" cy="32" r="27" stroke="#3A3F4B" stroke-width="2"/>
<ellipse cx="32" cy="32" rx="27" ry="10" stroke="#EDE8E0" stroke-width="1.8"
         opacity=".5" transform="rotate(-24 32 32)"/>
<path d="M53 21.5 A27 27 0 0 1 46 52" stroke="#EDE8E0" stroke-width="5"/>
<circle cx="32" cy="32" r="7" fill="#EDE8E0"/>
<circle cx="10" cy="40" r="3.5" fill="#FF4D2E"/>
</svg>"""


# Caption copy. Written to the positioning rules: no em-dash, no certainty
# language, no "you will", and each line names what the screen SHOWS rather than
# what it promises.
FRAMES: list[dict[str, str]] = [
    {
        "id": "01-gate",
        "eyebrow": "The board",
        "caption": "It says no more than it says yes.",
        "body": "Published, scoring, and gated, side by side.",
    },
    {
        "id": "02-evidence",
        "eyebrow": "Every pick",
        "caption": "Every call carries its own evidence.",
        "body": "The factor breakdown, the market price, the freshness stamp.",
    },
    {
        "id": "03-calibration",
        "eyebrow": "Calibration",
        "caption": "When it is wrong, it says so here.",
        "body": "Does higher confidence actually win more? We publish the answer either way.",
    },
    {
        "id": "04-withheld",
        "eyebrow": "Discipline",
        "caption": "We withhold what we price worse than the book.",
        "body": "And we count it, rather than hiding it.",
    },
    {
        "id": "05-quiet",
        "eyebrow": "Quiet days",
        "caption": "Some days there is nothing.",
        "body": "We tell you that too.",
    },
    {
        "id": "06-receipt",
        "eyebrow": "Receipts",
        "caption": "Every pick has a receipt you can check.",
        "body": "Committed before kickoff. Verifiable after.",
    },
]


def frame_html(frame: dict[str, str], index: int) -> str:
    """One screen. The caption sits in the lower third, above the safe area."""
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>{frame['id']}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{
    width: {WIDTH}px; height: {HEIGHT}px; overflow: hidden;
    background: {CARBON}; color: {BONE};
    font-family: Inter, -apple-system, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }}
  .screen {{ width: {WIDTH}px; height: {HEIGHT}px; position: relative; display: flex; flex-direction: column; }}
  .top {{ padding: 54px 24px 0; display: flex; align-items: center; gap: 10px; }}
  .eyebrow {{ font-size: 12px; letter-spacing: 1.9px; text-transform: uppercase; color: {IRIS}; font-weight: 600; }}
  .stage {{ flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 24px; }}
  .panel {{
    width: 100%; border: 1px solid {MINERAL}; border-radius: 14px;
    background: {ECLIPSE}; padding: 22px;
  }}
  .caption {{ font-size: 31px; line-height: 36px; font-weight: 600; letter-spacing: -0.5px; }}
  .body {{ margin-top: 10px; font-size: 15px; line-height: 22px; color: {FOG}; }}
  .rule {{ height: 1px; background: {MINERAL}; margin: 18px 0; }}
  .meta {{ font-size: 12px; letter-spacing: 1.6px; text-transform: uppercase; color: {MIST}; }}
  .num {{ font-variant-numeric: tabular-nums; font-weight: 700; color: {BONE}; }}
  .bottom {{ padding: 0 24px 62px; }}
  .foot {{ display: flex; justify-content: space-between; align-items: baseline; margin-top: 14px; }}
  .row {{ display: flex; gap: 22px; align-items: baseline; }}
  .bar {{ height: 6px; border-radius: 3px; background: rgba(196,191,182,.16); overflow: hidden; margin-top: 8px; }}
  .bar > i {{ display: block; height: 6px; border-radius: 3px; background: {EMBER}; }}
  .pill {{
    display: inline-block; border: 1px solid rgba(196,191,182,.45); border-radius: 3px;
    padding: 2px 8px; font-size: 11px; letter-spacing: 1.6px; text-transform: uppercase; color: {FOG};
  }}
  .pill.ember {{ border-color: rgba(255,77,46,.45); color: {EMBER}; }}
  .pill.iris {{ border-color: rgba(154,168,232,.5); color: {IRIS}; }}
</style></head>
<body><div class="screen">
  <div class="top">
    {MARK.format(s=22)}
    <span class="eyebrow">Galaxy Sports Edge</span>
  </div>

  <div class="stage">
    <div class="panel">
      <div class="meta">{frame['eyebrow']}</div>
      <div class="caption" style="margin-top:12px">{frame['caption']}</div>
      <div class="body">{frame['body']}</div>
      <div class="rule"></div>
      {stage_body(frame['id'])}
    </div>
  </div>

  <div class="bottom">
    <div class="foot">
      <span class="meta">Frame {index + 1} of {len(FRAMES)}</span>
      <span class="meta">We detect. You decide.</span>
    </div>
  </div>
</div></body></html>"""


def stage_body(frame_id: str) -> str:
    """The per-frame evidence, mirroring the app's real components."""
    if frame_id == "01-gate":
        return f"""<div class="row">
        <span class="pill ember">Published 3</span>
        <span class="pill iris">Scoring 4</span>
        <span class="pill">Gated 7</span>
      </div>
      <div style="margin-top:14px" class="meta">Books polled</div>
      <div class="num" style="font-size:26px">11</div>"""
    if frame_id == "02-evidence":
        return f"""<div class="meta">Confidence</div>
      <div class="num" style="font-size:26px">72/100</div>
      <div class="bar"><i style="width:72%"></i></div>
      <div class="row" style="margin-top:14px">
        <div><div class="meta">Edge Index</div><div class="num" style="font-size:16px">14.2</div></div>
        <div><div class="meta">Market implied</div><div class="num" style="font-size:16px">48.7%</div></div>
      </div>"""
    if frame_id == "03-calibration":
        return f"""<div class="row" style="align-items:center">
        <span style="color:{EMBER}; font-size:14px">&#9660;</span>
        <span style="font-size:16px; color:{EMBER}">Higher confidence is winning less. Under review.</span>
      </div>
      <div class="row" style="margin-top:14px">
        <div><div class="meta">Settled</div><div class="num" style="font-size:20px">142</div></div>
        <div><div class="meta">Brier</div><div class="num" style="font-size:20px">0.2381</div></div>
      </div>"""
    if frame_id == "04-withheld":
        return f"""<div class="row">
        <span class="pill" style="border-color:rgba(255,180,84,.45); color:#FFB454">Withheld 3</span>
      </div>
      <div class="body" style="margin-top:12px">2 priced worse than the book by our own estimate.
      1 not refreshed inside the staleness window.</div>"""
    if frame_id == "05-quiet":
        return f"""<div class="body">The engine ran and did not find an edge it could stand behind.
      That is the product working as designed.</div>
      <div class="rule"></div>
      <div class="meta">Quiet slate</div>"""
    return f"""<div class="meta">Content hash</div>
      <div class="body" style="word-break:break-all; font-size:13px">4f9c21ab8e77d0c3b1a5
      9e420f6d7c88a1b3e5f7092d4c6</div>
      <div class="rule"></div>
      <div class="meta">Committed before kickoff</div>"""


def main() -> None:
    out = pathlib.Path(__file__).resolve().parent.parent / "preview" / "store"
    out.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(FRAMES):
        path = out / f"{frame['id']}.html"
        path.write_text(frame_html(frame, i), encoding="utf-8")
        print(f"wrote {path.relative_to(out.parent.parent)}")

    # A single index that renders all six in a row, for a one-glance review.
    index = "\n".join(
        f'<iframe src="{f["id"]}.html" width="{WIDTH}" height="{HEIGHT}" '
        f'style="border:0;border-radius:20px"></iframe>'
        for f in FRAMES
    )
    (out / "index.html").write_text(
        f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<title>App Store preview storyboard</title>
<style>body{{background:#000;margin:0;padding:24px;display:flex;gap:20px;
flex-wrap:wrap;justify-content:center}}</style></head><body>{index}</body></html>""",
        encoding="utf-8",
    )
    print(f"wrote preview/store/index.html ({len(FRAMES)} frames)")


if __name__ == "__main__":
    main()
