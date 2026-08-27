# Paper spec — CPAE / expected-completion GAM surfaces (arXiv:1906.03339)

**Paper**: "next-gen-scraPy: Extracting NFL Tracking Data from Images to Evaluate
Quarterbacks and Pass Defenses" — full text fetched 2026-08-26 (ar5iv).
**E2 slot**: EDGE-PATH §2/E2 "CPAE / expected-completion surfaces". Feeds props +
fantasy p-paths through the covariate bus. **priced:false until walk-forward admission.**

> Scope guard: the paper has two halves — (a) an image-scraping pipeline that pulls
> pass coordinates out of NGS chart JPEGs, and (b) a spatial completion-probability
> model + CPAE aggregation. Half (a) is **rights-gated and NOT wanted** (scraping
> NGS media assets; our posture forbids it — see CLAUDE.md Legal Scraping Posture).
> This spec ports only half (b), refit on data we already hold under CC-BY-4.0.

---

## 1. Method (as extracted from the paper)

### 1.1 Completion-probability surface — GAM, logit link (§3.1.2)

```
log( P(Complete | x, y) / P(Incomplete | x, y) ) = c0 + f_x(x) + f_y(y) + f_xy(x, y)
```

- `x` = pass depth relative to the line of scrimmage, range −10 … +55 yards.
- `y` = horizontal position relative to field center (sideline-bounded).
- Smoothers: **tensor-product interaction smoothers** ("work well in situations
  where both marginal and interaction effects are present", §3.1.2; choice
  supported by cross-validation — CV procedure not detailed in the paper).
- Attempt-location density estimated by bivariate-normal **KDE with Scott's rule**
  bandwidth `ĥ = 1.06 × min(σ̂, IQR/1.34) × n^(−1/5)` (§3.1.1, fn. 7).

### 1.2 Small-sample shrinkage — "2-D Naive Bayes smoothing" (§3.2)

Per-group (QB or defense) surfaces are regressed toward the league surface,
weighted by local data mass:

```
P̂*_g(Complete|x,y) =
    [ N_g · f̂_g(x,y) · P̂_g(Complete|x,y)  +  N_median · f̂_NFL(x,y) · P̂_NFL(Complete|x,y) ]
  / [ N_g · f̂_g(x,y)                       +  N_median · f̂_NFL(x,y) ]
```

- `N_g` = group pass count; `f̂_g` = group attempt density; `N_median` = median
  pass attempts across the group class — the single tunable shrinkage knob
  ("can be adjusted to give more or less weight to the league-wide distribution").

### 1.3 CPAE aggregation (Eq. 1, §4.5)

CPAE is a **group-level** metric (not per-pass): the above-league-average
surface integrated against the group's own attempt density:

```
CPAE_g = ∬ P̂*_{g,league}(Complete | x, y) · f̂_g(x, y) dx dy
```

where `P̂*_{g,league}` is the group surface minus the league surface (the
"above expectation" field). Computed for QBs (min 100 passes/season) and for
**defenses** (pass coverage allowed) — the defense direction is the part GSE
does not yet have.

### 1.4 Evaluation (paper)

- Coordinate fidelity vs. Big Data Bowl tracking: median deviation 1.7 yd (§4.1).
- **Correlation of their CPAE vs NGS's proprietary CPAE: ρ = 0.81 (2017),
  ρ = 0.91 (2018)** (§4.5) — this is the validation target we replicate.
- Sample: 27,946 passes / 840 charts / 491 games, 2017–2018.

---

## 2. Data required vs. data GSE has

| Paper needs | GSE has | Verdict |
|---|---|---|
| (x, y) coordinates per pass | nflverse **pbp** (CC-BY-4.0): `air_yards` = continuous depth (≡ their x), `pass_location` ∈ {left, middle, right} (their y at 3-bin resolution), `complete_pass`, `passer_player_id`, `defteam`, `qb_hit`, `down`, `ydstogo`, `yardline_100`, `shotgun`, `no_huddle` | **Portable now** — depth is fully continuous; horizontal is coarse (3 bins). We do NOT fake y-resolution we don't have. |
| Their scraped chart images | — | **Deliberately skipped** (rights posture) |
| League + per-QB + per-defense samples | pbp since 1999 (catalog: `packages/data-ingestion/src/nflverse-source.ts`, `NFLVERSE_CATALOG.pbp`) | Portable now |
| NGS vendor CPAE for validation | NGS weekly rows carry vendor CPOE/xComp — **y-axis only** per covariate-bus law; permitted as *validation ground truth* exactly as `expected-metrics/expected-completion.ts` already does (correlate, never serve, never feed as p) | Portable now |

Existing prior art in-repo: `packages/prediction-engine/src/expected-metrics/expected-completion.ts`
(gse-xcomp-v1) is a plain logistic with `airYards + airYards²` + location dummies.
The paper's upgrade over it is threefold: **(i)** proper smooth depth profiles per
location bin (spline basis, not a global quadratic), **(ii)** the §3.2 shrinkage
estimator for per-group surfaces, **(iii)** the Eq.-1 density-weighted CPAE
aggregate — and the **defense-allowed** direction.

## 3. Port plan

### 3.1 Module A — surface fit: `packages/prediction-engine/src/expected-metrics/cpae-surface.ts`

Discrete tensor product at our real resolution: 3 location bins × smooth depth.

- Depth basis: natural cubic spline, fixed interior knots at depth
  `[-2, 2, 6, 10, 15, 20, 30]` (clamped domain [−10, 60]); basis functions
  `B_1..B_K` (K = knots+2). Deterministic, versioned: `EXPECTED_CPAE_FEATURE_KEYS`.
- Tensor product ≈ location-specific smooths: features `B_k × 1[loc=l]` for
  l ∈ {left, middle, right} → 3·K spline features (+ the gse-xcomp-v1 context
  block: `qbHit, down, ydstogo, yardline100, shotgun, noHuddle` reused verbatim).
- Fit with the existing `fitLogistic` (`expected-metrics/logistic.ts`) — its L2
  penalty (default `1e-3`) is the smoothing penalty; sweep λ ∈ {1e-4, 1e-3, 1e-2}
  inside walk-forward folds only (never on holdout).
- `MODEL_VERSION = "gse-cpae-surface-v1"`; ≥ `MIN_DROPBACKS_TO_FIT = 200` for the
  league fit (reuse constant). Fit-on-load like gse-xcomp-v1; provenance via
  `computeFeatureSchemaHash`.
- **As-of cutoff (CodeRabbit finding, satisfied structurally in the shipped
  pure core)**: `cpae-surface.ts` does no data loading and takes no `asOfWeek`
  parameter itself — `fitCpaeSurface`/`predictCpaeCompletionProbability` only
  ever see rows the CALLER has already filtered. The real fit-on-load
  increment (this section) MUST perform that filter — restrict training rows
  to weeks strictly before the stamped `asOfWeek` — before calling the pure
  core; the module's own leakage mutation test (future rows appended + refit
  must be deeply-equal to the unmutated fit) proves the pure core itself
  cannot leak, but the loader is where the cutoff has to actually be applied.

### 3.2 Module B — shrinkage + CPAE aggregate (same file or `cpae-aggregate.ts`)

Discretize §3.2 exactly on a fixed grid: depth bins
`[-10,-2) [-2,2) [2,6) [6,10) [10,15) [15,20) [20,30) [30,60)` × 3 locations = 24 cells.
With cell counts `n_g(c)` (so `N_g · f̂_g(c) = n_g(c)`):

```
P̂*_g(c) = [ n_g(c)·P̂_g(c) + (N_med/N_NFL)·n_NFL(c)·P̂_NFL(c) ]
         / [ n_g(c)        + (N_med/N_NFL)·n_NFL(c)          ]
```

`P̂_g(c)` = mean model-adjusted completion rate of group g in cell c;
`N_med` = median attempts across the group class (per paper default — expose as a
parameter, register any tuning in the trials registry). Then (Eq. 1, discrete):

```
GSE-CPAE_g = Σ_c ( n_g(c) / N_g ) · ( P̂*_g(c) − P̂_league(c) )       [×100 → pp]
```

Compute for two group classes, both `PlayerExpectedMetric`-shaped with
`asOfWeek` stamped:
- **QB grain** (`passer_player_id`, min 100 attempts — paper's qualifier).
- **Defense grain** (`defteam`) → `cpaeAllowed` — coverage quality allowed. NEW signal.

Validation gate (before any bind), **QB grain only** — NGS vendor CPOE is the
only grain with a vendor number to correlate against: correlate season
GSE-CPAE vs NGS vendor CPAE per `expected-metrics/validation.ts` pattern;
paper achieved ρ = 0.81–0.91 — **admission floor for the metric itself:
ρ ≥ 0.75** on the most recent complete season, else stop and diagnose.
**Defense grain has no vendor ground truth to correlate against** (no
published "coverage quality allowed" vendor metric exists) — `cpaeAllowed`
therefore needs its own, separately defined admission target before any bind
may consume it; do not gate defense admission on the QB-grain ρ number, and
do not bind `cpaeAllowed` until that target is defined.

### 3.3 Module C — bind: `packages/prediction-engine/src/edge-lab/props-hb-cpae-def-bind.ts`

Clone the `props-hb-cpoe-comp-bind.ts` pattern (same refuse-code state machine):

```ts
export interface CpaeDefBindRequest {
  readonly gsisId: string;            // passer
  readonly season: number;
  readonly kickoffWeek: number;
  readonly comp: CompSample;          // or PassYardsSample for the yards bind
  readonly qbCpae: number;            // GSE-CPAE, signed pp
  readonly qbCpaeAsOfWeek: number;    // must be int, ≠0, < kickoffWeek
  readonly oppCpaeAllowed: number;    // defense GSE-CPAE-allowed, signed pp
  readonly oppCpaeAsOfWeek: number;   // same boundary rules
}
```

- As-of guards identical to `gseCpoeAsOfWeek` handling (integer, non-zero,
  strictly `< kickoffWeek`); refuse codes: `"cpae_as_of_boundary" |
  "non_finite_cpae" | "opp_cpae_as_of_boundary" | "non_finite_opp_cpae"`.
- Emit `CovariateCell`s with `provenance: "expected_metric_v1"`,
  `grain: "week_t_for_tplus1"`. **`priced: false` on every result.**
- Consumers: completions model (`props-hb-comp`), pass-yards
  (`props-hb-pass-yards`), and the fantasy QB projection path.

### 3.4 Admission (edge-lab law, non-negotiable)

1. `walkForwardSplits` / `sealHoldout` (`edge-lab/walk-forward.ts`) — holdout
   stays sealed behind `FOUNDER_HOLDOUT_TOKEN`.
2. `shuffledTimePlacebo` + `conditionalMiProbe` (`edge-lab/placebo.ts`) on the two
   new covariates.
3. `recordFeatureAdmissionTrial` + `decideFamilyAdmissions` with
   `benjaminiHochberg` (`edge-lab/trials-registry.ts`) — family:
   `{qbCpae, oppCpaeAllowed}` plus any λ/N_med values tried.
4. Flip `priced` only on admission; until then the bind ships dark.

## 4. Effort estimate

| Piece | Est. |
|---|---|
| A: spline basis + surface fit + tests | 2–3 days |
| B: shrinkage grid + CPAE aggregate (QB + defense) + ρ-validation + tests | 2 days |
| C: bind + tests | 1 day |
| Admission run (walk-forward + placebo + registry) | 1 day |
| **Total** | **~1 engineer-week** |

## 5. What we deliberately skip, and why

- **The entire image pipeline** (§2: HTML scraping, homography, HSV thresholding,
  K-means++/DBSCAN cluster extraction): scrapes NGS media — forbidden by our
  rights posture, and unnecessary: PBP gives depth exactly and location coarsely.
- **Continuous-y KDE / bivariate Scott's-rule density**: our horizontal axis has 3
  bins; a 2-D KDE would cosplay resolution we don't have. Discrete cell masses are
  the honest equivalent (grain honesty, same rule as the covariate bus header).
- **Vendor NGS xComp/CPOE as model input**: y-axis only (covariate-bus law).
  Used solely as validation ground truth, mirroring gse-xcomp-v1.
- **Per-pass CPAE**: the paper itself doesn't define one; we don't invent one.
