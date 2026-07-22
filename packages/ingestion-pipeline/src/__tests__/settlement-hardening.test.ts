/**
 * Hardening-unit tests for directive section 6 (PR #161):
 *   6.1 durable run identity + corroboration rule (distinct snapshots OR
 *       minimum temporal separation)
 *   6.3 append-only owner decision events over anomalies
 *
 * Pure-function and structural-db tests; the real-Postgres constraint and
 * concurrency proofs live in scripts/integration/settlement-outbox-acceptance.mjs.
 */

import { describe, expect, it, vi } from "vitest";
import {
  countCorroboratingRuns,
  MIN_CORROBORATION_SEPARATION_MINUTES,
  OWNER_DECISION_KINDS,
} from "../settlement-evidence.js";
import {
  computeScheduledWindow,
  fingerprintSourceSnapshot,
  getOrCreateSettlementRun,
  settlementRunIdempotencyKey,
  type SettlementRunDb,
} from "../settlement-run.js";
import {
  recordOwnerSettlementDecision,
  type SettlementDecisionDb,
} from "../settlement-decisions.js";

const T0 = new Date("2026-07-22T12:00:00Z");
const min = (m: number) => new Date(T0.getTime() + m * 60_000);

describe("countCorroboratingRuns (6.1)", () => {
  it("distinct snapshot fingerprints corroborate regardless of spacing", () => {
    const { corroboratingRunIds } = countCorroboratingRuns([
      { settlementRunId: "r1", sourceSnapshotFingerprint: "a", observedAt: min(0) },
      { settlementRunId: "r2", sourceSnapshotFingerprint: "b", observedAt: min(1) },
      { settlementRunId: "r3", sourceSnapshotFingerprint: "c", observedAt: min(2) },
    ]);
    expect(corroboratingRunIds).toEqual(["r1", "r2", "r3"]);
  });

  it("identical snapshots seconds apart corroborate ONCE — a retry storm can never promote", () => {
    const { corroboratingRunIds, distinctRunCount } = countCorroboratingRuns([
      { settlementRunId: "r1", sourceSnapshotFingerprint: "same", observedAt: min(0) },
      { settlementRunId: "r2", sourceSnapshotFingerprint: "same", observedAt: min(1) },
      { settlementRunId: "r3", sourceSnapshotFingerprint: "same", observedAt: min(2) },
      { settlementRunId: "r4", sourceSnapshotFingerprint: "same", observedAt: min(3) },
    ]);
    expect(distinctRunCount).toBe(4);
    expect(corroboratingRunIds).toEqual(["r1"]);
  });

  it("identical snapshots DO corroborate once genuinely separated in time", () => {
    const sep = MIN_CORROBORATION_SEPARATION_MINUTES;
    const { corroboratingRunIds } = countCorroboratingRuns([
      { settlementRunId: "r1", sourceSnapshotFingerprint: "same", observedAt: min(0) },
      { settlementRunId: "r2", sourceSnapshotFingerprint: "same", observedAt: min(sep) },
      { settlementRunId: "r3", sourceSnapshotFingerprint: "same", observedAt: min(2 * sep) },
    ]);
    expect(corroboratingRunIds).toEqual(["r1", "r2", "r3"]);
  });

  it("duplicate observations within one run collapse to the run's earliest sighting", () => {
    const { corroboratingRunIds, distinctRunCount } = countCorroboratingRuns([
      { settlementRunId: "r1", sourceSnapshotFingerprint: "a", observedAt: min(5) },
      { settlementRunId: "r1", sourceSnapshotFingerprint: "a", observedAt: min(0) },
      { settlementRunId: "r1", sourceSnapshotFingerprint: "a", observedAt: min(9) },
    ]);
    expect(distinctRunCount).toBe(1);
    expect(corroboratingRunIds).toEqual(["r1"]);
  });

  it("legacy rows with a null fingerprint fail closed onto temporal separation only", () => {
    const { corroboratingRunIds } = countCorroboratingRuns([
      { settlementRunId: "r1", sourceSnapshotFingerprint: null, observedAt: min(0) },
      { settlementRunId: "r2", sourceSnapshotFingerprint: null, observedAt: min(1) },
      { settlementRunId: "r3", sourceSnapshotFingerprint: null, observedAt: min(MIN_CORROBORATION_SEPARATION_MINUTES) },
    ]);
    // r2 (1 minute later, no distinct fingerprint) never corroborates.
    expect(corroboratingRunIds).toEqual(["r1", "r3"]);
  });

  it("is deterministic regardless of input order", () => {
    const rows = [
      { settlementRunId: "r2", sourceSnapshotFingerprint: "b", observedAt: min(1) },
      { settlementRunId: "r1", sourceSnapshotFingerprint: "a", observedAt: min(0) },
    ];
    const a = countCorroboratingRuns(rows);
    const b = countCorroboratingRuns([...rows].reverse());
    expect(a).toEqual(b);
  });
});

describe("settlement-run identity (6.1)", () => {
  it("scheduled window is the UTC hour bucket — stable across rapid retries", () => {
    expect(computeScheduledWindow(new Date("2026-07-22T18:03:11Z"))).toBe("2026-07-22T18Z");
    expect(computeScheduledWindow(new Date("2026-07-22T18:59:59Z"))).toBe("2026-07-22T18Z");
    expect(computeScheduledWindow(new Date("2026-07-22T19:00:00Z"))).toBe("2026-07-22T19Z");
  });

  it("snapshot fingerprint is order-insensitive and content-sensitive", () => {
    const a = { externalId: "g1", completed: true, homeScore: 3, awayScore: 1 };
    const b = { externalId: "g2", completed: true, homeScore: null, awayScore: null };
    expect(fingerprintSourceSnapshot([a, b])).toBe(fingerprintSourceSnapshot([b, a]));
    expect(fingerprintSourceSnapshot([a, b])).not.toBe(
      fingerprintSourceSnapshot([a, { ...b, homeScore: 0 }]),
    );
  });

  it("getOrCreateSettlementRun upserts on the composite idempotency key", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "run-1", startedAt: T0 });
    const db: SettlementRunDb = { settlementRun: { upsert } };
    const identity = {
      source: "the-odds-api",
      sport: "basketball_nba",
      scheduledWindow: "2026-07-22T18Z",
      sourceSnapshotFingerprint: "f".repeat(64),
    };
    const run = await getOrCreateSettlementRun(db, identity, T0);
    expect(run.id).toBe("run-1");
    expect(run.idempotencyKey).toBe(settlementRunIdempotencyKey(identity));
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idempotencyKey: run.idempotencyKey },
        update: { lastReusedAt: T0 },
      }),
    );
  });
});

// ── 6.3 owner decisions ───────────────────────────────────────────────────

function decisionDb(anomaly: { id: string; state: string } | null, updateCount = 1) {
  const updateMany = vi.fn().mockResolvedValue({ count: updateCount });
  const eventCreate = vi.fn().mockResolvedValue({});
  const db: SettlementDecisionDb = {
    $transaction: async (fn) =>
      fn({
        settlementAnomaly: {
          findUnique: async () => anomaly,
          updateMany,
        },
        settlementDecisionEvent: { create: eventCreate },
      }),
  };
  return { db, updateMany, eventCreate };
}

describe("recordOwnerSettlementDecision (6.3)", () => {
  it("the full owner vocabulary is exactly the directive's", () => {
    expect([...OWNER_DECISION_KINDS]).toEqual([
      "ACKNOWLEDGED",
      "WAIT_FOR_SOURCE",
      "MARK_POSTPONED",
      "VOID_PICKS",
      "DISMISS_ANOMALY",
      "RESOLVE_SCORES_ARRIVED",
    ]);
  });

  it("appends an OWNER event with actor receipt and prior/next state", async () => {
    const { db, updateMany, eventCreate } = decisionDb({ id: "a-1", state: "OWNER_REVIEW" });
    const outcome = await recordOwnerSettlementDecision({
      db,
      anomalyId: "a-1",
      decisionKind: "DISMISS_ANOMALY",
      actor: { subjectId: "owner-user-1", requestId: "req-9" },
      reason: "duplicate feed glitch",
    });
    expect(outcome).toEqual({ applied: true, priorState: "OWNER_REVIEW", nextState: "DISMISSED" });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "a-1", state: { in: ["OWNER_REVIEW"] } } }),
    );
    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          decisionKind: "DISMISS_ANOMALY",
          actorType: "OWNER",
          priorState: "OWNER_REVIEW",
          nextState: "DISMISSED",
          actorReceipt: expect.objectContaining({
            actorType: "OWNER",
            subjectId: "owner-user-1",
            requestId: "req-9",
          }),
        }),
      }),
    );
  });

  it("ACKNOWLEDGED keeps the anomaly in OWNER_REVIEW (non-terminal decision)", async () => {
    const { db, eventCreate } = decisionDb({ id: "a-1", state: "OWNER_REVIEW" });
    const outcome = await recordOwnerSettlementDecision({
      db,
      anomalyId: "a-1",
      decisionKind: "ACKNOWLEDGED",
      actor: { subjectId: "owner-user-1" },
      reason: "seen, waiting",
    });
    expect(outcome).toEqual({
      applied: true,
      priorState: "OWNER_REVIEW",
      nextState: "OWNER_REVIEW",
    });
    expect(eventCreate).toHaveBeenCalled();
  });

  it("the race loser (updateMany count 0) appends NOTHING", async () => {
    const { db, eventCreate } = decisionDb({ id: "a-1", state: "OWNER_REVIEW" }, 0);
    const outcome = await recordOwnerSettlementDecision({
      db,
      anomalyId: "a-1",
      decisionKind: "VOID_PICKS",
      actor: { subjectId: "owner-user-1" },
      reason: "postponed per league",
    });
    expect(outcome).toEqual({ applied: false, reason: "lost_race" });
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it("terminal anomalies are not decidable — history is never rewritten", async () => {
    const { db, eventCreate } = decisionDb({ id: "a-1", state: "RESOLVED" });
    const outcome = await recordOwnerSettlementDecision({
      db,
      anomalyId: "a-1",
      decisionKind: "DISMISS_ANOMALY",
      actor: { subjectId: "owner-user-1" },
      reason: "late",
    });
    expect(outcome).toEqual({ applied: false, reason: "not_decidable" });
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it("a missing anomaly is reported honestly", async () => {
    const { db } = decisionDb(null);
    const outcome = await recordOwnerSettlementDecision({
      db,
      anomalyId: "ghost",
      decisionKind: "ACKNOWLEDGED",
      actor: { subjectId: "owner-user-1" },
      reason: "n/a",
    });
    expect(outcome).toEqual({ applied: false, reason: "anomaly_not_found" });
  });
});
