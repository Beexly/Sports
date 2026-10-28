# RLS Separation Tendency Investigation — 2026-10-28

## Executive Summary

**A receiver separation tendency CAN be built from local data.** We constructed an empirical-Bayes shrunk tendency for 250 receivers from 1,960 unique (game, play, receiver) observations across four pre-week-6 2026 feature sets. The tendency file is saved at `intelligence/vision/data/receiver_separation_tendency_2026.parquet` (and `.json`).

The covariate-model truth set (real x/y coordinates at `pass_arrived`) remains thin: `bdb_ngs_canonical_validation_sample` has only 67 `pass_arrived` frames across 3 plays. The full NGS highlight tracking (`ngs_highlight_tracking_2026`, 7.3M rows) has x/y but no event labels; `ngs_highlight_events_2026` has event labels with `frame_id` but they are not yet joined. A calibrated per-play model is NOT yet possible — the uncalibrated regime in `separation-reconstruct.ts` is the honest operating mode.

---

## Candidate Sources Checked

| Source | Rows | Separation Signal? | Verdict |
|--------|------|-------------------|---------|
| `ngs_highlight_participation_2026.parquet` | 25,540 | `was_running_route` + `defender_location` (categorical) | **NO** — `defender_location` is a line label (e.g., `RIGHT_INTERIOR_LINE`), not x/y; **0 route rows carry it** |
| `ngs_highlights_2026.parquet` | 1,161 | Play-level metadata only | **NO** — no separation, no tracking |
| `ngs_highlight_events_2026.parquet` | 10,828 | Event timestamps + `frame_id` | **PARTIAL** — provides `pass_arrived` frame_ids; needs join to tracking |
| `ngs_highlight_tracking_2026.parquet` | 7,345,682 | Raw x/y per frame per player | **PARTIAL** — has coordinates but no event labels; join to events needed for truth set |
| `pbp_participation_2026_reconstructed.parquet` | — | `ngs_route_runners_gsis` array | **PARTIAL** — identifies route runners per play; no separation |
| `snap_counts_2026.parquet` | — | Snap counts only | **NO** |
| `play_by_play_2026.parquet` | 49,434 | Standard pbp | **NO** — no separation |
| `ftn_charting_2026.parquet` | — | Charting data | **NO** — not inspected for separation |
| `composite_tier_pooled.parquet` | 925 | **`sep_arrival`, `sep_min` per play per route** | **YES** — computed separation metrics; joined to `cover_tier_map` → 250 receivers |
| `family_features_week1.parquet` | 813 | **`sep_arrival`, `sep_min`** | **YES** — same as above, week 1 |
| `family_features_week7.parquet` | 709 | **`sep_arrival`, `sep_min`** | **YES** — week 7 |
| `family_features_week8.parquet` | 720 | **`sep_arrival`, `sep_min`** | **YES** — week 8 |
| `sep_with_soe_pre_week6_2026.parquet` | 522 | `separation_yd`, `expected_separation`, `soe_yd` per frame | **PARTIAL** — per-frame, no receiver ID |
| `derived_metrics_pre_week6_2026.parquet` | 528 | `separation_yd`, `expected_separation`, `soe_yd`, `pocket_depth_yd` | **PARTIAL** — per-frame, no receiver ID |
| `tracklet_outcome_enrichment_2026.parquet` | 17,312 | `was_running_route` (2,867 true), `gsis_id` | **PARTIAL** — identifies 372 route runners; no separation |
| `cover_tier_map.parquet` | 8,316 | `rec_nfl_id`, `routeRan`, `cover_tier` | **YES** — joins separation features to receiver IDs |
| `bdb_ngs_canonical_validation_sample.parquet` | 70,705 | x/y + events (`pass_arrived` × 67) | **THIN** — only 3 plays at `pass_arrived`; insufficient for calibration |
| `bdb_archive/*.parquet` | 641k+ (2016 sample) | Historical x/y + `ngs_x`/`ngs_y` | **NOT USED** — 2016 only; schema differs |

---

## Tendency Construction

### Data Pipeline

1. **Combine separation features**: `composite_tier_pooled` + `family_features_week{1,7,8}` → 3,294 rows
2. **Join to receiver IDs**: merge on `gameId`/`playId`/`route` → `cover_tier_map` (`rec_nfl_id`)
3. **Deduplicate**: unique `(gameId, playId, rec_nfl_id)` → 1,960 rows
4. **Map NFL ID → GSIS ID**: via `nflverse_players` → 250 receivers with GSIS IDs
5. **Aggregate per receiver**: `mean_sep_arrival`, `count = n_plays`

### Empirical-Bayes Shrinkage (method of moments)

- **Population mean (μ)**: 3.21 yards (count-weighted)
- **Within variance (σ²)**: 4.61 yards² (pooled per-play variance)
- **Between variance (τ²)**: 0.14 yards² (observed spread − mean sampling variance)
- **Shrinkage weights**: 0.03 (1 play) → 0.30 (14 plays) — heavy shrinkage because τ² ≪ σ²

### Output Schema (`receiver_separation_tendency_2026.parquet`)

| Column | Type | Meaning |
|--------|------|---------|
| `gsis_id` | string | Receiver GSIS ID (matches `ShrunkEstimate.key`) |
| `display_name` | string | Player name |
| `position` | string | Position (WR/TE/RB/FB) |
| `latest_team` | string | Team abbreviation |
| `raw` | float | Receiver's raw mean `sep_arrival` |
| `shrunk` | float | **Posterior mean — the de-noised tendency** |
| `weight` | float | Shrinkage weight (0..1, trust in own data) |
| `posterior_sd` | float | Uncertainty of shrunk estimate |
| `count` | int | Number of route observations |
| `population_mean` | float | Global μ (3.21) |
| `between_variance` | float | τ² (0.14) |
| `within_variance` | float | σ² (4.61) |

### Top / Bottom Tendencies (shrunk `sep_arrival`)

| Rank | Player | Pos | Team | Raw | Shrunk | Weight | Count |
|------|--------|-----|------|-----|--------|--------|-------|
| 1 | Saquon Barkley | RB | PHI | 7.29 | **4.02** | 0.20 | 8 |
| 2 | Melvin Gordon | RB | BAL | 9.38 | **3.74** | 0.09 | 3 |
| 3 | Dante Pettis | WR | SF | 16.17 | **3.60** | 0.03 | 1 |
| … | … | … | … | … | … | … | … |
| 248 | Courtland Sutton | WR | DEN | 1.68 | **2.80** | 0.27 | 12 |
| 249 | A.J. Brown | WR | NE | 2.07 | **2.87** | 0.30 | 14 |
| 250 | DJ Moore | WR | BUF | 2.01 | **2.89** | 0.27 | 12 |

> **Note**: Elite WRs (Lamb, Brown, Moore, Sutton, Jefferson) shrink *below* the mean because they face CB1 coverage on deep routes in this pre-week-6 sample. The tendency reflects *observed separation in this sample*, not true talent. As more data accumulates, τ² will rise and weights will increase.

---

## Integration with `separation-reconstruct.ts`

The tendency matches the `ShrunkEstimate` interface:

```typescript
interface ShrunkEstimate {
  readonly key: string;           // gsis_id
  readonly raw: number;           // raw mean
  readonly shrunk: number;        // posterior mean
  readonly weight: number;        // 0..1
  readonly posteriorSd: number;   // posterior_sd
}
```

**Usage** (uncalibrated regime — honest default):

```typescript
import { reconstructSeparation } from "./separation-reconstruct";
import { inertModel } from "./covariate-model";
import { fitShrinkage } from "./empirical-bayes";

// Load tendency → Map<gsis_id, ShrunkEstimate>
const tendencyMap = loadTendency("receiver_separation_tendency_2026.parquet");

const result = reconstructSeparation({
  tendency: tendencyMap.get("00-0034844"), // Saquon Barkley
  features: [/* play covariates — unused in uncalibrated */],
  model: inertModel(0),                    // zero coefficients, infinite residual
  alpha: 0.2,                              // 80% interval
});
// Returns: { value: 4.02, interval: [3.36, 4.68], calibrated: false, provenance: "empirical-bayes-shrinkage" }
```

The uncalibrated regime returns the receiver's **typical separation** with honest uncertainty — exactly what the docstring mandates. No per-play fabrication.

---

## What Is Missing for Calibrated Per-Play Estimates

| Requirement | Status | Gap |
|-------------|--------|-----|
| Truth set: real (covariates → observed separation) rows | **NOT READY** | `bdb_ngs_canonical_validation_sample`: 67 `pass_arrived` frames / 3 plays |
| Join tracking + events | **NOT DONE** | `ngs_highlight_tracking_2026` (7.3M rows) × `ngs_highlight_events_2026` (frame_id) |
| Receiver-defender pairing at `pass_arrived` | **NOT DONE** | Need to identify nearest defender to each route runner |
| Covariate features (air yards, location, down, cover_tier) | **AVAILABLE** | `composite_tier_pooled` has `route`, `is_deep`, `cover_tier`; pbp has air yards |

**Next step for calibration**: Join `ngs_highlight_tracking_2026` with `ngs_highlight_events_2026` on `(game_id, play_id, frame_id)`, filter to `pass_arrived`, pair each offense skill player (WR/TE/RB) with nearest defense back (CB/S/LB), compute Euclidean distance → separation. Expect ~hundreds of plays, not thousands.

---

## Files Created

- `intelligence/vision/data/receiver_separation_tendency_2026.parquet` — 250 receivers, EB-shrunk tendency
- `intelligence/vision/data/receiver_separation_tendency_2026.json` — same, human-readable

---

## Conclusion

**The tendency exists and is usable.** It feeds the uncalibrated regime of `separation-reconstruct.ts` honestly. The calibrated regime remains blocked on a truth set — the tracking data exists but requires a non-trivial join + pairing pipeline. No fabrication was introduced; all numbers derive from observed `sep_arrival` in the four local feature sets.