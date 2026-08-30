# Issue #419 — Decision Packet: MODEL_VERSION v5.2.6 calibration artifact

Status: **decision-ready, evidence complete**. A strong session (or the owner)
can green `guard:model-freeze` in ~5 minutes using §2 verbatim.

---

## 1. The verdict: FROZEN is NOT honest — use an IMPLEMENTED proposal

Issue #419's option 3 (FROZEN.md) is only valid "if the bump genuinely changed
no scoring weights." The v5.2.6 bump **materially changed calibration math**:

Commit `5387ac6f` ("feat(closeout): finish all remaining A–D levers without
gate flips", 2026-08-10) — its own diff:

- `packages/prediction-engine/src/constants.ts`:
  - `export const MODEL_VERSION = "v5.2.5"` → `"v5.2.6"`
  - New constants: `INDEPENDENT_EVIDENCE_SHRINK = 0.88` and
    `MARKET_ANCHOR_INDEP_WEIGHT = 0.55`
- `apps/web/lib/calibration/live-calibration-p.ts`:
  - New live-eligibility p formula: `0.55 × shrink(indep) + 0.45 × real book
    marketFair` (replaces the v5.2.5 `0.7 indep / 0.3 conf` blend)
  - New `shrinkIndependent(p, α=0.88)` fixed-prior shrink toward 0.5
  - v5.2.5's blend was `0.7 indep / 0.3 conf`; v5.2.4 (6db080c3) changed
    resolution to independent-p-first; v5.2.3 (47c3617e) priced independents
    into the ranking path.

Because the confidence/eligibility probability computation changed, a FROZEN
marker would falsely claim "no scoring weights changed since the last
implemented proposal." **Do not use FROZEN for v5.2.6.**

## 2. The fix (5 minutes)

Create `docs/calibration-proposals/2026-08-10-closeout-v5.2.6.md` with:

```markdown
---
modelVersion: v5.2.6
status: IMPLEMENTED
date: 2026-08-10
author: closeout leverage (principal build agent)
supersedes: v5.2.2
---

# CalibrationProposal — market-anchored live eligibility + evidence shrink (v5.2.2 → v5.2.6)

## Decision

Bump `MODEL_VERSION` to **v5.2.6** for the v5.2.3→v5.2.6 closeout run:

1. **v5.2.3** (47c3617e): independent estimators (free MLB StatsAPI standings,
   nflverse EPA) priced into the ranking path.
2. **v5.2.4** (6db080c3): Murphy RES unlock — independent p first, synthetic
   marketFairProb=0.5 never treated as a real book.
3. **v5.2.5** (9940022b): dual-objective selective publish (RES under Brier
   cap); live eligibility blend 0.7 independent / 0.3 confidence; softer
   discrimination stretch.
4. **v5.2.6** (5387ac6f): market-anchored live eligibility — fixed evidence
   shrink α=0.88 (`INDEPENDENT_EVIDENCE_SHRINK`) and 0.55/0.45
   independent/market blend (`MARKET_ANCHOR_INDEP_WEIGHT`) in
   `apps/web/lib/calibration/live-calibration-p.ts`; pick-card
   priced-into-ranking honesty.

Heuristic confidence weights / composite formula otherwise unchanged. Maps,
AUTO_PUBLISH, PERFORMANCE_STATS, floors unchanged.

## What this is — and is NOT

Calibration/eligibility math change. **Not** a PROVEN claim. Floors (Brier ≤
0.22, ECE ≤ 0.05, Murphy R ≤ 0.05, n ≥ 100, GREEN×K) unchanged and still
required for PROVEN.

## Evidence

- Commit 5387ac6f diff (constants.ts: `INDEPENDENT_EVIDENCE_SHRINK`=0.88,
  `MARKET_ANCHOR_INDEP_WEIGHT`=0.55; live-calibration-p.ts blend formula).
- Tests: `apps/web/__tests__/live-calibration-p.test.ts` (updated in 5387ac6f).
```

Then verify:

```bash
npm run guard:model-freeze   # expect OK
npm run typecheck && npm run lint && npm test
```

## 3. Notes for the owner

- FROZEN.md currently locks `frozen: v5.1.0` — it has not been updated since
  v5.1.0 and does NOT cover v5.2.x. Leaving it stale while adding the v5.2.6
  proposal is fine (the guard only needs the IMPLEMENTED artifact), but the
  stale line is misleading — consider updating its comment.
- The shadow pipeline (merged in #412) will accumulate settled outcomes; when
  real calibration evidence exists, a follow-up proposal can cite actual
  Brier/ECE deltas instead of commit-level evidence.
- Guardrail source: `scripts/guardrails/model-freeze.mjs` accepts either the
  seed-row path (packages/db/prisma/seed.ts) or the docs path above. The docs
  path matches the existing v5.2.1/v5.2.2 artifacts and needs no seed/schema
  change.
