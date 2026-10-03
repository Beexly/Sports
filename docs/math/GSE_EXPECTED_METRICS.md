# GSE Expected Metrics — the metric bible

> Source of truth for the code: `packages/prediction-engine/src/expected-metrics/*`
> (pure, deterministic, zero-dependency engine) and
> `apps/web/lib/nflverse/expected-metrics.ts` (the fit-on-load loader). Everything
> in this document is a description of that code, not an aspiration. If the code
> and this doc disagree, the code wins and this doc is the bug.

---

## (a) Thesis — own the metric, don't re-serve someone else's

Next Gen Stats (NGS) publishes tracking-derived player metrics — completion
percentage above expectation, rush yards over expected per attempt, average YAC
above expectation. Those numbers come from a **private** model fit on **stadium
tracking hardware** (RFID/optical player tracking) we do not have and cannot
legally reproduce byte-for-byte. Re-serving them makes us a mirror of NGS, adds
no IP, and leans on a feed we don't own.

The GSE Expected Metrics play is the opposite: we **compute our own**
expected-value metrics — GSE-CPOE, GSE-RYOE, GSE-xYAC — from **public
play-by-play** (nflverse, CC-BY-4.0), and then we **prove** them by correlating
our per-player values against NGS as ground truth. We own the definition, the
feature contract, the fitted coefficients, and the provenance. NGS becomes the
**referee**, never the product: its numbers enter our system **only** as the
y-axis of a validation correlation and are **never** copied into a served metric.

The honesty is baked in. We fit on real public data at load time (not
hardcoded), we gate on sample floors (return `null` rather than guess), and we
grade ourselves against **honest** thresholds that reflect how much of NGS's
tracking signal is actually recoverable from public play-by-play. A metric that
does not reproduce ground truth is reported as `failed` — it does not get
quietly shipped.

---

## (b) The three metrics

All three share the same shape: fit an **expected-value model** on a season of
plays, take the **residual** (actual − expected) per play, and roll it up per
player into an over-expected rate. The rollup
(`rollup.ts` → `rollupByPlayer`) reports per-play means scaled to match NGS
units, plus an unscaled `overExpectedTotal` counting stat, sorted descending and
id-tiebroken for deterministic output. The join key throughout is the nflverse
**`gsis_id`**.

### GSE-CPOE — completion percentage over expectation

- **Model version:** `gse-xcomp-v1`
- **Estimator:** logistic regression (`logistic.ts` → `fitLogistic` /
  `predictLogistic`), method tag `"logistic-regression"`. L2-regularized
  full-batch gradient descent on the log-loss over **standardized** features,
  with the intercept carried as a separate **unpenalized** bias term initialized
  at the class-prior log-odds. Deterministic by construction (defaults:
  400 iterations, learning rate 0.3, L2 = 1e-3) — same plays → same coefficients.
- **Play type:** one dropback pass attempt per row (`DropbackPlay`), i.e. a
  charted pass with `complete_pass=1` or `incomplete_pass=1` and `air_yards`
  and `passer_player_id` set.
- **Features (10, canonical order — `EXPECTED_COMPLETION_FEATURE_KEYS`):**
  `airYards`, `airYardsSquared`, `qbHit`, `isMiddle`, `isLeft`, `down`,
  `ydstogo`, `yardline100`, `shotgun`, `noHuddle`.
  - `airYards` + `airYardsSquared` capture pass **depth and its curvature**
    (completion probability falls off nonlinearly with depth).
  - `qbHit` is our **public pressure proxy** (`qb_hit`).
  - `isMiddle` / `isLeft` one-hot the throw location (`pass_location`); **right
    is the reference category**.
  - `down`, `ydstogo`, `yardline100`, `shotgun`, `noHuddle` carry the
    down/distance/field-position/tempo situation.
- **Definition:** for a passer over their qualifying dropbacks,

  ```
  GSE-CPOE(passer) = 100 × mean(complete − P̂(complete))
  ```

  reported in **completion-percentage points** (the rollup applies
  `reportScale = 100`, matching NGS units). `overExpectedTotal` is completions
  above expectation — a genuine counting stat in raw units.
- **Sample floors:** `MIN_DROPBACKS_TO_FIT = 200` to fit the model at all;
  `DEFAULT_MIN_PASSER_ATTEMPTS = 100` for a passer to appear in the rollup
  (matches NGS passing grain).

### GSE-RYOE — rush yards over expected per attempt

- **Model version:** `gse-xrush-v1`
- **Estimator:** ridge (L2) linear regression (`linear.ts` → `fitRidge` /
  `predictRidge`), method tag `"ridge-linear"`. Closed-form ridge normal
  equations `β = (ZᵀZ + λR)⁻¹ Zᵀy` on a **standardized** design with a leading
  intercept column; `R = diag(0, 1, 1, …)` leaves the intercept **unpenalized**.
  Solved exactly by Gaussian elimination with partial pivoting — no iteration,
  no randomness (default `λ = 1`).
- **Play type:** one designed rush per row (`RushPlay`): `rush=1`,
  `qb_kneel≠1`, with `rushing_yards`, `score_differential`, and
  `rusher_player_id` set.
- **Features (9, canonical order — `EXPECTED_RUSH_FEATURE_KEYS`):**
  `yardline100`, `down`, `ydstogo`, `shotgun`, `scoreDifferential`,
  `runMiddle`, `runLeft`, `gapGuard`, `gapTackle`.
  - `runMiddle` / `runLeft` one-hot the run location (`run_location`); **right
    is the reference**. `gapGuard` / `gapTackle` one-hot the run gap
    (`run_gap`); **end is the reference**.
  - `scoreDifferential` (offense minus defense at snap) captures game-script
    effects on box counts and run-blocking intent.
- **Definition:** over the rusher's qualifying carries,

  ```
  GSE-RYOE(rusher) = mean(rushingYards − ŷ(rushingYards))
  ```

  reported in **yards over expected per attempt** (`reportScale = 1`).
  `overExpectedTotal` is total rush yards over expectation.
- **Sample floors:** `MIN_RUSHES_TO_FIT = 200`;
  `DEFAULT_MIN_RUSHER_ATTEMPTS = 50` (matches NGS rushing grain).

### GSE-xYAC — yards after catch over expectation

- **Model version:** `gse-xyac-v1`
- **Estimator:** ridge linear regression (same kernel as GSE-RYOE),
  method tag `"ridge-linear"`, default `λ = 1`.
- **Play type:** one completed reception per row (`CatchPlay`): `complete_pass=1`
  with `air_yards`, `yards_after_catch`, and `receiver_player_id` set.
- **Features (6, canonical order — `EXPECTED_YAC_FEATURE_KEYS`):**
  `airYards`, `yardline100`, `down`, `ydstogo`, `isMiddle`, `isLeft`.
  - `airYards` is the dominant public proxy for expected YAC — short, in-stride
    catches carry more YAC potential than deep contested ones. `isMiddle` /
    `isLeft` one-hot the throw location (right is the reference).
- **Definition:** over the receiver's qualifying receptions,

  ```
  GSE-xYAC(receiver) = mean(yardsAfterCatch − ŷ(yardsAfterCatch))
  ```

  reported in **YAC over expected per catch** (yards, `reportScale = 1`).
  `overExpectedTotal` is total YAC over expectation.
- **Sample floors:** `MIN_CATCHES_TO_FIT = 200`;
  `DEFAULT_MIN_RECEIVER_CATCHES = 30` (aligned to NGS receiving grain).

---

## (c) Fit-on-load architecture

The models are **not hardcoded and not pre-trained**. On each load
(`loadNflverseExpectedMetrics`), the loader:

1. Fetches a real season of nflverse play-by-play via `loadPbp`, **column-projected**
   to only the ~27 columns the three models read (the OOM defense on the ~372-column
   asset). `loadPbp` tries `[season, season − 1]` so an empty current season falls
   back to the most recent complete one, and it runs `assertIngestible("nflverse")`
   first.
2. Maps each qualifying row to a `DropbackPlay` / `RushPlay` / `CatchPlay` (REG
   only; two-point attempts, spikes, and kneels excluded).
3. **Fits our own models on that exact season** — `fitExpectedCompletionModel`,
   `fitExpectedRushModel`, `fitExpectedYacModel` — so the served metric is always
   our computation on **current public data**, never NGS's figure.
4. Rolls play-level residuals into per-player over-expected metrics, keeps the
   top-N leaders for display, and attaches the validation report (section d).

Every fitted model carries **provenance** (`ExpectedMetricProvenance`):

| Field | Meaning |
|---|---|
| `modelVersion` | `gse-xcomp-v1` / `gse-xrush-v1` / `gse-xyac-v1` — bump when features change |
| `method` | `"logistic-regression"` or `"ridge-linear"` |
| `featureKeys` | the canonical ordered feature list the model was fit on |
| `featureSchemaHash` | deterministic djb2 hash of `featureKeys` (8 hex chars) — a **drift detector**: a changed feature list changes the hash, so a downstream consumer can tell a served number came from a different feature contract than it expects. Not cryptographic. |
| `sampleSize` | number of qualifying plays the fit consumed |

**Honesty gates (return `null`, never guess):**

- Below the `MIN_*_TO_FIT` floor (200 plays), `fit*Model` returns `null` and the
  loader emits an **empty block** (`provenance: null`, verdict
  `insufficient-sample`) — no coefficients, no leaders, no fabricated metric.
- `fitLogistic` also returns `null` on **degenerate labels** (all completions or
  all incompletions — no decision boundary is estimable). `fitRidge` returns
  `null` when the system is **underdetermined** (`n < p + 1`) or the normal-equations
  matrix is **singular even after ridging**.
- On any source error, the loader returns `status: "source-error"` with empty
  blocks — the product shows an empty state, never fabricated metrics.

---

## (d) Validation methodology — the "prove it" half

Owning a metric means nothing until we show it reproduces reality.
`validation.ts` joins **our** per-player over-expected series to **NGS's** on the
shared `gsis_id` and reports agreement:

- `buildCalibrationReport(ours, truth)` → `CalibrationReport`:
  `n` (inner-join size), `pearson`, `spearman`, `rmse`, `mae`,
  `bias` (= `ourMean − truthMean`, the systematic offset), `ourMean`, `truthMean`.
  A join of fewer than 2 players yields an **all-zero** report (no correlation is
  estimable) rather than `NaN`. All statistics round to 4 decimals.
- `graduationVerdict(report, thresholds)` grades the report into
  `graduated` | `provisional` | `insufficient-sample` | `failed`, using Pearson
  as the headline.

**`DEFAULT_GRADUATION_THRESHOLDS` (and why they differ):**

| Metric | `minSample` | `graduatedPearson` | `provisionalPearson` |
|---|---|---|---|
| `cpoe` | 12 | **0.60** | 0.35 |
| `xyac` | 12 | **0.50** | 0.25 |
| `ryoe` | 12 | **0.40** | 0.20 |

The bars are **deliberately different**, and setting them truthfully is the whole
point — we grade against what a public reconstruction can actually achieve, not
against a number we wish we hit:

- **CPOE → high bar (0.60):** completion probability is mostly a function of
  **pass depth + pressure**, both of which we have publicly (air yards, its
  square, `qb_hit`). Little of the signal is hidden, so we should reproduce NGS
  closely or admit we failed.
- **xYAC → medium bar (0.50):** YAC is strongly **air-yards-driven** (a public
  feature), but it also depends on **defender proximity at the catch point**,
  which tracking sees and we do not. Partial recovery is the honest expectation.
- **RYOE → lower bar (0.40):** rush-yards-over-expected leans hardest on
  **defenders-in-the-box and the runner's closing/top speed** — exactly the
  tracking geometry we cannot see. Our per-carry expectation is coarser, so we
  set the bar where a public model can honestly land.

The verdict logic (from `graduationVerdict`): `n < minSample` →
`insufficient-sample`; `pearson ≥ graduatedPearson` → `graduated`;
`provisionalPearson ≤ pearson < graduatedPearson` → `provisional`; otherwise
`failed`.

---

## (e) GRAIN DISCIPLINE — read this or the number is a lie

**The single most important correctness rule in the whole feature.** A Pearson
correlation between two per-player series is only meaningful when **both series
are at identical aggregation grain**. If the grain differs, the number is
fiction — it can be inflated or destroyed at will.

Identical grain here means **all** of:

1. **Same season** — our metric and the NGS series must be the same NFL season
   (the loader correlates against the season PBP actually resolved to, the
   `activeSeason`, after the `[season, season − 1]` fallback — **not** the
   requested season blindly).
2. **Same season type** — REG only, on both sides.
3. **Same per-player key** — the nflverse `gsis_id`, joined 1:1.
4. **Matched per-player qualifier** — a season-aggregate per player on both
   sides. Our side applies `DEFAULT_MIN_PASSER_ATTEMPTS` / `_RUSHER_ATTEMPTS` /
   `_RECEIVER_CATCHES`; the NGS side is read from its **week-0 season-aggregate**
   rows (the loader filters `week == 0`, `season_type == REG`,
   `season == activeSeason`). The `buildCalibrationReport` join is an **inner
   join**, so only players who qualify on **both** sides enter the correlation.

Concretely lethal mistakes this rule forbids: correlating a **per-play** series
against a **per-season** series; correlating a **min-100-attempt** pool against a
**min-1** pool; correlating **REG** against **REG+POST**; joining on name instead
of `gsis_id`. Each silently produces a "correlation" that means nothing.

`validation.ts` performs the join **by `playerId` only** — it is the **caller's**
responsibility to have produced both sides at identical grain. The loader
(`expected-metrics.ts`) is what enforces that grain; the pure engine documents
and assumes it. Do not call `buildCalibrationReport` with two series you have not
personally confirmed share all four grain properties above.

---

## (f) Honest limitations — what tracking sees that public PBP does not

NGS is fit on optical/RFID **player tracking**: the (x, y) position and velocity
of all 22 players at ~10 Hz. That gives NGS's private models signals that are
**physically absent** from public play-by-play, including:

- **Receiver separation and cushion** at the throw and at the catch.
- **Defender proximity** at the catch point (drives real expected YAC and real
  expected completion).
- **Defenders-in-the-box** and the pre-snap front (drives real expected rush
  yards).
- **Runner closing speed / top speed / time-to-line-of-scrimmage.**
- **Time-to-throw** and route geometry.

Our public proxies are coarser by construction: `air_yards` (and its square),
`qb_hit` as a binary pressure flag, throw/run **location** and run **gap** buckets,
down/distance/field position, shotgun/no-huddle, and score differential. These
recover **some** of the tracking signal (a lot for CPOE, less for RYOE) but not
all of it — which is exactly why the graduation bars are set where they are, and
why we **measure and report** the correlation we actually earn instead of
assuming it.

---

## (g) What we can defensibly claim vs what we cannot

**We CAN claim (measured, not asserted):**

- These are **our own** metrics — our feature contract, our coefficients fit on
  public data at load time, fully provenance-stamped and auditable.
- At matched grain, our per-player values **reproduce the NGS ranking and level**
  to the degree the calibration report shows — reported as Pearson **and**
  Spearman (rank), with RMSE/MAE/bias, and graded by an honest, pre-registered
  threshold per metric. "Reproduces ground truth" is a `graduated` verdict backed
  by a real correlation on a real joined sample, not a slogan.

**We CANNOT claim:**

- **Identity with NGS's model.** We do not have their tracking inputs; our
  per-play probabilities and expectations differ from theirs by construction. A
  strong correlation is reproduction of the **per-player signal**, not proof that
  we recomputed their private model.
- That our number **equals** the NGS number for a player. `bias` in the report is
  the standing reminder that there is a systematic offset; we surface it rather
  than paper over it.
- Anything **forward-looking**. GSE Expected Metrics are historical measurement.
  `canPublishProjections` stays `false`; nothing here is a projection, a pick, or
  a "significant trend." Wiring any of this into the edge/scoring engine is a
  separate, founder-gated `MODEL_VERSION` step, not an automatic consequence of a
  `graduated` verdict.

---

## Appendix — module map

| File | Responsibility |
|---|---|
| `numeric.ts` | pure primitives: standardizer, `solveLinearSystem` (Gaussian elimination + partial pivoting, `null` on singular), stable `sigmoid`, `pearson`/`spearman`/`rankAverage`, `rmse`/`mae`, `round`. All return `0` (not `NaN`) on degenerate input. |
| `linear.ts` | `fitRidge` / `predictRidge` — closed-form ridge, unpenalized intercept, standardized features. |
| `logistic.ts` | `fitLogistic` / `predictLogistic` — deterministic L2 gradient descent, unpenalized bias at class-prior log-odds. |
| `types.ts` | `ExpectedMetricProvenance`, `PlayerExpectedMetric`, `computeFeatureSchemaHash` (djb2 drift hash). |
| `rollup.ts` | `rollupByPlayer` — per-player actual/expected/over-expected, `reportScale`, deterministic sort. |
| `expected-completion.ts` | GSE-CPOE (`gse-xcomp-v1`). |
| `expected-rush-yards.ts` | GSE-RYOE (`gse-xrush-v1`). |
| `expected-yac.ts` | GSE-xYAC (`gse-xyac-v1`). |
| `validation.ts` | `buildCalibrationReport`, `graduationVerdict`, `DEFAULT_GRADUATION_THRESHOLDS`. |
| `index.ts` | re-exports all of the above from `@sports/prediction-engine`. |
| `apps/web/lib/nflverse/expected-metrics.ts` | fit-on-load loader; PBP + NGS fetch, grain enforcement, empty/error states. |
| `apps/web/app/api/nflverse/expected-metrics/route.ts` | premium-gated GET route (measurement only). |

See `docs/data/NGS_GROUND_TRUTH_MAP.md` for the legal/data map behind the NGS
ground-truth series.
