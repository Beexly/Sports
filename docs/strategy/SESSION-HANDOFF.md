# Session Handoff — Sports Prediction Platform

**Written:** 2026-06-18 · **Branch:** `claude/pensive-brown-yql6ld` · **HEAD:** `1743c7c`

> Read this top-to-bottom once. It is written so a fresh Claude Code session with zero prior
> context can be productive in five minutes. Pair it with `docs/strategy/integration-audit-2026-06.md`
> (the code-grounded status ledger) and `docs/path-to-70.md` (the strategy of record).

---

## 0. TL;DR — orientation in 60 seconds

- **Mission:** build a sports-picks platform whose flagship is a **proven, calibrated ~70%
  high-conviction tier** — where a pick labeled ~70% *actually wins ~70%*, measured, publicly
  verifiable, and CLV-positive. **A blended/ATS 70% is impossible and must NEVER be claimed**
  (break-even at −110 is 52.4%; best sustained ATS ≈ 55–57%). Honesty is the product.
- **The big realization this session:** the research docs say a lot is "SHIPPED." That's true at
  the **module** level but **not** at the **live-wiring** level. The core value chain
  (Shin de-vig ensemble → calibration → independent-referee ensemble → priced edge) is **built and
  tested but NOT running on a live pick.** It's gated by design + by the ≥100-settled-pick clock.
- **What IS live and real:** the **proof/accountability surface** (Merkle ledger + CSV export,
  reliability diagram, CLV report, edge-significance, calibration *measurement*) and the
  **grading/CLV settlement loop**.
- **Highest-leverage next work is WIRING, not porting.** See §6. The single cleanest win:
  `process-sport.ts` is ~30 lines away from activating the entire independent-referee architecture
  (the mapper already exists).

---

## 1. The mission & the one rule that governs everything

`docs/path-to-70.md` is the strategy of record. The honest 70% has exactly **two levers**:
1. **SELECTION** — what you choose to grade (a scarce, high-conviction tier).
2. **CALIBRATION** — P means what it says (confidence 70 ⇒ wins 70% over many picks).

Both exist in the engine; both are **founder-gated** and not yet live. The binding constraint is
**Step 0: ≥100 settled canonical picks** — no code shortcuts the clock; only real settled results
prove calibration. Everything else either (a) sharpens the probability so we find *more* genuine
≥70% spots without lowering the bar, or (b) *proves* the 70% is real (CLV, significance, reliability).

**Trust guardrails are enforced in CI:** `scripts/guardrails/trust-gate.mjs` trips on fabricated
stats / blended-70% claims. `CLAUDE.md` non-negotiables: no fake data, no fabricated stats, no
frontend-only paywalls, no secrets in code, tests required, TS strict (no `any`).

---

## 2. Current state — what's live vs. gated vs. unbuilt

**The authoritative, file:line-grounded version is `docs/strategy/integration-audit-2026-06.md`.**
Summary taxonomy: 🟢 LIVE · 🟡 GATED (wired but deliberately inert) · 🟠 PORTED-UNWIRED (module
exists, no live caller) · 🔵 UNBUILT · ⚪ DECLINED (correctly).

### The live pick path (trace it yourself before changing anything)
```
workers/data-refresh/src/index.ts
  → packages/ingestion-pipeline/src/process-sport.ts   (builds GameContextInput, calls scoreGames)
    → packages/prediction-engine/src/scoring.ts :: scoreGames()
      → local removeVig() [scoring.ts:39]  ← proportional de-vig (NOT the Shin ensemble)
      → weighted-factor composite → RAW 0–100 confidence
      → assessIndependentEdge() [scoring.ts:141] → returns null in prod (no fair values fed)
    → db.pick (create/update)
settlement: apps/web/app/api/cron/settle-picks/route.ts
  → packages/ingestion-pipeline/src/settle-sport.ts → clv-capture.ts (CLV captured) + grading
```

### What's NOT firing on a live pick (built but dormant)
| Capability | Module | Why dormant |
|---|---|---|
| Shin+goto **de-vig ensemble** | `prediction-engine/src/shin-devig.ts` | scorer uses local proportional `removeVig` instead; 0 live importers of the ensemble |
| **Calibration** of confidence | `calibration-apply.ts`, `probability-calibration.ts` | never applied in live scoring; activates ≥100 settled (founder-gated) |
| Independent referees | `edge-engine.ts`, `elo-estimator.ts`, `ml-estimator.ts`, Kalshi | `process-sport.ts` never populates `context.independentFairValues`; even when fed, `priced:false` by design |

---

## 3. What this session shipped (all on the branch, pushed)

Commits `0c002b1`, `e93d982`, `e0464ca`, `1743c7c`:
1. **Public proof surface** on `/performance`:
   - `components/performance/reliability-diagram.tsx` — pure-SVG calibration scatter (expected vs
     observed win rate per bucket, **Wilson 95% CI** error bars, perfect-calibration diagonal, 52.4%
     break-even line, dot size ∝ √n, intersection-observer reveal). Client component.
   - `components/performance/significance-panel.tsx` — async server component; runs
     `edgeSignificance()` (Monte-Carlo permutation test, `nullProb=0.5`, 2000 trials) on settled
     canonical picks. Gated by `canExposePerformanceStats`.
   - `components/performance/ladder-panel.tsx` + `lib/calibration/ladder-state.ts` — calibration-
     ladder status (path-to-70 Step 1): accrual bar, selected method, held-out ECE vs identity,
     **Wilson lower bound at confidence 65 & 70** (the defensible "70-tier floor").
   - `lib/calibration/compute.ts` — extended `CalibrationBucket` with `wilsonLow`/`wilsonHigh`.
2. **CSV export** `app/api/proof/export/route.ts` — `GET /api/proof/export`, tamper-evident pick
   ledger (17 cols incl. `leaf_hash`); headers `X-Merkle-Root`, `X-Record-Count`. Download buttons
   wired into `app/proof/page.tsx` with verification instructions.
3. **Integration audit doc** `docs/strategy/integration-audit-2026-06.md` (the ported-vs-wired truth).

**Engine primitives behind these ARE unit-tested** (`packages/prediction-engine/src/__tests__/edge-
significance.test.ts`, `calibration-ladder.test.ts`). The **web-layer integration is NOT** — see §5.

---

## 4. The cleanest next win — activate the referee architecture (~30 lines)

**The mapper already exists.** `packages/data-ingestion/src/kalshi-client.ts:287`
`toIndependentFairValue(kalshiFairValue, homeAbbr, awayAbbr) → IndependentMarketFairValue`
(the exact shape `scoring.ts` consumes via `context.independentFairValues`). It is exported from
`@sports/data-ingestion` but **called by nothing in the live path.**

The wire-in, in `packages/ingestion-pipeline/src/process-sport.ts` where the `context` object is
built (~line 263):
1. Fetch Kalshi fair value for the game (kalshi-client has fetch + `devigTwoSided` + `toIndependentFairValue`).
2. `context.independentFairValues = [toIndependentFairValue(fv, homeAbbr, awayAbbr)]`.
3. `scoreGames()` → `assessIndependentEdge()` now fires; result rides on the pick for the glass box
   + CLV grading. It stays **`priced:false`** (does NOT move confidence) until a founder flips the
   `MODEL_VERSION` gate — so this is safe to ship: it surfaces & grades the referee without changing
   a single confidence score.

This converts build-queue items #1–#4 from "fires on zero picks" to "surfaced and grading," which is
exactly the data needed to later prove the ensemble earns CLV. **Clearance note:** Kalshi is an
`approved_api`/referee read — keep it read-only, route through clearance, never bet-execution.

---

## 5. Known gaps & technical debt (be honest about these)

1. **Proof-surface tests missing (violates `CLAUDE.md` Rule 6).** No web-layer test references
   `SignificancePanel`, `LadderPanel`, `ReliabilityDiagram`, `loadCalibrationLadderState`, or
   `/api/proof/export`. **Highest-value missing test:** CSV export hash reproduction — independently
   re-derive `hashLeaf(sha256, {id, payload})` for a known pick and assert it matches, proving the
   public verification artifact is correct. Match the idiom in
   `__tests__/proof-of-record-surface.test.ts` + `__tests__/cockpit-history-export.test.ts`
   (behavioral hash test + source-pin assertions on headers/gating/no-fake-data).
2. **211 pre-existing typecheck errors** in `apps/web` (cockpit/admin/moderation/promotions —
   `CockpitTaskStatus`, `ModerationActionKind`, `Promotion`, `Prisma.InputJsonValue`, many implicit
   `any`). **None are from this session's files.** `next build` does NOT ignore TS errors, so
   `npm run build` fails today. This is a real blocker to "build succeeds." Likely a stale Prisma
   client / schema drift for some; the implicit-`any`s are genuine debt.
3. **The headline value chain is gated** (§2). Honest external messaging must not imply calibrated
   confidence or referee cross-checks are *live* yet — they are *built and provable when the data
   matures*.

---

## 6. Prioritized backlog (leverage order; all founder-gated to ACTIVATE)

From `integration-audit-2026-06.md` §6 + `oss-scan` Part 3 §18–19:

1. **CI leakage-prevention test** 🔵 — a test that FAILS any calibrator validated in-sample/random-
   split (`calibration-apply.ts` currently validates on the sample it fit — real leakage). Cheap, no
   model change, high-trust. **Recommended first.**
2. **Wire `independentFairValues` in `process-sport.ts`** 🟡→🟢 — see §4. Activates the dormant
   ensemble (surfaced, not priced). ~30 lines, mapper already exists.
3. **Offline backtest + calibrator-export lane** 🔵 — `scripts/analytics/` Python: sklearn
   `CalibratedClassifierCV(cv=TimeSeriesSplit)` + statsmodels Poisson over `Odds` history + settled
   picks; export the versioned calibrator the ladder consumes. Pre-proves calibration before the live
   sample matures.
4. **Close the proof-surface test gap** (§5.1).
5. **Canonical UOF odds schema** 🔵 — `packages/types`: `Event→Market{specifiers,status,lineId}→
   Outcome{odds,impliedProb,active}`, nullable odds, per-source `lastProcessedAt`; unblocks
   line-movement + freshness (`minus5/go-uof-sdk` is the reference shape).
6. Then: Polymarket referee (3rd estimator) · line-movement/steam worker (statsforecast) ·
   Dixon-Coles ρ fit + λ ingestion (activates soccer DC) · war-room content council · `DESIGN.md` ·
   Umami analytics · `exceljs` exports.

**Fix `npm run build`** (the 211 errors) is orthogonal but blocks "build succeeds" — worth a
dedicated pass (regen Prisma client + schema check first; then the implicit-`any` sweep).

---

## 7. Repository map (monorepo, npm workspaces)

```
apps/web/                      Next.js 14 app (App Router, TS)
  app/performance/page.tsx     ← public proof page (CalibrationPanel + SignificancePanel + LadderPanel)
  app/proof/page.tsx           ← Merkle ledger + CSV download buttons
  app/api/proof/export/route.ts← tamper-evident CSV (this session)
  app/api/cron/settle-picks/   ← settlement cron (live grading + CLV)
  components/performance/       ← reliability-diagram, significance-panel, ladder-panel, calibration-panel
  lib/calibration/             ← compute.ts (Wilson bounds), ladder-state.ts
  lib/proof/load-proof-of-record.ts
  lib/scraping/                ← clearance-engine.ts, source-rights-registry.ts (READ before any ingestion)
  __tests__/                   ← 331 vitest files
packages/
  prediction-engine/src/       ← scoring.ts (scoreGames), edge-engine.ts (assessEdge), shin-devig.ts,
                                  elo-estimator.ts, ml-estimator.ts, poisson.ts, calibration-*.ts,
                                  edge-significance.ts, proof-of-record.ts, kelly.ts, settlement.ts
    __tests__/                 ← 46 engine test files
  data-ingestion/src/          ← odds-api-client.ts, kalshi-client.ts (toIndependentFairValue!),
                                  openfootball-source.ts, normalizer.ts
  ingestion-pipeline/src/      ← process-sport.ts (LIVE pick path), settle-sport.ts
  types/                       ← shared types (IndependentMarketFairValue lives here, via @sports/types)
  db/                          ← Prisma schema/client (@sports/db)
workers/                       ← data-refresh (the real cron), pick-generation (18-line shim), content-publishing
docs/
  path-to-70.md                ← STRATEGY OF RECORD
  strategy/integration-audit-2026-06.md  ← code-grounded status ledger (READ THIS)
  strategy/repo-firehose-review.md       ← 6-item build queue + extraction ledger
  research/oss-betting-repo-scan-2026-06.md ← all 73 repos, Parts 1–4 (mapped to engine targets)
```

---

## 8. Environment & gotchas (will save you an hour)

- **Run web tests from `apps/web/`, not the repo root** (root run hits path-alias resolution
  failures, ~204 false failures):
  ```bash
  cd /home/user/Sports/apps/web && /home/user/Sports/node_modules/.bin/vitest run __tests__/<file>.test.ts
  ```
- **Typecheck a slice:** `cd apps/web && npx tsc --noEmit 2>&1 | grep <yourfile>` (the repo has 211
  pre-existing errors — filter to your files; don't be alarmed by the noise).
- **Engine tests** run fine from root or package dir.
- **Model freeze is real:** new engine modules must be **PURE, ADDITIVE, GATED OFF**. Do not change a
  live confidence score without an explicit founder `MODEL_VERSION` step. "Surfaced, not priced" is
  the pattern (see `scoring.ts:133`).
- **Scraping is clearance-gated:** every extraction must pass `lib/scraping/clearance-engine.ts`
  (`checkClearance()`), carry a `RightsSnapshot`, and respect `source-rights-registry.ts`. No
  evasion, ever. Kalshi/Polymarket = referee reads only.
- **Remote ephemeral container:** commit + push anything worth keeping. Push with
  `git push -u origin claude/pensive-brown-yql6ld` (retry w/ exponential backoff on network errors).
- **Commit trailer convention** (see prior commits): `Co-Authored-By:` + `Claude-Session:` lines.
  Do NOT put the model identifier in commits/PRs/code.
- **Do not open a PR unless explicitly asked.** Develop on `claude/pensive-brown-yql6ld`.

---

## 9. Definition of done (`CLAUDE.md` Autonomous Loop)

A task is NOT complete until **tests pass, types pass, build succeeds.** For this codebase that
currently means: your slice typechecks clean, your feature has passing tests (Rule 6), and you have
not added to the 211-error backlog. Be honest in status: if the build is red because of pre-existing
debt, say so — don't claim "live-ready."

---

## 10. First moves for the next session

1. `git log --oneline -8` and read `docs/strategy/integration-audit-2026-06.md` end-to-end.
2. Confirm the live path by reading `process-sport.ts` (context build ~line 263) and `scoring.ts`
   (`assessIndependentEdge` line 141, `removeVig` line 39).
3. Pick from §6. Recommended order: **(1) CI leakage test → (2) wire Kalshi `independentFairValues`
   → (4) proof-surface tests.** Each is self-contained, founder-gate-safe, and moves a real metric.
4. Keep the bar: pure, additive, gated, tested. Prove every "done" with the command output.
