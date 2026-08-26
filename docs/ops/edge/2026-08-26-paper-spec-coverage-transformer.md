# Paper spec — Factorized-attention coverage transformer (arXiv:2603.25901)

**Paper**: factorized attention transformer for NFL pass-coverage assignment,
receiver-defender matchup, and target-defender prediction from tracking data —
full text fetched 2026-08-26 (ar5iv).
**E2 slot**: EDGE-PATH §2/E2 explicitly parks this: "full-trajectory methods …
wait on a cleared tracking-data source — Big Data Bowl research licenses are not
commercial clearance."

## Verdict up front

**The model itself is FULLY GATED.** It requires (a) NGS 10 Hz player-tracking
trajectories 2020–2024 and (b) PFF per-defender coverage-assignment labels.
GSE holds neither, and neither has a commercial-clearance path today
(`source-rights-registry` has no approved tracking or PFF source; Big Data Bowl
terms are research-only). **No model port now. Do not ingest Big Data Bowl data
for production. Do not scrape PFF.** What follows records the method faithfully
(so the day a cleared source lands we implement without re-reading), then specs
the four transfer-learnable ideas that cost nothing in rights.

---

## 1. Method (as extracted — reference record for the gated build)

### 1.1 Architecture (§3.1)

- **Factorized attention**: instead of full spatio-temporal attention, apply
  "attention along the agent axis at each timestep, then along the time axis for
  each agent independently" (pattern credited to HoopTransformer). This is the
  temporal×agent factorization: O(T·A²) + O(A·T²) rather than O((T·A)²).
- Input per player per frame: (x, y) at 10 Hz, orientation angle, movement
  direction vector (angularly normalized), team affiliation (offense/defense),
  positional category via learnable embedding. Sequence window: frame −30
  (3 s pre-snap) through the pass-forward frame; frame 0 = snap.
- Categorical metadata "fused with the outputs of the transformer" (post-hoc
  embedding fusion, not input concatenation); temporal pooling averages player
  representations to play level; FFN heads produce predictions.
- Heads / output shapes: coverage assignment `[num_defenders, 20]` (20 assignment
  classes incl. position-specific zones — "hook curl left, deep right, etc." —
  and "no assignment" for rushers, §3.1 + App. 0.A.2); receiver-defender matchup
  `[num_defenders, num_receivers + 1]` (+1 = no matchup); target defender =
  single-label with defensive-player masking.
- Hyperparameters (Table 4, App. 0.A.3): coverage head 8 attention heads /
  6 layers / dropout 0.1; matchup 4/3/0.2; target defender 4/3/0.1.

### 1.2 Labels (§3.1, App. 0.A.2)

PFF ground truth: per-defender coverage assignment, defender-receiver matchup,
target defender. Known weakness the authors flag: labels are "a single
snapshot … typically captured at the end of the play" — play-level, so mid-play
rotations/handoffs make reported accuracy an **underestimate**.

### 1.3 Training (App. 0.A)

- Losses: per-defender cross-entropy (20 classes); per-defender CE over
  receivers + no-matchup; masked single-label CE for target defender.
- AdamW, weight_decay 1e-4, betas (0.9, 0.999); coverage head: cosine annealing
  with warm restarts (init_lr 2e-5, T₀=15); matchup/target: OneCycleLR
  (max_lr 2e-4).
- **Augmentation**: random trajectory truncation, 60/40 split of 11 fixed
  truncation strategies vs. truly random cuts within [−30, pass-arrival].
- Split: train 2020–2023, held-out test 2024.

### 1.4 Results (§5)

| Task | Accuracy | F1 |
|---|---|---|
| Receiver-defender matchup (full play) | 89.4% | 0.894 |
| Coverage assignment (post-snap, −10→arrival) | 91.8% | 0.879 |
| Coverage assignment (pre-snap only) | ~88% | — |
| Target defender (ML + post-processing) | 88.2% | — |
| Target defender (**rules baseline**: nearest defender) | 76.4% | — |

Prior CNN-LSTM team-level system: 88.9% over eight coverage types.

### 1.5 Derived metrics the authors propose (§5.4–5.5) — the transferable payload

- **Disguise rate**: pre-snap vs post-snap coverage-prediction accuracy gap per
  defense — quantifies "how effectively defenses disguise their true intentions"
  (example: KC lowest pre-snap accuracy under Spagnuolo).
- **Double-coverage rate**: share of plays where "at least 2 defenders playing
  man coverage have a primary matchup against the same receiver" — base rate
  5.5% (1,179 / 21,567 plays); authors flag annotation bias toward star WRs.

---

## 2. Data required vs. data GSE has

| Requirement | GSE status |
|---|---|
| NGS 10 Hz trajectories, 5 seasons | **Absent; no cleared source.** nflverse NGS = weekly means only |
| PFF assignment labels | **Absent; license required** |
| Compute for 6-layer transformer training | Available, irrelevant until data clears |

Nothing in the model is approximable from weekly aggregates — a temporal×agent
attention stack without trajectories is meaningless. Unlike papers 1–2, there is
no honest low-resolution refit. Stated plainly, per the tasking.

## 3. Port plan — transfer-learnable ideas only (portable now)

1. **Reserve the covariate schema** (≈0.5 day):
   `packages/types` (or `edge-lab/features/nfl-def-scheme-covariates.ts`) gets

   ```ts
   /** GATED: populated only from a cleared tracking/label source. Never derived
    *  from weekly aggregates — grain honesty. */
   export interface DefenseSchemeCovariates {
     readonly disguiseRate: number | null;       // pre/post-snap predictability gap, per defense-week
     readonly doubleCoverageRate: number | null; // §5.5 definition, per defense-week
     readonly provenance: "tracking_derived_gated";
   }
   ```

   All fields `null` until a source clears through the clearance engine +
   `source-rights-registry`. Downstream binds (e.g. WR-props shading by
   `doubleCoverageRate`) can be typed against this today and fail-closed on null,
   which is exactly the covariate-bus posture.
2. **Rules-baseline discipline** (0 days — a norm, enforced in the two sibling
   specs): their nearest-defender baseline (76.4% vs 88.2%) is the honest floor
   that makes the ML lift a real number. Standing edge-lab rule: *no learned
   covariate is admitted without a pre-registered rules baseline in the same
   walk-forward run* (the GMM spec's `cushionAllowedMean` baseline instantiates
   this).
3. **Truncation-augmentation ↔ as-of windows** (0 days): their random truncation
   is train-time robustness to partial information — the same invariant our
   walk-forward + as-of store already enforce at evaluation time. Recorded here
   as the design rationale; no code change.
4. **Label-grain honesty** (0 days): their play-level-label caveat is our
   "weekly mean ≠ catch frame" rule in another domain. When a labeled coverage
   source ever clears, labels get a grain tag from day one.

Unlock path (founder-gated, not engineering): licensed PFF feed, licensed
tracking vendor (e.g. league/vendor commercial terms), or an
`approved_api`/`approved_written_permission` entry in
`apps/web/lib/scraping/source-rights-registry.ts`. Until one exists, this paper
stays a reference record plus the schema stub.

## 4. Effort estimate

- Portable now: **~0.5 day** (schema stub + registry cross-reference note).
- Gated build (if/when data clears): multi-week ML project (data pipeline,
  training infra, eval harness) — re-open this spec §1 as the blueprint; not
  scoped further because the gate, not engineering, is binding.

## 5. What we deliberately skip, and why

- **The entire model** — both inputs are unlicensed; building it on Big Data Bowl
  research data would launder research terms into a commercial product
  (clearance-engine violation).
- **Aggregate-based imitation of disguise rate** — pre-snap vs post-snap
  divergence does not exist in weekly means; faking it from box-score deltas
  would be exactly the fabricated-signal behavior the platform bans.
- **PFF label acquisition by scraping** — `permission_required`-class conduct;
  vendor licensing or nothing.
- **20-class taxonomy adoption now** — with no labels, carrying their taxonomy
  would imply a capability we lack; the reserved schema carries only the two
  defense-week rates with a gated provenance tag.
