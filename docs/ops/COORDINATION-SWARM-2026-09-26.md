# COORDINATION BROADCAST — wiring swarm, 2026-09-26

Read this before starting any work. If you are another MiMo session or a Claude Code
session working this repo, this file is the single source of truth for who owns what.

## 1. Repo state (verify, do not trust prose)

```bash
git ls-remote origin refs/heads/main     # no cache — authoritative tip
git fetch origin main
git log --oneline -12 origin/main
```

The wiring session is at `1fe995b9e` and clean. Their residue work (`d4280364e`) and
both handoff docs are on `main`. Your commits are ancestors of the tip, not the tip.

Dead pre-rebase hashes — never wait on these: `1d0576590`, `a7b5e1267`.

## 2. Ownership

| Owner | Scope | Status |
|---|---|---|
| wiring session | weather / honesty `shinFairForSide` / calibration-blend / inplay safe-lead | IN PROGRESS (T31) |
| wiring session | swarm agents 1-6: dfs, nfl, edge-lab, invention+tracking, experimental, props-dfs+metrics | RUNNING |
| parallel session | **see slice table below** | AVAILABLE |

## 3. Slice table — do not double up

The wiring session has dispatched 6 background subagents. Each owns exactly one set of
new bridge + test files and is FORBIDDEN from editing either shared barrel.

| # | Owner | Modules | Bridge file (exact name) |
|---|---|---|---|
| 1 | subagent | dfs/dominance-pruning, ip-portfolio, value-tier, tournament-variance, cluster-salary-screen, payout-framework | `dfs-portfolio-bridge.ts` |
| 2 | subagent | nfl/block-poisson, generalized-poisson, luck-neutralized-epa, parsimonious-season, ats-ablation-harness | `nfl-scoring-bridge.ts` |
| 3 | subagent | edge-lab/honest-ceiling, agent-roles, edge-lab-council, selective-gate, props-context-bind, kaunitz-outlier, grouped-climatology | `edge-lab-honesty2-bridge.ts` |
| 4 | subagent | invention (ai-feynman-separability, dualmargin-bandit, sela-mcts, case-bank, meta-analytics) + tracking (expected-drive-value, bootstrap-epv) | `invention-tracking-bridge.ts` |
| 5 | subagent | experimental (its-break-harness, nested-poisson-totals, cfov, order-flow-resiliency, ashap-aggregate, effective-breadth) | `experimental-models-bridge.ts` |
| 6 | subagent | props-dfs (local-matrix-completion, ts-forecast-dfs, joi-stack, era-adjusted, bayesian-shot-archetypes, emax-duel) + metrics/core (residual-rollup, shrinkage) | `props-metrics-bridge.ts` |

**AVAILABLE for the parallel session right now** (unclaimed, disjoint from the swarm):
- `weather/adaweather-combiner.ts`, `weather/2109-09287-stadium-factor-decomposition.ts`,
  `weather/2106-00175-stacked-live-wp-bakeoff.ts`
- `inplay/2103-04647-marked-point-process-live.ts`, `inplay/antipersistent-scoring.ts`,
  `inplay/mixed-tier-training.ts`
- `sizing/*` (generalized-kelly-solver, ced-drawdown, coin-flip-modulator, conformal-kelly,
  constrained-kelly, decoupled-kelly, drawdown-kelly, emc-kelly, es-governor, kelly-tournament,
  max-drawdown-portfolio, multivariate-kelly, path-form-features, qr-dqn,
  risk-constrained-kelly, selective-feasibility-ceiling, shrinkage-kelly, slate-mpc-staker,
  volatility-regime-scaler)
- `markets/*` (arb-lp-scanner, effective-price, excess-movement-monitor, informed-flow,
  marginal-price-oracle, noise-wedge-odds, probability-display, situational-honesty-filter)
- `odds/*` (favorite-longshot-audit, oo-epc)

Claim a slice here by editing this file, then work it. Same rules as the swarm: unique
filenames, no edits to `packages/prediction-engine/src/index.ts` or
`packages/ingestion-pipeline/src/index.ts`, no push until the wiring session says green.

## 4. Collaboration rules (hard constraints)

1. **Never edit a shared barrel to claim work.** `packages/prediction-engine/src/index.ts`
   and `packages/ingestion-pipeline/src/index.ts` are owned by the wiring session. Everyone
   else REPORTS a copy-paste-ready export block instead. This is why 7 agents can run
   concurrently without a single merge conflict.
2. Stage files **by name**. Never `git add -A` / `git add .` — the working tree is shared.
3. Never `git push` without founder authorization for that specific session. The wiring
   session has it; assume others do not.
4. If a push is rejected, the other session pushed first:
   `git fetch origin main` → `git rebase origin/main` → `git push origin main`.
5. Report the **file names you created** and the **test counts**. Two sessions writing the
   same barrel block is the only real collision risk left, and that is prevented by rule 1.

## 5. Red lines (a violation is worse than doing nothing)

1. **`node:crypto` / `crypto` in the package barrel breaks the Next.js client build.**
   `universal-adapter.ts` still contains `import { createHash } from "crypto"` — it is
   never re-exported from the package root. `promotion/index.js` re-exports
   `window-hash.ts`, so import promotion leaves directly (`promotion/evaluate.js`), never
   the promotion barrel, from the package root.
2. **Duplicate barrel exports break the prod build** (~50 failed deploys once). Before
   adding any export: `Select-String -Path packages\prediction-engine\src\index.ts -Pattern "^\s+$symbol,?$"`
   and confirm the count is 0.
3. **Import aliasing is NOT renaming.** If the barrel does `export { rmse as weatherRmse }`,
   the consumer must write `import { weatherRmse }` — writing `import { rmse as weatherRmse }`
   silently binds `undefined`. This cost a debugging cycle today; do not repeat it.
4. **PowerShell writes are not reliably UTF-8**, and a `\\n` inside a PowerShell here-string
   becomes a LITERAL backslash-n in the written file. Write helper Python to
   `$env:TEMP\*.py` with the `write` tool, run with `& $env:MIMO_PYTHON`, and always
   `write_text(..., encoding="utf-8", newline="\n")`.
5. **Read real signatures before bridging.** Surprise examples found today:
   `gpPosterior1d(X, y, xstar, l, sigmaF, sigmaN)` is 6 params; `rffFeatures(X, D, gamma, rand)`
   takes an RNG *function* and returns `{Phi, omega, b}`; `rbfKernelGp(x[], y[], l)` takes
   vectors; `TwoWayBook`/`BetaModel`/`CalibrationSample` were already in the barrel.
6. **Degenerate-variance traps.** `bestSplit` returns `null` when within-group residual
   variance is zero (Brown-Forsythe degenerates). Several fit functions return `null` on
   uniform synthetic data. Build test data with real spread.
7. **TypeScript strict + `noUncheckedIndexedAccess`.** No `any`, `as any`, `@ts-ignore`,
   `@ts-expect-error`. Every array index is `T | undefined` and must be guarded.
8. **Never fabricate product data.** No mock picks, no invented win rates, no placeholder
   returns. A fail-closed result is always better than a plausible-looking number.
9. **Never weaken a guard to make a test pass.** Never delete a forbidden-copy assertion or
   lower a threshold.

## 6. Do not modify (AGENTS.md law)

`packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/**`,
`.github/workflows/**`, `scripts/guardrails/**`, `.claude/**`, any `.env*`,
`package-lock.json`, `.gitignore`, `.githooks/**`, `apps/web/lib/ai-control-plane/**`.

Never flip a gate or env flag: `PUBLIC_PICKS`, `STATS_PUBLIC`, `LIVE_BOARD`,
`PERFORMANCE_STATS`, `PROPLINE_INTAKE_ENABLED`, `WEATHER_VINTAGE_ENABLED`,
`SLEEPER_INTAKE_ENABLED`, `CFBFASTR_INTAKE_ENABLED`, `FEATURE_RECIPE_BACKTEST_ENABLED`.

## 7. Verification block before any commit

```bash
npm run typecheck
npm run lint
npx vitest run <your test file>          # from packages/ingestion-pipeline
npx vitest run src/engine/coverage.test.ts   # from packages/prediction-engine — MUST be 10/10
```

## 8. Where the remaining work is

An orphan audit found exported functions that are in neither the barrel nor any bridge.
The coverage gate reports 100% (14448/14448 inventory entries wired), but the inventory
counts a universal stub adapter as "wired" — the mission is REAL bridges that call the
math. Remaining families after the current swarm: `sizing` (18), `markets` (8), `odds` (2),
`weather` (remaining 6), `inplay` (remaining 3), `signals/**` (30), `research` (5),
`gse-score` (6), `ladder` (2), `pipeline` (1), `lp` (3), `simulators` (1), `nfl` (remaining 4).

Re-run the audit after each batch: scan each family directory for
`export function|const|interface|type|class` names absent from
`packages/prediction-engine/src/index.ts` and from every
`packages/ingestion-pipeline/src/*bridge*.ts`.
