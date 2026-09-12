import { describe, expect, it } from "vitest";
import {
  FOUNDER_MODEL_VERSION,
  founderFactorBreakdown,
  validateFounderPick,
  type FounderPickInput,
} from "@/lib/founder-picks/types";

const KICKOFF = new Date("2026-09-14T18:00:00.000Z");
const BEFORE = new Date("2026-09-14T12:00:00.000Z");
const AFTER = new Date("2026-09-14T19:00:00.000Z");

function validInput(over: Partial<FounderPickInput> = {}): FounderPickInput {
  return {
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "Chiefs -3.5",
    line: -3.5,
    confidence: 72,
    reasoning: "Chiefs at home off a bye, line still short.",
    ...over,
  };
}

describe("validateFounderPick", () => {
  it("accepts a well-formed pick before kickoff", () => {
    expect(validateFounderPick(validInput(), { kickoff: KICKOFF, now: BEFORE }).ok).toBe(true);
  });

  it("refuses a pick after kickoff (same rule as the engine)", () => {
    const v = validateFounderPick(validInput(), { kickoff: KICKOFF, now: AFTER });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/kicked off/i);
  });

  it("fails CLOSED when kickoff is unknown", () => {
    const v = validateFounderPick(validInput(), { kickoff: null, now: BEFORE });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/unknown/i);
  });

  it("requires a real reason — a founder pick without one is a tout", () => {
    const v = validateFounderPick(validInput({ reasoning: "vibes" }), {
      kickoff: KICKOFF,
      now: BEFORE,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/tout|reason/i);
  });

  it("requires confidence in 1–100 as an integer", () => {
    expect(
      validateFounderPick(validInput({ confidence: 0 }), { kickoff: KICKOFF, now: BEFORE }).ok,
    ).toBe(false);
    expect(
      validateFounderPick(validInput({ confidence: 101 }), { kickoff: KICKOFF, now: BEFORE }).ok,
    ).toBe(false);
    expect(
      validateFounderPick(validInput({ confidence: 70.5 }), { kickoff: KICKOFF, now: BEFORE }).ok,
    ).toBe(false);
    expect(
      validateFounderPick(validInput({ confidence: 100 }), { kickoff: KICKOFF, now: BEFORE }).ok,
    ).toBe(true);
  });

  it("requires a selection string", () => {
    const v = validateFounderPick(validInput({ selection: "x" }), {
      kickoff: KICKOFF,
      now: BEFORE,
    });
    expect(v.ok).toBe(false);
  });
});

describe("founderFactorBreakdown", () => {
  it("tags the source and never invents engine factors", () => {
    const fb = founderFactorBreakdown(validInput());
    expect(fb["source"]).toBe("founder");
    expect(fb["founderModelVersion"]).toBe(FOUNDER_MODEL_VERSION);
    expect(fb["rankingP"]).toBeNull();
    expect(fb["rankingSource"]).toBe("founder");
    expect(Array.isArray(fb["factors"])).toBe(true);
  });

  it("carries consensus notes when provided", () => {
    const fb = founderFactorBreakdown(
      validInput({
        consensusNotes: [
          { source: "market", lean: "Chiefs -3 consensus" },
          { source: "engine", lean: "held — no edge" },
        ],
      }),
    );
    expect(fb["consensusNotes"]).toHaveLength(2);
  });
});

describe("FOUNDER_MODEL_VERSION", () => {
  it("is distinct from the engine MODEL_VERSION so records never mix silently", () => {
    expect(FOUNDER_MODEL_VERSION).toBe("founder-v1");
    expect(FOUNDER_MODEL_VERSION).not.toBe("v5.2.7");
  });
});
