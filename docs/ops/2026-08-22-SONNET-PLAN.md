# SONNET BUILD PLAN — Galaxy Sports Edge
**Date:** 2026-08-22 · **Repo:** /home/user/Sports · **Lane:** Sonnet (parallel to Grok's 17-item lane; Opus reviews/merges)

---

## 0. CURRENT STATE

- `main` is green: **11,526 apps/web tests**, **2,423 prediction-engine tests**, `tsc` exit 0, full guardrail chain passing in CI.
- Open PRs (Claude/Opus): **#463** (workflow contract tests + scheduler-liveness/settlement-health), **#464** (pick-explainer GSE-SEC-071). Their files are radioactive — see §2.
- Grok is running a 17-item lane list (A1–A5 local lanes + B-items). Its files and read-only declarations are radioactive — see §2.
- The edge-lab program (Phases 0–3) is **substantially built** in `packages/prediction-engine/src/edge-lab/`. Do not rebuild anything in §3. Your work is the verified residue: the gaps below survived an adversarial file-level audit.
- Everything you build ships **inert / founder-gated / draft-only**. `MODEL_VERSION` bumps, env-flag flips, `.github/**` edits, and schema changes are not yours.

## 1. OPERATING RULES

**Never stall.** For each item: branch `sonnet/<slug>` off fresh `origin/main` → implement → run the item's scoped verify commands → push → open PR (one item per PR) → **immediately start the next item**. Never wait for review, never push `main`, never self-merge, no force-push. If blocked >15 min on one item, note the blocker in the PR-to-be and move to the next item.

**PR body format (mandatory):**
```
## What / Why
<2-4 lines, cite the plan item id>
## Files
<paths>
## Verification (real output, real exit codes — paste, don't summarize)
$ npx vitest run <scoped test>          → exit 0, N passed
$ npm run typecheck                     → exit 0
$ npm run lint                          → exit 0
## Risk / gating
<what stays inert, which flag guards it>
```

**Binding invariants (from the intel handoff + CLAUDE.md — violating any one is a rejected PR):**
1. Leak-free foundation gates everything; nothing bypasses the as-of store / placebo discipline.
2. Fire/rank on calibrated edge `e = p − q`, never on confidence κ.
3. No public number without all four legs: coverage denominator + Wilson/Clopper-Pearson LCB + CLV backing + walk-forward provenance (`apps/web/lib/ledger/display-guard.ts` is the law).
4. No affiliate, no real-money mechanics, licensed/free-legal data only, no scraping evasion.
5. TypeScript strict, no `any`; tests required; server-side paywalls; secrets via env; no fake data.
6. New thresholds/features tried → recorded in `edge-lab/trials-registry.ts`. No exceptions.
7. `scripts/guardrails/trust-gate.mjs` is a string mirror of `apps/web/lib/trust-claims.ts` BANNED entries — any BANNED change updates both **in the same PR**.

## 2. HARD DO-NOT-TOUCH (compiled from the coordination docs — zero overlap permitted)

**Claude's open-PR files (PR #463/#464):**
- `apps/web/lib/ops/scheduler-liveness.ts`
- `apps/web/lib/performance/settlement-health.ts`
- `apps/web/__tests__/github-workflow-contract.test.ts`
- `apps/web/lib/pick-explainer/explain.ts`
- `apps/web/lib/pick-explainer/explain-error-disclosure.test.ts`
- `apps/web/app/api/picks/[id]/explain/route.ts`

**Claude-owned (other):**
- `apps/web/lib/scraping/source-rights-registry.ts` (Grok A1/A4 hold the only carve-out)
- `apps/web/lib/api/rate-limit.ts` **and every file calling `consumeRateLimit`** (durable-limiter swap queued)
- `apps/web/lib/ops/cron-schedule-manifest.ts`, `apps/web/__tests__/cron-schedule-manifest.test.ts`, `scripts/check-deploy-readiness.mjs`

**Grok's lane files:**
- A1/A4: `packages/ingestion-pipeline/src/build-independent-fair-values.ts` (Kalshi/ClubElo `checkClearance` gating — do **not** pre-gate it yourself), `packages/quote-plane/src/providers/kalshi-trade-api.ts`
- A2: `scripts/ops/hermes-runner.ps1`, `docs/ops/hermes/RESUME.md`
- A5: `apps/web/e2e/*.spec.ts`
- B-item read-only files and their tests: `apps/web/lib/dashboard/load-performance.ts`, `apps/web/__tests__/dashboard-load-performance.test.ts`, `apps/web/lib/ops/compute-live-calibration-metrics.ts` (+ its new test), `apps/web/lib/jarvis/ledger-types.ts`, `apps/web/__tests__/council-ledgers.test.ts`

**Sealed / founder-only:**
- `.github/**` (including the two known one-line workflow bugs — founder's fixes, pinned by #463)
- `packages/db/prisma/schema.prisma` and `packages/db/prisma/migrations/**` (read-only; no new models, no migrations)
- `docker/docker-compose.yml`; `package.json` `test:integration:db` script
- MVE fire, PROVEN env-flag flips, Stripe Dashboard, Neon rotation, crypto rail enablement — never attempted by any agent
- `packages/types/` or widening any cross-package export: **STOP and ask in the PR body; do not widen.**

**Shared:** `handoff/REMEDIATION_EXECUTION.md` and `docs/ops/AGENT-COORDINATION.md` — append-only, never rewrite.

## 3. DO-NOT-REBUILD (verified already implemented — extend by import, never re-author)

- As-of feature store: `packages/prediction-engine/src/edge-lab/asof-store.ts` (+ `packages/feature-store/src/pit-validate.ts`)
- Purged/embargoed walk-forward + sealed holdout: `edge-lab/walk-forward.ts` (+ `scripts/guardrails/sealed-holdout-open-scan.mjs`)
- Shuffled-time placebo + MI probe + walkForwardEval: `edge-lab/placebo.ts`
- Snapshot provenance: `edge-lab/provenance.ts`; line archive + Pinnacle close: `packages/ingestion-pipeline/src/line-archive.ts`, `pinnacle-line-archive.ts`
- Devig (proportional + Shin + 5 more): `packages/prediction-engine/src/devig/oracle.ts`, `edge-lab/devig.ts`
- Selective conformal gate (LCB(e) > τ_vig, Mondrian/Venn-Abers, disjoint-fold τ): `edge-lab/selective-gate.ts`
- Tail calibration blend (beta tail + isotonic middle, Brier reliability-resolution selection): `edge-lab/calibration-blend.ts`
- Logit-pool market-blend truth test (FIRE_NOTHING verdict): `edge-lab/logit-pool.ts`
- Portfolio Kelly (James-Stein + Ledoit-Wolf + CLV deflator): `edge-lab/kelly.ts`
- Props HB specialist: `edge-lab/props-hb.ts`; market-residual GBM: `edge-lab/residual-gbm.ts`; close-distillation core: `edge-lab/close-distillation.ts`
- Hash-chained ledger + pre-kickoff Merkle commitment: `edge-lab/ledger-chain.ts`, `packages/ingestion-pipeline/src/freeze-slate-commitments.ts`; recompute verifier: `edge-lab/recompute-verifier.ts` + `scripts/edge-lab/recompute.ts`
- Display guard (four statutory legs): `apps/web/lib/ledger/display-guard.ts`; trials registry + BH-FDR: `edge-lab/trials-registry.ts`
- ACI + Learn-then-Test: `edge-lab/phase4-research.ts`; signal-mesh fusion (inert): same file
- Copy discipline: `apps/web/lib/trust-claims.ts` + `scripts/guardrails/trust-gate.mjs` + copy-scan test suites; sharp-money ban: trust-gate BS-023
- Frictionless cancel + ROSCA disclosures: `apps/web/app/api/subscriptions/portal/route.ts`, `components/pricing/subscribe-button.tsx`
- Contest Bay free pick'em: `apps/web/app/fantasy/contests/` + `lib/contests/`; calculators: `apps/web/app/tools/`
- llms.txt + open robots + JSON-LD: `apps/web/app/llms.txt/route.ts`, `lib/proof/machine-proof.ts`, `lib/seo/`
- B2B v1 API + OpenAPI: `apps/web/app/api/v1/`; Odds-API redistribution guard: `lib/api/v1/payload-rights.ts` + `scripts/guardrails/api-payload-rights-scan.mjs`
- Pick-object independence guard: `scripts/guardrails/affiliate-structural-separation.mjs`
- FTC substantiation gates: `apps/web/lib/claims/public-claim-compiler.ts`, `lib/pricing/pricing-phases.ts`

---

## 4. WORK QUEUE (in order — banked value first)

### S1 — CLV-anchored headline; demote win-rate  `[S]` `Phase 2 / honesty`
**Branch:** `sonnet/clv-headline` · **Files:** edit `apps/web/lib/performance/public-performance-policy.ts`; new `apps/web/__tests__/clv-headline-policy.test.ts`; touch consumers `/performance`, `/dashboard` render order only as needed.
**Read first:** `public-performance-policy.ts` (headline currently `publicWinRate`, lines ~13–15, 197–205), `public-clv-policy.ts` (Wilson + 0.524 breakeven), `clv-coverage.ts`, `display-guard.ts`.
**Task:** Add a `headlineMetric` field to the policy result whose only legal values are a CLV beat-close rate (Wilson-bounded, coverage-stamped, from `public-clv-policy`) or an explicit `NOT_READY` — never win-rate. `publicWinRate` stays as a **secondary** field (existing consumers unbroken) but any surface that renders it must render the CLV headline above it. Do not delete existing fields; add and re-rank.
**Accept:** test proves headline slot can never contain win-rate; win-rate render requires CLV headline present or explicit NOT_READY state; all existing performance-policy tests still pass.
**Verify:** `npx vitest run apps/web/__tests__/clv-headline-policy.test.ts apps/web/__tests__ -t performance` · `npm run typecheck` · `npm run lint`

### S2 — Honest-ceiling constants + full-slate-claim fence  `[S]` `Honest ceiling / copy`
**Branch:** `sonnet/honest-ceiling` · **Files:** new `packages/prediction-engine/src/edge-lab/honest-ceiling.ts` + `edge-lab/__tests__/honest-ceiling.test.ts`; edit `apps/web/lib/trust-claims.ts` (new BANNED pattern) **and** `scripts/guardrails/trust-gate.mjs` mirror in the same PR (invariant 7).
**Read first:** `trust-claims.ts` BANNED block (~lines 265–362), `trust-gate.mjs:9-10,53`, handoff ceiling doctrine (blind 52–56%; selective 57–60% only at ~8–15% coverage after 200+ fired walk-forward bets).
**Task:** Encode `BLIND_ATS_CEILING = 0.56`, `BREAK_EVEN = 0.524`, `SELECTIVE_CLAIM_FLOOR = { minFiredBets: 200, requiresMultiSeasonWalkForward: true, requiresPositiveClv: true }` and `assertClaimWithinCeiling(claim)` that throws on any full-slate rate claim > ceiling or any selective ~60% claim lacking the proof object. Add a BANNED copy pattern for full-slate "60%+" style claims.
**Accept:** guard throws on a fabricated "62% on all games" claim; passes a coverage-stamped selective claim with a satisfying proof object; trust-gate mirror test green.
**Verify:** `npx vitest run packages/prediction-engine/src/edge-lab/__tests__/honest-ceiling.test.ts` · `node scripts/guardrails/trust-gate.mjs` · `npm run typecheck && npm run lint`

### S3 — Trend/streak render contract  `[S]` `Copy discipline`
**Branch:** `sonnet/trend-render-contract` · **Files:** new `apps/web/lib/trends/render-contract.ts` + `apps/web/__tests__/trend-render-contract.test.ts`; wire into `apps/web/lib/trends/workbench.ts` output path.
**Read first:** `packages/prediction-engine/src/trend-discovery.ts:44-61` (Trend already carries n, baselineMean, z, pValue), `lib/trends/workbench.ts`.
**Task:** `renderableTrendOrNull(t)` returns null (and a typed reason) unless the trend carries all four: `n ≥ minSampleSize`, base rate, a regression-to-mean caveat string, and a calibrated probability. Mirror the `display-guard.ts` throw-never-warn style. Public trends surface consumes only this.
**Accept:** test proves a "36 of last 37" style streak without base rate/caveat cannot render; a complete trend renders with all four fields present.
**Verify:** `npx vitest run apps/web/__tests__/trend-render-contract.test.ts` · `npm run typecheck && npm run lint`

### S4 — Per-tier TTL matrix + staleness copy fence  `[S]` `Source hierarchy`
**Branch:** `sonnet/tier-ttl-matrix` · **Files:** new `apps/web/lib/picks/tier-ttl.ts` + `apps/web/__tests__/tier-ttl.test.ts`; import from `lib/picks/signal-lineage.ts` (small edit) and `lib/data-reliability/public-freshness-gate.ts` (small edit).
**Read first:** `signal-lineage.ts:14,58-67` (SourceTier 1–6 + publicSafe matrix already exist), `public-freshness-gate.ts`, `packages/data-ingestion/src/freshness-schedule.ts`.
**Task:** Encode the doctrine TTLs as data: Tier 1 = 15 min standard / 5 min game-day-injury, Tier 2 live = 2 min, Tier 3 = 2 hr (plus sane defaults for 4–6); `isStaleForTier(tier, ageMs, context)`. Add a copy test forbidding "current"/"live"/"confirmed" adjacent to a datapoint whose tier TTL is breached (test the gate function contract, not a DOM crawl).
**Accept:** stale Tier-1 injury data at 6 min on game day is flagged; the freshness gate consumes the matrix; copy fence test green.
**Verify:** `npx vitest run apps/web/__tests__/tier-ttl.test.ts` · `npm run typecheck && npm run lint`

### S5 — Ask-the-Brain launch gate  `[S]` `Launch sequencing`
**Branch:** `sonnet/ask-the-brain-gate` · **Files:** new `apps/web/lib/launch/ask-the-brain-gate.ts` + `apps/web/__tests__/ask-the-brain-gate.test.ts`.
**Read first:** `apps/web/lib/launch/public-surface-gate.ts` (pattern), `apps/web/app/` route listing.
**Task:** Gate module with the four prerequisites as typed booleans (evidence vault tested, claim governance tested, methodology pages live, cockpit Q&A quality gate passed), all hard-coded `false` today, `canLaunchPublicBrain()` requiring all four. Test additionally asserts **no public route** matching `/(ask|brain|qa)/i` exists under `apps/web/app/` outside `/cockpit` (filesystem scan in the test, like `public-surface-gate.test.ts`).
**Accept:** gate returns blocked with all four reasons; route-absence assertion green.
**Verify:** `npx vitest run apps/web/__tests__/ask-the-brain-gate.test.ts` · `npm run typecheck && npm run lint`

### S6 — "Beat the Model" benchmark row in Contest Bay  `[S]` `Funnel (free/skill only)`
**Branch:** `sonnet/beat-the-model` · **Files:** edit `apps/web/lib/contests/store.ts` (`leaderboard()`), `apps/web/app/fantasy/contests/page.tsx` copy; new `apps/web/__tests__/contest-beat-the-model.test.ts`.
**Read first:** `lib/contests/store.ts:358` (leaderboard), `lib/contests/week.ts`, the legal fences on the contests page (`page.tsx:13-15,37` — free, no prize, no real money: unchanged).
**Task:** When (and only when) the model produced graded picks for the same contest board, inject a clearly-labeled non-competing benchmark row ("GSE Model") into the leaderboard computed from the **same settled outcomes** — no fake data, no synthetic grades; absent otherwise. No prize logic, no entry-fee logic, copy stays inside the existing fences.
**Accept:** benchmark row appears only with real settled model grades; ranking of human entrants unaffected; zero banned-copy regressions (`public-copy-scanner` suite).
**Verify:** `npx vitest run apps/web/__tests__/contest-beat-the-model.test.ts apps/web/__tests__/public-copy-scanner.test.ts` · `npm run typecheck && npm run lint`

### S7 — Value-gap ("GSE vs market") column on the board  `[S]` `Product honesty`
**Branch:** `sonnet/value-gap-column` · **Files:** new `apps/web/components/picks/value-gap.tsx` + test; small edits to the board table (locate under `apps/web/app/board/` + `components/picks/`).
**Read first:** `components/picks/pick-card.tsx:326-328` ("Market fair (de-vig)" already rendered per-card), `lib/gse-stats/value-provider.ts:23-25`.
**Task:** A dedicated column/badge showing `calibrated p − market fair q` per pick on board/table views, derived from the fields the pick already carries (no new data path, no Kalshi). Renders only when both values are real; never implies profitability without the display-guard legs.
**Accept:** component test: renders gap when p and q present, renders nothing otherwise; snapshot of sign/formatting; copy scanner green.
**Verify:** `npx vitest run apps/web/__tests__ -t value-gap` · `npm run typecheck && npm run lint`

### S8 — llms.txt `## Optional` + cookieless AI-referral bucketing  `[S]` `AI-citation layer`
**Branch:** `sonnet/ai-citation-polish` · **Files:** edit `apps/web/lib/proof/machine-proof.ts` (add `## Optional` section per llmstxt.org); new `apps/web/lib/analytics/ai-referral.ts` + `apps/web/__tests__/ai-referral.test.ts`; wire into `lib/analytics/events.ts`.
**Read first:** `machine-proof.ts:168-200`, `app/llms.txt/route.ts`, `lib/analytics/provider-gating.ts` (cookieless posture — preserve it).
**Task:** (a) `## Optional` section listing secondary citable surfaces. (b) Pure-function referrer classifier (chatgpt.com, perplexity.ai, claude.ai, gemini.google.com, copilot.microsoft.com → `ai_referral` event bucket), cookieless, no PII, gated by the existing provider gating.
**Accept:** llms.txt test asserts section ordering + no drift from Proof API; classifier unit tests; no cookies introduced.
**Verify:** `npx vitest run apps/web/__tests__/ai-referral.test.ts apps/web/__tests__ -t llms` · `npm run typecheck && npm run lint`

### S9 — Battleground market-selection config  `[S]` `Edge targeting`
**Branch:** `sonnet/battleground-markets` · **Files:** new `apps/web/lib/performance/battleground-markets.ts` + `apps/web/__tests__/battleground-markets.test.ts`; consume in `lib/performance/clv-segments.ts` (small edit).
**Read first:** `clv-segments.ts:1-28`, `edge-lab/trials-registry.ts` header.
**Task:** Named-market priority config (NFL receiving yards, anytime-TD, early-week sides/totals as `target`; MLB pitcher-Ks, total bases as `avoid`) with per-bucket requirements `{minSettled: 50, publishZeroHonestly: true}`. Buckets feed `clv-segments`; any bucket threshold experiment gets a trials-registry entry. Pure config + selectors — no firing-path change.
**Accept:** segment output carries bucket identity + n-floor status; a below-floor bucket reports `INSUFFICIENT_N`, never a rate.
**Verify:** `npx vitest run apps/web/__tests__/battleground-markets.test.ts` · `npm run typecheck && npm run lint`

### S10 — Privacy: CPRA rights control + vendor inventory  `[S]` `Legal surface`
**Branch:** `sonnet/privacy-cpra` · **Files:** new `apps/web/app/privacy/rights/page.tsx` (or section component) + vendor-inventory data module `apps/web/lib/legal/vendor-inventory.ts` + test; small edit to `app/privacy/page.tsx` linking it.
**Read first:** `app/privacy/page.tsx:59-95`, `app/terms/page.tsx`.
**Task:** Interactive CCPA/CPRA rights request surface (delete/access/do-not-sell — routes to existing account-deletion mechanics + a contact path; no new data collection), plus a truthful vendor inventory table (Stripe, Neon, The Odds API, NWS, hosting, email/push provider) with data categories + retention. **Leave governing-law/venue as a clearly-marked `FOUNDER_INPUT_REQUIRED` placeholder constant** — do not invent a venue (see §6).
**Accept:** page renders from the typed inventory; copy scanners green; no cookie banner introduced (cookieless architecture preserved).
**Verify:** `npx vitest run apps/web/__tests__ -t privacy` · `npm run typecheck && npm run lint`

### M1 — Deflated Sharpe / White Reality Check / Hansen SPA model admission  `[M]` `Phase 0 / §5 integrity`
**Branch:** `sonnet/model-admission-mtc` · **Files:** new `packages/prediction-engine/src/edge-lab/model-admission.ts` + `edge-lab/__tests__/model-admission.test.ts`; small edit to `edge-lab/trials-registry.ts` to record admission trials (its header at :13-16 explicitly marks this QUEUED — you are un-queuing it, not rebuilding).
**Read first:** `trials-registry.ts` (append-only chain + BH machinery), `edge-lab/stats.ts`, `edge-lab/rng.ts` (seeded mulberry32 convention).
**Task:** Implement (a) Deflated Sharpe Ratio (Bailey–López de Prado, correcting for number of trials/skew/kurtosis), (b) White's Reality Check and (c) Hansen SPA via stationary-bootstrap over strategy return series, seeded RNG only. `admitBaseModel(candidates, benchmark)` returns per-model verdict + p-values and **must** write a trials-registry entry per candidate. Pure functions, no I/O, no wiring into live scoring (admission is consumed by the founder-run acceptance scripts).
**Accept:** property tests — 50 pure-noise candidate models: admission rejects all at α=0.05 (allowing seed-stable tolerance); one candidate with injected true edge: admitted; registry entries appended and chain still verifies.
**Verify:** `npx vitest run packages/prediction-engine/src/edge-lab/__tests__/model-admission.test.ts packages/prediction-engine/src/edge-lab/__tests__/trials-registry.test.ts` · `npm run typecheck && npm run lint`

### M2 — Rule-regime embargo in walk-forward  `[M]` `Phase 0`
**Branch:** `sonnet/regime-embargo` · **Files:** new `packages/prediction-engine/src/edge-lab/regime-embargo.ts` + test; additive option on `edge-lab/walk-forward.ts` (`regimeBoundaries?: RegimeBoundary[]`) — do not change existing default behavior or the sealed-holdout mechanics.
**Read first:** `walk-forward.ts:2-23,111-137,188` (purge/embargo + sealed holdout), `sealed-holdout-open-scan.mjs` contract.
**Task:** Declared regime-boundary table (MLB shift ban 2023-03-30; NFL 2024 kickoff overhaul; extensible per sport) with `embargoAcrossRegimes(splits, boundaries)` that widens the embargo so no training fold's window straddles a boundary that its eval fold sits on the other side of. Every boundary is a documented constant with a source comment.
**Accept:** test: a fold set spanning the MLB shift-ban date gets rows purged/embargoed across the boundary; without boundaries behavior is byte-identical to today (regression test against existing fixtures).
**Verify:** `npx vitest run packages/prediction-engine/src/edge-lab/__tests__/regime-embargo.test.ts packages/prediction-engine/src/edge-lab/__tests__/walk-forward.test.ts` · `npm run typecheck && npm run lint`

### M3 — Constrained log-odds stacking (ridge + Dirichlet, β≥0)  `[M]` `Phase 1`
**Branch:** `sonnet/logodds-stacking` · **Files:** new `packages/prediction-engine/src/edge-lab/stacking.ts` + `edge-lab/__tests__/stacking.test.ts`.
**Read first:** `edge-lab/logit-pool.ts` (its OOF-only input contract and refusal style — mirror it), `edge-lab/logistic.ts` (deterministic ridge trainer), `ensemble/baee-ensemble.ts:157` (existing w≥0 constraint — do not duplicate; stacking is walk-forward log-odds level, ensemble is different layer: say so in the header).
**Task:** Meta-learner over sub-model logits: weights `β_m ≥ 0` with ridge penalty + Dirichlet prior toward uniform, fit **only on purged walk-forward OOF predictions** (refuse non-OOF inputs the way logit-pool does); vanilla BMA explicitly not offered (killed). Output includes per-model weight + a `marketDominance` check (if market logit takes ~all weight, verdict mirrors FIRE_NOTHING).
**Accept:** recovery test on synthetic OOF data with known weights; refusal test on in-fold rows; degenerate case (market-only) yields the fire-nothing-style verdict.
**Verify:** `npx vitest run packages/prediction-engine/src/edge-lab/__tests__/stacking.test.ts` · `npm run typecheck && npm run lint`

### M4 — Umpire/referee EB tendency features (inert)  `[M]` `Phase 3`
**Branch:** `sonnet/umpire-ref-eb` · **Files:** new `packages/prediction-engine/src/edge-lab/features/umpire-ref-eb.ts` + test; new loader `edge-lab/loaders/mlb-umpires.ts` (MLB Stats API boxscore `officials` — already an approved source per data contracts) feeding the as-of store.
**Read first:** `metrics/core/shrinkage.ts` (reuse the conjugate EB estimator — do not re-derive), `edge-lab/loaders/mlb-platoon-splits.ts` (loader shape + silent-fail notes), `edge-lab/asof-store.ts` (keys must pass the closing-line-pattern filter), `edge-lab/trials-registry.ts` (admission).
**Task:** EB-shrunk per-umpire K%/BB%/run-environment tendencies (and the NFL-ref scaffold with the same estimator), shrunk toward league mean by n; emitted as as-of feature keys, **not wired into any scoring path** — admission only via the MI trial in the trials registry. Loader is inert behind the existing ingestion env-gating pattern.
**Accept:** shrinkage test (n=5 umpire pulled hard to league mean, n=300 barely); as-of write passes key filter; a trials-registry MI admission entry shape test; zero imports from scoring.
**Verify:** `npx vitest run packages/prediction-engine/src/edge-lab/__tests__/umpire-ref-eb.test.ts` · `npm run typecheck && npm run lint`

### M5 — Sign-constrained physics transfer functions (inert)  `[M]` `Phase 3`
**Branch:** `sonnet/physics-transforms` · **Files:** new `packages/prediction-engine/src/edge-lab/features/physics-transforms.ts` + test.
**Read first:** `apps/web/lib/weather/game-weather.ts` (NWS, outdoor venues), `edge-lab/features/nfl-weather.ts` (existing wind features — extend, don't duplicate), the double-counting risk note (books already price public weather → these are features for the residual models, never standalone edge).
**Task:** Deterministic, sign-constrained transforms: air density from temp/elevation/humidity → carry factor (MLB totals), wind speed/direction → kicking/passing adjustments (NFL), altitude constants per venue. Each transform's sign is asserted in tests (denser air ⇒ less carry ⇒ lower total pressure, etc.). Emit as as-of feature keys; inert until trials-registry admission.
**Accept:** sign/monotonicity property tests per transform; Coors-vs-sea-level fixture sanity; no scoring-path imports.
**Verify:** `npx vitest run packages/prediction-engine/src/edge-lab/__tests__/physics-transforms.test.ts` · `npm run typecheck && npm run lint`

### M6 — Distillation soft-target loss + closing-drift IC module  `[M]` `Phase 3`
**Branch:** `sonnet/distill-loss-upgrade` · **Files:** extend `packages/prediction-engine/src/edge-lab/close-distillation.ts` (additive API — keep the existing ridge path untouched as default); new `edge-lab/closing-drift.ts` + tests for both.
**Read first:** `close-distillation.ts:1-19,62-181` (honest-data-boundary + CLOSING_KEY_PATTERN discipline — preserve verbatim), the killed-list: heavy λ≈0.7–0.9 default is **killed**; moderate λ only.
**Task:** (a) Add `trainCloseDistillerSoftTarget` with blended objective KL(pred‖p_close) + λ·BCE(pred, outcome), λ default in the moderate band (~0.3–0.5), λ recorded per-fit in the trials registry. (b) `closing-drift.ts`: regression on `D = logit(p_close) − logit(q_open)` with information-coefficient evaluation; module refuses any "admitted" verdict below sustained OOS IC ≥ 0.05 across walk-forward folds.
**Accept:** on synthetic data where close = truth + noise, soft-target beats pure-BCE in sample efficiency (seeded, tolerance-banded); drift module honestly reports NOT_ADMITTED on noise; existing close-distillation tests untouched and green.
**Verify:** `npx vitest run packages/prediction-engine/src/edge-lab/__tests__/close-distillation.test.ts packages/prediction-engine/src/edge-lab/__tests__/closing-drift.test.ts` · `npm run typecheck && npm run lint`

### M7 — Wasserstein-2 covariate-shift control chart  `[M]` `Phase 4`
**Branch:** `sonnet/w2-shift-chart` · **Files:** new `packages/prediction-engine/src/edge-lab/covariate-shift.ts` + test; additive config hook on the selective gate (`quantileWideningFactor` input — read `selective-gate.ts` for where τ/interval config enters; do not alter default behavior).
**Read first:** `edge-lab/phase4-research.ts:68-75` (aciUpdate), `apps/web/lib/calibration/aci-state.ts`, `instrumented-eprocess.ts:222-233` (shift e-process — complementary, cite it in the header), killed-list note: OT mispricing-localization use is killed — this is a **control chart only**.
**Task:** Per-feature 1-D W2 distance (sorted-sample closed form) between recent window and training reference + aggregate statistic with a control limit; when breached, emit a widening factor for the conformal quantile (consumed by ACI/selective-gate config, default 1.0 = no-op).
**Accept:** unshifted synthetic data stays inside the limit; mean/variance-shifted data breaches and emits >1 widening; wiring test proves default behavior unchanged.
**Verify:** `npx vitest run packages/prediction-engine/src/edge-lab/__tests__/covariate-shift.test.ts packages/prediction-engine/src/edge-lab/__tests__/selective-gate.test.ts` · `npm run typecheck && npm run lint`

### M8 — Wire /glass-ledger view to the real chain  `[M]` `Phase 2`
**Branch:** `sonnet/ledger-view-wiring` · **Files:** edit `apps/web/lib/ledger/ledger-view.ts`; new `apps/web/__tests__/ledger-view-wiring.test.ts` (mocked db).
**Read first:** `ledger-view.ts:18-50` (self-declared follow-up: "no live ledger chain to read from... always resolves to the empty-but-honest shape"), `packages/db/prisma/schema.prisma` PickProofReceipt :594 / SlateCommitment :623 (**read-only** — queries only, no schema change), `edge-lab/ledger-chain.ts`, `display-guard.ts`, `glass-ledger/page.tsx` display-guard wiring + its regression tests.
**Task:** Replace the stub resolver with a real read path: settled receipts → season rows (SU%, ATS-vs-close, CLV, MAE), reliability buckets, n-toward-significance — every number passing through `renderableMetricOrNull` with all four legs; when the store is empty (today's reality) the output is byte-identical to the current empty-but-honest shape. `PUBLISH_LEDGER` founder gate untouched.
**Accept:** mocked-db test with a small settled fixture produces guard-passing rows; empty-db test reproduces today's exact shape; `ledger-display-guard.test.ts` and `glass-ledger-page.test.tsx` green unmodified.
**Verify:** `npx vitest run apps/web/__tests__/ledger-view-wiring.test.ts apps/web/__tests__/ledger-display-guard.test.ts apps/web/__tests__/glass-ledger-page.test.tsx` · `npm run typecheck && npm run lint`

### M9 — Independent-reviewer sign-off gate (ships dark)  `[M]` `Process guardrail`
**Branch:** `sonnet/reviewer-signoff-gate` · **Files:** new `apps/web/lib/claims/reviewer-signoff.ts` + `apps/web/__tests__/reviewer-signoff.test.ts`; wire as an additional blocker into `apps/web/lib/claims/public-claim-compiler.ts`.
**Read first:** `public-claim-compiler.ts:1-14` ("No compiler pass, no public claim"), the calibration-proposals front-matter pattern (`docs/calibration-proposals/`, `scripts/guardrails/model-freeze.mjs`) — reuse the file-based mechanism because **schema is sealed** (no new tables).
**Task:** Sign-off records live as `docs/reviews/<slug>.md` with front-matter `{reviewer, reviewerIsFounder: false, scope, modelVersion, status: SIGNED, date}`. `requireReviewerSignoff(claimScope, modelVersion)` blocks any WIN_RATE/CLV/CALIBRATION/ROI claim without a matching non-founder SIGNED record. New blocker code `NO_INDEPENDENT_REVIEW`. Since no records exist, this ships blocking-by-default — which is exactly the doctrine; note it prominently in the PR.
**Accept:** compiler blocks without a record; passes with a matching fixture record; founder-authored record (`reviewerIsFounder: true`) does not satisfy it; existing claim-compiler tests updated and green.
**Verify:** `npx vitest run apps/web/__tests__/reviewer-signoff.test.ts apps/web/__tests__ -t claim` · `npm run typecheck && npm run lint`

### M10 — Graded-results weekly digest generator (draft-only)  `[M]` `Habit loop`
**Branch:** `sonnet/graded-digest` · **Files:** new `apps/web/lib/newsletter/graded-digest.ts` + `apps/web/__tests__/graded-digest.test.ts`.
**Read first:** `lib/newsletter/issues.ts`, the draft-only doctrine (`scripts/guardrails/draft-only.mjs` — the generator must never set `publishedAt`, never import a send SDK), `display-guard.ts`, `settlement-outbox/` (data source for settled results).
**Task:** Pure generator: settled picks for a week → a ContentDraft-shaped digest body leading with the honest aggregate (wins **and** losses, CLV where present, Wilson-bounded counts, explicit "in progress" posture), every number display-guard-compliant. Output is a draft object only; publishing/sending remains founder-mediated through the existing review pipeline. No "bet of the day", no urgency mechanics (copy fences apply).
**Accept:** fixture week → deterministic digest with losses rendered; a week with unguardable numbers renders counts only; `draft-only` guardrail passes; copy scanners green.
**Verify:** `npx vitest run apps/web/__tests__/graded-digest.test.ts` · `node scripts/guardrails/draft-only.mjs` · `npm run typecheck && npm run lint`

### M11 — Stale-ingestion → deduped cockpit task wiring  `[M]` `Agent OS (named next build)`
**Branch:** `sonnet/stale-ingestion-tasks` · **Files:** new `apps/web/lib/tasks/stale-ingestion-tasks.ts` + `apps/web/__tests__/stale-ingestion-tasks.test.ts`; small consume edit in the cockpit decision-queue loader (locate via `lib/jarvis/jarvis-operating-assessment.ts:55` nextBestAction).
**Read first:** `lib/data-reliability/stale-data-detector.ts` (TAL states), `lib/tasks/agent-task-store.ts` + `agent-task-types.ts` (task seed shape, `claudeReviewRequired`), `statking/stat-coverage-auditor.ts` (`coverageGapToTask` pattern — mirror it). **Avoid:** `lib/ops/scheduler-liveness.ts` (Claude #463), `lib/jarvis/ledger-types.ts` (Grok B13 read-only), `compute-live-calibration-metrics.ts` (Grok B11).
**Task:** Map stale/critical-stale/rights-blocked source states to deduped agent-task seeds (stable dedupe key per source+state; re-detection updates, never duplicates), status QUEUED, `claudeReviewRequired: true`, safe action type only — no execution wiring, no queue workers (Redis-less MANUAL degradation untouched).
**Accept:** same stale source detected twice → one task; state transition stale→critical updates the task; rights-blocked maps to a review task, never an ingestion task.
**Verify:** `npx vitest run apps/web/__tests__/stale-ingestion-tasks.test.ts` · `npm run typecheck && npm run lint`

### L1 — SEO hubs + season-freshness robots gating  `[L]` `Distribution`
**Branch:** `sonnet/seo-hubs` · **Files:** new `apps/web/app/nfl/predictions/page.tsx` (+ `today/`, `week/[n]/`), `apps/web/app/mlb/predictions/page.tsx` (+ `today/`); new `apps/web/lib/seo/season-freshness.ts` consumed by `app/robots.ts` (additive rules only) and `sitemap.ts`; tests.
**Read first:** `app/preview/[sport]/[slug]/page.tsx` (per-game pages exist — hubs link into them, never duplicate them), `lib/seo/sports-jsonld.ts`, `lib/seo/site-url.ts` (canonical www host law), `app/robots.ts:14-38`, the strategy caveat: **fewer, richer pages**, each carrying the graded-record framing — not a 600k-URL fan-out; skip the 3-variant-per-game fan-out for now (thin-content risk; founder call, §6).
**Task:** Day/week hub pages (SSR, BreadcrumbList + ItemList JSON-LD, interlinked to existing preview pages and the ledger/calibration surfaces) rendering only real scheduled games from existing data paths; `season-freshness.ts` computes current+adjacent season windows per sport and robots gains Disallow rules for stale-season hub paths. All copy through the scanners; no performance claims on hubs beyond what the claim compiler passes.
**Accept:** hub renders from a real-slate fixture and renders an honest empty state off-season; robots test asserts stale-season Disallow + operator surfaces unchanged; sitemap includes hubs under canonical host; copy-scanner suites green.
**Verify:** `npx vitest run apps/web/__tests__ -t "seo|robots|sitemap"` · `npm run typecheck && npm run lint && npm run build` (build required — new routes)

### L2 — Read-only MCP server over the settled ledger (ships dark)  `[L]` `Two-lane API`
**Branch:** `sonnet/mcp-settled-ledger` · **Files:** new `packages/mcp-server/` (package.json, `src/index.ts`, `src/tools.ts`, tests). **Do not** add exports to `packages/types` or any shared package (stop-and-ask rule); consume `apps/web`'s public Proof API shapes by HTTP contract, not by import.
**Read first:** `apps/web/app/api/proof/openapi.json/route.ts` + `lib/proof/machine-proof.ts` (the settled/citable contract), `lib/api/v1/payload-rights.ts` (redistribution rules — the MCP surface exposes derived/aggregate + attribution only, never raw vendor odds).
**Task:** Minimal stdio MCP server exposing read-only tools: `get_settled_ledger`, `get_calibration_summary`, `get_clv_summary`, `verify_receipt` — each proxying the public Proof endpoints (base URL via env), stamping attribution, and refusing any field kind the payload-rights scanner bans. Not deployed, not registered anywhere, no keys, no write tools. This is lane-2 scaffolding the founder can point agents at later.
**Accept:** tool-contract tests against fixture responses; payload-rights compliance test (no raw_source_value/provider_identifier fields pass through); package builds standalone; root `npm run typecheck` unaffected.
**Verify:** `npx vitest run packages/mcp-server` · `npm run typecheck && npm run lint`

---

## 5. BLOCKED / OWNED-ELSEWHERE (do not start; listed so nothing looks forgotten)

| Item | Owner / blocker |
|---|---|
| Kalshi ToS verify + registry entry + `checkClearance` gating in `build-independent-fair-values.ts` | **Grok A1** (founder-local; do not pre-gate on unverified rights) |
| ClubElo live-behavior verify + registration | **Grok A4** (cloud egress blocked) |
| Hermes runner repoint; live-DB smoke; Playwright e2e | **Grok A2 / A3 / A5** |
| The two one-line `.github` workflow bugs (watchdog "ok" union; cron guard literal) | **Founder** (pinned by Claude PR #463) |
| Durable rate-limiter swap | **Claude** |
| Signal-Ledger 34-event schema; `User.dateOfBirth`; per-user decision-history persistence | **Schema sealed** — founder must unseal + approve change proposal |
| ESPN/Yahoo OAuth league sync | **Founder gate** (Sleeper live; page says so) |
| Market Gravity full-spec extension (pressure_direction, bounded confidence_adjustment, WATCH/LEAN/PICK/AVOID) | **Doctrine requires an approved change proposal** — founder |
| Cox-hazard news-latency model | **No corpus by design** — mesh capture is founder/legal-gated; stays inert per handoff |
| Phase-3 empirical CLV acceptance (+CLV on stated subset) | **Data accrual**, needs `LINE_ARCHIVE_ENABLED` + `LINE_ARCHIVE_EU_PINNACLE` flipped (founder) |
| Live in-play push layer + lag-delta; GMM tier clustering; contrarian "right when the field was wrong" stat; real-person pundit pages; per-game 3-variant SEO fan-out | **Deferred** — scope doctrine (focus) and/or founder gate; revisit after Phase-2 clock is running |
| OpenAI domain verification token; ChatGPT-store GPT | **Founder** (OpenAI account); Actions-compatible OpenAPI already exists |
| MVE fire; PROVEN flag flips; Stripe Dashboard (Radar, ToS URL); Neon rotation; crypto rail enable; MoneyPuck email | **Founder / operator** |

## 6. FOUNDER — decisions this plan needs (one line each)

1. **Flip `LINE_ARCHIVE_ENABLED=true` and `LINE_ARCHIVE_EU_PINNACLE=true`** — this starts the Phase-2 pre-registered-record clock, the one non-copyable moat; every day dark is record you never get back.
2. Apply the two one-line `.github` workflow fixes pinned by PR #463 (watchdog status union; cron guard literal) — the external alarm rail is dead until you do.
3. Name the independent model/calibration reviewer — M9 ships the gate dark and blocking; a person (not you) must sign `docs/reviews/` records before any performance number can publish.
4. Decide Kalshi (Grok A1 evidence) and ClubElo (A4) — until then those fair-value inputs run ungated by prior decision, not oversight.
5. Supply governing-law/venue text for the terms imprint — S10 leaves a marked placeholder rather than inventing jurisdiction.
6. Approve or park the Market Gravity change proposal (doctrine requires your sign-off before implementation).
7. Decide the fantasy/DFS scope question: paid Fantasy tier (current CLAUDE.md) vs the dossier's amputate-to-one-sport doctrine — the repo currently follows CLAUDE.md; say if that changes.
8. Provide the OpenAI domain-verification token if you want the GPT-store surface claimed this quarter.
9. Unseal the schema only if you want the Signal-Ledger event table or DOB persistence built; otherwise both stay correctly blocked.
10. `MODEL_VERSION` bumps remain yours, via the CalibrationProposal mechanism — nothing in this plan bumps it.