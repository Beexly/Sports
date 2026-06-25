import { describe, it, expect } from "vitest";
import { classifyConflict, type ConflictParty } from "../source-conflict-court.js";

const party = (over: Partial<ConflictParty>): ConflictParty => ({
  sourceId: "s", factType: "spread", observedAt: "2026-01-04T10:00:00Z", reliability: 0.8, gseEntityId: "game:x", ...over,
});

describe("Source Conflict Court", () => {
  it("classifies a stale disagreement as LATE_SOURCE and trusts the fresher source", () => {
    const r = classifyConflict({ a: party({ sourceId: "A", observedAt: "2026-01-04T10:00:00Z" }), b: party({ sourceId: "B", observedAt: "2026-01-04T11:00:00Z" }) });
    expect(r.conflictClass).toBe("LATE_SOURCE");
    expect(r.verdict).toBe("TRUST_SOURCE_B"); // B is fresher
  });
  it("classifies a fantasy projection vs football reality as FANTASY_PLATFORM_LAG (a signal, not truth)", () => {
    const r = classifyConflict({ a: party({ factType: "platform_projection" }), b: party({ factType: "injury_report" }) });
    expect(r.conflictClass).toBe("FANTASY_PLATFORM_LAG");
    expect(r.verdict).toBe("USE_AS_CONTRADICTION_SIGNAL");
  });
  it("quarantines a disagreement across different canonical entities", () => {
    const r = classifyConflict({ a: party({ gseEntityId: "player:a" }), b: party({ gseEntityId: "player:b" }) });
    expect(r.conflictClass).toBe("ENTITY_MAPPING_COLLISION");
    expect(r.verdict).toBe("QUARANTINE");
  });
  it("waits for confirmation on a rumor", () => {
    expect(classifyConflict({ a: party({ isRumor: true }), b: party({}) }).verdict).toBe("WAIT_FOR_CONFIRMATION");
  });
  it("does not average different stat definitions", () => {
    const r = classifyConflict({ a: party({ statDefinition: "air_yards_intended" }), b: party({ statDefinition: "air_yards_completed" }) });
    expect(r.conflictClass).toBe("STAT_DEFINITION_MISMATCH");
  });
  it("trusts the more reliable source on a clear reliability gap", () => {
    const r = classifyConflict({ a: party({ sourceId: "A", reliability: 0.9 }), b: party({ sourceId: "B", reliability: 0.4 }) });
    expect(r.conflictClass).toBe("BAD_SOURCE");
    expect(r.verdict).toBe("TRUST_SOURCE_A");
  });
});
