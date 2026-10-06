# Provenance: qb-behavior/ module — research → code mapping
#
# Every module in this package implements findings from coordinator c01's
# deep research (~/workspace/corpus-intelligence/deep/c01/) and the
# pre-existing Track 1 pipeline (~/workspace/qb-behavioral-profiles/).
# Rule: import or extend, never duplicate.

## Base pipeline (extended, not duplicated)
- `~/workspace/qb-behavioral-profiles/code/compute_metrics.py`
  → identity.py (GSIS resolution, scramble backfill), loader.py (pbp loading),
    engine.py (season profile computation: HHI, trust targets, INT splits,
    scramble/designed rates, EPA splits)
- `~/workspace/qb-behavioral-profiles/code/gen_profiles.py`
  → profile.py (QBProfile replaces the markdown renderer as the machine-readable
    profile object; markdown rendering kept as a view, not the store)

## Metric bible (filters + baselines)
- `docs/props/research/2026-09-17/props-consensus/our-metric-stack.md`
  → loader.py: garbage-time removal (4Q, WP>0.95 or <0.05 — 11.2% of 2025 plays),
    kneel/spike exclusion, Success = EPA > 0, dropback = attempt OR scramble
  → metrics.py: INT baseline 1.867%/dropback, fumble-lost 0.640%/play,
    TWP ~3.0% flagged with 52.3%→INT conversion (prior for INT projection)

## Deep research → new modules
- partition-01-qb.md #1 (BUILD 1: per-QB rolling EPA/dropback, 16-game window,
  passer_player_id-keyed, snap-share availability weight, anti-leakage rule;
  measured: log loss 0.633→0.625, AUC 0.690→0.700, 3,816 games 2012–2025,
  Brier 0.216; MIT github.com/TreMatt03/nfl-game-predictor)
  → engine.py: compute_rolling_form()
- partition-01-qb.md #2 (pressure-to-sack QB trait; Challenge A: wire ONLY with
  empirical-Bayes shrinkage toward ~18% baseline; raw rates never published)
  → metrics.py: eb_shrink(); engine.py: pressure_trait()
- partition-01-qb.md #6 (dropback-outcome split: complete/incomplete/scramble/
  sack/INT % per QB; dfs/research/2026-09-29/full-tables/README.md)
  → engine.py: dropback_outcomes()
- partition-01-qb.md #7 (scramble-vs-designed EPA under pressure; Allen 5-for-49
  template; no standalone "mobility" family per competitive-intel)
  → engine.py: run_behavior_epa()
- partition-01-qb.md #8 (aDOT / air-yard-share / deep-rate public aggressiveness
  proxy; NGS true aggressiveness is internal-only per 2026-09-28 doctrine)
  → engine.py: aggressiveness()
- partition-01-qb.md #10 (QB Burden Index drivers: pressure, depth,
  down-distance friction, weather/context penalty, line disruption;
  burden ≠ quality; SHADOW weights unpublished — drivers only)
  → engine.py: burden_drivers()
- partition-01-qb.md #11 (QB familiarity + availability; Keenum control case:
  backups get full profiles)
  → engine.py: availability()
- partition-01-qb.md #12 (D/S/I audit per 1184; Minerva Seal ≥80 per 2048;
  n<30 flag; 100-dropback minimum; Challenge M)
  → audit.py
- partition-01-qb.md Challenge F (TacticAI ≥5% gate is reader-invented, not the
  paper's) → NOT implemented as a gate anywhere in this module.
- partition-04-engine-internals.md (1.867% INT baseline recomputed 1.8666%;
  0.53–0.61/0.13–0.19 correlation is an orphan number — NOT used for weighting;
  ARBY/Baldwin are mislabeled X-thread formulas — NOT used)
  → metrics.py uses only verified baselines; no ARBY/Baldwin anywhere.

## Reasoning layer contract
- `~/workspace/corpus-intelligence/handoff/reasoning-depth-spec.md`
  → profile.py: Verification enum (CORPUS/COMPUTED/SINGLE_SOURCE/INFERENCE, §6.2);
    every MetricValue carries one. Track 1 checklist input (§5).

## Methodological deltas vs the original pipeline (documented, not bugs)
- This engine applies the metric-bible garbage-time filter (4Q, WP>0.95/<0.05)
  which `compute_metrics.py` did not; season numbers differ slightly and
  deliberately (e.g. Rodgers 2016: HHI 0.1424 vs 0.1417, EPA/db 0.217 vs 0.236).
- The p2s floor proxy (qb_hit OR sack) undercounts charting pressures, so
  p2s_raw runs HIGH vs the ~18% charting baseline; both p2s metrics are
  proxy-grade until FTN/SumerSports charting is wired (partition-01 #2).
- The 0.53–0.61/0.13–0.19 passing/rushing correlation is an ORPHAN number
  (partition-04: no cited study, no sample, no window) — never used for
  feature weighting anywhere in this module.
- ARBY 65/35 and Baldwin 40/40/20 are competitor X-thread formulas mislabeled
  as lab inventory (partition-04) — not implemented here.

## Explicitly NOT in this module (c02's lane — see README.md interface contract)
- Situational split matrices (down × distance × field position × game script)
- WR-absence-conditional trust targets (Pitts/London template, partition-01 #3)
- Receiver-conditional TD decomposition P(TD)=Σ P(TD|t)·P(t) (partition-01 #9)
- First-read share / TPRR ingestion (partition-01 #5 — needs FTN charting,
  rights-cleared, no production caller; queued behind the FTN wiring lane)
- Man/zone and blitz/no-blitz EPA splits (needs charting/NGS data)
- QB-specific uncertainty bands (explicitly SUPPRESSED per
  fantasy/research/2026-09-28/half-life-and-band-calibration.md:
  corr(predicted SD, realized SD) = +0.0636 for QB)

---

## c02 layer: situational splits + trust-target modeling (2026-10-02)

Owner: c02 coordinator. Built on the c01 engine (imports loader/metrics/
identity/engine frames; implements c01's SplitSpec protocol from splits.py).

### Research basis
- `corpus-intelligence/deep/c02/verified-claims.md` (PRESS-1..14, SIT-1..9,
  TRUST-1..10, INT-1..12, COMP-1..10, NGS-1..10 — every claim file:line-pinned)
- `corpus-intelligence/deep/c02/{syntheses,challenges,buildable-systems}.md`
- `docs/models/qb-pressure-indices-proposal.md` (sensitivity/stress formulas + guards)
- `docs/props/research/2026-09-17/props-consensus/projection_methods.md`
  (INT recipe, sack-prop veto, veto list)
- `docs/architecture/2026-09-18-signal-architecture.md` (FTN L7 share-alike
  model-ineligibility — engine is T1 nflverse-pbp only)
- `docs/data-sources/research/2026-09-18/2026-09-18-ngs-replacement-spec.md`
  (naming contract: _floor/_pbp/_proxy suffixes; TTT NULL, never proxied)

### Code map
- `src/qb_behavior/situational/cells.py` — cell definitions (single source of
  truth shared by build + runtime): pressure_floor, 288-cell INT grid,
  trust situations. Stdlib only.
- `src/qb_behavior/situational/specs.py` — SplitSpec implementations
  (pressure_floor, int_situational, trust_situation, down_distance,
  field_zone, script, quarter) run via c01's apply_split() or the build job.
- `src/qb_behavior/situational/serve.py` — CSV-backed INT/situational server;
  EB ladder M=25 league->team->QB; null floors n<30, QB pressure cells need
  >=100 pooled pressured dropbacks.
- `src/qb_behavior/situational/trust.py` — trust-target series (point-in-time),
  top-share CV stability, HHI autocorrelation persistence gate.
- `src/qb_behavior/situational/protection.py` — Protection Stress OLS
  (unweighted, with intercept; analyst/display use only in v1).
- `src/qb_behavior/situational/provider.py` — SituationalQBProvider implements
  integration/providers.py QBBehaviorProvider; UNPARKS get_pressure_splits.
- `build/build_tables.py` — precompute (polars) -> `data/*.csv`.
- `build/build_protection_stress.py` — pfr_advstats -> `data/protection_stress.csv`.

### Honest limitations (from the deep research, not hidden)
- Charted-pressure sensitivity is NULL: the nflverse FTN release has no
  per-play pressure field (PRESS-7). The served `sensitivity_epa_floor` is the
  honest T1 construction, attenuated toward zero, never the spec's charted index.
- `first_read_rate` is always None + data_gap (no pbp source; FTN read_thrown
  is display-only under L7 share-alike).
- TTT is never emitted (no proxy per the naming contract).
- No `predicted_sacks` column exists anywhere (sack-prop veto, R²<0.005).
- QB-quality confounding of sensitivity is unaddressed by the corpus: the
  provider serves the sensitivity + clean baseline + SE triple, never a raw
  cross-QB ranking (CH-PRESS-4).
