import { describe, expect, it } from "vitest";
import {
  ROUTE_COMBINATIONS,
  hypothesizeCombinations,
} from "./cv-route-combinations";
import type { RouteName, FieldSide, RouteDepth } from "./cv-route-combinations";

type Obs = { route: RouteName; side: FieldSide; depth: RouteDepth };

describe("route combination ontology", () => {
  it("defines at least 10 named combinations", () => {
    expect(ROUTE_COMBINATIONS.length).toBeGreaterThanOrEqual(10);
  });

  it("every combination has a coverage stress and CV signature", () => {
    for (const c of ROUTE_COMBINATIONS) {
      expect(c.stress.length).toBeGreaterThan(10);
      expect(c.cvSignature.length).toBeGreaterThan(10);
      expect(c.roles.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("recognizes smash from hitch + corner same side", () => {
    const obs: Obs[] = [
      { route: "hitch", side: "right", depth: "short" },
      { route: "corner", side: "right", depth: "intermediate" },
    ];
    const hyps = hypothesizeCombinations(obs);
    expect(hyps[0]?.combination).toBe("smash");
    expect(hyps[0]?.confidence).toBe(1);
  });

  it("recognizes mesh from crossing drags", () => {
    const obs: Obs[] = [
      { route: "drag", side: "left", depth: "short" },
      { route: "drag", side: "right", depth: "short" },
    ];
    const hyps = hypothesizeCombinations(obs);
    const mesh = hyps.find((h) => h.combination === "mesh");
    expect(mesh).toBeDefined();
  });

  it("recognizes verticals from 4 deep traces", () => {
    const obs: Obs[] = [
      { route: "go", side: "left", depth: "deep" },
      { route: "seam", side: "middle", depth: "deep" },
      { route: "seam", side: "middle", depth: "deep" },
      { route: "go", side: "right", depth: "deep" },
    ];
    const hyps = hypothesizeCombinations(obs);
    expect(hyps[0]?.combination).toBe("verticals");
  });

  it("returns empty for unrecognized groupings", () => {
    const obs: Obs[] = [{ route: "hitch", side: "left", depth: "short" }];
    const hyps = hypothesizeCombinations(obs);
    expect(hyps.length).toBe(0);
  });
});
