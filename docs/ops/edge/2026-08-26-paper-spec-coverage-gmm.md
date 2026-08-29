# Paper spec — Unsupervised coverage identification via GMM (arXiv:1906.11373)

**Paper**: unsupervised man/zone identification from tracking data (GMM on engineered
per-DB features) — full text fetched 2026-08-26 (ar5iv).
**E2 slot**: EDGE-PATH §2/E2 "Unsupervised coverage clustering → WR/CB matchup
covariates". **priced:false until walk-forward admission.**

> Split up front, per data reality: the paper's features are per-frame **trajectory
> statistics** (10 Hz x/y/speed/direction). GSE holds nflverse weekly aggregates,
> not trajectories. So this spec ports the paper's *machinery* — unsupervised
> mixture + stability-based model selection + soft posteriors as covariates — at
> the **defense-week grain** on aggregate proxies (portable now), and quarantines
> the literal per-play feature set behind a cleared tracking source (gated).

---

## 1. Method (as extracted from the paper)

### 1.1 Engineered features (§3.2, Table 1) — per cornerback, per play, per time period

| Feature | Definition (verbatim where quoted) |
|---|---|
| VAR_X | variance in x-coordinate: `Σ_t (x_{i,t} − μ_x)² / n` |
| VAR_Y | variance in y-coordinate: `Σ_t (y_{i,t} − μ_y)² / n` |
| SPEED_VAR | variance in speed: `Σ_t (s_{i,t} − μ_s)² / n` |
| OFF_VAR | "variance in the distance from the nearest offensive player" |
| DEF_VAR | "variance in the distance from the nearest defensive player" |
| OFF_MEAN | "mean distance from the nearest offensive player at every frame" |
| DEF_MEAN | "mean distance from the nearest defensive player at every frame" |
| OFF_DIR_VAR | "variance in difference in degrees of direction of motion between player and nearest offensive player" |
| OFF_DIR_MEAN | mean of the same direction difference |
| RAT_MEAN | mean of (distance to nearest receiver) / (that receiver's distance to its nearest defender) |
| RAT_VAR | variance of that ratio |

Computed over **five time snapshots**: pre-snap, snap, snap-throw midpoint, throw,
post-throw. (Orientation features proposed but unavailable in their data.)

### 1.2 Mixture model (§4)

- Unit: one feature vector per CB × play × time period — 16,316 vectors from
  6,712 pass plays (Big Data Bowl, 2017 weeks 1–6, 10 Hz).
- **Gaussian mixture, EM, diagonal covariance**; no dimension reduction (authors
  acknowledge collinearity and keep raw features).
- **Model selection**: grid G ∈ {2..9}; chosen by **leave-one-week-out (LOWO)
  cross-validation maximizing partition stability via adjusted Rand index (ARI)**.
  Result: **G\* = 2**, ARI > 0.9 — the two clusters are man vs. zone.
- Soft assignment (posterior): `P(G(x)=g) = f̂*_g(x) / Σ_h f̂*_h(x)`.
- Semantic labeling: **manual** — an author with DB experience watched play
  animations and named cluster→{man, zone}.
- Feature importance: `Influence_m = mean-ARI(all features) − mean-ARI(drop m)`;
  top: OFF_DIR_VAR (post-throw); ratio features expected most discriminative
  (man ⇒ small, stable defender–receiver distance).

### 1.3 Evaluation

No ground-truth labels by design; validation = LOWO ARI stability + qualitative
case studies (Figs. 7–9). No film-label benchmark exists in the paper.

---

## 2. Data required vs. data GSE has

| Paper needs | GSE has | Verdict |
|---|---|---|
| 10 Hz trajectories (x, y, speed, direction) per player | none — Big Data Bowl research terms are **not commercial clearance** | **Gated**: all 11 Table-1 features |
| Per-play defender identity/frames | none | Gated |
| Aggregate proximity/tendency proxies | nflverse NGS weekly means (CC-BY-4.0) via `data-ingestion/nflverse-ngs.ts` + `edge-lab/covariate-bus.ts`: `avgCushion`, `avgSeparation`, `aggressiveness`, `avgTimeToThrow`, `avgAirYardsDifferential`, `pctAttemptsGte8Defenders`; schedule join via `NFLVERSE_CATALOG.schedules` + `edge-lab/loaders/nfl-games.ts` | **Portable now** at defense-week grain |
| Per-play "defenders in box" | nflverse `pbp_participation` exists in the catalog **but is FTN CC-BY-SA-4.0 and per `nflverse-source.ts` header is not ingested** | **Gated on a founder/legal share-alike decision** — do not wire without it |

Grain honesty (covariate-bus law): weekly means over one game are *game-level
tendencies*, not play-level coverage calls. The portable output is therefore a
**defense-week man-tendency score**, never a per-play coverage label.

## 3. Port plan (portable-now half)

### 3.1 Defense-week feature vectors — `packages/prediction-engine/src/edge-lab/features/nfl-def-coverage-profile.ts`

For defense D, week w (join opponent's player rows via schedules; leak rule:
built only from weeks `1..t` for a game at `t+1`, week=0 dropped — reuse
covariate-bus selection semantics):

| GSE feature | Construction | Paper analog |
|---|---|---|
| `cushionAllowedMean` | mean `avgCushion` over opposing receivers' NGS receiving rows that week | OFF_MEAN at snap (press-man ⇒ low cushion) |
| `separationAllowedMean` | mean `avgSeparation` allowed | OFF_MEAN at throw / RAT_MEAN direction |
| `aggressivenessFaced` | opposing QB `aggressiveness` (% tight-window throws) | tight coverage ⇒ man share |
| `tttForced` | opposing QB `avgTimeToThrow` | pressure/blitz structure proxy |
| `airYardsDiffForced` | opposing QB `avgAirYardsDifferential` | deep-shot suppression |
| `boxRateFaced` | mean `pctAttemptsGte8Defenders` over opposing rushers | box loading / single-high proxy |

Weighted by opponent player volume where available (receptions/attempts from
`player_stats_week`). Missing cell ⇒ drop the defense-week (fail-closed, no
imputation — bus law).

### 3.2 GMM — `packages/prediction-engine/src/edge-lab/kernel/gmm-em.ts` (pure, no deps)

Port the paper's setup exactly, small-n adapted:

- z-score features on training weeks only; **EM for a diagonal-covariance GMM**
  (log-space responsibilities; variance floor 1e-6; ≤500 iters; tol 1e-8;
  seeded via `edge-lab/rng.ts` — deterministic).
- **K selection = the paper's criterion**: K ∈ {2, 3, 4}; leave-one-week-out
  refits; pick K maximizing mean pairwise **ARI** between the held-out
  partitions (implement ARI in `edge-lab/stats.ts`; exact formula, no
  approximation). Expect K\*=2 per paper; if LOWO ARI < 0.7 for every K, the
  aggregate signal is unstable ⇒ **stop, record the negative in the trials
  registry, do not bind** (that is a legitimate kill).
- Soft posterior per defense-week: `P(cluster g | x)` — the paper's
  soft-assignment formula verbatim.
- **Semantic labeling — pre-registered rule replacing their film review** (we
  have no film step and will not eyeball): the cluster with the lower mean
  `cushionAllowedMean` (tighter press) is labeled MAN-leaning. Declared here,
  ahead of fitting, so it cannot be chosen post-hoc. **Gated in the shipped
  code**: `labelClustersByCushionRule` (`edge-lab/kernel/gmm-em.ts`) applies
  this mapping ONLY when the caller passes an explicit, externally-computed
  `polarityValidation: { passed: boolean }`; with `null` or a failed
  validation it returns `{ kind: "anonymous" }` — clusters never get a
  semantic label (`man_zone`) until polarity is independently confirmed, so a
  stable-but-inverted fit can never silently mislabel `oppManTendency`.
- Output: `manTendencyPosterior ∈ [0,1]` per (defense, season, week), plus the
  paper's influence diagnostic (ARI drop per dropped feature) in the fit
  report. Until the polarity validation above passes, treat cluster ids as
  anonymous — do not bind `oppManTendency` to a semantic MAN/ZONE meaning.

### 3.3 Bind — `packages/prediction-engine/src/edge-lab/props-hb-man-tendency-bind.ts`

Clone the `props-hb-cpoe-comp-bind.ts` state machine:

- Request: `{ gsisId (WR), season, kickoffWeek, catch: CatchSample,
  oppManTendency: number, oppManTendencyAsOfWeek: number }`.
- Guards: as-of integer, non-zero, strictly `< kickoffWeek`; posterior finite and
  in [0,1]; player's own `avgSeparation`/`avgCushion` pulled via
  `latestPriorRow(rows, gsisId, season, "receiving", kickoffWeek)`.
- Emitted covariates (all `CovariateCell`, `grain: "week_t_for_tplus1"`):
  `oppManTendency` (provenance `"expected_metric_v1"`), `avgSeparation`,
  `avgCushion` (provenance `"weekly_ngs_mean"`), **and the interaction
  `manTendency × avgSeparation`** — the matchup covariate this whole port exists
  for (separation skill matters more against man).
- Refuse codes: `"no_prior_row" | "null_separation" | "null_cushion" |
  "tendency_as_of_boundary" | "non_finite_tendency"`. **`priced: false`.**
- Consumers: `props-hb-catch`, `props-hb-adot-sep` family, WR fantasy projections.

### 3.4 Admission

Standard edge-lab law: `walkForwardSplits` + `sealHoldout`,
`shuffledTimePlacebo` + `conditionalMiProbe` on `oppManTendency` and the
interaction, `recordFeatureAdmissionTrial` → `decideFamilyAdmissions`
(Benjamini–Hochberg; family = {tendency, interaction} + every K tried). A
**rules baseline first** (per the transformer-paper discipline, see companion
spec): plain `cushionAllowedMean` as a raw covariate must be beaten by the GMM
posterior in walk-forward, else admit the simpler feature or nothing.

## 4. Effort estimate

| Piece | Est. |
|---|---|
| Defense-week aggregation feature module + tests | 2 days |
| EM GMM + ARI + LOWO selection + tests (pure TS) | 2–3 days |
| Bind + tests | 1–1.5 days |
| Admission run + baseline comparison | 1 day |
| **Total** | **~1.5 engineer-weeks** |

## 5. What we deliberately skip, and why

- **All 11 Table-1 trajectory features and the per-CB-per-play grain**: require
  10 Hz tracking we do not hold a commercial license for. Big Data Bowl terms are
  research-only (EDGE-PATH §2 says this explicitly). These become buildable the
  day a cleared tracking source lands — the feature definitions above are the
  ready-to-implement checklist for that day.
- **Film-study cluster labeling**: not reproducible or auditable; replaced by the
  pre-registered lowest-cushion rule (§3.2) declared before fitting.
- **`pbp_participation` box counts (per-play)**: CC-BY-SA share-alike — excluded
  until a founder/legal decision; `boxRateFaced` uses the CC-BY NGS rushing
  aggregate instead.
- **Safeties / non-CB roles**: the paper itself defers them; our aggregate grain
  cannot separate roles at all — defense-unit tendency only, stated honestly.
- **Per-play coverage labels as a product surface**: weekly aggregates cannot
  support that claim; the output is a tendency score, and every cell carries
  grain + provenance so no consumer can mistake it for charting.
