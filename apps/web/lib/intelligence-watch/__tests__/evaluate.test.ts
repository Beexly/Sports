/**
 * W005 Intelligence Watch v0 — acceptance suite. The delta fed to the
 * evaluator is built from a REAL `WorldlineStore` + `worldDelta` (W002),
 * never an invented `WorldDelta` shape, and the contract is built via
 * `defaultIntelligenceWatchContract` from a real `WatchlistEntry` shape
 * (matching `watchlist/types.ts` exactly) — see
 * docs/frontier/WORKSTREAM_005_INTELLIGENCE_WATCH_V0.md.
 */
import { describe, expect, it } from "vitest";
import { WorldlineStore, worldDelta, type WorldObservation } from "@/lib/worldline";
import type { WatchlistEntry } from "@/lib/watchlist/types";
import { defaultIntelligenceWatchContract } from "../contract";
import { evaluateIntelligenceWatch } from "../evaluate";

const BEFORE = { validTime: "2026-07-14T19:00:00.000Z", knowledgeTime: "2026-07-14T19:00:00.000Z" };
const AFTER = { validTime: "2026-07-14T20:30:00.000Z", knowledgeTime: "2026-07-14T20:30:00.000Z" };

function obs(overrides: Partial<WorldObservation> & Pick<WorldObservation, "id" | "entityId" | "attribute" | "value">): WorldObservation {
  return {
    occurredAt: "2026-07-14T18:00:00.000Z",
    observedAt: "2026-07-14T18:00:00.000Z",
    source: "nflverse",
    ...overrides,
  };
}

const WATCHLIST_ENTRY: WatchlistEntry = {
  id: "watch-1",
  userId: "user-1",
  entityType: "TEAM",
  entityId: "team-1",
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
};

/** A real delta: team-1's score AND injuryStatus change; an unrelated team-2 also changes. */
function realDelta() {
  const store = new WorldlineStore();
  store.ingest(obs({ id: "o1", entityId: "team-1", attribute: "score", value: 0, occurredAt: "2026-07-14T18:00:00.000Z", observedAt: "2026-07-14T18:00:00.000Z" }));
  store.ingest(obs({ id: "o2", entityId: "team-1", attribute: "injuryStatus", value: "healthy", occurredAt: "2026-07-14T18:00:00.000Z", observedAt: "2026-07-14T18:00:00.000Z" }));
  const from = store.snapshotAt(BEFORE);

  store.ingest(obs({ id: "o3", entityId: "team-1", attribute: "score", value: 7, occurredAt: "2026-07-14T20:00:00.000Z", observedAt: "2026-07-14T20:00:00.000Z" }));
  store.ingest(obs({ id: "o4", entityId: "team-1", attribute: "injuryStatus", value: "questionable", occurredAt: "2026-07-14T20:00:00.000Z", observedAt: "2026-07-14T20:00:00.000Z" }));
  store.ingest(obs({ id: "o5", entityId: "team-2", attribute: "score", value: 3, occurredAt: "2026-07-14T20:00:00.000Z", observedAt: "2026-07-14T20:00:00.000Z" }));
  const to = store.snapshotAt(AFTER);

  return worldDelta(from, to);
}

describe("evaluateIntelligenceWatch", () => {
  it("is entitlement-gated FIRST — not_entitled fires even for a large, otherwise-material delta", () => {
    const contract = defaultIntelligenceWatchContract(WATCHLIST_ENTRY);
    const outcome = evaluateIntelligenceWatch({ contract, delta: realDelta(), canGetAlerts: false });
    expect(outcome).toEqual({ surface: false, reason: "not_entitled" });
  });

  it("a delta with zero entries for the watched entity does not surface", () => {
    const contract = defaultIntelligenceWatchContract({ ...WATCHLIST_ENTRY, entityId: "team-9" });
    const outcome = evaluateIntelligenceWatch({ contract, delta: realDelta(), canGetAlerts: true });
    expect(outcome).toEqual({ surface: false, reason: "no_material_change" });
  });

  it("a delta below the materiality threshold does not surface", () => {
    const contract = { ...defaultIntelligenceWatchContract(WATCHLIST_ENTRY), materialityThreshold: 3 };
    const outcome = evaluateIntelligenceWatch({ contract, delta: realDelta(), canGetAlerts: true });
    // team-1 has exactly 2 changed attributes (score, injuryStatus) — below threshold 3.
    expect(outcome).toEqual({ surface: false, reason: "no_material_change" });
  });

  it("a delta at/above threshold surfaces with EXACTLY the matching entries — never team-2's unrelated change", () => {
    const contract = defaultIntelligenceWatchContract(WATCHLIST_ENTRY); // threshold 1, all attributes
    const outcome = evaluateIntelligenceWatch({ contract, delta: realDelta(), canGetAlerts: true });
    expect(outcome.surface).toBe(true);
    if (!outcome.surface) return;
    expect(outcome.matchingEntries).toHaveLength(2);
    expect(outcome.matchingEntries.every((e) => e.entityId === "team-1")).toBe(true);
    expect(outcome.matchingEntries.map((e) => e.attribute).sort()).toEqual(["injuryStatus", "score"]);
  });

  it("watchedAttributes narrows both the threshold count and the surfaced entries", () => {
    const contract = { ...defaultIntelligenceWatchContract(WATCHLIST_ENTRY), watchedAttributes: ["injuryStatus"] };
    const outcome = evaluateIntelligenceWatch({ contract, delta: realDelta(), canGetAlerts: true });
    expect(outcome.surface).toBe(true);
    if (!outcome.surface) return;
    expect(outcome.matchingEntries).toHaveLength(1);
    expect(outcome.matchingEntries[0]!.attribute).toBe("injuryStatus");
    expect(outcome.matchingEntries[0]!.after).toBe("questionable");
  });

  it("watchedAttributes for an attribute that did not change yields no_material_change", () => {
    const contract = { ...defaultIntelligenceWatchContract(WATCHLIST_ENTRY), watchedAttributes: ["weather"] };
    const outcome = evaluateIntelligenceWatch({ contract, delta: realDelta(), canGetAlerts: true });
    expect(outcome).toEqual({ surface: false, reason: "no_material_change" });
  });

  it("defaultIntelligenceWatchContract carries the watchlist entry's identity through honestly", () => {
    const contract = defaultIntelligenceWatchContract(WATCHLIST_ENTRY, new Date("2026-07-17T12:00:00.000Z"));
    expect(contract.watchlistEntryId).toBe("watch-1");
    expect(contract.entityId).toBe("team-1");
    expect(contract.entityType).toBe("TEAM");
    expect(contract.watchedAttributes).toEqual([]);
    expect(contract.materialityThreshold).toBe(1);
    expect(contract.createdAt).toBe("2026-07-17T12:00:00.000Z");
  });
});
