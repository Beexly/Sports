1. **Edit `packages/prediction-engine/src/edge-lab/covariate-bus.ts`**:
   Add `readonly targets: number | null;` to the `CovariateRow` interface (under receiving).
2. **Create `packages/prediction-engine/src/expected-metrics/expected-cushion-separation.ts`**:
   - `export function computeCushionSeparationMatchup(rows: readonly CovariateRow[], gsisId: string, season: number, kickoffWeek: number, windowWeeks: number = 4)`
   - Filter `rows` for `statType === "receiving"`, `week > 0 && week < kickoffWeek`, `season === season`.
   - Calculate the league-wide mean cushion and separation from these rows to compute z-scores.
   - For the specific `gsisId`, get the trailing 4 weeks (or whatever `windowWeeks` specifies, plus maybe year-to-date. Let's just use `week >= kickoffWeek - windowWeeks`).
   - Aggregate `avgCushion`, `avgSeparation` weighted by `targets`.
   - If `totalTargets < 20`, return `null`.
   - Compute `cushionZ` and `separationZ` (using league means/stddevs computed point-in-time).
   - Matchup score = `cushionZ + separationZ`.
   - Return `{ matchupScore, cushionZ, separationZ }`.
3. **Register the metric**:
   - Add birth certificate in `metric-birth-certificate-registry.ts`.
4. **Exports**:
   - Export from `expected-metrics/index.ts`.
   - Export from `packages/prediction-engine/src/index.ts`.
5. **Tests**:
   - `packages/prediction-engine/src/expected-metrics/__tests__/expected-cushion-separation.test.ts`
   - Test synthetic Shakir cell (`avgCushion` 9.5, `avgSeparation` 4.4).
   - Test target floor (<20 targets returns null).
   - Test point-in-time (future weeks don't leak).
   - Test rolling window.
6. **PR formatting & Agent Bus**:
   - Save PR description / agent bus outbox as requested.
