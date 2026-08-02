# Full session extract — waves 0–7 (integrity)

Consolidates process-capital + waves 3–7 + Session 2 research. Every row is
**SHIPPED**, **OPERATOR**, or **HARD NON-GOAL**. No soft deferrals.

Merge order when landing: **none — land the single consolidated branch.**
The wave branches are linear ancestors of each other, so #281–#285 each carry a
cumulative superset diff against `main` and #286 supersedes all five. The
earlier "#281 → #282 → #283 → this wave6" sequence assumed independent diffs
and would merge the same commits repeatedly.

| Field | Rule |
|-------|------|
| Finding | One concrete claim |
| Wave | 0 process · 3 CIR · 4 holdout · 5 Session2 · 6 embed |
| Path | Code or doc |
| Status | SHIPPED · OPERATOR · HARD NON-GOAL |

---

## Wave 0 — Process capital / money path

| Finding | Path | Status |
|---------|------|--------|
| Free settle only when `THE_ODDS_API_KEY` ABSENT | settle-picks cron | SHIPPED (OPERATOR blank key) |
| Stripe `checkout.session.expired` + idempotency | webhooks/stripe | SHIPPED (OPERATOR dashboard) |
| Outbox lease + claimVersion | existing outbox | SHIPPED — never rewrite |
| CheckoutAttempt create-idempotency | stripe lib | SHIPPED |
| Clearance honesty unregistered=false | source-router | SHIPPED |
| Skills pack SKILL.md | docs/agent-skills/* | SHIPPED |
| agent-eval $0 fixtures | scripts/agent-eval | SHIPPED |
| MODEL_PRIMARY / MODEL_CHEAP | model-router.ts | SHIPPED |
| export:settled-picks | scripts/export-settled-picks… | SHIPPED |
| ORBIT_UNLOCK founder checklist | docs/ops/ORBIT_UNLOCK.md | SHIPPED |
| Credits claims | docs/ops/CREDITS.md | OPERATOR |
| Polymarket feature work | polymarket-hold | HARD NON-GOAL |
| Rebuild webhook/outbox | — | HARD NON-GOAL |
| LIVE_BOARD without founder YES | — | HARD NON-GOAL |

## Wave 3 — CIR + DSPy + orbit map

| Finding | Path | Status |
|---------|------|--------|
| centeredIsotonicCalibration | probability-calibration.ts | SHIPPED (R&D gate) |
| countDistinctPredictions | same | SHIPPED |
| dspy-gse dry-run harness | scripts/dspy-gse | SHIPPED |
| ORBIT_MAP / ORBIT_NEXT_50 | docs/ops | SHIPPED |
| coding-agent + polymarket-hold skills | docs/agent-skills | SHIPPED |

## Wave 4 — Hold-out + paradox + offline

| Finding | Path | Status |
|---------|------|--------|
| timeHoldoutSplit | probability-calibration.ts | SHIPPED |
| selectedSliceEce | same | SHIPPED |
| calibration:offline | scripts/calibration-offline | SHIPPED |
| calibration-pipeline skill | docs/agent-skills | SHIPPED |

## Wave 5 — Session 2 extract integrity

| Finding | Path | Status |
|---------|------|--------|
| SESSION_2_EXTRACT.md | docs/ops | SHIPPED |
| gse_metric Prediction(score,feedback) | gse_metric.mjs | SHIPPED |
| gepa_config reflection 1.0 / task 0 / auto=light | gepa_config.json | SHIPPED |
| promote Examples train/val | promote.mjs | SHIPPED |
| sizeAfterCalibration CIR→Kelly | calibration-kelly-bridge.ts | SHIPPED |
| portfolioKellyStakes barrel export | index.ts | SHIPPED |
| dspy-gepa skill | docs/agent-skills | SHIPPED |
| Full Kelly / MIPROv2 default | DEFER_90_DAYS | HARD NON-GOAL |

## Wave 6 — Distribution embed + full integrity

| Finding | Path | Status |
|---------|------|--------|
| Free `/embed/edge-index/[gameId]` | apps/web/app/embed/… | SHIPPED |
| `/edge-index` marketing + snippet | apps/web/app/edge-index | SHIPPED |
| iframe frame-ancestors for /embed/* | middleware + next.config | SHIPPED |
| No confidence on free embed | loadEdgeIndexEmbed FREE only | SHIPPED |
| orbit-extract-integrity harness | scripts/orbit-extract-integrity.mjs | SHIPPED |
| inference-routing SKILL.md | docs/agent-skills/inference-routing | SHIPPED |
| FULL_SESSION_EXTRACT | this file | SHIPPED |

## Commands

```bash
npm run dspy:gse
npm run calibration:offline
npm run agent:eval
npm run orbit:integrity        # path assert + session2:extract
npm run orbit:integrity:full   # the above, chained with dspy + calibration:offline + agent:eval
npm run session2:extract
```

`npm run orbit:integrity` parses **this file** and fails if any command above is
not declared in the root `package.json`, or if any symbol in the import surface
below is not exported from `packages/prediction-engine/src/index.ts` — so the
doc cannot drift from the repo it describes. The Path column in the tables is
prose shorthand, not repo-root paths, and is not machine-asserted.

## Package import surface

```ts
import {
  centeredIsotonicCalibration,
  timeHoldoutSplit,
  selectedSliceEce,
  sizeAfterCalibration,
  portfolioKellyStakes,
  clvDeflator,
  shinDevig,
  toEdgeIndex,
  MODEL_VERSION,
} from "@sports/prediction-engine";
```

## Wave 7 — Max leverage (no soft deferrals)

| Finding | Path | Status |
|---------|------|--------|
| health-alert cron every 15m | vercel.json | SHIPPED |
| refresh-player-stats every 30m | vercel.json | SHIPPED |
| Production embed CSP frame-ancestors | vercel.json headers | SHIPPED |
| selectSettlementPath pure law | lib/settlement/path-select.ts | SHIPPED |
| settle-picks uses path-select | settle-picks/route.ts | SHIPPED |
| orbit-unlock-smoke | scripts/ops/orbit-unlock-smoke.mjs | SHIPPED |
| MAX_LEVERAGE founder page | docs/ops/MAX_LEVERAGE.md | SHIPPED |
| max-leverage skill | docs/agent-skills/max-leverage | SHIPPED |
