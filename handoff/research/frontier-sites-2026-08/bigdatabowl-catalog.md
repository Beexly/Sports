# Big Data Bowl corpus — catalog + acquisition plan (2026-08, orchestrator)

The BDB competition archive is the largest free repository of NFL tracking
analytics in existence. Every year's Kaggle submissions (public notebooks)
+ winner repos = methodology gold we haven't touched.

## What exists (verified via GitHub API, 2026-08-26)

- Homepage: github.com/nfl-football-ops/Big-Data-Bowl (152★) — data schema,
  FAQs, R tutorial for Next Gen Stats tracking data. README fetched to
  data/bigdatabowl/bdb-homepage-README.md (master branch, not main).
- 2024 winners (tackle probability): mpchang/uncovering-missed-tackle-
  opportunities (14★) — directly extends our missed-tackle bind.
- 2023 winners (linemen): peterlmajors/Offensive-Linemen-Immediate-Zone,
  thomas-ramsay/NFL-Data-Bowl-2023-Big-Time-Pass-Rush — pass-rush win-rate
  metrics from tracking; feeds our pressure-rate binds with real
  tracking-derived definitions.
- 2022: punt-return pathing (ritchi12); 2021: oh_snap (asmae-toumi);
  2020 winning-solution reproductions: juancamilocampos/nfl-big-data-bowl-2020.
- 2026 silver medal trajectory prediction: YZY0108/nfl-player-trajectory-prediction.

## Constraint (honest)

BDB tracking CSVs themselves are Kaggle-gated (need account). What IS
freely grabbable: every submission's CODE + derived-metric definitions +
their published accuracy claims. We can adopt metric DEFINITIONS now and
bind real data later if tracking access is ever arranged.

## Build path

1. Clone top 4-5 repos into data/bigdatabowl/ as reference code.
2. Extract each submission's core metric definition → one-line spec in
   this doc (tackle prob model form, pass-rush win rate def, xYards trees).
3. Map each to a covariate-bus slot or falsifier candidate:
   - tackle probability → missedTackleRate bind upgrade
   - pass-rush win rate → pressure-rate bind replacement (tracking-grade)
   - xYards rush model → rush-over-expected v2 cross-check
4. Only after definitions are catalogued do we consider asking the user
   for a Kaggle account to pull actual tracking CSVs.

Status: catalog only — nothing claimed as tested. Next session can clone
and mine at leisure.
