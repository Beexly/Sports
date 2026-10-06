#!/usr/bin/env python3
"""
GSE Edge Sheet generator — Galaxy Sports Edge (@GalaxySportsHQ).

Builds a 1080x1350 matchup data sheet PNG from REAL computed nflverse
team metrics. No mock data: every team number is read from the CSVs in
~/workspace/gse-research/nfl-2026/ (computed by compute_team_metrics.py).
The only non-CSV numbers are:
  - brand constants (FIELD system),
  - game metadata passed as CLI args (teams, date, venue, market line),
  - two documented modeling assumptions (PLAYS_PER_GAME, HOME_FIELD)
    used only for the illustrative fair-line box.

Usage:
  .venv/bin/python build_edge_sheet.py --home BUF --away DET \
      --home-name "BILLS" --away-name "LIONS" \
      --week "WEEK 2" --date "Thursday, September 17, 2026" \
      --venue "New Highmark Stadium" --time "7:15 PM CT" \
      --market-line -5.5 \
      --csv2025 ../nfl-2026/team_metrics_2025.csv \
      --csv2026 ../nfl-2026/team_metrics_2026.csv \
      --out bills-lions-edge-sheet.png

Public copy rules enforced in this script: no em dashes, no
"sports intelligence", human voice, no hashtag walls.
"""

import argparse
import csv
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle

# ---------------------------------------------------------------- brand
# GSE FIELD system. These are the only hardcoded visual constants.
GROUND = "#08090C"   # page background
PANEL  = "#12141A"   # panel background
PLINE  = "#23262E"   # panel border / dividers
BONE   = "#EDE8E0"   # primary text, BUF bars
FOG    = "#C4BFB6"   # secondary text
MIST   = "#8F8A82"   # DET bars, tertiary text
SIGNAL = "#FF4D2E"   # action / accents only

# ------------------------------------------------- modeling assumptions
# Documented, not data. Used ONLY for the illustrative fair-line box.
PLAYS_PER_GAME = 63    # typical combined offensive plays per team per game
HOME_FIELD     = 2.0   # standard home-field points assumption

W, H = 1080, 1350
DPI = 100


def load_teams(path):
    teams = {}
    with open(path, newline="") as fh:
        for row in csv.DictReader(fh):
            teams[row["team"]] = {k: (float(v) if v not in ("", None) else float("nan"))
                                  for k, v in row.items() if k != "team"}
            teams[row["team"]]["_raw"] = row
    return teams


def fmt_epa(x):
    return ("+" if x >= 0 else "") + f"{x:.2f}"


def luck_tag(diff, kind):
    """kind: 'giveaway' (lower is luckier) or 'takeaway' (higher is luckier)."""
    if abs(diff) < 1.5:
        return "NEUTRAL", FOG
    if kind == "giveaway":
        return ("LUCKY", SIGNAL) if diff < 0 else ("UNLUCKY", SIGNAL)
    return ("LUCKY", SIGNAL) if diff > 0 else ("UNLUCKY", SIGNAL)


def panel_box(fig, x0, y0, x1, y1):
    p = FancyBboxPatch((x0, y0), x1 - x0, y1 - y0,
                       boxstyle="round,pad=0.012,rounding_size=0.012",
                       facecolor=PANEL, edgecolor=PLINE, linewidth=1.5,
                       transform=fig.transFigure, figure=fig, zorder=1)
    fig.patches.append(p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", default="BUF")
    ap.add_argument("--away", default="DET")
    ap.add_argument("--home-name", default="BILLS")
    ap.add_argument("--away-name", default="LIONS")
    ap.add_argument("--week", default="WEEK 2")
    ap.add_argument("--date", default="Thursday, September 17, 2026")
    ap.add_argument("--venue", default="New Highmark Stadium")
    ap.add_argument("--time", default="7:15 PM CT")
    ap.add_argument("--market-line", type=float, default=-5.5,
                    help="Market spread from the home team's perspective (negative = home favored).")
    ap.add_argument("--csv2025", default="../nfl-2026/team_metrics_2025.csv")
    ap.add_argument("--csv2026", default="../nfl-2026/team_metrics_2026.csv")
    ap.add_argument("--out", default="edge-sheet.png")
    a = ap.parse_args()

    for p in (a.csv2025, a.csv2026):
        if not os.path.exists(p):
            sys.exit(f"missing input CSV: {p}")

    t25 = load_teams(a.csv2025)
    t26 = load_teams(a.csv2026)
    home, away = t25[a.home], t25[a.away]
    home26, away26 = t26[a.home], t26[a.away]

    # ---- derived numbers (all from CSVs) ----
    eff_metrics = [
        ("Off EPA / play", "epa_per_play"),
        ("Dropback EPA", "epa_per_dropback"),
        ("Rush EPA", "epa_per_rush"),
        ("Def EPA / play", "def_epa_per_play"),
    ]
    net_home = home["epa_per_play"] + home["def_epa_per_play"]
    net_away = away["epa_per_play"] + away["def_epa_per_play"]
    fair_margin = (net_home - net_away) * PLAYS_PER_GAME + HOME_FIELD
    fair_line = -round(fair_margin)  # from home perspective, negative = favored

    # turnover luck rows: (label, actual, expected)
    def luck_rows(t):
        return [
            ("INTs thrown", t["int_thrown"], t["int_expected"],
             t["int_diff_actual_minus_expected"], "giveaway"),
            ("Fumbles lost", t["fumbles_lost"], t["fumble_lost_expected"],
             t["fumble_lost_diff_actual_minus_expected"], "giveaway"),
            ("INTs taken", t["takeaways_int"], t["takeaways_int_expected"],
             t["takeaways_int_diff"], "takeaway"),
        ]

    fig = plt.figure(figsize=(W / DPI, H / DPI), dpi=DPI)
    fig.patch.set_facecolor(GROUND)

    # ============================================================ header
    fig.text(0.06, 0.955, "GSE EDGE SHEET", color=FOG, fontsize=20,
             weight="bold", va="center", ha="left",
             family="DejaVu Sans")
    fig.text(0.94, 0.955, a.week + "  \u00b7  2026", color=SIGNAL, fontsize=20,
             weight="bold", va="center", ha="right")
    fig.text(0.06, 0.905, f"{a.home_name} vs {a.away_name}", color=BONE,
             fontsize=62, weight="bold", va="center", ha="left")
    fig.text(0.06, 0.862, f"{a.date} \u00b7 {a.venue} \u00b7 {a.time}",
             color=FOG, fontsize=19, va="center", ha="left")
    fig.patches.append(Rectangle((0.06, 0.84), 0.88, 0.004, facecolor=SIGNAL,
                                 transform=fig.transFigure, figure=fig, zorder=2))

    # ================================================== panel 1: efficiency
    panel_box(fig, 0.04, 0.50, 0.96, 0.82)
    fig.text(0.07, 0.79, "TRUE EFFICIENCY", color=BONE, fontsize=24,
             weight="bold", va="center")
    fig.text(0.07, 0.767,
             "2025 full season \u00b7 garbage time and kneels removed \u00b7 via nflverse "
             "\u00b7 defense shown positive = good",
             color=FOG, fontsize=14, va="center")
    fig.text(0.07, 0.747,
             f"Week 1 2026 (one game each): "
             f"{a.home} {fmt_epa(home26['epa_per_play'])} EPA/play \u00b7 "
             f"{a.away} {fmt_epa(away26['epa_per_play'])} EPA/play "
             "\u00b7 small sample, not a rating.",
             color=MIST, fontsize=13, va="center")

    # legend
    fig.text(0.80, 0.79, "\u25a0", color=BONE, fontsize=18, va="center")
    fig.text(0.825, 0.79, a.home, color=FOG, fontsize=15, va="center")
    fig.text(0.875, 0.79, "\u25a0", color=MIST, fontsize=18, va="center")
    fig.text(0.90, 0.79, a.away, color=FOG, fontsize=15, va="center")

    bar_x0, bar_x1 = 0.32, 0.93
    lo, hi = -0.10, 0.22
    def xpos(v):
        return bar_x0 + (v - lo) / (hi - lo) * (bar_x1 - bar_x0)
    zero_x = xpos(0.0)
    # zero line
    fig.patches.append(Rectangle((zero_x, 0.545), 0.0018, 0.175, facecolor=PLINE,
                                 transform=fig.transFigure, figure=fig, zorder=2))
    group_ys = [0.705, 0.655, 0.605, 0.555]
    for (label, key), gy in zip(eff_metrics, group_ys):
        fig.text(0.07, gy, label, color=FOG, fontsize=16, va="center")
        for team, tval, color, dy in ((a.home, home[key], BONE, 0.011),
                                      (a.away, away[key], MIST, -0.011)):
            y = gy + dy
            x0b, x1b = (zero_x, xpos(tval)) if tval >= 0 else (xpos(tval), zero_x)
            fig.patches.append(FancyBboxPatch(
                (x0b, y - 0.0085), x1b - x0b, 0.017,
                boxstyle="round,pad=0.001,rounding_size=0.004",
                facecolor=color, edgecolor="none",
                transform=fig.transFigure, figure=fig, zorder=3))
            lab_x = x1b + 0.012 if tval >= 0 else x0b - 0.012
            fig.text(lab_x, y, fmt_epa(tval), color=color, fontsize=14,
                     va="center", ha="left" if tval >= 0 else "right")

    # ================================================== panel 2: luck layer
    panel_box(fig, 0.04, 0.24, 0.96, 0.47)
    fig.text(0.07, 0.442, "THE LUCK LAYER", color=BONE, fontsize=24,
             weight="bold", va="center")
    fig.text(0.07, 0.42,
             "Turnover luck, 2025 \u00b7 actual vs expected \u00b7 luck always regresses",
             color=FOG, fontsize=14, va="center")

    for col_x, tag, t in ((0.07, a.home, home), (0.53, a.away, away)):
        team_label = a.home_name if tag == a.home else a.away_name
        fig.text(col_x, 0.388, team_label, color=BONE, fontsize=21,
                 weight="bold", va="center")
        ry = 0.356
        for label, actual, expected, diff, kind in luck_rows(t):
            tag_txt, tag_col = luck_tag(diff, kind)
            fig.text(col_x, ry, label, color=FOG, fontsize=15, va="center")
            fig.text(col_x + 0.175, ry,
                     f"{actual:.0f} / {expected:.1f} exp", color=MIST,
                     fontsize=14, va="center")
            fig.text(col_x + 0.345, ry, tag_txt, color=tag_col,
                     fontsize=14, weight="bold", va="center")
            ry -= 0.038


    # ================================================== panel 3: the read
    panel_box(fig, 0.04, 0.058, 0.96, 0.215)
    fig.text(0.07, 0.19, "THE READ", color=BONE, fontsize=24,
             weight="bold", va="center")

    fig.text(0.07, 0.158, "Illustrative fair line", color=FOG, fontsize=15, va="center")
    fig.text(0.07, 0.112, f"{a.home} {fair_line}", color=BONE, fontsize=44,
             weight="bold", va="center")
    fig.text(0.52, 0.158, "Market", color=FOG, fontsize=15, va="center")
    mkt = f"{a.home} {a.market_line:.1f}".replace(".0", "")
    fig.text(0.52, 0.112, mkt, color=FOG, fontsize=44, weight="bold", va="center")

    takeaway_l1 = (
        f"On 2025 efficiency alone, the fair price is about "
        f"{abs(fair_line - a.market_line):.1f} points steeper than the market."
    )
    takeaway_l2 = ("Tonight's variables: a deafening new building, "
                   "Detroit's banged-up line. Illustrative, not the GSE engine.")
    fig.text(0.07, 0.074, takeaway_l1, color=BONE, fontsize=15, va="center")
    fig.text(0.07, 0.056, takeaway_l2, color=MIST, fontsize=12, va="center")

    # ============================================================ footer
    fig.text(0.06, 0.028, "WE DETECT. YOU DECIDE.", color=BONE, fontsize=16,
             weight="bold", va="center")
    fig.text(0.94, 0.028, "@GalaxySportsHQ", color=FOG, fontsize=16, va="center",
             ha="right")
    fig.text(0.50, 0.010,
             "Data: nflverse (CC-BY 4.0) \u00b7 FTN charting via nflverse (CC-BY-SA 4.0)",
             color=MIST, fontsize=11, va="center", ha="center")

    plt.savefig(a.out, facecolor=GROUND, bbox_inches=None)
    print(f"wrote {a.out} ({W}x{H})")
    print(f"fair line calc: net {a.home} {net_home:+.3f} vs {a.away} {net_away:+.3f} "
          f"-> margin {fair_margin:.1f} -> {a.home} {fair_line}")


if __name__ == "__main__":
    main()
