# Buried sports implementation verification

Searched committed source in `main` (`a39f75ef4fba786708c303d9de876a35acdfd138`) and `motif/gse-intelligence-build-2026-10-02` (`1758cfa0dc4f8f387328151cbd9008416d31853c`). The evidence below is executable implementation lines, not comment-only mentions.

## Results

### Rights Classification Gate — FOUND in both

- **main** — `apps/web/lib/scraping/clearance-engine.ts:374-375`: `if (!clearance.allowed) { throw new Error(`
- **motif/gse-intelligence-build-2026-10-02** — same path and lines: `if (!clearance.allowed) { throw new Error(`

### Odds Capture Governor — FOUND in both

- **main** — `packages/ingestion-pipeline/src/refresh-odds.ts:310`: `if (!decision.allow) {`
- **motif/gse-intelligence-build-2026-10-02** — same path and line: `if (!decision.allow) {`

### Dixon-Coles — FOUND in both

- **main** — `packages/prediction-engine/src/dixon-coles.ts:93`: `const tau = dixonColesTau(x, y, lambdaHome, lambdaAway, r);`
- **motif/gse-intelligence-build-2026-10-02** — same path and line: `const tau = dixonColesTau(x, y, lambdaHome, lambdaAway, r);`

### Bayesian blend — FOUND in both

- **main** — `packages/prediction-engine/src/nfl/generalized-poisson.ts:157`: `forN === 0 ? priorFor : (priorFor * priorStrength + forSum) / (priorStrength + forN);`
- **motif/gse-intelligence-build-2026-10-02** — same path and line: `forN === 0 ? priorFor : (priorFor * priorStrength + forSum) / (priorStrength + forN);`

### Poisson/ELO — FOUND in both

- **main** — Poisson: `packages/ingestion-pipeline/src/build-independent-fair-values.ts:566`: `const poisson = poissonIndependentFairValue({`; Elo: `packages/prediction-engine/src/elo-estimator.ts:91`: `const homeFairProb = eloWinProbability(homeRating, awayRating, options);`
- **motif/gse-intelligence-build-2026-10-02** — Poisson: `packages/ingestion-pipeline/src/build-independent-fair-values.ts:536`: `const poisson = poissonIndependentFairValue({`; Elo: `packages/prediction-engine/src/elo-estimator.ts:91`: `const homeFairProb = eloWinProbability(homeRating, awayRating, options);`

## Conclusion

All five items have implementation evidence in both refs. The claim that they are absent from both `main` and the motif ref is not supported by these revisions.
