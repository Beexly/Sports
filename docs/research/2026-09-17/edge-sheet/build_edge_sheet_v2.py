#!/usr/bin/env python3
"""GSE Edge Sheet v2: Bills vs Lions, Week 2 2026.

Metric-dense 1080x1350 data graphic. Seven visual panels, every number with
league context (percentile / rank / average line / distribution).
Deterministic. CLI-driven game metadata.

Layout v2.1 (2026-09-17 fix pass): full restructure for zero text collisions.
Panel title blocks use measured font line-boxes (Noto Condensed reserves
~1.89em vertical); every stacked text pair is placed from measured extents
with enforced pixel gaps. Verified by /tmp/audit_sheet.py (bbox-level audit:
zero text-text overlaps, zero out-of-bounds, full panel containment).

Run: ./.venv-v2/bin/python build_edge_sheet_v2.py [--home BUF ...]
"""
import argparse
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import patches
import numpy as np
import pandas as pd
from scipy.stats import gaussian_kde

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1350

# ---------------------------------------------------------------- palette
GROUND = "#08090C"
PANEL  = "#12141A"
BONE   = "#EDE8E0"
FOG    = "#C4BFB6"
MIST   = "#96918A"
SIGNAL = "#FF4D2E"
HAIR   = "#2A2D35"
DOT    = "#43474F"

# ---------------------------------------------------------------- fonts
FD = os.path.join(HERE, "fonts")
COND_BLACK = matplotlib.font_manager.FontProperties(
    fname=os.path.join(FD, "NotoSansDisplay_Condensed-Black.ttf"))
COND_XBOLD = matplotlib.font_manager.FontProperties(
    fname=os.path.join(FD, "NotoSansDisplay_Condensed-ExtraBold.ttf"))
COND_BOLD = matplotlib.font_manager.FontProperties(
    fname=os.path.join(FD, "NotoSansDisplay_Condensed-Bold.ttf"))
plt.rcParams["font.family"] = "DejaVu Sans"


def tracked(s):
    return "\u2009".join(list(s))


def ordinal(p):
    p = int(round(p))
    if 10 <= p % 100 <= 20:
        suf = "th"
    else:
        suf = {1: "st", 2: "nd", 3: "rd"}.get(p % 10, "th")
    return f"{p}{suf}"


def fmt_epa(x):
    x = round(float(x), 2)
    if x == 0:
        x = 0.0
    return f"{x:+.2f}"


def pct_rank(s, higher_better=True):
    """Percentile where 100 = best. Rank 1 = best."""
    r = s.rank(method="min", ascending=not higher_better)
    pct = (r - 1) / (len(s) - 1) * 100
    if higher_better:
        pct = 100 - pct
    return pct, r.astype(int)


# ---------------------------------------------------------------- CLI
ap = argparse.ArgumentParser()
ap.add_argument("--home", default="BUF")
ap.add_argument("--away", default="DET")
ap.add_argument("--week", default="WEEK 2")
ap.add_argument("--season", default="2026")
ap.add_argument("--date", default="THURSDAY, SEPTEMBER 17")
ap.add_argument("--venue", default="NEW HIGHMARK STADIUM")
ap.add_argument("--time", default="7:15 PM CT")
ap.add_argument("--market", type=float, default=-5.5)
ap.add_argument("--out", default="bills-lions-edge-sheet-v2.png")
args = ap.parse_args()
HOME, AWAY = args.home, args.away

# ---------------------------------------------------------------- data
D = os.path.join(HERE, "..", "nfl-2026")
tm = pd.read_csv(os.path.join(D, "team_metrics_2025.csv")).set_index("team")
bp = pd.read_csv(os.path.join(D, "metric_percentiles_2025.csv")).set_index("team")
drv = pd.read_csv(os.path.join(D, "drive_stats_2025.csv")).set_index("team")
ds = pd.read_csv(os.path.join(D, "down_splits_2025.csv"))
xm = pd.read_csv(os.path.join(D, "extra_metrics_2025.csv")).set_index("team")
w1 = pd.read_csv(os.path.join(D, "team_metrics_2026.csv")).set_index("team")
pbp = pd.read_csv(os.path.join(HERE, "dropback_epa_2025_all.csv"))
edist = pd.read_csv(os.path.join(D, "epa_distributions_2025.csv"))
wktr = pd.read_csv(os.path.join(D, "weekly_trends_2025.csv"))

b, d_ = tm.loc[HOME], tm.loc[AWAY]

OFF_PCT, OFF_R = pct_rank(tm["epa_per_play"])
DEF_PCT, DEF_R = pct_rank(tm["def_epa_per_play"])
LG_OFF, LG_DEF = tm["epa_per_play"].mean(), tm["def_epa_per_play"].mean()

ds_off = ds[(ds.season == 2025) & (ds.side == "offense")].set_index(["team", "down_group"])
early = ds_off.xs("early_1_2", level="down_group")["epa_per_play"]
late = ds_off.xs("late_3_4", level="down_group")["epa_per_play"]
early_pct, _ = pct_rank(early)
late_pct, _ = pct_rank(late)
lc = xm["late_close_epa"]
lc_pct, _ = pct_rank(lc)
give = drv["turnover_drive_rate"]
give_pct, _ = pct_rank(-give)          # right = better = fewer giveaways
ppd = drv["points_per_drive"]
ppd_pct, _ = pct_rank(ppd)

LUCK_PTS = {}
for t in tm.index:
    r = tm.loc[t]
    net = (r["int_diff_actual_minus_expected"]
           + r["fumble_lost_diff_actual_minus_expected"]
           - r["takeaways_int_diff"])
    LUCK_PTS[t] = -net * 4.5

# Tail shares (share of dropbacks at 1.0+ EPA) from the distributions CSV.
# Verified against raw play data: BUF 27.5%, DET 27.0% of dropbacks >= 1.0 EPA.
def tail_share(team):
    r = edist[(edist.team == team) & (edist.side == "offense")
              & (edist.split == "dropback")].iloc[0]
    return r["share_chunk_epa"] * 100, int(r["n"])
TAIL_B, N_B = tail_share(HOME)
TAIL_D, N_D = tail_share(AWAY)

# 4-week rolling offensive EPA/play for form lines (bye weeks -> NaN gap).
_roll = {}
for _t, _g in wktr.groupby("team"):
    _s = _g.set_index("week")["epa_per_play"].reindex(range(1, 19))
    _roll[_t] = _s.rolling(4, min_periods=1).mean()
ROLL = pd.DataFrame(_roll)
_r18 = ROLL.loc[18].rank(ascending=False, method="min")
FORM_W18 = {t: (ROLL.loc[18, t], int(_r18[t])) for t in (HOME, AWAY)}
LG_ROLL = ROLL.mean(axis=1)

# Illustrative fair line (NOT the engine). Same documented recipe as v1:
# net EPA/play edge times 63 plays, plus 2.0 points home field.
net_home = b["epa_per_play"] + b["def_epa_per_play"]
net_away = d_["epa_per_play"] + d_["def_epa_per_play"]
FAIR_MARGIN = (net_home - net_away) * 63 + 2.0
FAIR_LINE = -round(FAIR_MARGIN)      # spread from home perspective
GAP = FAIR_MARGIN + args.market     # positive = illustrated value on home

bu = {"pass_off_epa": b["epa_per_dropback"], "rush_off_epa": b["epa_per_rush"],
      "pass_def_epa": b["def_epa_per_dropback"], "rush_def_epa": b["def_epa_per_rush"]}
du = {"pass_off_epa": d_["epa_per_dropback"], "rush_off_epa": d_["epa_per_rush"],
      "pass_def_epa": d_["def_epa_per_dropback"], "rush_def_epa": d_["def_epa_per_rush"]}

# ---------------------------------------------------------------- figure
fig = plt.figure(figsize=(W / 100, H / 100), dpi=100)
fig.patch.set_facecolor(GROUND)

PANEL_BBOX = dict(boxstyle="round,pad=0.3", facecolor=PANEL, edgecolor="none")


def card(x, y_top, w, h):
    # zorder=-1: figure-level patch must sit BEHIND axes (axes default zorder 0).
    p = patches.FancyBboxPatch(
        (x / W, 1 - (y_top + h) / H), w / W, h / H,
        boxstyle=f"round,pad=0.012,rounding_size={10/1080}",
        facecolor=PANEL, edgecolor=HAIR, lw=1.2,
        transform=fig.transFigure, figure=fig, zorder=-1)
    fig.add_artist(p)


def panel_ax(x, y_top, w, h, title_h=62, bottom=18):
    """Inner axes. title_h px reserved at top; bottom px reserved at bottom."""
    pad = 18
    top = y_top + pad + title_h
    hh = h - pad - title_h - bottom
    ax = fig.add_axes([(x + pad) / W, 1 - (top + hh) / H,
                       (w - 2 * pad) / W, hh / H])
    ax.set_facecolor(PANEL)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_xticks([])
    ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    return ax


def ptitle(x, y_top, title, subtitle, tsize=17, ssize=12.5):
    """Title block. Noto Condensed reserves ~1.89em vertical; subtitle is
    placed 8px below the title's measured line box so boxes never touch."""
    t_top = y_top + 18
    fig.text(x / W, 1 - t_top / H, tracked(title),
             fontproperties=COND_BOLD, size=tsize, color=BONE, va="top", ha="left")
    s_top = t_top + tsize * 1.89 + 8
    fig.text(x / W, 1 - s_top / H, subtitle,
             size=ssize, color=MIST, va="top", ha="left")
    return s_top + ssize * 1.39   # bottom of subtitle box (for layout math)


# ================================================================ HEADER (0-240)
# Three clean rows: (A) kicker left / week right; (B) title left / market
# chip right; (C) dateline left. Signal rule closes the band.
fig.text(40 / W, 1 - 26 / H, tracked("GSE EDGE SHEET"), fontproperties=COND_BOLD,
         size=16, color=MIST, va="top", ha="left")
fig.text(1040 / W, 1 - 26 / H, f"{args.week} \u00b7 {args.season}",
         size=24, color=SIGNAL, weight="bold", va="top", ha="right")
# Title at 72pt: measured box is 136px tall, ~624px wide from x=40.
t_bills = fig.text(40 / W, 1 - 62 / H, "BILLS", fontproperties=COND_BLACK,
                   size=72, color=BONE, va="top", ha="left")
fig.canvas.draw()
x_vs = t_bills.get_window_extent().x1 + 16
t_vs = fig.text(x_vs / W, 1 - 62 / H, "vs", fontproperties=COND_BLACK,
                size=72, color=SIGNAL, va="top", ha="left")
fig.canvas.draw()
x_lions = t_vs.get_window_extent().x1 + 16
t_lions = fig.text(x_lions / W, 1 - 62 / H, "LIONS", fontproperties=COND_BLACK,
                   size=72, color=BONE, va="top", ha="left")
fig.canvas.draw()
title_end = t_lions.get_window_extent().x1   # ~664px; chip starts at 692
pill = patches.FancyBboxPatch(
    (692 / W, 1 - 152 / H), 348 / W, 60 / H,
    boxstyle=f"round,pad=0.012,rounding_size={10/1080}",
    facecolor=PANEL, edgecolor=HAIR, lw=1.2,
    transform=fig.transFigure, figure=fig, zorder=2)
fig.add_artist(pill)
fig.text(866 / W, 1 - 122 / H, f"MARKET  {HOME} {args.market:+g}",
         size=22, color=BONE, weight="bold", va="center", ha="center")
# Dateline measured at 910px wide: fits 40..1040 with room to spare.
fig.text(40 / W, 1 - 202 / H,
         f"{args.date} \u00b7 {args.time} \u00b7 {args.venue}",
         size=17.5, color=BONE, weight="bold", va="top", ha="left")
fig.patches.extend([patches.Rectangle(
    (40 / W, 1 - 230 / H), 1000 / W, 4 / H, facecolor=SIGNAL,
    transform=fig.transFigure, figure=fig, zorder=3)])

# ================================================================ 1. HERO (238-439)
# v2.2: the 32-team scatter strip was unreadable at phone width (thin band,
# crowded dots, W1 note sitting on the axis). Replaced with a four-cell
# two-team comparison built from the SAME data: off/def EPA + league rank.
card(40, 238, 1000, 201)
ax1 = panel_ax(40, 238, 1000, 201, title_h=62, bottom=34)
ptitle(58, 238, "EFFICIENCY MAP",
       "2025 EPA/play vs all 32 teams \u00b7 rank of 32 \u00b7 garbage time and kneels removed",
       tsize=17, ssize=12.5)
_cells = [
    (0.125, "BUFFALO OFFENSE", fmt_epa(b["epa_per_play"]),
     f"#{OFF_R[HOME]} OF 32", BONE),
    (0.375, "BUFFALO DEFENSE", fmt_epa(b["def_epa_per_play"]),
     f"#{DEF_R[HOME]} OF 32", BONE),
    (0.625, "DETROIT OFFENSE", fmt_epa(d_["epa_per_play"]),
     f"#{OFF_R[AWAY]} OF 32", SIGNAL),
    (0.875, "DETROIT DEFENSE", fmt_epa(d_["def_epa_per_play"]),
     f"#{DEF_R[AWAY]} OF 32", SIGNAL),
]
for _cx, _lab, _val, _rk, _col in _cells:
    ax1.text(_cx, 0.88, _lab, size=10.5, color=MIST, weight="bold",
             ha="center", va="center")
    ax1.text(_cx, 0.52, _val, size=28, color=_col, weight="bold",
             ha="center", va="center")
    ax1.text(_cx, 0.14, _rk, size=11.5, color=FOG, ha="center", va="center")
for _dx in (0.25, 0.5, 0.75):
    ax1.plot([_dx, _dx], [0.06, 0.96], color=HAIR, lw=1.2, zorder=1)
# Takeaway + W1 note share one line in the reserved bottom pad, clear of cells.
fig.text(58 / W, 1 - 420 / H,
         "Both offenses top 10. Buffalo's sits a tier higher.",
         size=12.5, color=BONE, style="italic", va="center", ha="left")
fig.text(1022 / W, 1 - 420 / H,
         f"W1 {args.season} (one game each, not a rating): "
         f"{HOME} {w1.loc[HOME, 'epa_per_play']:+.2f} \u00b7 "
         f"{AWAY} {w1.loc[AWAY, 'epa_per_play']:+.2f}",
         size=10.5, color=MIST, style="italic", va="center", ha="right")


# ================================================================ 2. FACEOFF (447-729)
card(40, 447, 1000, 282)
ax2 = panel_ax(40, 447, 1000, 282, title_h=62, bottom=26)
ptitle(58, 447, "PERCENTILE FACEOFF",
       "10 metrics vs all 32 teams, 2025 \u00b7 right = better \u00b7 sorted by BUF/DET split",
       tsize=17, ssize=12.5)
fig.text(1014 / W, 1 - 465 / H, "\u25c6 BUF", size=12, color=BONE,
         weight="bold", va="top", ha="right")
fig.text(1014 / W, 1 - 485 / H, "\u25c6 DET", size=12, color=SIGNAL,
         weight="bold", va="top", ha="right")

rows = [
    ("RUSH EPA",        fmt_epa(b["epa_per_rush"]),   fmt_epa(d_["epa_per_rush"]),
     bp.loc[HOME, "epa_per_rush_pct"],   bp.loc[AWAY, "epa_per_rush_pct"]),
    ("LATE AND CLOSE",  fmt_epa(lc[HOME]),           fmt_epa(lc[AWAY]),
     lc_pct[HOME], lc_pct[AWAY]),
    ("LATE-DOWN EPA",   fmt_epa(late[HOME]),         fmt_epa(late[AWAY]),
     late_pct[HOME], late_pct[AWAY]),
    ("GIVEAWAYS / DRIVE", f"{give[HOME]*100:.1f}%", f"{give[AWAY]*100:.1f}%",
     give_pct[HOME], give_pct[AWAY]),
    ("DEF DROPBACK EPA", fmt_epa(b["def_epa_per_dropback"]), fmt_epa(d_["def_epa_per_dropback"]),
     bp.loc[HOME, "def_epa_per_dropback_pct"], bp.loc[AWAY, "def_epa_per_dropback_pct"]),
    ("SUCCESS RATE",    f"{b['success_rate']*100:.1f}%", f"{d_['success_rate']*100:.1f}%",
     bp.loc[HOME, "success_rate_pct"],   bp.loc[AWAY, "success_rate_pct"]),
    ("DEF RUSH EPA",    fmt_epa(b["def_epa_per_rush"]), fmt_epa(d_["def_epa_per_rush"]),
     bp.loc[HOME, "def_epa_per_rush_pct"], bp.loc[AWAY, "def_epa_per_rush_pct"]),
    ("OFF EPA / PLAY",  fmt_epa(b["epa_per_play"]),  fmt_epa(d_["epa_per_play"]),
     bp.loc[HOME, "epa_per_play_pct"],   bp.loc[AWAY, "epa_per_play_pct"]),
    ("EXPLOSIVE RATE",  f"{b['explosive_rate']*100:.1f}%", f"{d_['explosive_rate']*100:.1f}%",
     bp.loc[HOME, "explosive_rate_pct"], bp.loc[AWAY, "explosive_rate_pct"]),
    ("DROPBACK EPA",    fmt_epa(b["epa_per_dropback"]), fmt_epa(d_["epa_per_dropback"]),
     bp.loc[HOME, "epa_per_dropback_pct"], bp.loc[AWAY, "epa_per_dropback_pct"]),
]
rows.sort(key=lambda r: abs(r[3] - r[4]), reverse=True)
NOTES = {0: "ground game is the mismatch", 1: "Allen owns money downs"}

T0, T1, TMED = 0.26, 0.52, 0.39
PITCH = 18 / 176   # 18px row pitch on the 176px-tall axes
MARK_HALF = 0.012  # diamond half-width in axes fraction, plus safety
LBL_W = 0.080      # value-label width estimate in axes fraction
for i, (label, bv, dv, bpc, dpc) in enumerate(rows):
    y = 0.945 - i * PITCH
    ax2.text(0.0, y, label, size=11.5, color=FOG, va="center", ha="left")
    ax2.plot([T0, T1], [y, y], color=MIST, alpha=0.35, lw=4,
             solid_capstyle="round", zorder=1)
    ax2.plot([TMED, TMED], [y - 0.020, y + 0.020], color=MIST, lw=1.2, zorder=1)
    xb, xd = T0 + bpc / 100 * (T1 - T0), T0 + dpc / 100 * (T1 - T0)
    ax2.scatter([xb], [y], s=90, marker="D", c=BONE, linewidths=0, zorder=3)
    ax2.scatter([xd], [y], s=90, marker="D", c=SIGNAL, linewidths=0, zorder=3)
    # Value labels start right of their own diamond with a guaranteed gap,
    # so markers never touch or clip text at any percentile.
    bx0 = max(0.545, xb + MARK_HALF + 0.012)
    ax2.text(bx0, y, f"{bv} {ordinal(bpc)}", size=10.5, color=BONE,
             weight="bold", va="center", ha="left", zorder=4)
    dx0 = max(0.66, bx0 + LBL_W + 0.015)
    ax2.text(dx0, y, f"{dv} {ordinal(dpc)}", size=10.5, color=SIGNAL,
             weight="bold", va="center", ha="left", zorder=4)
    if i < 2:
        # Bracket + note shift right of the DET label; notes stay in
        # DejaVu (condensed reserves ~1.9em vertical and the note boxes touched).
        nx0 = max(0.751, dx0 + LBL_W + 0.02)
        ax2.plot([nx0 - 0.021, nx0 - 0.021], [y - 0.030, y + 0.030],
                 color=SIGNAL, lw=2, zorder=4)
        ax2.text(nx0, y, NOTES[i], size=10, color=SIGNAL,
                 weight="bold", style="italic", va="center", ha="left", zorder=4)
# axis captions inside the axes bottom (bottom=30px reserved for them)
for xx, lab in ((T0, "0"), (TMED, "MEDIAN"), (T1, "100")):
    ax2.text(xx, 0.012, lab, size=10, color=MIST, va="bottom", ha="center",
             transform=ax2.transAxes)

# ================================================================ 3+4. SPLIT (737-932)
# ---- 3. distributions (left): taller plot, stronger fills, tail labels
# stacked as ONE centered group in the low-density tail region.
card(40, 737, 494, 195)
ax3 = panel_ax(40, 737, 494, 195, title_h=62, bottom=18)
ptitle(58, 737, "PASS-GAME SHAPES", f"2025 dropback EPA \u00b7 {N_B} vs {N_D} plays",
       tsize=17, ssize=12.5)
ax3.set_xlim(-2.0, 2.4)
ax3.set_xticks([-2, -1, 0, 1, 2])
ax3.set_xticklabels(["-2", "-1", "0", "+1", "+2"], size=11, color=MIST)
ax3.tick_params(length=0, pad=4)
for s in ax3.spines.values():
    s.set_visible(False)
ax3.spines["bottom"].set_visible(True)
ax3.spines["bottom"].set_color(HAIR)

xs = np.linspace(-2.2, 2.5, 400)
kde_lg = gaussian_kde(pbp["epa"].values, bw_method=0.25)
ax3.plot(xs, kde_lg(xs), color=MIST, ls=(0, (4, 4)), lw=1.4, alpha=0.95, zorder=1)
for team, col, zc in ((HOME, BONE, 3), (AWAY, SIGNAL, 2)):
    epa = pbp.loc[pbp.posteam == team, "epa"].values
    kde = gaussian_kde(epa, bw_method=0.25)
    yy = kde(xs)
    ax3.fill_between(xs, yy, color=col, alpha=0.30, zorder=zc)
    ax3.plot(xs, yy, color=col, lw=3.0, zorder=zc + 1)
ymax = max(float(kde_lg(xs).max()),
           float(gaussian_kde(pbp.loc[pbp.posteam == HOME, "epa"].values,
                              bw_method=0.25)(xs).max()),
           float(gaussian_kde(pbp.loc[pbp.posteam == AWAY, "epa"].values,
                              bw_method=0.25)(xs).max()))
ax3.set_ylim(0, ymax * 1.22)
ax3.axvspan(1.0, 2.4, color=FOG, alpha=0.06, zorder=0)
ax3.text(2.32, ymax * 0.06, "lg", size=10.5, color=MIST, ha="right", va="bottom")
# Tail-share stack: moved left and spread vertically so the three boxes
# clear each other, the curve, and the panel edge.
ax3.text(1.55, ymax * 0.98, f"{HOME} {TAIL_B:.1f}%", size=12, color=BONE,
         weight="bold", ha="center", va="center", bbox=PANEL_BBOX)
ax3.text(1.55, ymax * 0.70, f"{AWAY} {TAIL_D:.1f}%", size=12, color=SIGNAL,
         weight="bold", ha="center", va="center", bbox=PANEL_BBOX)
ax3.text(1.55, ymax * 0.44, "at 1.0+ EPA", size=10.5, color=MIST,
         ha="center", va="center", bbox=PANEL_BBOX)

# ---- 4. luck ledger (right): rebuilt. One "actual/expected" label per bar,
# expected as a mist tick. Category labels + takeaway in reserved bottom pad.
card(546, 737, 494, 195)
ax4 = panel_ax(546, 737, 494, 195, title_h=62, bottom=56)
ptitle(564, 737, "THE LUCK LEDGER", "2025 actual / expected",
       tsize=17, ssize=12.5)
fig.text(1010 / W, 1 - 795 / H, "\u25a0 DET", size=11, color=SIGNAL,
         weight="bold", va="top", ha="right")
fig.text(940 / W, 1 - 795 / H, "\u25a0 BUF", size=11, color=BONE,
         weight="bold", va="top", ha="right")
ax4.set_xlim(-0.55, 2.55)
ax4.set_ylim(0, 16.5)
luck_rows = [
    ("INTS THROWN",  b["int_thrown"],   b["int_expected"],   d_["int_thrown"],   d_["int_expected"]),
    ("FUMBLES LOST", b["fumbles_lost"], b["fumble_lost_expected"],
     d_["fumbles_lost"], d_["fumble_lost_expected"]),
    ("INTS TAKEN",   b["takeaways_int"], b["takeaways_int_expected"],
     d_["takeaways_int"], d_["takeaways_int_expected"]),
]
for i, (lab, b_act, b_exp, d_act, d_exp) in enumerate(luck_rows):
    gx = float(i)
    for act, exp, xc, col in ((b_act, b_exp, gx - 0.21, BONE),
                              (d_act, d_exp, gx + 0.21, SIGNAL)):
        ax4.bar(xc, act, width=0.22, color=col, zorder=2)
        ax4.plot([xc - 0.14, xc + 0.14], [exp, exp], color=MIST, lw=2.5, zorder=3)
        ax4.text(xc, act + 0.55, f"{act:.0f}/{exp:.1f}", size=9.5, color=col,
                 weight="bold", va="bottom", ha="center", zorder=4)
for i, (lab, _, _, _, _) in enumerate(luck_rows):
    fig.text((643 + i * 144) / W, 1 - 885 / H, lab, size=11, color=MIST,
             va="top", ha="center")
fig.text(564 / W, 1 - 906 / H,
         f"Both banked luck: {HOME} {LUCK_PTS[HOME]:+.0f} PTS, "
         f"{AWAY} {LUCK_PTS[AWAY]:+.0f} PTS.",
         size=12.5, color=FOG, style="italic", va="top", ha="left")

# ================================================================ 5+6. SPLIT2 (940-1124)
# ---- 5. form lines (left)
card(40, 940, 494, 184)
ax5 = panel_ax(40, 940, 494, 184, title_h=62, bottom=30)
ptitle(58, 940, "FORM LINES", "4-wk rolling off EPA/play \u00b7 2025 weeks 1-18",
       tsize=17, ssize=12.5)
ax5.set_xlim(1, 22.5)
ax5.set_ylim(-0.35, 0.62)
ax5.set_xticks([])
ax5.axvspan(14.5, 18.5, color=BONE, alpha=0.045, zorder=0)
ax5.plot(range(1, 19), LG_ROLL.values, color=MIST, ls=(0, (4, 4)), lw=1.2,
         alpha=0.9, zorder=1)
for _team, _col in ((HOME, BONE), (AWAY, SIGNAL)):
    _s = ROLL[_team]
    ax5.plot(_s.index, _s.values, color=_col, lw=2.2, zorder=2)
    ax5.text(1.15, float(_s.loc[1]), _team, size=11, color=_col, weight="bold",
             ha="left", va="center", zorder=3, bbox=PANEL_BBOX)
ax5.axvline(18.75, color=HAIR, lw=1.2, zorder=1)
for _team, _col in ((HOME, BONE), (AWAY, SIGNAL)):
    _v = w1.loc[_team, "epa_per_play"]
    ax5.scatter([20.4], [_v], s=90, facecolors="none", edgecolors=_col,
                linewidths=2, zorder=4)
ax5.text(20.4, 0.60, "2026 W1", size=9.5, color=MIST, ha="center", va="top",
         zorder=3)
_b18, _b18r = FORM_W18[HOME]
_d18, _d18r = FORM_W18[AWAY]
_b_tr = ROLL[HOME].loc[18] - ROLL[HOME].loc[14]
_d_tr = ROLL[AWAY].loc[18] - ROLL[AWAY].loc[14]
_read = []
if _d_tr < -0.03:
    _read.append("Detroit faded late.")
elif _d_tr > 0.03:
    _read.append("Detroit surged late.")
if _b_tr < -0.03:
    _read.append("Buffalo faded late.")
elif _b_tr > 0.03:
    _read.append("Buffalo surged late.")
_take = f"W18 4-wk: {HOME} #{_b18r} \u00b7 {AWAY} #{_d18r}."
if _read:
    _take += " " + " ".join(_read)
fig.text(58 / W, 1 - 1098 / H, _take,
         size=12.5, color=BONE, style="italic", va="top", ha="left")

# ---- 6. situational edges (right): 2x2 small multiples, hand-placed.
# Per mini: line 1 = label + BUF value (right); line 2 = percentile track
# with diamonds + DET value (right). Diamonds split vertically when close.
card(546, 940, 494, 184)
ptitle(564, 940, "SITUATIONAL EDGES", "2025 percentile vs all 32 \u00b7 right = better",
       tsize=17, ssize=12.5)
_sit = [
    ("EARLY DOWNS",   early_pct[HOME], early_pct[AWAY], False),
    ("LATE DOWNS",    late_pct[HOME],  late_pct[AWAY],  False),
    ("LATE AND CLOSE", lc_pct[HOME],   lc_pct[AWAY],    True),
    ("BALL SECURITY", give_pct[HOME],  give_pct[AWAY],  False),
]
for _i, (_lab, _bpc, _dpc, _hl) in enumerate(_sit):
    _col, _row = _i % 2, _i // 2
    _x0 = 564 + _col * 229
    _y0 = 1020 + _row * 38
    fig.text((_x0 + 2) / W, 1 - _y0 / H, _lab, fontproperties=COND_BOLD,
             size=10, color=MIST, va="top", ha="left")
    if _hl:
        fig.patches.extend([patches.Rectangle(
            ((_x0 + 2) / W, 1 - (_y0 + 22.5) / H), 68 / W, 2.5 / H,
            facecolor=SIGNAL, transform=fig.transFigure, figure=fig, zorder=3)])
    fig.text((_x0 + 227) / W, 1 - (_y0 + 9) / H,
             f"{HOME} {ordinal(_bpc)}", size=9.5, color=BONE, weight="bold",
             va="center", ha="right")
    _tx0, _tx1, _ty = _x0 + 2, _x0 + 150, _y0 + 28
    fig.patches.extend([patches.Rectangle(
        (_tx0 / W, 1 - (_ty + 2) / H), (_tx1 - _tx0) / W, 4 / H,
        facecolor=MIST, alpha=0.35, transform=fig.transFigure, figure=fig,
        zorder=1)])
    _tmx = (_tx0 + _tx1) / 2
    fig.patches.extend([patches.Rectangle(
        (_tmx / W, 1 - (_ty + 4) / H), 1.5 / W, 8 / H,
        facecolor=MIST, transform=fig.transFigure, figure=fig, zorder=1)])
    _bpx = _tx0 + _bpc / 100 * (_tx1 - _tx0)
    _dpx = _tx0 + _dpc / 100 * (_tx1 - _tx0)
    _by, _dy = _ty, _ty
    if abs(_bpx - _dpx) < 18:       # diamonds would touch: split vertically
        _by, _dy = _ty - 9, _ty + 9
    fig.text(_bpx / W, 1 - _by / H, "\u25c6", size=11, color=BONE,
             va="center", ha="center")
    fig.text(_dpx / W, 1 - _dy / H, "\u25c6", size=11, color=SIGNAL,
             va="center", ha="center")
    fig.text((_x0 + 227) / W, 1 - (_y0 + 28) / H,
             f"{AWAY} {ordinal(_dpc)}", size=9.5, color=SIGNAL, weight="bold",
             va="center", ha="right")
fig.text(1022 / W, 1 - 1100 / H, "Detroit collapses late in close games.",
         size=11, color=FOG, style="italic", va="top", ha="right")

# ================================================================ 7. UNIT MATCHUPS (1132-1256)
card(40, 1132, 1000, 124)
fig.text(58 / W, 1 - 1148 / H, tracked("UNIT MATCHUPS"),
         fontproperties=COND_BOLD, size=14, color=BONE, va="top", ha="left")
fig.text(58 / W, 1 - 1178 / H, "2025 EPA/play \u00b7 unit vs unit for tonight \u00b7 tint = winner",
         size=11, color=MIST, va="top", ha="left")
fig.text(1022 / W, 1 - 1148 / H, "biggest gap: Buffalo's pass game wins big.",
         size=11.5, color=SIGNAL, style="italic", weight="bold",
         va="top", ha="right")

cells = [
    ("BUF PASS OFF", bu["pass_off_epa"], "DET PASS DEF", du["pass_def_epa"]),
    ("BUF RUSH OFF", bu["rush_off_epa"], "DET RUSH DEF", du["rush_def_epa"]),
    ("DET PASS OFF", du["pass_off_epa"], "BUF PASS DEF", bu["pass_def_epa"]),
    ("DET RUSH OFF", du["rush_off_epa"], "BUF RUSH DEF", bu["rush_def_epa"]),
]
gaps = [abs(o - dv) for (_, o, _, dv) in cells]
star = int(np.argmax(gaps))
winners = ["BUF" if o > dv else "DET" for (_, o, _, dv) in cells]
cw, chh = 233, 52
for i, (ol, ov, dl, dv) in enumerate(cells):
    cx = 58 + i * (cw + 10)
    cy = 1198
    tint = BONE if winners[i] == "BUF" else SIGNAL
    cell = patches.FancyBboxPatch(
        (cx / W, 1 - (cy + chh) / H), cw / W, chh / H,
        boxstyle=f"round,pad=0.012,rounding_size={10/1080}",
        facecolor=tint, alpha=0.10,
        edgecolor=SIGNAL if i == star else HAIR, lw=2.0 if i == star else 1.0,
        transform=fig.transFigure, figure=fig, zorder=2)
    fig.add_artist(cell)
    lcol = BONE if "BUF" in ol else SIGNAL
    rcol = BONE if "BUF" in dl else SIGNAL
    fig.text((cx + cw / 2) / W, 1 - (cy + 2) / H, f"{ol} vs {dl}",
             fontproperties=COND_BOLD, size=7.5, color=MIST, va="top", ha="center")
    fig.text((cx + 14) / W, 1 - (cy + 18) / H, fmt_epa(ov),
             fontproperties=COND_XBOLD, size=17, color=lcol, va="top", ha="left")
    fig.text((cx + cw - 14) / W, 1 - (cy + 18) / H, fmt_epa(dv),
             fontproperties=COND_XBOLD, size=17, color=rcol, va="top", ha="right")

# ================================================================ 8. FOOTER (1264-1350)
# Fair-line number line (left), brand + attribution (right), honesty
# disclaimer pinned above the canvas edge with real margin.
card(40, 1264, 1000, 86)
X0, X1, Y = 58, 460, 1298
fig.patches.extend([patches.Rectangle(
    (X0 / W, 1 - (Y + 2) / H), (X1 - X0) / W, 4 / H, facecolor=MIST, alpha=0.35,
    transform=fig.transFigure, figure=fig, zorder=3)])
mk, md = args.market, -FAIR_MARGIN
gx0 = X0 + (md + 8.2) / 5.4 * (X1 - X0)
gx1 = X0 + (mk + 8.2) / 5.4 * (X1 - X0)
fig.patches.extend([patches.Rectangle(
    (gx0 / W, 1 - (Y - 4) / H), (gx1 - gx0) / W, 12 / H, facecolor=SIGNAL,
    alpha=0.25, transform=fig.transFigure, figure=fig, zorder=3)])
for t, tl in ((-8, "-8"), (-3, "-3")):
    tx = X0 + (t + 8.2) / 5.4 * (X1 - X0)
    fig.text(tx / W, 1 - (Y + 6) / H, tl, size=10, color=MIST,
             ha="center", va="top")
mx = X0 + (mk + 8.2) / 5.4 * (X1 - X0)
dx_ = X0 + (md + 8.2) / 5.4 * (X1 - X0)
fig.text(mx / W, 1 - (Y - 6) / H, f"MARKET {mk:+g}", size=12.5, color=FOG,
         weight="bold", ha="center", va="bottom")
fig.text(dx_ / W, 1 - (Y + 6) / H, f"MODEL {HOME} {md:+.1f}", size=12.5,
         color=SIGNAL, weight="bold", ha="center", va="top")
chip = patches.FancyBboxPatch(
    (478 / W, 1 - 1312 / H), 84 / W, 28 / H,
    boxstyle=f"round,pad=0.012,rounding_size={10/1080}",
    facecolor=PANEL, edgecolor=SIGNAL, lw=1.2,
    transform=fig.transFigure, figure=fig, zorder=3)
fig.add_artist(chip)
fig.text(520 / W, 1 - 1298 / H, f"{GAP:+.1f}", size=13, color=SIGNAL,
         weight="bold", ha="center", va="center")
fig.text(58 / W, 1 - 1326 / H, "Simple illustration, not the GSE engine.",
         size=10.5, color=MIST, va="top", ha="left", style="italic")

fig.text(1022 / W, 1 - 1272 / H, tracked("WE DETECT. YOU DECIDE."),
         fontproperties=COND_BOLD, size=15, color=BONE, va="top", ha="right")
fig.text(1022 / W, 1 - 1304 / H, "@GalaxySportsHQ", size=11, color=FOG,
         va="top", ha="right")
fig.text(1022 / W, 1 - 1324 / H, "DATA: NFLVERSE (CC-BY 4.0) \u00b7 FTN CHARTING (CC-BY-SA 4.0)",
         family="DejaVu Sans Mono", size=9, color=MIST, va="top", ha="right")

plt.savefig(os.path.join(HERE, args.out), dpi=100)
print("wrote", os.path.join(HERE, args.out), f"fair_margin={FAIR_MARGIN:+.1f} gap={GAP:+.1f}")
