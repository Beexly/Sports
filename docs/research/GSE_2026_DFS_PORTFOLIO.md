# GSE 2026 — DFS Portfolio Primitives (Sprint 5)

Continued R&D into the DFS competitive segment (SaberSim's "Dupes" leverage,
FantasyLabs/Stokastic correlation + exposure). Transparent, auditable math instead of a black box —
the same trust-first wedge as everywhere else. Pure, dependency-free, tested
(`apps/web/lib/gse/dfs-portfolio.ts`).

| Function | What it does | Beats the field by |
|---|---|---|
| `buildCorrelationMatrix` | Correlation from same-team / same-game structure (teammates positive, opponents slightly negative) | Showing the structure, not hiding it |
| `covarianceFromCorrelation` | Correlation × volatilities → covariance | — |
| `riskParityWeights` | Equal-risk-contribution exposure (inverse-vol for diagonal cov) | Exposure reflects *risk*, not raw size — no concentration in disguise |
| `lineupOverlap` / `portfolioUniqueness` | Jaccard overlap; 1 − mean pairwise overlap | A transparent "Dupes" leverage proxy users can audit |
| `exposureCounts` / `withinExposureCaps` | Per-player exposure + cap enforcement with violation list | Caps keep a portfolio from being one concentrated bet wearing a diversification costume |

Verified invariants: risk-parity reduces to inverse-volatility on a diagonal covariance and yields
equal risk contributions; identical lineups score 0 uniqueness, disjoint score 1; exposure caps flag
every violation.

This closes the `risk_parity` method gap (now marked **partial** in the registry). Remaining DFS gap:
Ledoit-Wolf shrinkage covariance (better correlation estimates under small samples) and full
Monte-Carlo slate simulation against a modeled field — both belong with a training worker.

## Verification
`tsc --noEmit` exit 0; new DFS tests pass; full GSE + cockpit-gating suites green; ESLint clean.
