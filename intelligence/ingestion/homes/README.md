# Ingestion homes — Wiring Surge Tranche A (2026-10-15)

Branch `motif/wiring-surge-a-2026-10-15`. Homing gives a census row a real,
stamped engine artifact. **Homing is not wiring into production callers and is
not promotion.** Every row's census status is preserved verbatim inside its
artifact; every row's emission stays ZERO_OBJECT.

## Totals

- Ledger rows: 279
- Homed before this tranche: 116 · **after: 127** · NO HOME YET: 152
- Rows homed here: 11 (the next ten buildable NO-HOME-YET rows in the ledger's
  ranked queue order — ranks 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, with C-224/C-075
  excluded as parallel lanes — plus C-096, homed by its verification probe)

## Homes created

| census | home kind | artifact |
|---|---|---|
| C-258 Lopez state-space market-margin model | calibration substrate | `substrate/C-258-lopez-state-space.json` |
| C-263 CEPT four-expert ensemble | calibration substrate | `substrate/C-263-cept-ensemble.json` |
| C-100 Laya / Jev gate evaluation | calibration substrate | `substrate/C-100-laya-jev-gate-evaluation.json` |
| C-096 Kats time-series suite | calibration substrate (verification) | `substrate/C-096-kats-suite-verification.json` |
| C-127 Signals registry | shadow ledger | `shadow/signals_registry_ledger.jsonl` (index + 47 registered signals) |
| C-118 StatKing metric system | shadow ledger | `shadow/statking_shadow_ledger.jsonl` |
| C-101 QB pressure-to-sack residual | shadow ledger | `shadow/qb_pressure_shadow_ledger.jsonl` |
| C-074 Player signals table | shadow ledger (schema + empty-table status) | `shadow/player_signals_shadow_ledger.jsonl` |
| C-009 Line-movement (ESPN path) | shadow ledger (schema + unlanded-series status) | `shadow/line_movement_shadow_ledger.jsonl` |
| C-125 Pregame context bridge | stamped reasoning template | `templates/C-125-pregame-context-bridge.md` |
| C-112 Analyst consensus board + scorecard | stamped reasoning template | `templates/C-112-analyst-consensus-board.md` |

## Probe findings (2026-10-15, against Beexly/Sports main `9a989b3`)

- **C-127 registry read**: 47 registered signals enumerated. Wired verdicts:
  no 37 / partial 10 / full 0. Activation: ACTIVE 41 / BLOCKED_MISSING_SOURCE 5 /
  SHADOW_ONLY 1. Producers: LOCAL_CODE 32 / STUB_OR_CONSTANT 15. Weights:
  prior_no_evidence 43 / numeric_no_evidence 4 — no signal carries
  measured-evidence weighting. Tested: no 38 / partial 9. The registry
  namespace is disjoint from the census namespace (0 exact matches);
  **census rows re-homed by this read: 0.**
- **C-118 StatKing probe**: 90/90 metrics `active_calculated`, all
  `snapshot_formula` over (open_snapshot, fixture_fallback) lineage; manifest +
  integrity stamped 2026-06-13; its own integrity record: "not safe to market
  as fully live-data product." Product surface, not engine-wired.
  **Census rows re-homed by this probe: 0.**
- **C-125 unlock read**: `calibration-holdout-2025.md` read in full. Measured
  holdout skill confirmed (Brier skill +0.026190, CI excludes zero, ECE
  0.051868, n=285); NOT PUBLISHABLE — duplicate of live `historical_strength`
  (f2 = 1 → family DARK) and `probabilityClaimsAllowed = false`.
- **C-096 Kats verification**: 4 of 9 ADOPT sub-items landed as code in
  `gse-ml-service` (BOCPD-lite, CUSUM, vendored Prophet + sports preset,
  vendored Simulator), all unwired (no endpoint in `app/main.py`); 5 not
  landed (TSFeatures, StatSig, backtesters, VAR, HarmonicRegression).
- Incidental probe results: PR #1018 (C-101's blocker) is **closed, never
  merged**; the C-009 n=2,397 series exists nowhere in this repo (code search
  "2397" = 0); no `PlayerSignal` model exists in the repo (C-074).

## Ledger twin

`intelligence/ingestion/ingestion-ledger-2026-10-15.jsonl` updated in place:
only the 11 rows above changed — `home` for all 11, plus probe-established
stamp/reasoning fields for C-127, C-118, C-125, C-096. No name, status-bearing,
or emission field changed anywhere. Validation: `validation-2026-10-15.json`
(all checks pass; 59 artifact records parsed; zero emission keys).
