import { describe, it, expect } from "vitest";
import { deriveHud, HELD_THRESHOLD } from "./hud";
import { DEMO_SLATE, TIMELINE, type TwinGame } from "./demo-slate";

const byId = (id: string): TwinGame => DEMO_SLATE.games.find((g) => g.id === id)!;

describe("deriveHud", () => {
  it("passes through a healthy verdict and never marks it held", () => {
    const play = byId("nfl-01"); // PLAY, ends high
    const hud = deriveHud(play, TIMELINE.length - 2);
    expect(hud.verdict).toBe("PLAY");
    expect(hud.held).toBe(false);
    expect(hud.confidence).toBeGreaterThan(HELD_THRESHOLD * 100);
  });

  it("flips a decayed read to HOLD when confidence drops below the hold line", () => {
    const decayed = byId("nfl-03"); // NO-BET, confidence ~0.22 - stays NO-BET
    const nobet = deriveHud(decayed, TIMELINE.length - 1);
    expect(nobet.verdict).toBe("NO-BET"); // NO-BET never re-labels to HOLD
    // A WATCHLIST/PLAY game forced below threshold should read HOLD:
    const synthetic: TwinGame = { ...byId("nfl-01"), confidence: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1] };
    const held = deriveHud(synthetic, 3);
    expect(held.held).toBe(true);
    expect(held.verdict).toBe("HOLD");
  });

  it("reports confidence rising since open for a building read", () => {
    const hud = deriveHud(byId("nba-01"), TIMELINE.length - 2);
    expect(hud.whatChanged).toMatch(/Confidence \+\d+ since open/);
  });

  it("names a scheduled impact event as what would break the read", () => {
    const hud = deriveHud(byId("nfl-02"), 0); // impact at step 2, upcoming
    expect(hud.breakRead).toContain("Questionable status");
  });

  it("falls back to the most fragile market when there is no impact event", () => {
    const hud = deriveHud(byId("nfl-01"), 0); // no impact
    expect(hud.breakRead).toMatch(/shock to the (Spread|Total|Moneyline) market/);
  });

  it("says there is nothing to settle for a NO-BET", () => {
    expect(deriveHud(byId("nfl-03"), 0).receipt).toMatch(/nothing to settle/i);
  });

  it("labels illustrative receipts honestly", () => {
    expect(deriveHud(byId("nfl-01"), 0, true).receipt).toMatch(/illustrative/i);
  });
});
