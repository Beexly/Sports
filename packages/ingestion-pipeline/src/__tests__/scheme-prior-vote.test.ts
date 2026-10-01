/**
 * Scheme prior from nflverse 2025 play-by-play. The measurement already
 * existed. The slate was not reading it.
 */
import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { nflEarlyDownProeSignal } from "../signal-registry-extensions.js";
import { NFL_SCHEME_PRIOR } from "../priors/nfl-2025-scheme.js";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";

const NOW = () => new Date("2026-10-01T12:00:00Z");

function ctx(home: string, away: string) {
  return {
    sportKey: "americanfootball_nfl",
    homeTeam: home,
    awayTeam: away,
    env: {},
    now: NOW,
  } as never;
}

describe("nflverse 2025 scheme prior votes", () => {
  it("resolves full names and votes the pass_oe differential, not a reconstructed early-down cut", async () => {
    const home = NFL_SCHEME_PRIOR.KC;
    const away = NFL_SCHEME_PRIOR.BAL;
    expect(home).toBeTruthy();
    expect(away).toBeTruthy();
    expect(home!.proePp).not.toBe(away!.proePp);
    const expected = Number(((home!.proePp - away!.proePp) / 100).toFixed(4));

    const raw = await nflEarlyDownProeSignal.evaluate!(ctx("Kansas City Chiefs", "Baltimore Ravens"));
    expect(raw).toBeTruthy();
    if (!raw || !("value" in raw)) throw new Error("expected a continuous value");
    expect(raw.value).toBe(expected);
    expect(raw.metadata?.season).toBe(2025);
    expect(raw.metadata?.source).toMatch(/scrimmage/);

    const tilt = await applyContinuousSignalTilt(0.5, SIGNAL_REGISTRY, ctx("KC", "BAL"));
    const vote = tilt.votes.find((v) => v.signalId === "nfl_early_down_proe_momentum");
    expect(vote?.rawValue).toBe(expected);
    if (expected > 0) {
      expect(tilt.adjustedHomeP).toBeGreaterThan(0.5);
    } else {
      expect(tilt.adjustedHomeP).toBeLessThan(0.5);
    }
  });

  it("abstains when either club is not in the prior", async () => {
    const raw = await nflEarlyDownProeSignal.evaluate!(ctx("Kansas City Chiefs", "TBD"));
    expect(raw).toBeNull();
  });

  it("does not vote a team against itself", async () => {
    const raw = await nflEarlyDownProeSignal.evaluate!(ctx("KC", "KC"));
    expect(raw).toBeTruthy();
    if (!raw || !("value" in raw)) throw new Error("expected a continuous value");
    expect(raw.value).toBe(0);
    const tilt = await applyContinuousSignalTilt(0.5, [nflEarlyDownProeSignal], ctx("KC", "KC"));
    expect(tilt.votes).toHaveLength(0);
    expect(tilt.adjustedHomeP).toBe(0.5);
  });
});
