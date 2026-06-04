/**
 * Trust Ledger — a live, REAL proof-of-record demonstration.
 *
 * Uses the engine's tamper-evident Merkle commitment (proof-of-record.ts) with a
 * real SHA-256 hash to commit a set of illustrative settled picks, publish the
 * root, prove one pick's inclusion, and show that altering any record (e.g.
 * quietly turning a LOSS into a WIN) changes the recomputed root — so the tamper
 * is detected against the published commitment. The cryptography is real; the
 * records are explicitly illustrative.
 *
 * Server-only (node:crypto).
 */

import { createHash } from "node:crypto";
import {
  merkleRoot, inclusionProof, hashLeaf, verifyInclusion, canonicalPickPayload,
  type HashFn, type PickRecord,
} from "@sports/prediction-engine";

const sha256: HashFn = (s) => createHash("sha256").update(s).digest("hex");
const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

type DemoPick = {
  readonly id: string;
  readonly label: string;
  readonly market: string;
  readonly selection: string;
  readonly result: "WIN" | "LOSS" | "PUSH";
  readonly confidence: number;
  readonly lockedAt: string;
  readonly modelVersion: string;
};

// Six illustrative settled picks — coded labels, never presented as live.
const PICKS: readonly DemoPick[] = [
  { id: "rec-1", label: "NFL · Game 01", market: "Spread", selection: "Home −3.5", result: "WIN", confidence: 64, lockedAt: "2026-05-30T18:02:00Z", modelVersion: "v5.2.0" },
  { id: "rec-2", label: "NBA · Game 02", market: "Total", selection: "Over 224.5", result: "LOSS", confidence: 58, lockedAt: "2026-05-30T19:14:00Z", modelVersion: "v5.2.0" },
  { id: "rec-3", label: "MLB · Game 03", market: "Moneyline", selection: "Away ML", result: "WIN", confidence: 61, lockedAt: "2026-05-30T20:05:00Z", modelVersion: "v5.2.0" },
  { id: "rec-4", label: "NHL · Game 04", market: "Puck line", selection: "Home −1.5", result: "LOSS", confidence: 55, lockedAt: "2026-05-30T20:40:00Z", modelVersion: "v5.2.0" },
  { id: "rec-5", label: "NFL · Game 05", market: "Total", selection: "Under 41.5", result: "PUSH", confidence: 52, lockedAt: "2026-05-30T21:10:00Z", modelVersion: "v5.2.0" },
  { id: "rec-6", label: "NBA · Game 06", market: "Spread", selection: "Away +6.5", result: "WIN", confidence: 67, lockedAt: "2026-05-30T22:00:00Z", modelVersion: "v5.2.0" },
];

function toRecord(p: DemoPick): PickRecord {
  return {
    id: p.id,
    payload: canonicalPickPayload({
      game: p.label, market: p.market, selection: p.selection,
      result: p.result, confidence: p.confidence, lockedAt: p.lockedAt, modelVersion: p.modelVersion,
    }),
  };
}

export type ProofDemo = {
  readonly illustrative: true;
  readonly publishedRoot: string;
  readonly publishedRootShort: string;
  readonly records: ReadonlyArray<{ id: string; label: string; market: string; selection: string; result: string }>;
  readonly intactMatches: boolean;
  readonly tamper: {
    readonly changedId: string;
    readonly changedLabel: string;
    readonly field: string;
    readonly from: string;
    readonly to: string;
    readonly recomputedRoot: string;
    readonly recomputedRootShort: string;
    readonly matches: boolean;
  };
  readonly proof: {
    readonly recordId: string;
    readonly recordLabel: string;
    readonly leafShort: string;
    readonly siblings: ReadonlyArray<{ hashShort: string; right: boolean }>;
    readonly verified: boolean;
  };
};

export function buildProofDemo(): ProofDemo {
  const records = PICKS.map(toRecord);
  const publishedRoot = merkleRoot(records, sha256);

  // Recompute from the intact ledger → should match the published root.
  const intactMatches = merkleRoot(records, sha256) === publishedRoot;

  // Tamper: quietly turn rec-4 from LOSS into WIN.
  const TAMPER_INDEX = 3;
  const tamperedPicks = PICKS.map((p, i) => (i === TAMPER_INDEX ? { ...p, result: "WIN" as const } : p));
  const tamperedRoot = merkleRoot(tamperedPicks.map(toRecord), sha256);

  // Inclusion proof for rec-2, verified against the published root.
  const PROOF_INDEX = 1;
  const proof = inclusionProof(records, PROOF_INDEX, sha256);
  const verified = verifyInclusion(proof, publishedRoot, sha256);
  const leaf = hashLeaf(sha256, records[PROOF_INDEX]!);

  return {
    illustrative: true,
    publishedRoot,
    publishedRootShort: short(publishedRoot),
    records: PICKS.map((p) => ({ id: p.id, label: p.label, market: p.market, selection: p.selection, result: p.result })),
    intactMatches,
    tamper: {
      changedId: PICKS[TAMPER_INDEX]!.id,
      changedLabel: PICKS[TAMPER_INDEX]!.label,
      field: "result",
      from: "LOSS",
      to: "WIN",
      recomputedRoot: tamperedRoot,
      recomputedRootShort: short(tamperedRoot),
      matches: tamperedRoot === publishedRoot,
    },
    proof: {
      recordId: PICKS[PROOF_INDEX]!.id,
      recordLabel: PICKS[PROOF_INDEX]!.label,
      leafShort: short(leaf),
      siblings: proof.siblings.map((s) => ({ hashShort: short(s.hash), right: s.right })),
      verified,
    },
  };
}
