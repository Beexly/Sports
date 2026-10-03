# Proof Spine — Integration Guide

How to wire the proof-spine primitives (all built + tested this cycle) into the live
pipeline **without fabricating anything**. Follow this exactly; the honesty traps are
called out where they bite.

---

## 1. What's built (the pieces)

| Piece | Where | Pure? | State |
|---|---|---|---|
| CLV coverage invariant | `apps/web/lib/performance/clv-coverage.ts` | loader | wired (admin) |
| Settlement health (stale-unsettled alarm) | `apps/web/lib/performance/settlement-health.ts` | loader | wired (admin) |
| Segmented CLV (sport/market/confidence/**version**) | `apps/web/lib/performance/clv-segments.ts` | pure | wired (admin) |
| Wilson intervals | `apps/web/lib/performance/wilson-interval.ts` (→ `@sports/prediction-engine`) | pure | wired (admin + public + calibration) |
| Public CLV policy (Wilson-bounded, break-even gated) | `apps/web/lib/performance/public-clv-policy.ts` | loader | wired (public `/clv`) |
| Pre-result tamper-evident receipt | `packages/prediction-engine/src/pick-proof-receipt.ts` | pure | **needs mint wiring** |
| Commit-reveal slate | `packages/prediction-engine/src/slate-commitment.ts` | pure | **needs publish wiring** |
| Production SHA-256 hash | `apps/web/lib/performance/proof-hash.ts` | server | ready |
| Anchor CLV (vs hard third-party close) | `apps/web/lib/performance/clv-anchor.ts` | pure | **needs Kalshi persistence** |
| `PickProofReceipt` table | `packages/db/prisma/schema.prisma` + migration | — | **needs `migrate deploy`** |

---

## 2. Wiring order

### Step A — expose the honest market fair prob (prereq for the mint)
`scoreGames()` already computes a devigged `fairProb` per pick (`removeVig` in
`packages/prediction-engine/src/scoring.ts`) but **discards it** (`fairProbability: null`
at three return sites). Surface it on the `ScoredPick` output (a new field, e.g.
`marketFairProb`). **Do NOT** repurpose the existing `factorBreakdown.fairProbability`
slot — it is reserved for a *future independent model prob, "never inferred from
market."* Add a separate, clearly market-derived field.

### Step B — mint a receipt at pick creation (`process-sport.ts`)
After the pick is upserted (around the `clvLockLine/clvLockPrice` capture):

```ts
import { buildPickProofReceipt } from "@sports/prediction-engine";
import { sha256Hex } from "@/lib/performance/proof-hash";

try {
  const receipt = buildPickProofReceipt({
    pickId: pick.id,
    gameId: pick.gameId,
    selection: pick.selection,
    pickType: pick.pickType,
    line: pick.line,
    entryOdds: pick.pickType === "MONEYLINE" ? Math.round(pick.line) : /* side price */ -110,
    marketFairProb: scored.marketFairProb,   // from Step A — REAL devigged prob
    confidence: pick.confidence,              // the 0–100 heuristic, committed AS a heuristic
    edgeScore: pick.edgeScore,
    modelProb: null,                          // ← LEAVE NULL until a calibrated prob exists
    modelVersion: pick.modelVersion,
    asOf: fetchedAt.toISOString(),            // pre-kickoff by construction
  }, sha256Hex);
  await db.pickProofReceipt.upsert({ where: { pickId: pick.id }, create: { ...receipt fields }, update: {} });
} catch (e) {
  // Non-fatal, exactly like CLV grading — a receipt failure never blocks pick creation.
}
```

**Honesty trap:** never pass `confidence / 100` as `modelProb`. There is no calibrated
model probability yet; committing `"none"` is the honest record. When the OOS promoter
lands a calibrated prob, populate `modelProb` then.

The receipt is immutable: write once (`upsert` with empty `update`), never overwrite.

### Step C — publish the slate commitment (pre first kickoff)
Once a slate's receipts exist, before any game starts:

```ts
import { buildSlateCommitment } from "@sports/prediction-engine";
const { root, count } = buildSlateCommitment(slateId, new Date().toISOString(), receipts, sha256Hex);
// persist { slateId, root, count, committedAt } — this is the public commitment.
```
Add a `SlateCommitment` model (`slateId @unique`, `root`, `count`, `committedAt`) and a
`slateId` FK on `PickProofReceipt` so a slate can be reconstructed and any pick's
inclusion proven later (`provePickInSlate` / `verifyPickInSlate`). The published `root`
is what a skeptic checks against — it fixes the population and its size before kickoff.

### Step D — grade vs the hard anchor at settlement (`settle-sport.ts`)
Settlement already grades CLV vs our consensus close. When Kalshi (or another sharp
close) is **persisted** (the client exists but is inert), also call `gradeAnchorClv`
with the entry prob, our consensus close prob, and the anchor close prob — **all on the
same vig basis** (all devigged, or all priced; never mixed). Record `clvVsAnchor` and
the `softClose` flag. `rollupAnchorClv` feeds the anchor-graded public number.

### Step E — surfaces
- Public `/clv` already shows the Wilson-bounded beat-close rate and break-even read.
- Build a **reveal** surface: published slate `root` + per-pick inclusion proof, so the
  pre-registration is publicly auditable. Win-rate stays gated until the floor.

---

## 3. Gating (unchanged invariants)
- Public CLV/calibration renders only when `canExposePerformanceStats` **and** the
  settled-sample floor is met (`public-clv-policy.ts`).
- Coverage must be healthy (`clv-coverage.ts`) before the beat-close rate is trusted —
  a rate over <100% coverage is survivorship-biased.
- Per-model-version record (`clv-segments.ts` "modelVersion") makes a model swap visible.
- Banned-phrase scanning stays the single source of truth (`@/lib/trust-claims`).

## 4. Owner / prod prerequisites
- `prisma migrate deploy` to create `pick_proof_receipts` (and the slate tables when added).
- Persist Kalshi (or a sharp book) for Step D.
- The OOS promoter (on `claude/laughing-wozniak-gyryjx`) for the calibrated `modelProb`.

---

*The point of this guide: the proof spine is fabrication-proof by construction only if
it's wired this way. Commit the real claim, leave `modelProb` null until it's real,
keep the anchor on one vig basis, freeze before kickoff, gate the public claim.*
