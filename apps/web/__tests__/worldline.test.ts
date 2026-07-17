/**
 * W002 Worldline v0 — acceptance suite (contract:
 * docs/frontier/WORKSTREAM_002_WORLDLINE_V0.md).
 *
 * The invariant under test is NO LOOKAHEAD: a snapshot at knowledge time K
 * depends only on observations with observedAt ≤ K, late knowledge is visible
 * only from its own observedAt forward, and a served replay can never silently
 * change (the audit fails loud, naming contaminators).
 */

import { describe, expect, it } from "vitest";
import {
  WorldlineIngestError,
  WorldlineReplayError,
  WorldlineStore,
  snapshotDigest,
  worldDelta,
  type WorldObservation,
} from "@/lib/worldline";

const T = (h: number): string => `2026-01-01T${String(h).padStart(2, "0")}:00:00.000Z`;

function obs(over: Partial<WorldObservation> & { id: string }): WorldObservation {
  return {
    entityId: "game-1",
    attribute: "score",
    value: "0-0",
    occurredAt: T(1),
    observedAt: T(1),
    source: "test-feed",
    ...over,
  };
}

describe("bitemporal semantics", () => {
  it("a late-observed fact is invisible before its observedAt and visible after", () => {
    const s = new WorldlineStore();
    // Final score occurred at 16:00 but we only learned it at 20:00.
    s.ingest(obs({ id: "final", value: "24-20", occurredAt: T(16), observedAt: T(20) }));
    const before = s.resolve({ validTime: T(23), knowledgeTime: T(18) });
    expect(before.cells).toHaveLength(0); // we did not know yet
    const after = s.resolve({ validTime: T(23), knowledgeTime: T(21) });
    expect(after.cells[0]?.value).toBe("24-20");
  });

  it("a correction supersedes for later knowledge times while the original stays replayable", () => {
    const s = new WorldlineStore();
    s.ingest(obs({ id: "orig", value: "24-20", occurredAt: T(16), observedAt: T(17) }));
    s.ingest(obs({ id: "corr", value: "24-21", occurredAt: T(16), observedAt: T(19) }));
    // Knowledge between 17 and 19: the original answer, honestly replayable.
    expect(s.resolve({ validTime: T(23), knowledgeTime: T(18) }).cells[0]?.value).toBe("24-20");
    // Knowledge after the correction: the corrected answer, attributed to it.
    const later = s.resolve({ validTime: T(23), knowledgeTime: T(20) });
    expect(later.cells[0]?.value).toBe("24-21");
    expect(later.cells[0]?.observationId).toBe("corr");
  });

  it("valid time selects the latest occurrence ≤ V per (entity, attribute)", () => {
    const s = new WorldlineStore();
    s.ingest(obs({ id: "q1", value: "7-0", occurredAt: T(13), observedAt: T(13) }));
    s.ingest(obs({ id: "q4", value: "24-20", occurredAt: T(16), observedAt: T(16) }));
    expect(s.resolve({ validTime: T(14), knowledgeTime: T(23) }).cells[0]?.value).toBe("7-0");
    expect(s.resolve({ validTime: T(23), knowledgeTime: T(23) }).cells[0]?.value).toBe("24-20");
  });

  it("a forecast (observedAt before occurredAt) is legal and appears only once V reaches the occurrence", () => {
    const s = new WorldlineStore();
    s.ingest(obs({ id: "fx", attribute: "wind_mph", value: 18, occurredAt: T(16), observedAt: T(9) }));
    // Known at 09:00, but not yet TRUE at valid time 10:00.
    expect(s.resolve({ validTime: T(10), knowledgeTime: T(12) }).cells).toHaveLength(0);
    expect(s.resolve({ validTime: T(16), knowledgeTime: T(12) }).cells[0]?.value).toBe(18);
  });
});

describe("replay-stability audit (no silent rewrites)", () => {
  it("throws with the contaminating observation named when late ingestion changes a served read", () => {
    const s = new WorldlineStore();
    s.ingest(obs({ id: "orig", value: "24-20", occurredAt: T(16), observedAt: T(17) }));
    s.snapshotAt({ validTime: T(23), knowledgeTime: T(18) }); // served to a consumer
    // Now a feed ingests a correction whose observedAt back-dates UNDER that
    // read (17:30 < the served K of 18:00) and wins resolution.
    s.ingest(obs({ id: "backdated", value: "24-21", occurredAt: T(16), observedAt: "2026-01-01T17:30:00.000Z" }));
    let thrown: unknown;
    try {
      s.auditReplayStability();
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(WorldlineReplayError);
    const err = thrown as WorldlineReplayError;
    expect(err.offenders.some((o) => o.observationId === "backdated")).toBe(true);
  });

  it("stays clean when late knowledge arrives with an honest (later) observedAt", () => {
    const s = new WorldlineStore();
    s.ingest(obs({ id: "orig", value: "24-20", occurredAt: T(16), observedAt: T(17) }));
    s.snapshotAt({ validTime: T(23), knowledgeTime: T(18) });
    s.ingest(obs({ id: "corr", value: "24-21", occurredAt: T(16), observedAt: T(19) })); // after the served K
    expect(() => s.auditReplayStability()).not.toThrow();
  });
});

describe("world delta (semantic, attributed)", () => {
  it("reports ADDED / CHANGED / REMOVED with causing observation ids, sorted", () => {
    const s = new WorldlineStore();
    s.ingest(obs({ id: "a1", entityId: "game-1", attribute: "score", value: "7-0", occurredAt: T(13), observedAt: T(13) }));
    s.ingest(obs({ id: "a2", entityId: "game-1", attribute: "score", value: "24-20", occurredAt: T(16), observedAt: T(16) }));
    s.ingest(obs({ id: "b1", entityId: "game-2", attribute: "status", value: "LIVE", occurredAt: T(15), observedAt: T(15) }));
    const early = s.resolve({ validTime: T(14), knowledgeTime: T(23) });
    const late = s.resolve({ validTime: T(23), knowledgeTime: T(23) });
    const d = worldDelta(early, late);
    const changed = d.entries.find((e) => e.kind === "CHANGED");
    expect(changed?.before).toBe("7-0");
    expect(changed?.after).toBe("24-20");
    expect(changed?.causedBy).toEqual(["a1", "a2"]);
    const added = d.entries.find((e) => e.kind === "ADDED");
    expect(added?.entityId).toBe("game-2");
    expect(added?.causedBy).toEqual(["b1"]);
    // sorted by (entityId, attribute)
    expect(d.entries.map((e) => e.entityId)).toEqual([...d.entries.map((e) => e.entityId)].sort());
  });

  it("an identical world at two coordinates yields zero entries", () => {
    const s = new WorldlineStore();
    s.ingest(obs({ id: "x", value: "24-20", occurredAt: T(16), observedAt: T(16) }));
    const a = s.resolve({ validTime: T(20), knowledgeTime: T(20) });
    const b = s.resolve({ validTime: T(22), knowledgeTime: T(22) });
    expect(worldDelta(a, b).entries).toHaveLength(0);
  });
});

describe("canonical digest (provable replays)", () => {
  it("ingestion order does not change the digest; a value change does", () => {
    const A = new WorldlineStore();
    const B = new WorldlineStore();
    const o1 = obs({ id: "o1", entityId: "g1", attribute: "score", value: "7-0", occurredAt: T(13), observedAt: T(13) });
    const o2 = obs({ id: "o2", entityId: "g2", attribute: "status", value: "LIVE", occurredAt: T(15), observedAt: T(15) });
    A.ingest(o1); A.ingest(o2);
    B.ingest(o2); B.ingest(o1);
    const at = { validTime: T(23), knowledgeTime: T(23) };
    expect(A.resolve(at).digest).toBe(B.resolve(at).digest);
    const C = new WorldlineStore();
    C.ingest({ ...o1, value: "7-3" }); C.ingest(o2);
    expect(C.resolve(at).digest).not.toBe(A.resolve(at).digest);
  });

  it("snapshotDigest is the canonical serializer over coordinate + cells", () => {
    const at = { validTime: T(1), knowledgeTime: T(1) };
    expect(snapshotDigest(at, [])).toMatch(/^[0-9a-f]{64}$/);
    expect(snapshotDigest(at, [])).toBe(snapshotDigest({ ...at }, []));
  });
});

describe("ingest validation + immutability", () => {
  it("rejects duplicate ids, missing source, and unparseable clocks", () => {
    const s = new WorldlineStore();
    s.ingest(obs({ id: "dup" }));
    expect(() => s.ingest(obs({ id: "dup" }))).toThrow(WorldlineIngestError);
    expect(() => s.ingest(obs({ id: "nosrc", source: "" }))).toThrow(WorldlineIngestError);
    expect(() => s.ingest(obs({ id: "badclock", occurredAt: "yesterday-ish" }))).toThrow(WorldlineIngestError);
  });

  it("snapshots are frozen and later mutation of the input does not leak in", () => {
    const s = new WorldlineStore();
    const raw = obs({ id: "m1", value: "7-0", occurredAt: T(13), observedAt: T(13) });
    s.ingest(raw);
    const snap = s.resolve({ validTime: T(23), knowledgeTime: T(23) });
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.cells)).toBe(true);
    expect(Object.isFrozen(snap.cells[0])).toBe(true);
  });
});
