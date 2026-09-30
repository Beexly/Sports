/**
 * Selection-blindness guard.
 *
 * SignalObservation.lean is documented (reasoning.ts:65) as "positive favors
 * home/over/selection A". The injury adapter honours that convention by
 * negating away-side leans (signal-adapters.ts:168). `reason()` then sums every
 * publishable lean into `situationalShift` -> `calibratedProb`.
 *
 * But `ctx.selection` is never read for any numeric purpose — only interpolated
 * into the summary string (reasoning.ts:428). So the probability does not invert
 * when the pick is on the away side: an away-QB-out injury RAISES the
 * probability on an away pick instead of lowering it.
 *
 * These tests pin the intended behaviour. They fail on the pre-fix code.
 */

import { describe, it, expect } from "vitest";
import { runIntelligence, type GameBundle } from "./engine";

const NOW = new Date("2026-09-30T12:00:00.000Z");

const AWAY_QB_OUT = {
  playerName: "Josh Allen",
  position: "QB",
  team: "BUF",
  reportStatus: "Out",
  primaryInjury: "shoulder",
  week: 5,
  season: 2026,
  sourceId: "nflverse",
  fetchedAt: NOW.toISOString(),
};

function baseBundle(selection: string): GameBundle {
  return {
    gameId: "g-1",
    sport: "NFL",
    selection,
    pickType: "MONEYLINE",
    commenceTime: "2026-10-04T17:00:00.000Z",
    homeTeam: "KC",
    awayTeam: "BUF",
    market: {
      market: "moneyline",
      fairProb: 0.5,
      line: null,
      bookmakerCount: 8,
      consensusPct: 0.5,
    },
    statedConfidence: 0.57,
    modelVersion: "v-test",
    now: NOW,
  } as GameBundle;
}

describe("selection blindness — away-side sign inversion", () => {
  it("an away-QB-out injury must LOWER an away pick", () => {
    const awayPick = baseBundle("BUF");
    const baseline = runIntelligence(awayPick);
    const withInjury = runIntelligence({ ...awayPick, awayInjuries: [AWAY_QB_OUT] });

    // Away player is out -> the away pick must get worse, not better.
    expect(withInjury.calibratedProb).toBeLessThan(baseline.calibratedProb);
  });

  it("the same injury must RAISE a home pick (mirror image)", () => {
    const homePick = baseBundle("KC");
    const baseline = runIntelligence(homePick);
    const withInjury = runIntelligence({ ...homePick, awayInjuries: [AWAY_QB_OUT] });

    // Opponent loses its QB -> the home pick must improve.
    expect(withInjury.calibratedProb).toBeGreaterThan(baseline.calibratedProb);
  });

  it("selection must change the result, not just the summary text", () => {
    const home = runIntelligence({ ...baseBundle("KC"), awayInjuries: [AWAY_QB_OUT] });
    const away = runIntelligence({ ...baseBundle("BUF"), awayInjuries: [AWAY_QB_OUT] });

    expect(home.calibratedProb).not.toBeCloseTo(away.calibratedProb, 4);
  });

  it("selection must invert the sign, not just shift the magnitude", () => {
    const home = runIntelligence({ ...baseBundle("KC"), awayInjuries: [AWAY_QB_OUT] });
    const away = runIntelligence({ ...baseBundle("BUF"), awayInjuries: [AWAY_QB_OUT] });

    // Symmetric around the baseline: one side up, other side down.
    const homeDelta = home.situationalShift;
    const awayDelta = away.situationalShift;
    expect(Math.sign(homeDelta)).toBe(-Math.sign(awayDelta));
  });
});