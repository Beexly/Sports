import { describe, expect, it } from "vitest";
import { hypothesizeWithFormation } from "./combo-formation-bridge";

describe("formation-boosted hypotheses", () => {
  it("boosts smash when formation is 2x2", () => {
    const hyps = hypothesizeWithFormation(
      [
        { route: "hitch", side: "right", depth: "short" },
        { route: "corner", side: "right", depth: "intermediate" },
      ],
      "2x2",
    );
    expect(hyps[0].combination).toBe("smash");
    expect(hyps[0].formationBoost).toBeGreaterThan(0);
  });

  it("boosts mesh when formation is bunch", () => {
    const hyps = hypothesizeWithFormation(
      [
        { route: "drag", side: "left", depth: "short" },
        { route: "drag", side: "right", depth: "short" },
      ],
      "bunch-left",
    );
    const mesh = hyps.find((h) => h.combination === "mesh");
    expect(mesh?.formationBoost).toBeGreaterThan(0);
  });

  it("no boost for unknown distribution", () => {
    const hyps = hypothesizeWithFormation(
      [
        { route: "hitch", side: "right", depth: "short" },
        { route: "corner", side: "right", depth: "intermediate" },
      ],
      "unknown",
    );
    expect(hyps[0].formationBoost).toBe(0);
  });
});
