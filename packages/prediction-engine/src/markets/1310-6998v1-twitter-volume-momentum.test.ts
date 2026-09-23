import { describe, it, expect } from "vitest";
import {
  ewma,
  volumeMomentumFeature,
  beatWriterSentiment,
  totalsModelFeatures,
} from "./1310-6998v1-twitter-volume-momentum.js";

describe("ewma", () => {
  it("reacts to a volume spike with locked theta=0.2", () => {
    const m = ewma([100, 100, 100, 500, 100], 0.2);
    expect(m[3]!).toBeCloseTo(0.2 * 500 + 0.8 * 100, 10);
    expect(m[4]!).toBeLessThan(m[3]!);
  });
});

describe("volumeMomentumFeature", () => {
  it("z-scores momentum so spikes read positive", () => {
    const mom = volumeMomentumFeature([50, 52, 48, 51, 49, 50, 51, 200]);
    expect(mom[mom.length - 1]!).toBeGreaterThan(1.5);
    expect(mom.slice(0, 7).every((x) => x < 0.5)).toBe(true);
  });
});

describe("beatWriterSentiment", () => {
  it("scores optimistic and pessimistic injury news with the right sign", () => {
    expect(
      beatWriterSentiment(["QB cleared to return, full participant in practice"]),
    ).toBeGreaterThan(0);
    expect(
      beatWriterSentiment(["Star WR doubtful with injury, setback in rehab"]),
    ).toBeLessThan(0);
    expect(beatWriterSentiment(["Team signs veteran backup quarterback"])).toBe(0);
  });
});

describe("totalsModelFeatures", () => {
  it("emits one feature row per week", () => {
    const rows = totalsModelFeatures(
      [50, 52, 200, 55],
      [["cleared to return"], [], ["doubtful with injury"], []],
    );
    expect(rows).toHaveLength(4);
    expect(rows[0]!.injurySentiment).toBeGreaterThan(0);
    expect(rows[2]!.injurySentiment).toBeLessThan(0);
    expect(rows[2]!.volumeMomentum).toBeGreaterThan(rows[0]!.volumeMomentum);
  });
});
