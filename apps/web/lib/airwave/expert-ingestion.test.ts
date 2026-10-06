import { describe, expect, it } from "vitest";
import {
  GATE_NOTE,
  MIN_DECIDED_FOR_PUBLISHED_RATE,
  toPunditClaim,
  validateExpertFeed,
  type ExternalClaim,
} from "./expert-ingestion";

function base(overrides: Partial<ExternalClaim> = {}): ExternalClaim {
  return {
    id: "c1",
    punditId: "p1",
    airedAt: "2025-11-09T10:14:00-06:00",
    sport: "NFL",
    subject: "Road underdog",
    claimType: "GAME_PICK",
    direction: "BACKS",
    assertion: "Takes the road underdog.",
    confidence: "LEAN",
    settlement: "pending",
    ...overrides,
  };
}

describe("toPunditClaim", () => {
  it("maps settled-hit to HIT (falsifiable)", () => {
    const c = toPunditClaim(base({ settlement: "settled-hit", outcomeNote: "Covered." }));
    expect(c.verdict).toBe("HIT");
    expect(c.falsifiable).toBe(true);
    expect(c.outcomeNote).toBe("Covered.");
  });

  it("maps settled-miss to MISS (falsifiable)", () => {
    const c = toPunditClaim(base({ settlement: "settled-miss", outcomeNote: "Lost." }));
    expect(c.verdict).toBe("MISS");
    expect(c.falsifiable).toBe(true);
  });

  it("maps settled-push to PUSH (falsifiable)", () => {
    const c = toPunditClaim(base({ settlement: "settled-push" }));
    expect(c.verdict).toBe("PUSH");
    expect(c.falsifiable).toBe(true);
  });

  it("maps unfalsifiable to UNFALSIFIABLE (not falsifiable)", () => {
    const c = toPunditClaim(base({ settlement: "unfalsifiable" }));
    expect(c.verdict).toBe("UNFALSIFIABLE");
    expect(c.falsifiable).toBe(false);
  });

  it("pending never fabricates HIT/MISS and defaults the outcome note", () => {
    const c = toPunditClaim(base({ settlement: "pending" }));
    expect(c.verdict).toBe("PENDING");
    expect(c.falsifiable).toBe(true);
    expect(c.verdict).not.toBe("HIT");
    expect(c.verdict).not.toBe("MISS");
    expect(c.outcomeNote).toBe("Not yet settled.");
  });

  it("unknown settlement falls through to PENDING, never HIT/MISS", () => {
    const c = toPunditClaim(base({ settlement: "bogus" as never }));
    expect(c.verdict).toBe("PENDING");
    expect(c.falsifiable).toBe(true);
  });
});

describe("validateExpertFeed", () => {
  it("accepts a valid feed and converts rows", () => {
    const r = validateExpertFeed([
      base({ id: "a", settlement: "settled-hit", outcomeNote: "Won." }),
      base({ id: "b", settlement: "pending" }),
    ]);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.claims).toHaveLength(2);
    expect(r.converted.map((c) => c.verdict)).toEqual(["HIT", "PENDING"]);
  });

  it("rejects a non-array feed", () => {
    const r = validateExpertFeed({ id: "x" });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveLength(1);
  });

  it("reports per-row errors with index, keeps valid rows", () => {
    const r = validateExpertFeed([base({ id: "ok" }), { id: "", settlement: "nope" }]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.startsWith("row 1:"))).toBe(true);
    expect(r.claims).toHaveLength(1);
    expect(r.converted[0]!.verdict).toBe("PENDING");
  });

  it("rejects bad enums and unparseable timestamps", () => {
    const r = validateExpertFeed([
      base({ claimType: "BAD" as never, airedAt: "not-a-date" }),
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/invalid claimType/);
    expect(r.errors.join(" ")).toMatch(/airedAt/);
  });
});

describe("gate + floor", () => {
  it("re-exports the 25-decided-call floor", () => {
    expect(MIN_DECIDED_FOR_PUBLISHED_RATE).toBe(25);
  });

  it("gate note names the gate, the checklist, and the floor", () => {
    expect(GATE_NOTE).toMatch(/founder gate/i);
    expect(GATE_NOTE).toMatch(/legal checklist/i);
    expect(GATE_NOTE).toMatch(/25/);
    expect(GATE_NOTE).toMatch(/fictional personas/i);
  });
});
