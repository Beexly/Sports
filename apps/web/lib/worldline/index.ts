/**
 * Worldline v0 — public surface (W002). Bitemporal WorldSnapshot / WorldDelta:
 * append-only observations on two clocks, as-of reads, semantic diffs, a
 * fail-loud replay-stability audit, and canonical digests for provable replays.
 * The invariant before the spectacle: no consumers here — W003+ (Reality
 * Receipts, SportsIR, Intelligence Contracts) build on this object.
 */

export type * from "./types";
export { WorldlineStore, WorldlineIngestError, WorldlineReplayError } from "./store";
export { worldDelta } from "./delta";
export { snapshotDigest } from "./digest";
