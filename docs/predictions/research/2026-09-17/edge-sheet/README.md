# GSE Edge Sheet

A reproducible, data-driven pregame graphic for @GalaxySportsHQ: one game,
three panels, zero fabrication. Every number is computed from public
play-by-play data and traceable back to its source.

## What it is

A 1080x1350 portrait PNG ("GSE EDGE SHEET") built in FIELD colors
(ground/panel/bone/fog/mist/signal). Three sections:

1. **TRUE EFFICIENCY** — 2025 full-season EPA/play splits (offense, dropback,
   rush, defense shown positive = good), garbage time and kneels removed.
2. **THE LUCK LAYER** — 2025 actual-vs-expected turnovers (INTs thrown,
   fumbles lost, INTs taken) with LUCKY / NEUTRAL / UNLUCKY tags.
3. **THE READ** — an explicitly illustrative fair-line comparison vs the
   market line, with the formula printed on the sheet.

Footer credits nflverse (CC-BY 4.0) and FTN charting (CC-BY-SA 4.0).

## Regenerate

```bash
cd ~/workspace/gse-research/edge-sheet
./.venv/bin/python build_edge_sheet.py --out bills-lions-edge-sheet.png
```

Dependencies live in `.venv` (matplotlib 3.11.2, pandas 3.0.5). The script
reads `../nfl-2026/team_metrics_2025.csv` and `../nfl-2026/team_metrics_2026.csv`
(see `../nfl-2026/COMPUTATION_NOTES.md` for how those were built).

All game metadata (teams, date, venue, kickoff, market line) is passed as
CLI flags; run `--help` for the full list. Nothing about the matchup is
hardcoded.

## Data definitions

- **EPA/play**: expected points added per play, nflverse/nflfastR output.
  Regular season only, pass/run play types, kneels and spikes excluded,
  fourth-quarter plays with possession-team win probability above 0.95 or
  below 0.05 excluded (garbage time). Overtime retained.
- **Dropback EPA**: EPA on pass attempts and scrambles. **Rush EPA**: EPA on
  designed rushes.
- **Expected turnovers**: interception probability from nflfastR's `cp`/`ep`
  family outputs (expected INTs); expected fumbles lost from fumble rates
  (see COMPUTATION_NOTES.md). FTN charting interception-worthy throws for
  2025 are included in the CSVs.
- **Luck tags**: |actual - expected| below 1.5 is NEUTRAL; above favors
  LUCKY (takeaways) or UNLUCKY (giveaways). Recovery is treated as noise,
  per the literature (year-to-year fumble-recovery correlation ~0.00).

## Model assumptions (printed on the sheet)

The illustrative fair line is:

```
fair margin = (home net EPA/play - away net EPA/play) x 63 + 2.0 home field
```

Hardcoded assumptions: **63 plays per game**, **2.0 points home field**,
**2025 full-season numbers**. This is a simple illustration, not the GSE
engine, and the sheet says so in print.

## Limitations

- No opponent adjustment. 2025 numbers are raw EPA, not DVOA-style
  opponent-corrected.
- Week 1 2026 figures shown are a one-game check, explicitly labeled "small
  sample, not a rating."
- Pressure rate is unavailable (FTN charting has no hurry/pressure columns);
  QB-hit and sack rates in the CSVs are lower-bound proxies.
- FTN 2026 interception-worthy data is not yet published.
- No weather, injury, or rest inputs. The takeaway line ("Tonight's
  variables...") is human context, not model output.

## Design rules

FIELD palette only. No gradients, no neon, no glow effects, no em dashes,
no hashtag walls, no "sports intelligence" phrasing. The visual hierarchy:
our number (bone) beats the market number (fog). LUCKY/UNLUCKY in signal
red, NEUTRAL in bone.

---

## V2 Rebuild (2026-09-17)

### What changed
Complete visual rebuild as a metric-dense 1080×1350 graphic. Eight panels:
1. Efficiency map (32-team EPA/play scatter)
2. 10-metric percentile faceoff (sorted by BUF/DET split)
3. Pass-game shapes (dropback EPA KDE)
4. Luck ledger (actual vs expected turnovers)
5. Form lines (4-week rolling 2025 + isolated 2026 W1 dots)
6. Situational edges (2×2 small multiples: early/late/late-and-close/ball security)
7. Unit matchups (offense vs opposing defense)
8. THE READ footer (market vs model)

Drive anatomy scatter was cut per the brief's rotation rule ("if two panels say the same thing, cut the weaker" — hero and drive both said "good team"). Situational multiples replaced it; the DET late-and-close collapse (6th percentile) was the sharper story.

### Methodology
- **Fair line:** `net_team = offense EPA/play + defense EPA/play`; `fair margin = (BUF net − DET net) × 63 + 2.0` (home field). Illustrative only, not the GSE engine.
- **Percentiles:** `pct_rank` descending (100 = best) vs all 32 teams, 2025 season.
- **Turnover luck:** Actual vs expected INTs/fumbles; expected from nflverse model; converted at ~4.5 points per turnover.
- **Form lines:** 4-week rolling offensive EPA/play, weeks 1–18 2025, bye weeks as gaps. 2026 W1 shown as isolated hollow dots, labeled "one game each, not a rating."
- **KDE:** Gaussian KDE on 2025 dropback EPA (539 BUF, 562 DET plays); tail share = P(EPA ≥ 1.0).

### Run
```bash
./.venv-v2/bin/python build_edge_sheet_v2.py [--market -5.5] [--out bills-lions-edge-sheet-v2.png]
```

### Sources & licenses
- nflverse data: CC-BY 4.0
- FTN charting via nflverse: CC-BY-SA 4.0
- Fonts: Noto Sans Display Condensed (vendored, OFL)

### Limitations
- No opponent adjustment; raw EPA, not DVOA-style.
- 2026 Week 1 is one game per team — shown as isolated dots, never a trend or rating.
- No 2026 weekly trends; no 2026 interception-worthy data (not published).
- Situational panel uses available splits (early/late/late-and-close/ball security); red-zone and pressure splits not in grounded data, not fabricated.
- No weather, injury, or rest inputs.
