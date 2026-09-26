# HANDOFF — Wire Every Module Into The Prediction Engine
**For:** next agent (continue immediately, do not re-derive)
**From:** previous agent session, 2026-09-26T15:04Z
**Repo:** `C:\Users\Garrett\XiaomiMiMoProjects\.mimo-sessions\2026-09-24\use any skills, tools, connectors, plugi\repo`
**Branch:** `main` @ `d4280364e` (synced with origin, tree clean)
**Production:** https://galaxysportsedge.com (Vercel auto-deploys from main)

---

## MISSION (unchanged)

Wire every single item in the repository into the prediction engine. The engine must REASON, not average. All input weighted. No cutting corners. "The smartest, most signal-ingesting, all-knowing hyper-intelligent reasoning model that has ever been created."

Success criteria:
- Every computation module callable through a live bridge/adapter
- Coverage gate `packages/prediction-engine/src/engine/coverage.test.ts` = 10/10 at all times
- All suites green (prediction-engine, ingestion-pipeline, data-ingestion, apps/web)
- Web build (`apps/web` → `npx next build`) reaches 255/255 pages
- Nothing lost/forgotten; commits pushed to `main` (founder authorized merge/push)
- **NO REGRESSIONS. FIX ANY RED LINES.**

User tone: aggressive about completeness ("KEEP FUCKING GOING", "DO NOT STOP", "nowhere near done"). Treat "done" as never — always audit more.

---

## VERIFIED GREEN AT HANDOFF (run these before claiming anything)

| Check | Command | Last result |
|---|---|---|
| Coverage gate | `npx vitest run src/engine/coverage.test.ts` in `packages/prediction-engine` | 10/10 |
| prediction-engine | `npx vitest run` in `packages/prediction-engine` | 6072/6072 (839 files) |
| ingestion-pipeline | `npx vitest run` in `packages/ingestion-pipeline` | 852/852 (76 files, 6 skipped) |
| data-ingestion | `npx vitest run` in `packages/data-ingestion` | 2391/2391 (475 files) |
| typecheck | `npm run typecheck` (or per-workspace `-w`) | clean |
| lint | `npm run lint` | clean |
| tree | `git status` | clean, 0/0 vs origin |

Inventory: `packages/prediction-engine/src/engine/inventory.json` = 14448 entries, all `wired: true` via `composition.ts` → `universal-adapter.ts` → `createEntryAdapter`. Gaps file empty.

---

## WHAT LANDED THIS SESSION (all pushed)

- `d4280364e` **feat: symreg/conformal/promotion/kernel/certificate residue bridge**
  - New `packages/ingestion-pipeline/src/symreg-conformal-residue-bridge.ts` + 25 tests (all pass)
  - Wires: AI Feynman Pareto pruning + hypothesis rejection + vertical SR filters; DGSR-lite staged/hill-climb refine; SINDy-SI sparse dynamics + side-info; sports-taxonomy Mondrian categories; LWT/MCPS greedy partition + bestSplit + assignLeafId; Acklam `standardNormalQuantile` / `zCritOneSided`; MetaVRF RBF/RFF/KRR helpers; gate-candidate → DecisionCertificate
  - Barrel adds in `packages/prediction-engine/src/index.ts` (paretoFrontier, skeletonJaccard, pairedPvalue, hypothesisReject, verticalFilter, nmse, hillClimbRefine, stagedRefine, leastSquaresActive, stlsq, verifySideInfo, dropIntercept, restBucket, tier1Categories, tier2Intersections, assignMondrianCategory, parentCategory, summarizeCategoryDiagnostics, bestSplit, assignLeafId, greedyPartition, leafQuantile, MondrianResidualManager, standardNormalQuantile, zCritOneSided, rbfKernelGp, rffFeatures, krrFit, certificateFromGateCandidate, …)
  - **Red lines fixed:** `noUncheckedIndexedAccess` in `packages/data-ingestion/src/holdout-discipline.ts` (guard `holdoutSeason`); `pick.game.sportKey` → `pick.game.sport?.key ?? null` in `apps/web/app/api/picks/route.ts:443`
- Earlier this session (already on main): `999db2b3d` bayesian-residue, `aca60a620` metalearning-residue, `4d0e32924` rl-residue, `6fa3909b9` pure-JS SHA-256 window-hash (node:crypto red line), `e75ac2fd9` stop re-exporting promotion/index.js

Parallel session landed (already on main, verified green): `b73520085` NGS measurement + ladder/boost scanners; `660299b8f` asof-store leak wall + placebo/walk-forward; `fd73e0ce8` V5 submission + V7 feature-recipe routes.

---

## IN PROGRESS — T31 (STOPPED MID-TASK, pick up exactly here)

**Task:** Wire weather / nfl / inplay / honesty / calibration-blend computation modules into a live bridge.

**Signatures already gathered (do not re-read unless you need more detail):**

### `packages/prediction-engine/src/weather/air-density-fg.ts`
- `fahrenheitToKelvin(tempF: number): number`
- `airDensityKgM3(altitudeFeet: number, tempF: number, pressureInHg?: number): number`
- `kickDistanceScale(rho: number, dragExponent = 1, rhoRef = RHO_SEA_LEVEL): number`
- `effectiveKickDistance(nominalYards: number, altitudeFeet: number, tempF: number, pressureInHg?: number): number`
- `venueEffectEstimate(venueBefore, venueAfter, leagueBefore, leagueAfter): number`
- `export const SEA_LEVEL_RHO`

### `packages/prediction-engine/src/weather/ball-physics.ts`
- `pressureAtTemp(tempF: number, psiReg = PSI_REG): number`
- `pressureDrop(tempF: number, psiReg = PSI_REG): number`
- `restitutionAtTemp(tempF: number, eps0 = 0.82, lambda = 0.012, psiReg = PSI_REG): number`
- `ballEffects(tempF: number, opts?: {eps0?, lambda?, kappa?, lambdaFumble?}): BallEffects`
- `fitLambda(pairs: ReadonlyArray<{tempF: number; epsilonObserved: number}>, eps0 = 0.82): number`

### `packages/prediction-engine/src/honesty/devig-method-compare.ts`
- `shinFairForSide(book: TwoWayBook, homeIsChosen: boolean): number | null`
- `compareDevigMethods` / `DevigMethodName` / `TwoWayBook` **ALREADY in barrel — do NOT re-export**

### `packages/prediction-engine/src/edge-lab/calibration-blend.ts`
- `applyBeta(model: BetaModel, p: number): number`
- `monotoneEnvelope(map: CalibrationMap, gridSize = 2001): CalibrationMap`
- `tailBlendMap(iso: CalibrationMap, beta: CalibrationMap, opts?: BlendOptions): CalibrationMap`
- `fitOofCalibration(oofSamples: readonly CalibrationSample[], opts?): OofCalibrationFit`
- Types: `CalibrationMap`, `BlendOptions`, `BlendCandidate`, `OofCalibrationFit`

### `packages/prediction-engine/src/inplay/safe-lead.ts`
- `safeLeadProb(p: SafeLeadParams): number`
- `diffusionWinProb(lead: number, timeRemainingMin: number, driftPerMin: number, diffusivity: number): number`
- `leadSafetyFeature(lead: number, timeRemainingMin: number, pregameSpread: number, diffusivity: number): number`
- `expectedLeadChangesRemaining(lead: number, timeRemainingMin: number, eventsPerMin: number, meanEventPoints: number, balance = 0.5): number`
- Types: `SafeLeadParams`. **Do NOT re-export `normalCdf` from safe-lead (already exported from performance-ci).**

**Barrel duplicate check already run for these names:** all OK except `compareDevigMethods`, `DevigMethodName`, `TwoWayBook` (already present — skip those).

**Next actions for T31 (exact pattern to follow — copy `symreg-conformal-residue-bridge.ts`):**
1. Append export blocks to `packages/prediction-engine/src/index.ts` for the OK names above (one section per source file). Re-check duplicates with `Select-String -Path "packages/prediction-engine/src/index.ts" -Pattern "^\s+$symbol,?$"` count must be 0 before each add.
2. Create `packages/ingestion-pipeline/src/physical-context-bridge.ts` (or similar name) with `export type PhysicalEval<T> = {ok:true;data:T}|{ok:false;reason:string}` + try/catch + fail-closed validation ("not imputed" in reason).
3. Write `packages/ingestion-pipeline/src/physical-context-bridge.test.ts` — fail-closes on missing input + computes on real data. 25-test style of the residue bridge.
4. Export the new eval functions from `packages/ingestion-pipeline/src/index.ts` (check name collisions first — `evalGpPosterior` already taken by metalearning-conformal-bridge).
5. Verify: typecheck, `npx vitest run <new test>`, coverage gate 10/10, full suite for touched packages. Then `git add` only your files (by name), commit, `git fetch origin main` → rebase if needed → `git push origin main`.

---

## REMAINING ORPHANS (audit ran 2026-09-26, after d4280364e)

Functions exported from source but NOT in barrel and NOT in any ingestion-pipeline bridge. Coverage inventory still says wired (via universal-adapter stubs) — the mission wants REAL bridges that call the math.

| Family | files w/ gaps | unpulled exports | examples |
|---|---|---|---|
| edge-lab | 44 | 256 | calibration-blend, honest-ceiling, edge-lab-council, agent-roles, kalshi-book-divergence |
| invention | 15 | 143 | ai-feynman-separability, risk-seeking-symreg, sela-mcts, biodisco, experience-graph |
| experimental | 23 | 95 | footballonomics-bootstrap, order-flow-resiliency, cfov, its-break-harness, riskneutral-inplay-pricer |
| props-dfs | 14 | 45 | local-matrix-completion, ts-forecast-dfs, regime-switching-synergy, joi-stack, emax-duel |
| weather | 9 | 49 | air-density-fg, ball-physics, decision-calibrated-weather, adaweather-combiner, stadium-factor |
| nfl | 8 | 49 | block-poisson, generalized-poisson, luck-neutralized-epa, ngs-adjacent-metrics, parsimonious-season |
| tracking | 7 | 36 | social-nce, masked-trajectory, atscc-route, bootstrap-epv, expected-drive-value |
| dfs | 6 | 32 | cluster-salary-screen, dominance-pruning, ip-portfolio, payout-framework, tournament-variance, value-tier |
| inplay | 2 | 8 | inplay-wp-markov, safe-lead |
| honesty | 1 | 1 | shinFairForSide |

**Recommended order after T31:** (1) finish weather+inplay+honesty+calibration-blend, (2) nfl scoring (block-poisson, generalized-poisson, luck-neutralized-epa, parsimonious-season), (3) dfs portfolio (dominance-pruning, ip-portfolio, value-tier, tournament-variance), (4) edge-lab honest-ceiling + agent-roles + council, (5) tracking expected-drive-value + bootstrap-epv, (6) invention/experimental research surface in batches.

Audit script (re-run after each bridge): `$env:TEMP\audit2.py` pattern — scan each family dir for `export function|const|interface|type|class` names absent from `packages/prediction-engine/src/index.ts` and from all `packages/ingestion-pipeline/src/*bridge*.ts`.

---

## RED LINES (never repeat these)

1. **`node:crypto` / `crypto` in package barrel breaks Next.js client build.** `window-hash.ts` fixed with pure-JS SHA-256. `universal-adapter.ts` still has `import { createHash } from "crypto"` — NEVER re-export it from `packages/prediction-engine/src/index.ts`. Deep-import only in server code. `promotion/index.js` re-exports window-hash — leaf-import only (`promotion/evaluate.js` etc.), never the promotion barrel from package root.
2. **Duplicate barrel exports break prod build** (~50 failed deploys once). Before every barrel add: `Select-String -Path "packages/prediction-engine/src/index.ts" -Pattern "^\s+$symbolName,"` and confirm count is 0. Known already-exported (do not re-add): `shinDevig`, `buildCalibrator`, `selectCalibrator`, `fractionalKellyStake`, `normalCdf`, `dixonColesTau`, `computeWindowHash`, `compareDevigMethods`, `DevigMethodName`, `TwoWayBook`, `evalGpPosterior` (ingestion barrel), `stlsqFit`, `innerAdapt`, `mamlMetaLoss`, `evaluatePromotion`, `hawkesGridFit`, `gpPosterior1d`, `uncertaintyMetaLoss`.
3. **PowerShell `Add-Content` / some Out-File writes are not clean UTF-8 and Python `"\\n"` inside PowerShell here-strings becomes a LITERAL backslash-n.** After every file write, verify the file decodes as UTF-8 and has no literal `\n` two-char sequences at line joins. Prefer Python `Path.write_text(..., encoding="utf-8", newline="\n")` via a script written with `Out-File -Encoding utf8` to `$env:TEMP\fix_*.py` then `& $env:MIMO_PYTHON`.
4. **`git push` rejected** when parallel session pushes — `git fetch origin main` → `git rebase origin/main` → `git push origin main`. Only `git add` your own files by name (their WIP may be dirty in shared tree — do NOT commit it). Never `git add -A`.
5. **Type signatures must be read before bridging.** Many modules have surprising shapes. Always `Select-String` for `export function` before writing the bridge. Examples: `gpPosterior1d(X, y, xstar, l, sigmaF, sigmaN)` (6 params, NOT 5); `rffFeatures(X, D, gamma, rand: () => number)` (RNG fn, not seed, returns `{Phi, omega, b}`); `rbfKernelGp(x: number[], y: number[], l)` (vectors, not scalars); `retrieveTopS` returns `string[]` ids.
6. **`fitGroupPrior` / similar return `null` on degenerate variance.** Test data needs enough spread.
7. **`bestSplit` returns `null` when within-group residual variance is zero** (Brown-Forsythe degenerate). Test data needs noise on BOTH sides of the split.
8. **TypeScript strict.** Never `any`, `as any`, `@ts-ignore`, `@ts-expect-error`. `noUncheckedIndexedAccess` is on — guard array indexing.

## CONSTRAINTS (AGENTS.md laws)

- **NEVER `git push` unless owner said so for this session.** Owner HAS authorized push to `main` for this workstream ("you are approved to merge once green"). Parallel session waits for their own authorization.
- **NEVER modify:** `packages/db/prisma/schema.prisma`; `packages/db/prisma/migrations/**`; `.github/workflows/**`; `scripts/guardrails/**`; `.claude/**`; any `.env*`; `package-lock.json`; `.gitignore`; `.githooks/**`; `apps/web/lib/ai-control-plane/**`.
- **NEVER flip a gate or env flag** (`PUBLIC_PICKS`, `STATS_PUBLIC`, `LIVE_BOARD`, `PERFORMANCE_STATS`, etc.).
- **NEVER fabricate product data.** No mock picks, sample odds, placeholder win rates.
- **NEVER weaken a guard to make a test pass.**
- **NEVER `git commit --no-verify`.**
- **NEVER install a package, run a migration, or touch a database.** Bare `npm install` is setup only.
- Two attempts per task. Then revert, mark BLOCKED with exact error, move on.
- One task = one commit. Stage by name. Tag `[hermes-<task-id>]` optional but recent style is `feat: ...`.
- Before every code commit: `npm run typecheck`, `npm run lint`, `npx vitest run <this task's test file>`.

## PATTERNS TO COPY

**Bridge pattern** (see `packages/ingestion-pipeline/src/symreg-conformal-residue-bridge.ts` and `rl-residue-bridge.ts`):
```ts
export type XEval<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly reason: string };
function fail(reason: string): XEval<never> { return { ok: false, reason }; }
export function evalThing(input: {...}): XEval<Out> {
  // validate shapes/finiteness first → fail("...")
  try { /* call real fn */ return { ok: true, data }; }
  catch (e) { return fail(`threw: ${e instanceof Error ? e.message : String(e)}`); }
}
```

**Adapter pattern:** `import type { AdapterResult } from "./universal-adapter.js"` (TYPE-ONLY), never value-import.

**Test pattern:** fail-closes on missing input + computes on real data. Deterministic RNG via counter or LCG when a function needs `rand: () => number`.

## VERCEL / PROD NOTES

- Vercel project: `pick-pilot-s-projects/sports-web`. Vercel MCP may be unauthorized — use `gh api repos/Beexly/Sports/commits/<sha>/status` to check deploys.
- `typescript: { ignoreBuildErrors: true }` in `next.config.mjs` so type errors don't block Vercel, but **`node:crypto` DOES block it** and UTF-8 corruption DOES block it.
- Founder-gated env flags (user flips via browser, do NOT touch): `PROPLINE_INTAKE_ENABLED`, `WEATHER_VINTAGE_ENABLED`, `SLEEPER_INTAKE_ENABLED`, `CFBFASTR_INTAKE_ENABLED`, `FEATURE_RECIPE_BACKTEST_ENABLED`. `vercel.json` cron registration for `/api/cron/feature-recipe-backtest` may still be needed — confirm with founder.

## WINDOWS / POWERSHELL QUIRKS

- Use `Select-String` not `rg` with pipes containing `|`/`"`.
- Write Python helpers to `$env:TEMP\fix_*.py` then `& $env:MIMO_PYTHON`.
- `Get-ChildItem -Filter` + `ForEach-Object` for file lists.
- Full monorepo `npm run typecheck` can exceed 3 min — run per-workspace: `npm run typecheck -w @sports/prediction-engine` etc. Workspace names: `@sports/prediction-engine`, `@sports/ingestion-pipeline`, `@sports/data-ingestion`, `sports-web` (apps/web).
- `npm run lint` at root runs eslint on apps/web and can take minutes.

## PARALLEL SESSION — OWNERSHIP (authoritative)

- Worktree `mimo/handinhand-20260925`. Cross-session chat (hop limit = 5).
- **THEIRS (already on main, done — do not redo):**
  - `fd73e0ce8` V5 submission contract + V7 feature-recipe live paths (#7/#8)
  - `660299b8f` asof-store leak wall + edge-lab placebo/walk-forward (#3-5 residual)
  - `b73520085` NGS measurement loop + ladder/boost scanners
  - bayesian-residue family, earlier symreg residue
- **MINE (already on main, done — do not redo):** rl-residue, metalearning-residue, symreg-conformal-residue (`d4280364e`), window-hash pure-JS, picks-API intelligence, holdout-discipline + sportKey red-line fixes.
- **IN PROGRESS (MINE only):** T31 physical-context bridge = weather (air-density-fg, ball-physics, decision-calibrated-weather) + honesty `shinFairForSide` + calibration-blend + inplay safe-lead. Signatures in T31 section above.
- **THEIRS NEXT (assigned 2026-09-26, they are idle):** dfs portfolio batch + nfl scoring batch:
  - `dfs/dominance-pruning.ts`, `dfs/ip-portfolio.ts`, `dfs/value-tier.ts`, `dfs/tournament-variance.ts`, `dfs/cluster-salary-screen.ts`, `dfs/payout-framework.ts`
  - `nfl/block-poisson.ts`, `nfl/generalized-poisson.ts`, `nfl/luck-neutralized-epa.ts`, `nfl/parsimonious-season.ts`
- Do not touch rl/symreg/metalearning/conformal/certificate/promotion (mine, largely done) or each other's in-progress bridge files. If hop limit hit, report to user and continue locally.

## IMMEDIATE NEXT STEPS (in order)

1. Start task T31 (already created): write `physical-context-bridge.ts` + tests for weather/nfl-inplay-honesty/calibration-blend using the signatures above. Mark task done when suites green and pushed.
2. Re-run orphan audit script. Wire nfl scoring batch (block-poisson, generalized-poisson, luck-neutralized-epa, parsimonious-season).
3. Wire dfs portfolio batch (dominance-pruning, ip-portfolio, value-tier, tournament-variance, cluster-salary-screen).
4. Wire edge-lab honest-ceiling + calibration-blend leftovers + agent-roles.
5. Continue down the orphan table. After each batch: coverage 10/10, full suites, typecheck, lint, commit, push.
6. Periodically confirm Vercel deploy status via `gh api repos/Beexly/Sports/commits/<sha>/status`.

**Nothing is done. Keep wiring.**
