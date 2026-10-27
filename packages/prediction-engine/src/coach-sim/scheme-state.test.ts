import { describe, expect, it } from "vitest";
import {
  BOX_CHARTED_SHARE,
  QB_DECISION_DISCLOSED,
  SCHEME_FLAGS,
  SCHEME_YARDS_PER_EPA,
  centerEpa,
  drawSchemePlay,
  flagRate,
  schemeReasoningLine,
} from "./scheme-state";

describe("scheme layer", () => {
  it("keeps every measured flag, including the small ones", () => {
    const ids = SCHEME_FLAGS.map((row) => row.id);
    expect(ids).toEqual([
      "play_action",
      "rpo",
      "qb_out_of_pocket",
      "no_huddle",
      "blitz",
      "box",
      "motion",
    ]);
    const motion = SCHEME_FLAGS.find((row) => row.id === "motion");
    expect(motion?.deltaEpa).toBe(0.0016);
    expect(motion?.role).toBe("tell");
  });

  it("centers each contrast so the drive mean does not pick up the gap twice", () => {
    for (const row of SCHEME_FLAGS) {
      const rate = flagRate(row.nOn, row.nOff);
      const mean = rate * centerEpa(row.deltaEpa, true, rate) + (1 - rate) * centerEpa(row.deltaEpa, false, rate);
      expect(mean).toBeCloseTo(0, 12);
    }
  });

  it("still moves the play when motion fires and when it does not", () => {
    const motion = SCHEME_FLAGS.find((row) => row.id === "motion")!;
    const rate = flagRate(motion.nOn, motion.nOff);
    expect(centerEpa(motion.deltaEpa, true, rate)).not.toBe(0);
    expect(centerEpa(motion.deltaEpa, false, rate)).not.toBe(0);
  });

  it("tags a stacked box as run-committed and a light box as the play-action opportunity", () => {
    const stacked = drawSchemePlay(() => 0, "dropback");
    expect(stacked.box).toBe("stacked");
    expect(stacked.playTypeSignal).toBe("run_committed");
    expect(stacked.blitzAndPlayAction).toBe(true);
    expect(stacked.flags.find((row) => row.id === "motion")?.applies).toBe(true);
    expect(schemeReasoningLine(stacked)).toContain("P(pass|box) was not in the join");
    expect(schemeReasoningLine(stacked)).toContain("no invented product");

    let i = 0;
    const seq = [0.99, 0.99, 0, 0.99, 0.99];
    const light = drawSchemePlay(() => seq[i++] ?? 0.99, "run");
    expect(light.box).toBe("light");
    expect(light.playTypeSignal).toBe("play_action_opportunity");
    expect(light.flags.find((row) => row.id === "box")?.centeredEpa).not.toBe(0);
    expect(light.yards).toBeCloseTo(light.deltaEpa * SCHEME_YARDS_PER_EPA, 12);
    expect(QB_DECISION_DISCLOSED.map((row) => row.team)).toContain("DET");
    expect(BOX_CHARTED_SHARE).toBeCloseTo(23000 / 103000, 12);
  });
});
