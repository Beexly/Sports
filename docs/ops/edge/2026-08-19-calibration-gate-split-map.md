# Calibration-gate split map — exact wiring + minimal split plan

Read-only research pass; no edits made. All paths absolute under `/home/user/Sports`.

---

## 1. Where the floors (Brier ≤ 0.22, ECE ≤ 0.05) and the 3-streak live

### 1a. Canonical definition (single source of truth)

| What | File:line |
|---|---|
| `DEFAULT_CALIBRATION_FLOORS = { n: 100, brier: 0.22, ece: 0.05, murphyReliability: 0.05 }` | `apps/web/lib/ops/calibration-eligibility.ts:69-74` |
| Floor resolution (partial override, never lowered by callers) | `apps/web/lib/ops/calibration-eligibility.ts:76-88` |
| Brier floor enforcement (`brier > floors.brier` → reason) | `apps/web/lib/ops/calibration-eligibility.ts:118` |
| ECE floor enforcement | `apps/web/lib/ops/calibration-eligibility.ts:120` |
| Murphy-reliability floor enforcement | `apps/web/lib/ops/calibration-eligibility.ts:121-127` |
| Streak rule: `runMeetsFloors` → `consecutiveGreen = prior+1` else 0; `GREEN` iff `runMeetsFloors && consecutiveGreen >= streakRequired` | `apps/web/lib/ops/calibration-eligibility.ts:130-139` (K documented "default 3" at :46) |

### 1b. The "3" itself (defined twice)

- `streakRequiredFromEnv()` — env `CALIBRATION_ELIGIBILITY_STREAK`, default **3**: `apps/web/lib/ops/calibration-eligibility-durable.ts:237-241`.
- Independent re-derivation inside publish policy — `streakRequired ?? 3` and its own `streakMet` check: `apps/web/lib/ops/calibration-publish-policy.ts:63-65`, used at :88 and :92.

### 1c. Durable evaluation / streak advancement (two writers)

- Cron path: `evaluateAndPersistEligibility()` — `apps/web/lib/ops/calibration-eligibility-durable.ts:246-334` (prior streak read :281-284; idempotency on `metricsGeneratedAt` :261-279; auto-publish/unpublish receipts :309-326). Durable store = `JarvisMemoryEvent` scopes `ops.calibration.metrics|eligibility|publish-receipt` (:23-25) — JSON payloads, **no Prisma schema involvement**.
- Ops read path (also persists first evaluation of a new artifact): `loadCalibrationOpsSurface()` — `apps/web/lib/ops/calibration-eligibility-durable.ts:371-430` (prior streak :395-398, persist :417-427).

### 1d. Publish policy consuming GREEN + streak

- `resolveCalibrationPublishPolicy()` — `apps/web/lib/ops/calibration-publish-policy.ts:50-125`. Key line: `canExposePerformanceStats = publishedEffective && green` (:97-98). Env flags: `CALIBRATION_PUBLISHED`, `CALIBRATION_AUTO_PUBLISH`, `CALIBRATION_AUTO_UNPUBLISH` (:54-60), all default off.

### 1e. Cron that produces the metrics the floors are checked against

- `apps/web/app/api/cron/calibration-metrics/route.ts` — computes Brier decomposition/ECE/MCE (:244-247), builds `DurableMetricsPayload` (:290-308), calls `evaluateAndPersistEligibility` (:421-426), returns eligibility+publish JSON (:428-450). Note it **already computes** `bssHalf`/`bssClim` (:271-272) but only into the local file artifact — `DurableMetricsPayload.overall` (`calibration-eligibility-durable.ts:34-39`) carries only brier/ece/mce/murphy. Seed-path twin: `buildDurableMetricsFromSamples` in `apps/web/lib/ops/compute-live-calibration-metrics.ts:62-123` (same shape, no BSS).

### 1f. Duplicated floor values — advisory/R&D only (not gate enforcement)

- `apps/web/lib/calibration/projected-proven-metrics.ts:119-121, 131` — hardcoded 0.22/0.05/0.05 "wouldPassFloors" projection.
- `apps/web/lib/calibration/ranking-power-control.ts:152` — `const BRIER_FLOOR = 0.22` (used :373, :394, :405, :494-512).
- `apps/web/lib/calibration/brier-minimization-explore.ts:174, 183, 197-201, 218-221` — 0.22 default params/strings.
- `apps/web/lib/calibration/murphy-res-definition.ts:61` — `brierFloor: 0.22` snapshot (surfaced into ops truth via `buildMurphyResSnapshot`, `public-surface-truth/route.ts:563-569`).
- `apps/web/lib/calibration/synthetic-overconfident-bakeoff.ts:12-14` — its own `ELIGIBILITY_FLOORS` copy.
- `apps/web/lib/calibration/proven-path-engine.ts:332-333` — doc strings "Brier≤0.22, ECE≤0.05 … streak GREEN×K".
- `packages/prediction-engine/src/calibration-monitor.ts:35-41` — `checkCalibrationHealth(recentBriers, threshold=0.22, consecutiveDays=7)`. **Different mechanism**: a 7-consecutive-day Brier regression alarm, exported at `packages/prediction-engine/src/index.ts:1371`, consumed only by its own tests. Not part of the eligibility gate.
- `packages/types/src/ladder.ts:54, 61, 68` — pricing-rung `maxBrierScore` 0.24/0.235/0.225 (a *different* ladder with different values; not the 0.22 floor).
- Value-pinning tests (must keep passing untouched): `apps/web/__tests__/synthetic-floor-stress-bakeoff.test.ts:17` (`brier === 0.22`), `apps/web/__tests__/calibration-eligibility.test.ts:74`, `apps/web/__tests__/segmented-murphy.test.ts:53`, `apps/web/lib/calibration/murphy-res-definition.test.ts:25`.

---

## 2. Which PUBLIC surfaces each gate blocks

There are **two distinct gates** that both call themselves `canExposePerformanceStats`:

### Gate A — env readiness gate (`PERFORMANCE_STATS_ENABLED`, owner-flagged, no floors)

Defined: `packages/prediction-engine/src/platform-config.ts:168` → `packages/prediction-engine/src/readiness.ts:137`. Blocks:

- `/api/performance` — 503 at `apps/web/app/api/performance/route.ts:8-11`.
- `/performance` page headline record/win-rate — `apps/web/app/performance/page.tsx:124-169` (plus its own thin-sample withhold :206-223).
- `/api/clv` — 503 at `apps/web/app/api/clv/route.ts:25-33`; policy libs `apps/web/lib/performance/public-clv-policy.ts:71`, `public-roi-policy.ts:151`.
- Content publishing of performance content — `apps/web/lib/content-engine/source-coverage.ts:139`, `content-engine/readiness.ts:90`, `lib/content/workflow.ts:137`.
- StatKing loader `calibrationGateOpen` — `apps/web/lib/statking/king-standard-loader.ts:87`.
- Cockpit/Jarvis operator copy (not public): `apps/web/lib/cockpit/jarvis.ts:469-476`, `ask-jarvis.ts:248`.

### Gate B — calibration eligibility ∩ publish policy (the 0.22/0.05 floors + 3-streak; this is what the split targets)

Resolved through `resolveEffectivePerformanceGate()` (`apps/web/lib/ops/effective-performance-gate.ts:19-59`) or `loadCalibrationOpsSurface().publish`. Blocks:

- **Public calibration report** `loadPublicCalibrationReport()` — `apps/web/lib/calibration/report.ts:16-30` returns "collecting" whenever Gate B is closed. Consumers (all public): homepage `apps/web/app/page.tsx:38`, `/board` `app/board/page.tsx:49`, `/house` `app/house/page.tsx:142`, `/observatory` `app/observatory/page.tsx:58`, `/calibration` `app/calibration/page.tsx:90`, `/api/calibration` `app/api/calibration/route.ts:7`, and the `CalibrationPanel` rendered inside `/performance` (`components/performance/calibration-panel.tsx:136`, mounted at `app/performance/page.tsx:174, 261`). **So even the passing ECE/reliability story is currently dark because the Brier floor fails.**
- **/dashboard performance tile** — `apps/web/app/dashboard/page.tsx:71` feeds `effectivePerf.canExposePerformanceStats` into `evaluatePublicPerformancePolicy` (:170-185); record/win-rate render "Collecting…" while closed.
- **Ops truth surface** — `apps/web/app/api/ops/public-surface-truth/route.ts:393-410` (`effectivePerformanceStats` :408-410), reported as `gates.canExposePerformanceStats` (:498) with env gate separately as `envPerformanceStatsEnabled` (:499); full eligibility block :514-531; publish block :532-542.
- **Revenue ladder / PROVEN claim** — `public-surface-truth/route.ts:460-473` passes `calibrationPublished` (= Gate B) and `performanceStatsEnabled: effectivePerformanceStats` into `evaluateRevenueLadder` (`apps/web/lib/autonomy/revenue-ladder.ts:38-127`, PROVEN requires `calibrationPublished` :43-46).
- **Founder next-steps advisory** — `apps/web/lib/ops/founder-next-steps.ts:267-292` ("floors + streak" copy :273).

### NOT blocked by either calibration gate

- The **board/picks surface** is gated by `PUBLIC_PICKS_ENABLED` (`canExposePublicPicks`) + stale-odds kill switches, and **confidence display** by `confidenceDisplayMode` (`readiness.ts:47, 72, 121`) — independent of Brier/ECE. On `/board`, only the calibration tile fed by `loadPublicCalibrationReport` is dark, not the board itself.

---

## 3. Split plan — CALIBRATION vs DISCRIMINATION, behavior-preserving by default

### Gate names

- **`CALIBRATION` gate** (reliability — currently passing): floors `{ n: 100, ece: 0.05, murphyReliability: 0.05 }` + settlement/sample preconditions + its own 3-streak.
- **`DISCRIMINATION` gate** (skill — currently failing): floors `{ n: 100, brier: 0.22 }` (values unchanged; BSS/CLV can be added later as additional members without changing 0.22) + its own 3-streak.
- Legacy combined status ≡ `CALIBRATION ∧ DISCRIMINATION` — computed exactly as today.

### Master switch (default posture: nothing changes)

New env flag `CALIBRATION_GATE_SPLIT_ENABLED` (unset/"false" = today's behavior bit-for-bit; every consumer keeps reading the combined status). Only an explicit owner flip routes the calibration-report surfaces to the CALIBRATION gate. Publish flags `CALIBRATION_PUBLISHED` / `CALIBRATION_AUTO_PUBLISH` / `CALIBRATION_AUTO_UNPUBLISH` and `PERFORMANCE_STATS_ENABLED` remain owner-flagged and untouched; win-rate/track-record/PROVEN surfaces stay on the combined (effectively DISCRIMINATION-bound) gate regardless of the flag.

### Consumer → gate mapping after the flip

| Consumer | Gate after split |
|---|---|
| `loadPublicCalibrationReport` (home, /board, /house, /observatory, /calibration, /api/calibration, CalibrationPanel) — reliability curve/ECE display | **CALIBRATION** (∩ publish policy) |
| /dashboard record & win-rate, ops `gates.canExposePerformanceStats`, revenue ladder `calibrationPublished`/PROVEN, trust-claim performance claims | **CALIBRATION ∧ DISCRIMINATION** (unchanged = combined) |
| Gate A env surfaces (/api/performance, /performance headline, /api/clv, content publishing) | unchanged — owner env flag only |
| Advisory R&D (projected-proven-metrics, ranking-power-control, brier-minimization, murphy-res-definition, proven-path) | untouched |

### Files the minimal diff touches

1. `apps/web/lib/ops/calibration-eligibility.ts` — additive: `evaluateCalibrationEligibilitySplit()` (or extra fields on the report) producing `{ calibrationGate, discriminationGate }` sub-reports each with `runMeetsFloors`/`consecutiveGreen`/`status`; existing `evaluateCalibrationEligibility` output unchanged; `DEFAULT_CALIBRATION_FLOORS` values unchanged.
2. `apps/web/lib/ops/calibration-eligibility-durable.ts` — additive optional fields on `EligibilityDurableSnap` (per-gate streak counters, `calibrationGreenPrior`/`discriminationGreenPrior`), seeded conservatively (see §4); both writers (cron + ops read-path) advance both counters in the same persisted snap.
3. `apps/web/lib/ops/calibration-publish-policy.ts` — additive input (per-gate statuses) and additive output `canExposeCalibrationReliability` = publishedEffective-style check against the CALIBRATION gate when split flag is on; existing `canExposePerformanceStats` formula (`:97-98`) byte-identical when flag off, and still bound to the combined status when on.
4. `apps/web/lib/ops/effective-performance-gate.ts` — additive field(s) `canExposeCalibrationReliability`, `splitEnabled`; existing fields unchanged.
5. `apps/web/lib/calibration/report.ts` — line 18 condition becomes `!(splitEnabled ? effective.canExposeCalibrationReliability : effective.canExposePerformanceStats)`; identical when flag off.
6. `apps/web/app/api/ops/public-surface-truth/route.ts` — additive JSON: per-gate eligibility sub-blocks and the split flag next to `calibrationEligibility` (:514-531); `gates.canExposePerformanceStats`/revenue-ladder inputs (:408-410, 460-473, 498) unchanged.
7. `apps/web/app/api/cron/calibration-metrics/route.ts` — additive per-gate statuses in the response JSON (:428-450); optionally lift `bssHalf`/`bssClim` (:271-272) into `DurableMetricsPayload.overall` (additive field, also mirrored in `apps/web/lib/ops/compute-live-calibration-metrics.ts:62-123`) so a future DISCRIMINATION member (BSS) has durable data — display-only until owner opts in.
8. `apps/web/lib/ops/founder-next-steps.ts` — advisory copy distinguishing "calibration passing / discrimination blocking" (:267-292). Optional, additive.
9. Tests (additive only, no weakening): new cases in `apps/web/__tests__/calibration-eligibility.test.ts` for split-off default equivalence + split-on behavior; wiring pins `ops-calibration-eligibility-surface.test.ts` / `ops-revenue-ladder-surface.test.ts` / `dashboard-performance-gate.test.ts` / `honest-degraded-states.test.ts` must keep passing as-is.

No changes to: floor **values**, `packages/prediction-engine/src/readiness.ts` / `platform-config.ts` (Gate A untouched), `apps/web/lib/performance/public-performance-policy.ts`, dark-reason taxonomy (`calibration_unpublished` still fits), Prisma schema (durable snaps are JSON in `JarvisMemoryEvent`).

### Sealed/frozen — must not touch

- `packages/db/prisma/**`, `.github/**`, `apps/web/lib/ai-control-plane/**` (its "calibration" hits are unrelated task-class strings), `scripts/guardrails/**` (read-only; `model-freeze.mjs`, `trust-gate.mjs`, `no-unsupported-performance-claims.mjs`, `sealed-holdout-open-scan.mjs`, `ai-control-plane-sealing.mjs` must all still pass — the split adds no public claim copy and no `MODEL_VERSION` bump, so none trigger).
- Edge-lab sealed holdout (`sealHoldout`/`openHoldout` in `packages/prediction-engine/src/edge-lab/walk-forward.ts`) — unrelated; do not route any gate through it.
- `packages/types/src/ladder.ts` rung thresholds and `packages/prediction-engine/src/ladder/reduce.ts:56` (`performanceStatsEnabled = rung >= PROVEN`) — a separate proof ladder; leave alone.
- Value-pinning test assertions listed in §1f — values stay 0.22/0.05/0.05; never weaken.

---

## 4. Where the 3-streak interacts with the split ambiguously

1. **Streak reset couples the gates** — `calibration-eligibility.ts:130-131`: `consecutiveGreen` zeroes on *any* floor failure, so the failing Brier has been resetting the streak the passing ECE would have earned. Durable history (`ops.calibration.eligibility` snaps) stores only the combined counter — the CALIBRATION gate's true prior streak is **unrecoverable retroactively**. The plan must pick and document a seed: conservative = both per-gate priors start at 0 on flip (CALIBRATION opens only after K fresh cron runs), not "inherit combined prior" (which is 0 anyway while Brier fails, so conservative seeding is also the de-facto no-op).
2. **Publish policy re-derives streakMet independently** — `calibration-publish-policy.ts:63-65` defaults `streakRequired ?? 3` and takes a single `consecutiveGreen`. Under a split it is ambiguous *which* gate's streak it receives; wiring the CALIBRATION streak into the performance-stats path (or vice versa) would silently open/close public surfaces. The split must pass per-gate streaks explicitly and keep `canExposePerformanceStats` on the combined pair.
3. **Two streak writers** — cron (`evaluateAndPersistEligibility`, durable.ts:246-334) and the ops read path (`loadCalibrationOpsSurface` persists first evaluation of a new artifact, durable.ts:417-427). With two counters, both writers must advance both counters in one snap; a partial write skews one gate's streak relative to the other. Idempotency key stays `metricsGeneratedAt` for both.
4. **`CALIBRATION_ELIGIBILITY_STREAK` env scope** — durable.ts:237-241 defines one K for the single gate. Split needs a decision: one K for both gates (simplest, recommended) vs per-gate K. Ambiguous if left implicit.
5. **Name collision with the 7-day Brier streak** — `packages/prediction-engine/src/calibration-monitor.ts:35-41` (`threshold 0.22, consecutiveDays 7`) is a regression alarm, not the eligibility 3-streak, yet shares the 0.22 constant and "consecutive" language. Split naming/docs must not conflate them; leave the module untouched.
6. **Operator copy** — `founder-next-steps.ts:273` ("wait for live Brier/ECE/Murphy floors + streak") and `calibration-eligibility.ts:135-148` hints assume one streak; after the split the RED reason strings should say which gate's streak is short, or the operator cannot tell which counter is accruing.

### Fresh-measurement context confirmed in-code

The Murphy identity note and the exact bound the owner cited are encoded at `apps/web/lib/calibration/murphy-res-definition.test.ts:25` (`0.02 + 0.2499 − 0.22`) and `apps/web/lib/calibration/brier-minimization-explore.ts:7-8` ("only path to BS≤0.22 is RES ≳ 0.03–0.05, not maps") — i.e., the codebase already documents that the CALIBRATION half cannot close the DISCRIMINATION half, supporting the split's framing.

### Verification honesty

This was a read-only mapping pass: no vitest/typecheck runs were executed (none needed — no code changed). All citations were verified by direct file reads.