/**
 * Prediction-Time Merkle — DecisionRecord (Pillar C.2)
 *
 * Commits an immutable hash of the provenance chain at publish time,
 * enabling tamper-evidence over the full decision trail.
 *
 * Design:
 *  - commitDecisionRecord: called once at pick publish, writes a leaf hash
 *    over the canonicalized ProvenanceChain. IMMUTABLE — upsert update is {}.
 *  - publishDailyDecisionRoot: builds a Merkle root over all records for a day,
 *    verifies inclusion proofs, stamps each row.
 *  - replayDecision: recomputes the leaf from the stored chain payload and
 *    asserts it matches the stored leafHash.
 *
 * The chainPayload column is the serialized canonical form. It is NEVER updated
 * after commit — the only valid write is the initial create.
 */

import { createHash } from "node:crypto";
import {
  hashLeaf,
  merkleRoot,
  inclusionProof,
  verifyInclusion,
  canonicalPickPayload,
} from "@sports/prediction-engine";
import { db } from "@sports/db";
import type { ProvenanceChain } from "@/lib/provenance/trace-claim";

// ─── Hash utility ─────────────────────────────────────────────────────────────

const sha256 = (s: string): string =>
  createHash("sha256").update(s, "utf8").digest("hex");

// ─── Canonical serialization ──────────────────────────────────────────────────

/**
 * Build a deterministic string over the ProvenanceChain.
 *
 * Invariants:
 *  - Same chain in any link order → same output (links are sorted by signalKey)
 *  - Each link is encoded as `signalKey:kind:payloadHash:knownAt:rightsStatus`
 *  - Top-level fields (pickId, generatedAt, modelVersion, broadcastAllowed) are included
 *
 * This feeds into canonicalPickPayload so the output is compatible with the
 * prediction-engine's PickRecord serialization.
 */
export function canonicalDecisionPayload(chain: ProvenanceChain): string {
  const sorted = [...chain.links].sort((a, b) =>
    a.signalKey.localeCompare(b.signalKey)
  );
  const linkParts = sorted.map(
    (l) =>
      `${l.signalKey}:${l.kind}:${l.payloadHash ?? "none"}:${l.knownAt}:${l.rights?.status ?? "unknown"}`
  );
  return canonicalPickPayload({
    pickId: chain.pickId,
    generatedAt: chain.generatedAt,
    modelVersion: chain.modelVersion,
    links: linkParts.join(";"),
    broadcastAllowed: String(chain.broadcastAllowed),
  });
}

// ─── Commit ──────────────────────────────────────────────────────────────────

/**
 * Write an immutable DecisionRecord for a pick at publish time.
 *
 * The upsert update is intentionally empty — once a record exists it is never
 * mutated. This means calling commitDecisionRecord twice is a safe no-op.
 */
export async function commitDecisionRecord(chain: ProvenanceChain): Promise<void> {
  const payload = canonicalDecisionPayload(chain);

  // knownAt = max fetchedAt across all links (latest signal we could have known)
  const knownAt =
    chain.links.length > 0
      ? new Date(
          Math.max(...chain.links.map((l) => new Date(l.knownAt).getTime()))
        )
      : new Date();

  const pickRecord = { id: chain.pickId, payload };
  const leaf = hashLeaf(sha256, pickRecord);

  await db.decisionRecord.upsert({
    where: { pickId: chain.pickId },
    create: {
      pickId: chain.pickId,
      knownAt,
      modelVersion: chain.modelVersion,
      chainPayload: payload,
      leafHash: leaf,
    },
    update: {}, // IMMUTABLE — never overwrite committed record
  });
}

// ─── Daily root ───────────────────────────────────────────────────────────────

/**
 * Build a Merkle root over all DecisionRecords committed on `day` (UTC),
 * verify each inclusion proof, then stamp dailyRoot on every matched row.
 *
 * Returns the computed root.
 *
 * Throws if any inclusion proof fails — a failure indicates data corruption.
 */
export async function publishDailyDecisionRoot(day: Date): Promise<string> {
  const start = new Date(day);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setUTCHours(23, 59, 59, 999);

  const records = await db.decisionRecord.findMany({
    where: { committedAt: { gte: start, lte: end } },
    orderBy: { committedAt: "asc" },
  });

  if (records.length === 0) {
    // Return deterministic empty-set root
    return sha256("");
  }

  const pickRecords = records.map((r: { id: string; chainPayload: string }) => ({ id: r.id, payload: r.chainPayload }));
  const root = merkleRoot(pickRecords, sha256);

  // Verify every leaf before stamping
  for (let i = 0; i < records.length; i++) {
    const proof = inclusionProof(pickRecords, i, sha256);
    if (!verifyInclusion(proof, root, sha256)) {
      throw new Error(
        `DecisionRecord ${records[i]!.id} failed inclusion verification — possible data corruption`
      );
    }
  }

  await db.decisionRecord.updateMany({
    where: { committedAt: { gte: start, lte: end } },
    data: { dailyRoot: root },
  });

  return root;
}

// ─── Replay ───────────────────────────────────────────────────────────────────

/**
 * Recompute the leaf hash from the stored chainPayload and compare it to
 * the committed leafHash. A mismatch indicates tampering.
 *
 * Returns: { valid, storedHash, recomputedHash }
 *
 * Throws if no DecisionRecord exists for the given pickId.
 */
export async function replayDecision(
  pickId: string
): Promise<{ valid: boolean; storedHash: string; recomputedHash: string }> {
  const record = await db.decisionRecord.findUnique({ where: { pickId } });
  if (!record) throw new Error(`No DecisionRecord for pick ${pickId}`);

  const pickRecord = { id: record.id, payload: record.chainPayload };
  const recomputed = hashLeaf(sha256, pickRecord);

  return {
    valid: recomputed === record.leafHash,
    storedHash: record.leafHash,
    recomputedHash: recomputed,
  };
}
