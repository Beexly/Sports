# DUPLICATION vs `claude/zealous-noether-inaaa3` (my session's work)

**No git-level conflicts.** Codex's code lives in `apps/web/lib/**`; my engine work lives in
`packages/prediction-engine/src/**`. Different paths → a merge would not collide. The concern
is **logic duplication / two-sources-of-truth drift**, not merge conflict. None blocks adoption.

| Area | Codex (apps/web) | Mine (packages/prediction-engine) | Relationship | Action |
|---|---|---|---|---|
| **Brier / ECE** | `lib/calibration/brier.ts`, `lib/calibration/ece.ts` (`brierScore`, `expectedCalibrationError`, `confidenceBuckets`, `maximumCalibrationError`) | `probability-calibration.ts` (`brierDecomposition`, `expectedCalibrationError`, `isotonicCalibration`) | **Duplicate core math.** Same definitions, different input shapes (`{probability,outcome}` vs `{p,y}`). Codex adds UI-oriented buckets; mine adds Murphy decomposition + isotonic/PAVA. Numerically consistent. | **Converge** on `@sports/prediction-engine` as the single calibration source of truth. Have `apps/web/lib/calibration` re-export / adapt from the engine. Low urgency (both pure, both AUDIT/display-safety-gated). |
| **CLV** | `lib/market/clv-candidate.ts` (coarse `close.line - open.line` readiness gate) | `clv.ts` + `clv-capture.ts` (directional spread/total/ML CLV, `deriveClosingSnapshotFromOdds`, `gradePickClv`) | **Conceptual overlap.** Codex's is a readiness gate; mine is the precise grade. Non-contradictory. | **Converge** the cockpit/DELTA path onto the engine's CLV once wired. |
| **GSIS→Player crosswalk** | `lib/nfl/player-identity-resolver.ts` (GSIS-keyed; `unsafeNameOnlyMergeAttempt` never auto-merges) | I had this **queued**, not built | **Codex superseded my queued item** — and did it safely. | **Adopt Codex's**; drop my queued duplicate. |
| **Team / game identity** | `lib/nfl/team-resolver.ts`, `game-resolver.ts`, `season-week.ts` | (none — I built scoring, not identity) | **Complementary.** | Keep; they fill a gap my work didn't. |
| **Memory** | `lib/memory/*` (candidate runtime, review queue, types) | (none) | **Complementary.** | Keep. |
| **Data reliability** | `lib/data-reliability/*` (stale detector, ingestion health) | (none) | **Complementary.** | Keep. |
| **Player projections / archetype / rush-scheme / opponent-adj / Elo / composite** | (none) | `player-projection.ts`, `player-archetype.ts`, `player-rush-scheme.ts`, `opponent-adjusted.ts`, `elo-backtest.ts`, `composite-score.ts` + `reliabilityCurve` | **Mine only — not on Codex's branch.** | Keep on my branch; no overlap. |

## Net
- **One true duplication** worth deduping later: Brier/ECE (calibration). Recommend the
  engine package become the single source; `apps/web/lib/calibration` adapts from it.
- **One supersede:** Codex built the GSIS crosswalk I had queued — adopt theirs.
- Everything else is complementary. Adoption does not threaten my prediction-engine work.
