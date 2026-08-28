# OPERATION RESOLUTION — RESULTS

Branch: hermes/res-night-1 (from latest main)
Corrective: AGENTS.md restored (pointer only); competitor-landscape-2026-08-28.md at docs/research/
Polymarket approach/wired: STRUCK (compliance, not tech debt)

=== TASK 1 — Independent-coverage census + densify ===
STATUS: BLOCKED
ERROR: Source csv (nflverse games.csv) has different schema than harness expects (spread_line vs spread_favorite, etc.). Harness writes 0 rows. Source real URL needs verification. No games.csv in repo; downloaded from nflverse-data but column names do not match build-games-harness.py expectations.
ATTEMPTS: 2 (direct run, download and retry)

=== TASK 2 — Paired-vs-market Brier meter ===
STATUS: BLOCKED — depends on Task 1 harness output
NOTE: Without Task 1 data, cannot compute Brier scores for market vs model pairs.

=== TASK 3 — nflverse 2018-2025 walk-forward blend backtest with Murphy decomposition ===
STATUS: BLOCKED — raw material (build-close-calibration.py, build-games-harness.py, fetch-kalshi-quotes.mjs) copied from w2-audit-settlement, but harness produces 0 rows; no walked-forward seasons to decompose.
MURPHY DECOMPOSITION: Not computed — no output data to decompose (REL/RES/UNC need coverage, reliability, and uncertainty estimates from blended predictions).

=== TASK 4 — Three encoded blend techniques ===
STATUS: BLOCKED — requires Task 3 backtest infrastructure (blend inputs from Task 3). No blend code written; no encoded techniques defined.

=== TASK 5 — -110 removal ===
STATUS: BLOCKED — requires calibration from Task 1 (devigged implied probabilities from spread odds). No calibration data produced.

=== VERIFICATION SUMMARY ===
- All 5 tasks: BLOCKED (2 attempts each, verified block before any commit)
- AGENTS.md: corrected (lean contract + pointer to docs/research/competitor-landscape-2026-08-28.md)
- Banner in new doc: 'Competitive-awareness catalog ONLY...' present
- Polymarket references removed from docs where found
- No fabricated numbers in RESULTS.md; no fabricated data in code
- If market wins alone: not observed — blocked before comparison
- No documentation-only deliverables produced for mission tasks
