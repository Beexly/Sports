# GSE Intelligence Build — Continuous Improvement Log

Lane owner: continuous-improvement coordinator. Garrett's directive: keep working
autonomously, making it the most intelligent we can. Every entry: what changed,
test results, real-data validation status, what's still open.

---

## 2026-10-02 ~08:00 UTC — Batch 1: reasoning-contract convergence

**Problem:** `reasoning/` and `integration/` both implemented the reasoning
engine with separate types and separate `analyze()` pipelines. The coding agent
could not wire two competing contracts.

**Decision:** `reasoning/` is the canonical contract (engine, canonical types
in `schemas.py`/`enums.py`, c08 adversarial layer, checklist validator — and
the e2e gate already treated it as canonical). `integration/` is now a thin
provider-wired façade: same public surface (`analyze`, `adversary_review`,
`correlated_theses`, `validate_checklist`), every reasoning operation
delegated to `reasoning/`.

**Changes:**
- `reasoning/enums.py`: added `LIVE_VERIFIED` to `Verification` (was an
  integration-only SPEC extension; spec §5 names it the top precedence rank)
  + precedence entry. Documented as a schema migration per the module's rule.
- `reasoning/schemas.py`: `ChecklistResult.escalated_to_l5` property alias for
  `requires_l5` (façade vocabulary).
- `reasoning/levels.py`: `run_l2` now scans the analysis question as well as
  specialist claims for causal language (spec §4: a causal claim at L2
  escalates to L3; a causal question IS the claim).
- `reasoning/engine.py`: two spec-mandated fixes exposed by the façade —
  (1) `bet_requested` (+ implied `matchup`) request-derived escalation
  triggers (spec §4 table: "bet requested" → L2→L3); (2) post-L4 escalation
  re-check so a genuine L3→L4 walk can reach L5 via `three_plus_legs` /
  `thesis_survived` (previously the engine never re-evaluated after L4).
- `integration/types.py`: closed enums / TRACKS / VERIFICATION_PRECEDENCE now
  re-exported from `reasoning/enums.py` — one vocabulary build-wide. Façade
  DTOs (AnalysisRequest, BetLeg, BreakingCondition, …) kept as the
  provider-wiring I/O vocabulary. `CausalLink` gained an `id` field.
- `integration/api.py`: rewritten as the façade — `analyze()` translates the
  `ProviderRegistry` into the canonical `DataContext` (observations, chains,
  checklist hints with honest UNCHECKED/DATA-GAP semantics, track evidence),
  runs `reasoning`'s `AnalysisEngine`, returns the canonical `ReasoningTrace`
  with the contract's serialized level views attached (L3 chains, L4
  breaking-conditions/correlated-theses/weak-link/gap-assumptions, L5
  layer-verdicts + weak-link disclosure). Checklist INVALID returned as a
  labeled trace, never raised. Resume merges as a new level (spec §2.6).
- `integration/trace.py`: `FileTraceStore`/`resume_trace` persist canonical
  traces (tagged format); legacy DTO payloads still load.
- Deleted `integration/specialists.py`, `integration/synthesis.py`
  (superseded parallel implementations; nothing imported them).
- Docs: `integration/README.md`, build `README.md`, `contracts/`
  updated to the converged architecture.

**Tests:** full suite 704/704 PASS (run_all.py, 148.8s). No test was modified —
the pinned T1–T7 behaviors (funnel kill, checklist gate, escalation triggers,
correlated-thesis bundling, weak-link flags, hierarchy order, resume) all pass
through the canonical engine via the façade.

**Real-data validation:** not yet — next batch.

**Still open:**
- Real-data validation of key gates (T1 on real nflverse data, coaching τ̂
  gates, trust-signal classifier baselines).
- No live X feed (needs Garrett's X API key or browser session).
- Backtests on synthetic DGPs in ratings/combining/trust/staking/newregime.
- Two SYS-28 FeatureStore implementations (trust + newregime) to consolidate.
- `integration/escalation.py` + `integration/checklist.py` utils are
  test-pinned but engine-redundant; converge or document as legacy.

## Batch 2 — 2026-10-02 (~09:30 UTC): top research builds wired in

Two corpus buildable-systems items implemented end-to-end (module + data +
tests + provider + façade wiring), per the mission's intelligence-improvement
lane.

### B2.1 Per-QB rolling form (c01 #1 — largest measured gain in the corpus)
- New `qb-behavior/src/qb_behavior/form.py`: trailing-16-game EPA/dropback
  keyed by `qb_id` (trade-following), strictly-before-weeks only
  (anti-leakage), `MIN_DROPBACKS=100` gate (withheld, never zeroed), and an
  availability proxy (trailing workload vs a full-time starter).
- Handles the real data grain: `qb_weekly.csv` is season-to-date cumulative
  (db) + mean EPA/db — `to_weekly_increments()` differences it; first
  appearances difference against zero (the <50-db floor).
- New `qb-behavior/tests/test_form.py`: 12 tests (anti-leakage incl. the
  spec's snap-share-excludes-current-week gate, trade-following, 16-game
  window, season carryover, min-db gating, cumulative-grain differencing).
- Wired: `SituationalQBProvider.get_form()` (additive) → façade adds
  `form.{qb_id}.epa` observations + LIVE_VERIFIED evidence.
- Real-data sanity (2026 Week 4, trailing 16g): Purdy +0.300, Stafford +0.205,
  Prescott +0.187, Lawrence +0.181, Goff +0.161 … Ward −0.094, Rodgers −0.100,
  D.Jones −0.120. Magnitudes sane; the corpus walk-forward gains (log loss
  0.633→0.625, AUC 0.690→0.700, 3,816 games) are cited, not re-run.
- Data note: qb_weekly.csv's 2026 build is partial (wk1: 1 team, wk2: 26,
  wk3: 29) vs the complete pbp_2026.parquet — the build needs a refresh;
  flagged for the validation lane. 2022–2025 complete.

### B2.2 Pressure-answer adaptation (c01 #24 — the Monken template)
- New build `coaching/build/build_pressure_answer.py` → `coaching/data/
  schedule.csv` (2,374 rows) + `def_pressure_weekly.csv` (2,374 rows):
  weekly schedule from game_id; defensive pressure proxy = (sack+qb_hit) per
  dropback faced with trailing-4-week rate. Verified: every scheduled team
  has defensive stats (26–28-team weeks are byes, not gaps); 2022–2025
  complete (568–570 team-games incl. playoffs).
- New `coaching/pressure_answer.py`: `answer_delta_w` (trailing-baseline,
  anti-leakage), `faced_top5_rush`, `pressure_answer_profile` (hit-rate +
  mean delta + weeks). Proxy is honestly labeled outcome-not-frequency;
  byes/gaps are None, never zero-filled.
- New `coaching/tests/test_pressure_answer.py`: 10 tests (stubbed tables +
  real-data pins).
- Wired: `CoachingEngineProvider.get_pressure_answer()` (additive) → façade
  adds `scheme.{team}.off_elite_rush` observation + COMPUTED evidence when a
  team comes off a top-5 rush, with its season answer profile.
- **Real-data divergence (honest finding):** the corpus claims
  answer_delta_w > 0 "exactly" for BAL 2023–2024. Under the implemented
  definitions 2024 reproduces 3/3 (hit_rate 1.0, mean +0.060) but 2023 is
  0/5 (hit_rate 0.0, mean −0.109) — BAL's elevated early-2023 quick-game
  baseline (wk1: 0.682) inverts the trailing deltas. The corpus claim needs
  the research's exact rank/baseline definitions to verify; pinned in tests
  as a documented divergence, not papered over.

**Tests:** full suite 716/716 PASS baseline re-confirmed before Batch 2
(242.8s); new tests add 22 (12 form + 10 pressure-answer). Full re-run after
Batch 2 in progress at log time.

**Still open:**
- Real-data validation lane (delegated subagent running): T1 on real data,
  coaching τ̂ gates, trust-signal baselines; qb_weekly.csv 2026 refresh.
- Monken-template exact-definition verification (research lane).
- #28 QB familiarity (roster continuity) — needs a continuity data source.
- #2 lock-provenance QC rule — no "lock" claim type exists yet in
  trust-signals/staking; needs a claim model first.
- No live X feed (needs Garrett's X API key or browser session).
- Backtests on synthetic DGPs in ratings/combining/trust/staking/newregime.
- Two SYS-28 FeatureStore implementations (trust + newregime) to consolidate.
- `integration/escalation.py` + `integration/checklist.py` engine-redundant
  utils; converge or document as legacy.

## Batch 3 — 2026-10-02 (~10:15 UTC): validation follow-ups + legacy convergence

### B3.1 Real-data validation handoff (delegated subagent, complete)
Full report: `REAL-DATA-VALIDATION.md` (109 lines, provenance-grounded).
- **T1 funnel-kill: PARTIAL.** On real providers the trace is INVALID (never
  recommended) — the safe direction — but the kill mechanism cannot fire:
  no OL provider exists (zero injury columns in all 5 pbp seasons), TTT is
  None (charting-gapped/NGS-only), week-4 grain uncharted. Real confirmed
  values: CLE quick-game 0.6452 ≥ 0.60 (MET), Watson INT 1.03% clean /
  4.43% pressured (inside fixture ranges). TTT "satisfied" in the worked
  example was a synthetic stipulation — marked UNVALIDATED, never green.
- **Coaching τ̂ gates: VALIDATED.** +6.77pp Hamming (n=3,988), 7.28% Brier
  improvement (n=306), 80.5% audit agreement (margin 0.5pp — re-audit advised).
- **Trust classifier: UNVALIDATED.** Keyword heuristic; 7/20 self-consistency;
  13/20 fell through to MOTIVATION. Concrete misses fixed in B3.2.
- New grain note: provider week-3 grain (0.6452/5.55) vs season-to-date
  (0.639/6.12) — both clear 0.60; build should pick one grain and say so.

### B3.2 Trust-classifier keyword coverage (validator's concrete misses)
- `trust-signals/classify.py` SCHEME list extended: unhyphenated "pass
  blocking", "pass protection", "pass pro", plurals ("island rates",
  "pressures", "pressures allowed", "pressure allowed", "pressure rate"),
  "1-on-1"/"one-on-one", "true pass set", "stunt", "twist", "pocket",
  "percentile grade", "assignment success". All outputs remain
  verification=INFERENCE (heuristic, not a trained model).
- `tests/test_trust_signals.py`: 4 new tests — OL keyword variants, the
  waldman/clawson source-lane hint rescue path (previously untested),
  unknown-source keeps MOTIVATION default.

### B3.3 Grain-contract decision (validator's item 3)
`get_scheme_fingerprint` keeps the STRICT contract: DataGapError on
unplayed/uncharted weeks (pinned by
`test_scheme_fingerprint_missing_week_raises`; the no-test-modification rule
decides it). The T1 week-4 evaluation waits for week-4 data — consistent with
the Monken gate's PENDING-DATA posture. A point-in-time fallback was
implemented, verified, then reverted when the pinned test rejected it.

### B3.4 Legacy convergence documented
`integration/escalation.py` + `integration/checklist.py` marked LEGACY in
their headers: test-pinned reference implementations of spec §4/§5; the
production path is `reasoning/escalation.py` + `reasoning/checklist.py` via
the façade. No production code imports them; enums already converged via
`integration/types.py`. Not deleted — pinned tests import them directly.

**Tests:** 726/726 PASS after Batch 2 (157.7s); full re-run after Batch 3
changes in progress at log time.

**Still open (unchanged + refined):**
- OL/injury data source: no nflverse column exists — needs practice-report
  ingestion, sportsbook injury lists, or a licensed feed (external lane).
- TTT: NGS-only per doctrine (internal); quick-game proxy is the interim.
- QB id-vocabulary contract: fixtures use slugs, real store uses GSIS ids.
- Monken-template exact-definition verification (research lane).
- #28 QB familiarity (needs roster-continuity source); #2 lock-provenance
  QC (needs a "lock" claim model first).
- No live X feed (needs Garrett's X API key or browser session).
- Backtests on synthetic DGPs in ratings/combining/trust/staking/newregime.
- Two SYS-28 FeatureStore implementations (trust + newregime) to consolidate.

## Batch 4 — 2026-10-02 (~11:00 UTC): familiarity + trust-target profiles

Two more corpus buildable-systems items, same end-to-end pattern
(module + data + tests + provider + façade).

### B4.1 QB familiarity (#28)
- New build `qb-behavior/build/build_starts.py` → `qb-behavior/data/
  qb_starts.csv` (2,374 team-weeks): per-team-week starter inferred as the
  passer with the most dropbacks (tiebreak: EPA) — labeled inference.
- New `qb-behavior/src/qb_behavior/familiarity.py`: trailing-16-start share
  by the listed starter (strictly-before weeks), backup flag at <0.5,
  provisional (not flagged) under 8 charted starts, None when no history.
- New `qb-behavior/tests/test_familiarity.py`: 8 tests.
- Wired: `SituationalQBProvider.get_familiarity()` → façade adds
  `fam.{team}.starter_share` observations + INFERENCE evidence when the
  backup flag fires.
- Real data (2026 W4): CLE 0.1875 (backup flag — Watson), NYJ 0.1875
  (backup flag), PIT 0.875 (Rodgers), TEN 0.9375 — sane.

### B4.2 QB trust-target profiles (#3)
- New build `qb-behavior/build/build_trust_targets.py` →
  `qb-behavior/data/trust_targets.csv` (19,912 qb-receiver-weeks) from
  nflverse targets. First-read/TPRR/air-yard share need FTN charting —
  explicitly excluded, never substituted.
- New `qb-behavior/src/qb_behavior/trust_target.py`: trailing-8-week
  P(target) per receiver (MIN_TARGETS=20 gate, n reported with every share)
  + `absence_delta` — the Pitts template: with-X vs without-X leader share,
  HHI, and trust_delta_absent, withheld on thin splits (<2 weeks/side).
- New `qb-behavior/tests/test_trust_target.py`: 9 tests.
- Wired: `get_trust_targets()` / `get_absence_delta()` on the provider →
  façade adds `trust.{qb}.top_target_share` + `trust.{qb}.target_hhi`.
- Real data (2026 W4): Stafford — Nacua 24.7% (72), Adams 18.5% (54),
  HHI 0.140; Nacua absence delta +0.047. Goff — A.St. Brown 33.7%.

**Tests:** 730/730 PASS after Batch 3 (158.3s). Full re-run after Batch 4
in progress at log time.

**Still open:** OL/injury source (external); TTT (NGS-only); QB
id-vocabulary contract; Monken exact-definition verification; #2
lock-provenance QC (needs claim model); live X feed (Garrett); synthetic-DGP
backtests in ratings/combining/trust/staking/newregime; two SYS-28
FeatureStores to consolidate.

## Batch 5 — 2026-10-02 (~11:30 UTC): adjustments→QB wiring + real-provider tests

### B5.1 Scheme-regime staleness (coaching adjustments → QB form)
- `CoachingEngineProvider.get_adjustment()` (additive): exposes the M10
  Mahalanobis week-to-week adjustment quantifier with the top_decile flag.
- Façade qb loop: when a QB's team logged a top-decile scheme adjustment in
  the trailing 4 weeks, the form evidence carries a "spans a scheme-regime
  change; form is stale-prone" note (INFERENCE) + `form.{qb}.regime_stale`
  observation — the L4 adversary now sees when trailing form crosses a
  regime boundary.

### B5.2 Real-provider façade tests
- New `tests/test_real_provider_wiring.py`: 7 tests running the REAL
  providers through `_build_data_context` — form/familiarity/trust-target/
  pressure-answer observations, the Watson form-withheld gap note (57
  trailing dropbacks < 100 → withheld, never zeroed), and the coaching
  `get_adjustment` shape.

**Tests:** full re-run in progress at log time (covers Batches 4–5).

**Notes:**
- #2 lock-provenance QC belongs to the Sports repo's pick-tracking lane
  (needs lock records + odds_batch + line archive) — not this build.
- Provider grain contract stays STRICT (DataGapError on unplayed weeks);
  the point-in-time fallback was reverted per the pinned test.

## Batch 5b — 2026-10-02 (~11:45 UTC): FeatureStore consolidation evaluated

Evaluated consolidating the two SYS-28 FeatureStores (`newregime/
feature_store.py` vs `trust/leakwall.py`). **Deferred deliberately:** the APIs
differ (`insert_offline(feature, ...)` vs `insert_offline(source, ...)` +
`as_of()`), each is pinned by its module's tests, and both live in the
synthetic-DGP backtest modules (not the live reasoning path). Unifying them
would be churn with breakage risk and no intelligence gain. Revisit if either
module graduates to the live path.

## Batch 5c — 2026-10-02 (~12:00 UTC): id-vocabulary contract

Closed the validator's item 4 (QB id-vocabulary contract) by DECISION, not
code: production `qb_id` is the nflverse GSIS id; fixture slugs
(`deshaun-watson`) live only in `integration/stubs.py` + pinned e2e fixtures
against stub providers. No slug→GSIS matcher was built — the store's `name`
column (`D.Watson`) cannot reliably invert a slug, and fuzzy identity matching
would violate the no-guessing rule. Contract recorded in
`contracts/integration-contracts.md` §1 (ID-vocabulary contract).

## Batch 5 — FINAL 2026-10-02 (~12:05 UTC): all-green verification

**770/770 PASS** (`tests/run_all.py`, 156.7s) — covers Batches 1–5 end to
end: reasoning-contract convergence, per-QB rolling form, pressure-answer
adaptation, QB familiarity, trust-target profiles, scheme-regime staleness,
trust-keyword coverage, the legacy documentation of integration/escalation.py
and integration/checklist.py, the id-vocabulary contract, and the two new
data tables per module with READMEs updated.

### High-value items remaining (all genuinely external to this lane)
- OL/injury data source: zero injury columns in nflverse — needs
  practice-report ingestion, sportsbook injury lists, or a licensed feed.
- TTT: charting-gapped (NGS-only per doctrine); quick-game proxy is the
  honest interim and is labeled as such everywhere.
- Monken-template exact definitions (research lane — needs research's
  rank/baseline definitions to re-verify the pinned 2023 divergence).
- #2 lock-provenance QC: Sports repo pick-tracking lane (needs lock records
  + odds_batch + line archive).
- #28/#1 note: extend TARGETS to all 100-dropback QBs (gen_profiles only
  covers 8) — a corpus build note, not this engine's wiring.
- Synthetic-DGP backtests in ratings/combining/trust/staking/newregime
  remain synthetic by design.
- X API key / browser session from Garrett for the live feed lane (HARD
  rule: nothing posts without him anyway).

Lane is at a natural resting point: every in-scope high-value item is built,
wired, tested, real-data-verified where data exists, and documented.
