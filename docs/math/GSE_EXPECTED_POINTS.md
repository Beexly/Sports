# GSE Expected Points, Win Probability, Success Rate & Drives — the methodology

> Source of truth is
> `packages/prediction-engine/src/expected-metrics/{expected-points,win-probability,success-rate,drives}.ts`.
> Everything here describes that code, not an aspiration. If the code and this
> document disagree, the code wins and this doc is the bug.

---

## (a) Thesis — own the metric, use nflverse as referee only

nflverse play-by-play (CC-BY-4.0) ships `ep`/`epa`/`wp`/`wpa` columns produced by
**its** next-score and win-probability models. We do **not** re-serve those
numbers. We compute our **own** first-principles metrics from public situation
columns:

- **Expected Points (EP) → EPA** — a next-score expectation over field state.
- **Win Probability (WP) → WPA** — a game-outcome probability over game state.
- **Success rate** — a definitional, closed-form play-quality rule.
- **Drives** — a pure partition of plays into possessions with per-drive rollups.

nflverse `ep`/`epa`/`wp` enter our system **only** as the y-axis of a calibration
correlation (the referee), never as a served metric. We own the definition, the
feature contract, the fitted coefficients, and the provenance.

These four are **glass-box** and **enter dark**: additive, descriptive, historical
metrics that are **not** wired into `scoring.ts`, `constants.ts`, or any
confidence/edge math. Shipping them changes no served pick.

---

## (b) The four metrics

### Expected Points — `gse-ep-v1`

- **Estimator**: seven **one-vs-rest binary logistics** (`fitLogistic`) over the
  next-score outcome, renormalized to a distribution. There is no softmax and no
  multinomial fitter in the codebase; EP reuses the existing binary logistic.
- **Play type**: any non-terminal down-to-down state.
- **Feature keys** (verbatim from `EXPECTED_POINTS_FEATURE_KEYS`):
  `down, ydstogo, yardline100, yardline100Squared, goalToGo, halfSecondsRemaining`.
- **Outcomes / values** (`EP_OUTCOMES` / `EP_OUTCOME_VALUES`, possession frame):
  `TD +7, FG +3, SAFETY +2, NONE 0, OPP_SAFETY −2, OPP_FG −3, OPP_TD −7`.
- **Math**: `EP(state) = Σ_k P(next-score = k) · value(k)`, provably in **[−7, 7]**
  (a convex combination of values in [−7, 7]).
- **EPA**: `EP(after) − EP(before)`. On a possession change EP(after) is in the
  opponent's frame, so it is **NEGATED** to return to the before-team's frame.
- **Rare-head graceful degradation**: the required heads
  `{TD, FG, NONE, OPP_FG, OPP_TD}` (`EP_REQUIRED_OUTCOMES`) must fit or no surface
  is served. The rare safety heads (`SAFETY`, `OPP_SAFETY`) may fail to fit; a null
  head contributes raw probability 0 before renormalization. EP stays bounded.
- **`TD = 7` v1 simplification**: the touchdown value is modeled inclusive of the
  expected PAT. A future `gse-ep-v2` may adopt the PAT-adjusted ~6.95 value.
- **Sample floor**: `MIN_EP_PLAYS_TO_FIT = 1000` usable plays; below it, `null`.

### Win Probability — `gse-wp-v1`

- **Estimator**: a single **binary logistic** (`fitLogistic`) of
  P(possession team ultimately wins).
- **Feature keys** (`WIN_PROBABILITY_FEATURE_KEYS`):
  `scoreDifferential, gameSecondsRemaining, scoreDiffPerSqrtTime, yardline100,
  down, ydstogo, timeoutDifferential, spreadLine`.
- **Math**: `WP(state) = σ(β · features)`, already in the open interval **(0, 1)**
  — no clamp is applied.
- **WPA**: `WP(after) − WP(before)`. On a possession change WP(after) is the
  opponent's win probability, so it is the **COMPLEMENT** `1 − WP(after)`.
- **`spreadLine ?? 0`**: a missing market spread is imputed as a pick'em. This
  conflates "missing" with a genuine pick'em; it is an accepted v1 imputation.
- **Sample floor**: `MIN_WP_PLAYS_TO_FIT = 1000`.

### Success rate — `gse-success-v1`

- **Estimator**: a **deterministic rule** — no fit.
- **Rule**: success = touchdown (forced) **OR** (not a turnover **AND** yards
  gained ≥ fraction(down) · yards-to-go), with fractions
  `SUCCESS_YARDAGE_FRACTION = {1: 0.4, 2: 0.6, 3: 1.0, 4: 1.0}`.
- **Precedence**: a **turnover forces failure and DOMINATES** a touchdown flag (a
  pick-six is a turnover, hence an offensive failure). An unratable down
  (∉ {1,2,3,4}) returns `null` and is dropped from every count — the down is
  range-guarded **before** indexing the fraction table, so the lookup is always a
  real number.
- **Splits**: by team, player, down, and early/late × short/medium/long situation
  bucket. No "over expected" — an expected-success surface is out of scope for v1.

### Drives — `gse-drives-v1`

- **Estimator**: a pure **drive segmentation** — no fit.
- **Partition-completeness invariant** (test-enforced): every input play lands in
  exactly one drive; `Σ playCount === plays.length` and the multiset of playIds is
  preserved. No play dropped, duplicated, or invented.
- **Two modes**: explicit `driveId` grouping, or detect-by-possession-change with
  synthesized sequential ids. An empty-`posteam` play attaches to the open drive;
  an empty-`posteam` first play **starts** a drive (never orphaned).
- **Result classification**: an explicit `terminalOutcome` is authoritative; else
  `points ≥ 6 → TD`, `points === 3 → FG`, else `OTHER`. A **safety is never
  inferred from a point total** (a safety is scored by the defense, not netted by
  the offense).
- **`pointsScored` is ACTUAL points, not `sp`**: the field is the real point value
  of the play — TD 6, FG 3, safety 2, PAT/XP 1, two-point 2 (0 otherwise). It **must
  not** be mapped from nflfastR's binary `sp` scoring-play indicator (0/1): a `sp`
  mapping would total a TD+PAT drive as `1 + 1 = 2` and misclassify it as `OTHER`.
- **Aggregates**: `points` (Σ), `epaTotal` (Σ epa ?? 0), `successRate` over ratable
  plays only (0, not NaN, when none are ratable), start/end field position from
  first/last play by `playIndex`.

---

## (c) Fit-on-load, provenance, null-not-guess

Every fitted model carries `ExpectedMetricProvenance`: `modelVersion`, `method`,
ordered `featureKeys`, `featureSchemaHash` (djb2 over the ordered keys, via
`computeFeatureSchemaHash`), and `sampleSize`. Three new `method` tags:

| method | metric |
|---|---|
| `multinomial-ovr-logistic` | Expected Points (7 one-vs-rest logistics, renormalized) |
| `logistic-regression` | Win Probability (single binary logistic — reuses the existing tag) |
| `deterministic-rule` | Success rate |
| `drive-segmentation` | Drives |

`fit*` returns `null` below its floor (`MIN_EP_PLAYS_TO_FIT`,
`MIN_WP_PLAYS_TO_FIT`) or on degenerate data — we never serve a metric from an
unfit model. EP additionally distinguishes required heads (must fit) from rare
safety heads (may be null → raw probability 0).

Own model versions (`gse-ep-v1`, `gse-wp-v1`, `gse-success-v1`, `gse-drives-v1`)
are unrelated to `constants.ts` `MODEL_VERSION`; none of these modules is imported
by `scoring.ts` or `constants.ts`.

---

## (d) Validation — prove it against the referee

EP is proven against nflverse `ep`, EPA against `epa`, and WP against `wp`, all at
**play grain** via `buildEpCalibration` / `buildWpCalibration` (thin play-grain
helpers in `validation.ts` reusing the same `numeric.ts` primitives — Pearson,
Spearman, RMSE, MAE, mean — no second statistics kernel). New threshold families in
`DEFAULT_GRADUATION_THRESHOLDS`:

```
ep: { minSample: 200, graduatedPearson: 0.9, provisionalPearson: 0.75 }
wp: { minSample: 200, graduatedPearson: 0.9, provisionalPearson: 0.8 }
```

The bars are **high** because EP and WP are almost fully functions of the public
situation (down / distance / field position / score / time), so a faithful public
reconstruction should correlate strongly with the referee. Here `minSample` is
reinterpreted as **paired plays**, not players.

Success rate and drives are **definitional** — there is no correlation gate, only
determinism and the partition invariant, enforced by unit tests.

---

## (e) Grain discipline

Validation is per-play, same season, same season type (REG), joined on
`game_id`+`play_id`. Never mix seasons. **EPA validation excludes terminal scoring
plays on both sides of the join** — v1 EPA covers non-terminal down-to-down
transitions only, and the nflverse `epa` join must be filtered to the identical
non-terminal set or the correlation mixes grains.

---

## (f) The two sign conventions (top correctness hazard)

- **EP negates** on a possession flip: `EP(after) → −EP(after)` (a signed point
  expectation).
- **WP complements** on a possession flip: `WP(after) → 1 − WP(after)` (a
  probability in [0, 1]).

These are **different operations**. Treating a WP flip as a negation — or an EP
flip as a complement — is the classic bug. Both `expectedPointsAdded` and
`winProbabilityAdded` document the after-play **possession-frame caller contract**:
`after` must be expressed from the after-play possession team's frame.

---

## (g) Claims vs non-claims

These metrics are **descriptive and historical**. They are **not** performance
claims: no win rate, no ROI, no profit, no closing-line-value assertion. They are
**not** wired into scoring or confidence — that would require a founder-gated
`MODEL_VERSION` step under the model-freeze guardrail. They **enter dark** as
glass-box audit metrics.

---

## Attribution & source columns

Play-by-play data © nflverse, CC-BY-4.0. FTN charting and participation columns
(CC-BY-SA-4.0) are **NOT** used.

Exact pbp columns each module reads:

- **Expected Points**: `game_id, play_id, down, ydstogo, yardline_100,
  half_seconds_remaining, goal_to_go, sp, touchdown, field_goal_result, safety,
  td_team, posteam, ep, epa`
- **Win Probability**: `game_id, play_id, score_differential,
  game_seconds_remaining, yardline_100, down, ydstogo, posteam_timeouts_remaining,
  defteam_timeouts_remaining, spread_line, result, wp`
- **Success rate**: `game_id, play_id, posteam, rusher_player_id,
  receiver_player_id, down, ydstogo, yards_gained, touchdown, interception,
  fumble_lost`
- **Drives**: `game_id, play_id, fixed_drive, fixed_drive_result, posteam,
  yardline_100, sp`
