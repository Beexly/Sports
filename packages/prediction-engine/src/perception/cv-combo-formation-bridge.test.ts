import { describe, expect, it } from "vitest";
import { hypothesizeWithFormation } from "./cv-combo-formation-bridge";
import type { RouteName, FieldSide, RouteDepth } from "./cv-route-combinations";

type Obs = { route: RouteName; side: FieldSide; depth: RouteDepth };

describe("formation-boosted hypotheses", () => {
  it("boosts smash when formation is 2x2", () => {
    const obs: Obs[] = [
      { route: "hitch", side: "right", depth: "short" },
      { route: "corner", side: "right", depth: "intermediate" },
    ];
    const hyps = hypothesizeWithFormation(obs, "2x2");
    expect(hyps[0]?.combination).toBe("smash");
    expect(hyps[0]?.formationBoost).toBeGreaterThan(0);
  });

  it("boosts mesh when formation is bunch", () => {
    const obs: Obs[] = [
      { route: "drag", side: "left", depth: "short" },
      { route: "drag", side: "right", depth: "short" },
    ];
    const hyps = hypothesizeWithFormation(obs, "bunch-left");
    const mesh = hyps.find((h) => h.combination === "mesh");
    expect(mesh?.formationBoost).toBeGreaterThan(0);
  });

  it("no boost for unknown distribution", () => {
    const obs: Obs[] = [
      { route: "hitch", side: "right", depth: "short" },
      { route: "corner", side: "right", depth: "intermediate" },
    ];
    const hyps = hypothesizeWithFormation(obs, "unknown");
    expect(hyps[0]?.formationBoost).toBe(0);
  });
});
