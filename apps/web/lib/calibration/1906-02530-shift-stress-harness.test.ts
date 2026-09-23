import { describe, expect, it } from "vitest";

import {
  VANILLA,
  brierScore,
  expectedCalibrationError,
  negativeLogLikelihood,
  retireShiftLosers,
  runShiftStressHarness,
  type Calibrator,
  type GameRow,
} from "@/lib/calibration/1906-02530-shift-stress-harness";
import { mulberry32 } from "@/lib/calibration/1501-01126v1-composite-risk-measure";

function syntheticGames(seed: number): GameRow[] {
  // Early weeks: outcomes follow p. Late weeks (shift): outcomes follow 1-p
  // (adversarial temporal shift) so overfit calibrators collapse.
  const rand = mulberry32(seed);
  const games: GameRow[] = [];
  for (let week = 1; week <= 20; week++) {
    for (let g = 0; g < 40; g++) {
      const p = 0.2 + 0.6 * rand();
      const trueP = week <= 12 ? p : 1 - p;
      games.push({ week, p, y: rand() < trueP ? 1 : 0 });
    }
  }
  return games;
}

describe("shift-stress harness", () => {
  it("metrics behave on perfect forecasts", () => {
    expect(brierScore([1, 0, 1], [1, 0, 1])).toBe(0);
    expect(negativeLogLikelihood([1, 0], [1, 0])).toBeCloseTo(0, 6);
    // Perfectly calibrated: 25% ones at p=0.25, 75% ones at p=0.75.
    expect(
      expectedCalibrationError(
        [0.25, 0.25, 0.25, 0.25, 0.75, 0.75, 0.75, 0.75],
        [0, 0, 1, 0, 1, 1, 0, 1],
        10,
      ),
    ).toBeCloseTo(0, 10);
  });

  it("retires a calibrator that is worse-than-vanilla under shift", () => {
    const games = syntheticGames(11);
    // Overconfident calibrator: fit on early weeks pushes probs to extremes.
    const overconfident: Calibrator = {
      name: "overconfident",
      fit: () => (p: number) => (p > 0.5 ? 0.99 : 0.01),
    };
    const rows = runShiftStressHarness(
      [VANILLA, overconfident],
      games,
      12,
      13,
    );
    const oc = rows.find((r) => r.name === "overconfident")!;
    expect(oc.worseThanVanillaBrier).toBe(true);
    expect(retireShiftLosers(rows).map((r) => r.name)).toEqual(["vanilla"]);
  });

  it("vanilla is never flagged against itself", () => {
    const games = syntheticGames(12);
    const rows = runShiftStressHarness([VANILLA], games, 12, 13);
    expect(rows[0].worseThanVanillaBrier).toBe(false);
  });
});
