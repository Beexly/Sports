# OOS Split Harness and Champion/Challenger Promoter

## Problem Solved

**The OOS + Promoter pair is the genuinely missing piece in safe model progression.**

Previously:
- All picks used a single, hardcoded `MODEL_VERSION` constant
- No way to test if a model was overfit (in-sample looks good, but OOS fails)
- No mechanism to promote a better model safely without human intervention
- No CLV-gated proof before advancement (pricing is proof-gated, model should be too)

**With OOS + Promoter:**
- In-sample and out-of-sample cohorts are split by a time boundary
- OOS is the ground truth: overfit models fail the OOS health check
- Challenger must beat champion by a statistical threshold to promote
- Promotion is gated on CLV proof (≥100 settled picks) and OOS sample size
- Champion never auto-downgrades; only promotion or hold

## Architecture

### OOS Split Harness (`oos-split.ts`)

**Divides settled picks by time boundary:**
- **In-sample**: Picks created before `boundaryDate` (training cohort)
- **Out-of-sample**: Picks created after `boundaryDate` (test cohort)

**Computes health metrics for each cohort:**
```
WindowCalibration {
  n: number           // sample size
  brier: number       // mean squared error: Σ(pred - actual)² / n (0=perfect)
  accuracy: number    // % of picks correct (0–1)
  meanPredicted: number  // average confidence across picks
  calibrationError: number  // |meanPredicted − accuracy| (0=perfect)
}
```

**Health verdict:**
```
oosIsHealthy = (OOS Brier − IS Brier) ≤ 0.03
```
Allows 3% Brier worsening for random drift; above that is overfit risk.

**Segmented health** (optional):
- Group OOS picks by pick type (SPREAD / MONEYLINE / TOTAL)
- Compute per-segment Brier to catch regressions on specific markets
- Prevents averaging across dissimilar units

### Champion/Challenger Promoter (`model-promoter.ts`)

**Maintains a single frozen "champion" model version for all picks.**

**Promotion decision flow:**
```
1. Input: champion model, challenger model, settled picks
2. Split picks by challenger deployment date (time boundary)
3. Verify OOS sample meets CLV proof threshold (≥100 picks, default)
4. Verify OOS health: brierDelta ≤ 0.03 (not overfit)
5. If challenger OOS Brier ≤ champion OOS Brier − threshold → PROMOTE
   (Brier improvement threshold = 0.02 or 2% by default)
6. Output: PromotionDecision { selectedModel, isPromotion, rationale }
```

**Key invariants:**
- Champion NEVER auto-downgrades (only human override or new challenger)
- Challenger must BEAT, not tie (threshold ensures real improvement)
- OOS + IS health checked before promotion (overfit guard)
- Proof is always CLV-gated (pick volume, not just calendar time)

## Integration with Pick Generation

### Current State

`packages/ingestion-pipeline/src/process-sport.ts` calls `scoreGames()` once per cycle:
```typescript
const scoredPicks = scoreGames(oddsInputs, fetchedAt);
// All picks use the MODEL_VERSION from constants.ts
for (const pick of scoredPicks) {
  const pickUpdateData = {
    modelVersion: pick.modelVersion,
    // ... other fields
  };
  await db.pick.upsert({ ... });
}
```

### Next Phase: Wire Promoter into Pick Creation

**Step 1: Query settled picks with their predicted probabilities**
```typescript
const settledPicks = await db.pick.findMany({
  where: { result: { not: "PENDING" } },
  select: {
    id: true,
    confidence: true, // model's predicted win%
    result: true,     // WIN / LOSS / VOID
    pickType: true,
    createdAt: true,
    settledAt: true,
  },
});

// Convert to SettledPickRecord format
const pickRecords = settledPicks.map(p => ({
  id: p.id,
  modelProb: p.confidence / 100,
  won: p.result === "WIN",
  createdAt: p.createdAt,
  settledAt: p.settledAt,
  line: null,  // optional; used for segmentation
  pickType: p.pickType,
}));
```

**Step 2: Call promoter to get model version selection**
```typescript
import { promoteModel } from "@sports/prediction-engine";

const currentChampion = { version: "v5.0.0", deployedAt: new Date(...) };
const proposedChallenger = { version: "v6.0.0", deployedAt: new Date(...) };

const decision = promoteModel(currentChampion, proposedChallenger, pickRecords, {
  minOosSample: 100,  // PROVEN tier
  brierImprovementThreshold: 0.02,
  maxOosToIsDelta: 0.03,
});

console.log(`Promotion: ${decision.isPromotion ? "YES" : "NO"}`);
console.log(`Selected model: ${decision.selectedModel.version}`);
console.log(`Reason: ${decision.reason}`);
```

**Step 3: Use selected model version in pick generation**
```typescript
// Replace:
const scoredPicks = scoreGames(oddsInputs, fetchedAt);

// With:
const modelVersion = decision.selectedModel.version;
const scoredPicks = scoreGames(oddsInputs, fetchedAt, { modelVersion });

// Then in the pick upsert loop, modelVersion is already set from decision
```

**Step 4: Mint receipt with selected model version**
```typescript
import { hashLeaf, merkleRoot, canonicalPickPayload } from "@sports/prediction-engine";

const picks = []; // array of ScoredPick
for (const pick of picks) {
  const payload = canonicalPickPayload({
    pickId: pick.id,
    modelVersion: decision.selectedModel.version,  // ← FROZEN
    modelProb: pick.confidence / 100,
    line: pick.line,
    asOf: fetchedAt.toISOString(),
  });
  
  const leaf = hashLeaf(cryptoHash, { id: pick.id, payload });
  picks.push({ ...pick, proofLeaf: leaf });
}

const root = merkleRoot(picks.map(p => ({ id: p.id, payload: p.payload })), cryptoHash);
await publishMerkleRoot(root, decision.selectedModel.version);
```

## Proof-Gating Milestones

| Milestone | Tier | Condition | What Unlocks |
|-----------|------|-----------|--------------|
| FOUNDING | Founding | Initial deployment | Pick generation, public board (no confidence) |
| PROVEN | Pro | ≥100 settled + CLV model published | Confidence display, model promoter eligible |
| ESTABLISHED | Elite | ≥500 settled + verified CLV ≥52.4% | Real-time alerts, premium access |
| AUTHORITY | VIP | Multi-season ROI track record | Strategic consulting, API access |

**Model versions are proof-gated the same way:**
- Challenger can't promote until it has ≥100 OOS picks AND passes OOS health check
- Once promoted, new champion is used for all future picks
- If champion degrades (drift alarm), owner is paged; challenger can be proposed

## Scheduling and Operations

**Promoter is called:**
1. **On demand** (admin trigger): owner manually evaluates and promotes
2. **Scheduled** (hourly): automated check if challenger is ready
3. **Trigger based** (on settlement): when a new pick settles, re-evaluate

**Drift monitoring** (separate from promoter):
- `calibration-drift.ts` compares recent vs baseline Brier
- If alert threshold (0.05) is crossed, page owner + flag new challenger as risky
- Champion stays active; decision is owner's

**CLV capture** (already wired):
- Settlement pipeline grades every pick against closing line
- CLV results are stored and segmented (no average across dissimilar markets)
- Promoter uses CLV for final health assessment (when available)

## Files and Dependencies

**New files:**
- `packages/prediction-engine/src/oos-split.ts` (270 lines)
- `packages/prediction-engine/src/model-promoter.ts` (230 lines)
- Tests: `src/__tests__/oos-split.test.ts`, `src/__tests__/model-promoter.test.ts`

**Exports from `packages/prediction-engine/src/index.ts`:**
```typescript
export {
  computeOosSplit,
  segmentOosSplit,
} from "./oos-split.js";

export {
  promoteModel,
} from "./model-promoter.js";
```

**Dependencies:**
- `calibration-drift.ts` (already in index): `computeWindowCalibration`, `WindowCalibration`
- `proof-of-record.ts` (for receipt minting): `hashLeaf`, `merkleRoot`

## Testing

**OOS Split tests (7 tests):**
- Split by boundary date (in-sample vs OOS)
- Detect insufficient samples
- Detect overfit (OOS Brier >> IS Brier)
- Handle edge cases (empty picks, out-of-range probabilities)
- Segment by pick type

**Promoter tests (7 tests):**
- Hold champion when no challenger proposed
- Hold champion when challenger has insufficient sample
- Hold champion when challenger shows overfit
- Promote challenger when it beats champion by threshold
- Include comparison details on promotion
- Never demote champion
- Handle edge cases (zero settled picks)

All tests pass (480 total in prediction-engine package).

## Next: Wire Receipt into Pick Creation

**Task sequence (post-promoter):**
1. Wire promoter output (selected model version) into `scoreGames()` call
2. Freeze model version in proof receipt before kickoff
3. Persist receipt root to public ledger
4. Add receipt verification to settlement pipeline (verify no tampering)
5. Surface proof attestation in public UI (glass box)

**Blocker: receipt mint requires proof persistence**
- Receipt root must be published (e.g., immutable log, blockchain, signed JSON)
- Every pick carries an inclusion proof
- User can verify pick was in the committed set

This is the bridge from proof infrastructure → public trust experience.
