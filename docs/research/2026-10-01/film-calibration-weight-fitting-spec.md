# Film Feature Calibration & Weight-Fitting Spec

**Date:** 2026-10-01
**Status:** RESEARCH SPEC — no code changes. All film signals remain
weight-zero and UNCALIBRATED.
**Context:** Tonight (Steelers–Browns, 7:15 PM CT) the watch loop captures
its first real game film. This spec defines how film features earn weight:
what data must accumulate, how weights get fitted, what gates a weight
must pass, and what stays at zero until then.

This is the **weight → calibrate** step of the engine loop
(research → wire → weight → calibrate → test → polish). Wire is done;
this spec governs what comes next. It does not perform it.

---

## 1. Where we are (grounded inventory)

All paths below are in `packages/prediction-engine/src/` on `main`.

- **Shadow harness** (`film-features/shadow/film-shadow-harness.ts`):
  every slate scores each subject twice — control (today's engine inputs)
  and treatment (film-augmented inputs) — via the REAL engine probability
  function. Ledger rows carry `controlProb`, `treatmentProb`, `filmPrior`,
  `weight` (typed as the literal `0`), `blendedProb` (= control at w=0),
  `delta` (0 by construction), `wouldBeDeltaW1` (treatment − control, the
  research signal), `actual` (null until graded), and `calibration:
  "UNCALIBRATED"` (literal type).
- **Blend law** (`film-features/film-priors.ts`):
  `P = (1−w)·P_base + w·P_film`, with `w: 0` as a literal type so no call
  site can smuggle film weight into a published number. Film priors
  (`receivingYardsPrior`, `anytimeTdPrior`) use heuristic coefficients
  (1.2 / 0.08 / 0.015; 1.5 / 0.9 / 0.05) that are documented starting
  guesses, NOT fitted values.
- **Adapter** (`film-features/film-feature-adapter.ts`): film overrides
  ONLY genuinely film-measured inputs (`usageShare`, `redZoneShare` from
  `targetShareByFormation` / `redZoneRouteShare`); box-score fields pass
  through untouched. With no player features (`pf == null`) it returns
  control == treatment and empty priors — honest null, not a guess.
- **Ledger** (`film-features/db/schema/watch-shadow-ledger.sql`):
  `film_shadow_ledger`, one row per slate × lane × subject × market, plus
  `v_shadow_weight_violations` — any row with `weight != 0` is a policy
  violation until the calibrate step authorizes it in a reviewed commit.
- **Promotion gate** (`promotion/`): frozen contract
  (`docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md`). Leg 1 = paired Brier
  differential with empirical-Bernstein LCB (contract defaults: nMin=500,
  deltaPrac=0.002, coverage floor 0.95 over a PRE-REGISTERED event
  universe); Leg 2 = CLV non-inferiority (Welch, min 100 picks/side);
  Leg 3 = walk-forward integrity (window registered before it opens, no
  peeking). Verdict is ELIGIBLE/NOT_ELIGIBLE only — applying a promotion
  stays a separate founder-only step.
- **Existing fitter** (`bridge/bridge-model.ts`): logistic IRLS with
  `MIN_FIT_ROWS = 200`, ridge on the Hessian, standardized features,
  refusal (not clamping) of 0/1 probabilities. The pattern to reuse, not
  reinvent.
- **Backtest** (`film-features/backtest/film-backtest-2024.ts`): synthetic
  2024 season (seeded PRNG) proving plumbing end-to-end with the real
  `anytimeTdProbability`. To be replaced by the real play stream once
  captures land.
- **Identity gap** (`film-features/film-types.ts`): `playerMap?:
  Record<trackletId, playerId>` — "roster identity from number OCR /
  manual map". `extractPlayerFilmFeatures` returns null without it.
  `watch.tracklets` carries only `team_hint` and `role`. Tonight:
  team-level features work; player-level features are null.

### 1.1 The estimand question this spec resolves

The harness currently has TWO film mechanisms and they are not the same
thing:

- **(A) Treatment-input arm.** `toPropsInputs` overrides `usageShare` /
  `redZoneShare` with film-measured values and runs the real engine.
  `wouldBeDeltaW1 = treatmentProb − controlProb` measures this arm.
- **(B) Prior-blend arm.** `blendProbability(control, filmPrior, w)`
  mixes the engine output with the heuristic film prior at weight `w`.

These must not be fitted as one thing — they are different challengers
with different identifiability. The protocol below treats them as
**separate candidate challengers per market family** and lets held-out
Brier pick the winner. Do not fit (A) and (B) jointly without an
identifiability analysis; their signals overlap (both consume
target share / red-zone share) and joint fitting will attribute shared
variance arbitrarily.

---

## 2. Weight-fitting protocol

### 2.1 What the ledger must accumulate

Fitting consumes **graded** `film_shadow_ledger` rows only
(`actual IS NOT NULL`, via `idx_shadow_ledger_graded`). Per market family
(`receiving_yards_over`, `anytime_td`, fantasy G-score bands, picks
spread/total), each row must carry:

- `controlProb`, `treatmentProb`, `filmPrior`, `line`, `actual`
  (binary 1/0 for hit/miss markets; realized stat for yardage bands),
- `provenance` JSON with `{source:'film', nPlays, nRoutes, confidence,
  identityConfidence}` — rows with identity confidence below threshold
  (§5) are EXCLUDED from fitting, not down-weighted silently,
- `slate_id` ordering so walk-forward splits are by time, never random.

**Grading join (required plumbing, not yet built):** post-game, `actual`
must be filled from official box scores. This needs a reliable
`slate_id → game` and `subject_id → official player` join. Until the
grading job exists and is tested, no fit runs — ungraded rows are not
data.

### 2.2 Minimum samples before any weight moves off zero

Ground rule: no fitting before the discipline the repo already demands
elsewhere — bridge `MIN_FIT_ROWS = 200`, promotion-gate Leg 1 `nMin =
500` paired events.

Per-game row budget (realistic, not optimistic):

| Market family | Rows / game | Games to 500 graded rows |
|---|---|---|
| Player props (`receiving_yards_over`, `anytime_td`) | ~30–60 (skill players with identity) | ~10–15 games |
| Fantasy G-score bands | ~20–40 (skill players with identity) | ~13–25 games |
| Team picks (spread/total) | 1 per market | ~500 games — INFEASIBLE per-team |

Consequences:

- **Player-level markets:** 500 graded rows is reachable within 3–4 weeks
  of regular tracking (primetime + Sunday slate). This is the feasible
  calibration lane. Per-player minima on top: a player's film features
  enter fitting only after ≥ 30 graded routes for that player
  (below that, `pf == null` path — control == treatment — keeps the row
  honest but uninformative).
- **Team-level markets:** 500 rows per team is infeasible. Team film
  weights must pool across teams with team fixed effects (hierarchical
  partial pooling), or team film stays a diagnostic until a full season
  of tracked games exists. Do NOT fit 32 separate team weights on
  ~17 rows each — that is noise with a confidence interval.
- **Identity gating:** until the tracklet→player map exists (§5),
  player-level rows are structurally zero. The protocol does not start
  for player markets until identity ships. Team-level tendency rows
  (`v_runpass_tendency`, `v_route_combo_freq`) accumulate from game one
  and are the only fittable film signal in the interim.

### 2.3 Fitting method

Per market family, fit the blend weight on the PRIOR-BLEND challenger
(B); the treatment-input challenger (A) is evaluated as a fixed
alternative, not fitted (its "parameters" are the engine's own).

**Model.** For binary hit/miss markets, the blended probability at
weight `w`:

```
P_w = (1 − w) · P_control + w · P_film,   w ∈ [0, 1]
```

**Objective.** Maximize the penalized log-likelihood over graded rows:

```
Σ_i [ y_i · log P_w(i) + (1 − y_i) · log(1 − P_w(i)) ] − λ · w²
```

- `λ` is shrinkage toward zero — the mathematical form of "film must
  prove itself." Choose `λ` by walk-forward cross-validation (§2.4),
  with the constraint that `λ` can only grow the penalty, never shrink
  it below the value that keeps `ŵ = 0` on pure-noise simulations.
- Bound `w ∈ [0, 1]`. Negative weights (film anti-signal) are not
  fitted — if the data wants `w < 0`, the finding is "the prior is
  mis-signed," which goes back to research, not into production with a
  negative weight.
- Report `ŵ` with a 95% interval (profile likelihood or bootstrap over
  games, NOT over rows — rows within a game are correlated).
  Clustered standard errors by game are mandatory; row-iid intervals
  will be overconfident and are a known trap.

**Reuse, don't reinvent.** The IRLS logistic machinery in
`bridge/bridge-model.ts` (standardization, ridge, refusal semantics) is
the template. The film-weight fitter should be a new module following
the same conventions (`MIN_FIT_ROWS`-style refusal, finite checks,
no clamping), not a copy-paste.

**What is NOT fitted:** the heuristic prior coefficients inside
`receivingYardsPrior` / `anytimeTdPrior` (1.2, 0.08, …). Those are
re-estimated only after `w > 0` is established AND with an order of
magnitude more data (coefficient fitting needs ~10× the rows of
single-weight fitting). Until then they stay documented guesses.

### 2.4 Walk-forward discipline (anti-overfit)

1. **Time-ordered splits only.** Fit on slates `1..k`, evaluate on
   `k+1`. Random K-fold is forbidden — it leaks future games into
   training through opponent and season effects.
2. **Pre-registration.** Each fitting window is registered BEFORE its
   evaluation slates occur (same Leg-3 discipline as the promotion
   gate): window id, market family, row-inclusion rules, `λ` grid,
   decision thresholds — all committed before kickoff of the first
   held-out game.
3. **In-sample vs out-of-sample gap.** Report Brier on the fit window
   AND on the held-out window. If held-out Brier is worse than control
   by more than the practical floor, the fit is rejected even if
   in-sample looks good. A large in/out gap is diagnosed as overfit,
   not as "needs more tuning."
4. **Noise-ceiling check.** Before fitting on real data, run the full
   protocol on label-shuffled rows: it must return `ŵ ≈ 0` and
   NOT_ELIGIBLE. If the protocol can "find signal" in shuffled labels,
   the protocol is broken, not the data.

### 2.5 Promotion gate criteria (film-weight gate)

A film weight graduates from `0` to `ŵ` only through a gate modeled on
the frozen promotion contract, with champion = control arm and
challenger = film-weighted arm, per market family:

- **Leg 1 (calibration):** paired Brier differential
  `(controlProb − y)² − (P_ŵ − y)²` over ≥ 500 graded rows, EB-LCB >
  `deltaPrac` (0.002 Brier points), coverage ≥ 0.95 of the
  pre-registered event universe (anti-cherry-picking: the film arm must
  cover the same slate the control arm covers).
- **Leg 2 (value):** CLV non-inferiority on the shadow lane — the
  film-weighted arm must not degrade CLV vs control (Welch, same
  margins as the frozen gate). Film that calibrates but loses value
  stays at zero.
- **Leg 3 (integrity):** pre-registered window, walk-forward, no
  peeking; recompute-from-rows must reproduce the decision
  byte-for-byte (the existing `recomputePromotionDecision` pattern).
- **Verdict** is ELIGIBLE / NOT_ELIGIBLE. Applying the weight —
  widening `weight: 0` to a fitted value in a reviewed commit — stays
  a founder-applied step, exactly like the model promotion gate.
  The `v_shadow_weight_violations` view must read empty before AND
  after, except for rows explicitly authorized by the reviewed commit.

---

## 3. Guardrails

1. **Weight-zero enforcement stays until validation passes.** Three
   independent locks: the literal `0` type in `film-priors.ts` and
   `film-shadow-harness.ts`; the `v_shadow_weight_violations` view;
   a CI check that fails on any `weight != 0` row in test fixtures.
   Removing any lock requires the reviewed commit that the gate
   verdict authorizes — never a drive-by.
2. **Small-sample overfitting.** No fitting before §2.2 minima;
   shrinkage prior peaked at zero (§2.3); walk-forward evaluation
   (§2.4); clustered-by-game intervals. Any one of these failing keeps
   `w = 0`.
3. **Honest calibration-state labeling.** The `calibration` column stays
   `"UNCALIBRATED"` until the gate passes; on passage it becomes a
   versioned label (`"CALIBRATED_v1_<windowId>"`), never a bare
   `"CALIBRATED"`. Film numbers never reach public projections,
   rankings, or picks at any stage (public/private doctrine).
4. **Multiple comparisons.** One gate evaluation per market family per
   window; Bonferroni `alpha / m` over concurrently evaluated families
   (the frozen gate already implements this — reuse it).
5. **No progress theater.** Per the standing wire-first rule: Brier
   deltas on old-model picks are not progress. Calibration judgment
   happens only on the fully wired pipeline with real film rows.
6. **Regression tripwire.** After any weight goes live, the shadow
   harness keeps running control-vs-weighted forever. If the live
   weighted arm underperforms control over a trailing window, the
   weight reverts to 0 by the same gate in reverse — weights are
   earned continuously, not once.

---

## 4. Tracklet→player identity map (the blocker for player features)

**Current state:** `watch.tracklets` has `team_hint` and `role`. The
`playerMap` on `FilmPlayInput` is unpopulated, so
`extractPlayerFilmFeatures` returns null and every player-level film
feature, prior, and treatment arm is structurally dead. Team-level
features (tendencies, distributions, route combos) are unaffected.

**Specified approach** (research-first; this is a new CV kernel, call
it K7 — identity — and it follows the engine order: research before
code):

1. **Jersey-number OCR on tracklet crops.** Burst frames (6 fps) give
   multiple crops per tracklet. Run number OCR per crop; aggregate by
   majority vote across the tracklet. Thresholds: ≥ 3 readable crops
   AND ≥ 60% agreement, else identity = null (never guess).
2. **Roster join.** `team_hint` + number → `playerId` via a roster
   table (nflverse rosters, free, refreshed weekly — roster churn
   across the trade deadline must be handled, not assumed away).
   Numbers are unique per team per phase (offense/defense can share),
   so the join key is `(team, number, phase)`.
3. **Role prior as disambiguator.** `role` (QB/RB/WR/TE/OL/DL/…) plus
   formation position gives a weak prior for duplicate-number cases.
   It breaks ties; it never overrides a confident OCR read.
4. **Temporal consistency.** Identity must be stable across the
   tracklet's full span; a tracklet whose per-crop reads flip
   mid-play is flagged corrupt and excluded.
5. **Confidence propagation.** Identity confidence (OCR agreement ×
   roster-match certainty) multiplies into `filmProvenance.confidence`.
   Fitting (§2) excludes rows below threshold — low-confidence
   identity is a missing row, not a noisy row.
6. **Manual correction table.** A small, auditable override table for
   the residual (star players the OCR persistently misreads). Every
   override is logged with who/what/when; overrides never enter the
   fitting sample (they're post-hoc and would bias it).

**What "done" looks like:** ≥ 80% of offensive skill-position
tracklets identified at ≥ 90% per-crop agreement on a full tracked
game, measured against a hand-labeled quarter as ground truth. Below
that, player features stay null-gated.

---

## 5. First experiment — tonight's game (Steelers–Browns, 2026-10-01)

**Pre-registration (write before kickoff; no peeking):**

- **Hypothesis under test:** the pipeline runs end-to-end on real
  film — capture → detection → tracklets → field coordinates → play
  segmentation → extractors → adapter → shadow harness → ledger rows
  → grading. This experiment tests PLUMBING, not signal.
- **Expected null result (documented in advance):** player-level rows
  ≈ 0, because identity (§4) doesn't exist yet. If player rows appear,
  that's a bug (guessing), not a win.
- **What should populate:** `watch.games/frames/tracklets` rows;
  `watch_plays` with team-level fields; tendency views
  (`v_runpass_tendency`, `v_route_combo_freq`); shadow ledger rows at
  team level with `weight = 0`, `calibration = 'UNCALIBRATED'`.

**Procedure:**

1. Scheduler arms the game at the pregame window; Space scales to
   T4 ~90 min before kickoff (autoscale job).
2. Capture runs through the game; frames → detections → tracklets
   persist to `watch.*`.
3. Post-game: play segmentation → `watch_plays`; extractors →
   adapter → `runShadowSlate` → ledger rows.
4. Grading job fills `actual` from official box scores (join on
   game + player/team — verify the join keys BEFORE trusting any
   graded row).
5. Compute `summarizeShadowSlate`: `n`, `nGraded`,
   `meanAbsWouldBeDeltaW1`, `controlAccuracy`, `filmWouldHaveHelped`.

**Success criteria (all must hold):**

- Zero pipeline errors; every stage's row counts reconcile
  (frames in → plays out → ledger rows, with documented drops).
- All ledger rows have `weight = 0`; `v_shadow_weight_violations`
  is empty.
- Grading completes: `nGraded / n` ≥ 0.95 for team-level rows.
- Summary computes. **No claim about film helping or hurting is
  made** — n = 1 game proves nothing, and the spec forbids
  verdicts below §2.2 minima.

**What we learn even on a perfect run:** the per-game row budget
(§2.2 table) gets its first REAL measurement, replacing estimates;
the CV measurement-validity question (§6) gets its first evidence.

---

## 6. Open unknowns (honest)

1. **Measurement validity (the big one).** Everything downstream —
   fitting, weights, calibration — assumes the CV pipeline measures
   football quantities (separation at the break, route depth, target
   shares) rather than detection noise. One game of real film is the
   first validity check, not the last. Sanity anchors: do film
   target shares correlate with box-score target shares for the same
   game? Do film route depths match charting? If the anchors fail,
   no amount of fitting fixes it — the problem is upstream.
2. **Grading-join reliability.** Ledger `subject_id`s must join
   cleanly to official player/team ids. Any join ambiguity silently
   corrupts `actual` and therefore every fit. The join needs its own
   test before any graded row is trusted.
3. **How many tracked games before player calibration is real.**
   §2.2's ~10–15 games assumes the primetime/Sunday tracking plan
   holds and identity ships. Slippage in either pushes calibration
   months out — the spec's timelines must be re-estimated from the
   measured row budget after tonight.
4. **Whether the treatment-input arm (A) or the prior-blend arm (B)
   is the better challenger.** Specified as an empirical question
   (§1.1), not decided here.

---

## 7. What this spec does NOT authorize

- No weight moves off zero (all three locks in §3.1 stay).
- No coefficient fitting inside the film priors.
- No public-surface exposure of any film number.
- No code changes — the fitting modules, grading job, identity
  kernel, and gate wiring are specified here and built later, in
  engine order.

---

*Research → wire → weight → calibrate → test → polish. This document
is the research artifact for weight and calibrate. The next artifact
is the fitted weight — earned, not assumed.*
