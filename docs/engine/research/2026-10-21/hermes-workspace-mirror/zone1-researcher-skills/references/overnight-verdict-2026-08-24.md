## Verdict 2026-08-24 — Falsify on 341 real YACoe rows (2022-2025)
VERDICT: MULTIPLICITY KILLED (e-value 0.000); leakage/shuffle/split PASS; overall = KILLED.
ROW SOURCE: data/nflverse/ngs_receiving_2021_2025_harness_rows.json (7351 total; 341 falsifiable after season-pair + targets>=20 filter).
SPLITS: val-2024 n=107 r=0.4025; hold-2025 n=84 r=0.4254 (from yacoe_real_backtest_results.json). Correlation stable positive — NOT a betting edge without multiplicity growth.
LANE A STATUS: preregisters preserved (PRE-2 box-rate→rushYards, PRE-3 missed-tackle→recTD, PRE-4 blitz-rate→sacks, PRE-5 comp-pct-allowed→passAttempts, PRE-6 pra→pressures, PRE-7 ttlos→rushAttempts, PRE-8 sticks→completions).
COMMIT SHA: ddf415fa (hermes/w2-audit-settlement pushed to origin).
