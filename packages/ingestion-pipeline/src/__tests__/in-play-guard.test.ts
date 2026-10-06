import { describe, expect, it } from "vitest";
import { hasKickedOff, inPlaySkipLine } from "../in-play-guard.js";

const NOW = new Date("2026-09-09T13:00:00.000Z");

describe("hasKickedOff", () => {
  it("is false for a game still ahead — including five minutes out", () => {
    expect(hasKickedOff(new Date(NOW.getTime() + 5 * 60 * 1000), NOW)).toBe(false);
    expect(hasKickedOff(new Date(NOW.getTime() + 1000), NOW)).toBe(false);
    expect(hasKickedOff(new Date(NOW.getTime() + 72 * 3600 * 1000), NOW)).toBe(false);
  });

  it("is true at the kickoff instant itself and after it", () => {
    // `<=`, not `<`: at the posted kickoff the market is no longer pre-game.
    expect(hasKickedOff(new Date(NOW.getTime()), NOW)).toBe(true);
    expect(hasKickedOff(new Date(NOW.getTime() - 1000), NOW)).toBe(true);
    expect(hasKickedOff(new Date(NOW.getTime() - 23 * 60 * 1000), NOW)).toBe(true);
  });

  it("fails CLOSED on an unreadable clock — a date we cannot parse is not proof the game is ahead", () => {
    expect(hasKickedOff(new Date("not-a-date"), NOW)).toBe(true);
    expect(hasKickedOff(new Date(NOW.getTime() + 3600 * 1000), new Date("not-a-date"))).toBe(true);
  });

  it("reproduces the reported in-play mint: generated 02:03Z on a 01:40Z first pitch", () => {
    expect(hasKickedOff(new Date("2026-08-23T01:40:00.000Z"), new Date("2026-08-23T02:03:00.000Z"))).toBe(
      true,
    );
  });
});

describe("inPlaySkipLine", () => {
  it("names the game, both clocks, and no credential", () => {
    const line = inPlaySkipLine("game-1", new Date("2026-09-09T12:40:00.000Z"), NOW);
    expect(line).toContain("game-1");
    expect(line).toContain("2026-09-09T12:40:00.000Z");
    expect(line).toContain("2026-09-09T13:00:00.000Z");
  });

  it("says so rather than throwing when the kickoff is unparseable", () => {
    expect(inPlaySkipLine("game-1", new Date("nope"), NOW)).toContain("unparseable");
  });
});
