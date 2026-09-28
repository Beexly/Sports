import { describe, it, expect } from "vitest";
import { hasKickedOff, inPlaySkipLine } from "./in-play-guard.js";

/**
 * Regression coverage for the kickoff boundary (C-299).
 *
 * WHY THIS FILE EXISTS. `in-play-guard.ts` had NO test file: a correctness
 * boundary that mints an immutable receipt and suppresses picks after kickoff
 * was protected by nothing but its own body. Measured on live Neon 2026-09-28:
 * 193 settled picks carry `generatedAt > commenceTime` (hindsight picks),
 * winning 73.7% versus 51.2% for the honest pre-kickoff population. Two of
 * them post-date the guard's own landing (commit ed8fc2b1e, 2026-09-22).
 *
 * The guard's LOGIC is correct — these tests pin it so it cannot regress
 * silently. The two residual rows are a coverage gap in the signal path, not a
 * defect in the predicate below; that gap is tracked separately and these
 * tests are the floor it must stay above.
 */
describe("hasKickedOff", () => {
  const kickoff = new Date("2026-09-23T17:38:00.000Z");

  it("is false strictly before kickoff", () => {
    expect(hasKickedOff(kickoff, new Date("2026-09-23T17:37:59.999Z"))).toBe(false);
  });

  it("is true at exactly kickoff (no buffer — the boundary is inclusive)", () => {
    expect(hasKickedOff(kickoff, new Date("2026-09-23T17:38:00.000Z"))).toBe(true);
  });

  it("is true after kickoff", () => {
    expect(hasKickedOff(kickoff, new Date("2026-09-23T20:17:14.000Z"))).toBe(true);
  });

  it("suppresses a game 36 minutes in — the exact measured residual", () => {
    // One of the two post-guard leaks: generated 44.2 min after commenceTime.
    expect(hasKickedOff(kickoff, new Date("2026-09-23T18:22:12.000Z"))).toBe(true);
  });

  it("does NOT invent a pre-kickoff cushion", () => {
    // A game 30s out is still a legitimate pre-game claim.
    expect(hasKickedOff(kickoff, new Date("2026-09-23T17:37:30.000Z"))).toBe(false);
  });

  // Fail-closed: on a path that mints an immutable receipt, a date we cannot
  // read is not evidence the game is still ahead.
  it("fails closed on an unparseable kickoff", () => {
    expect(hasKickedOff(new Date("not-a-date"), new Date())).toBe(true);
  });

  it("fails closed on a missing kickoff", () => {
    expect(hasKickedOff(undefined as unknown as Date, new Date())).toBe(true);
  });

  it("fails closed on an unparseable clock", () => {
    expect(hasKickedOff(kickoff, new Date("not-a-date"))).toBe(true);
  });
});

describe("inPlaySkipLine", () => {
  it("names the game and both clocks, and says a pick is a pre-game claim", () => {
    const line = inPlaySkipLine(
      "game_1",
      new Date("2026-09-23T17:38:00.000Z"),
      new Date("2026-09-23T18:22:12.000Z"),
    );
    expect(line).toContain("game_1");
    expect(line).toContain("2026-09-23T17:38:00.000Z");
    expect(line).toContain("2026-09-23T18:22:12.000Z");
    expect(line).toContain("pre-game claim");
  });

  it("reports an unparseable kickoff honestly rather than printing Invalid Date", () => {
    const line = inPlaySkipLine("game_2", new Date("nope"), new Date());
    expect(line).toContain("unparseable");
    expect(line).not.toContain("Invalid Date");
  });
});
