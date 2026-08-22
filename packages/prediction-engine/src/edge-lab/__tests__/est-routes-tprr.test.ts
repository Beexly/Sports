import { describe, expect, it } from "vitest";
import {
  EST_ROUTES_METHOD_TAG,
  estRoutesTprr,
} from "../est-routes-tprr.js";

describe("estRoutesTprr", () => {
  it("is snaps × team dropbacks / team snaps with TPRR on L1", () => {
    const r = estRoutesTprr({
      playerOffenseSnaps: 40,
      teamOffenseSnaps: 70,
      teamDropbacks: 35,
      targets: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.estRoutes).toBeCloseTo((40 * 35) / 70, 12);
    expect(r.tprr).toBeCloseTo(8 / ((40 * 35) / 70), 12);
    expect(r.layer).toBe("L1");
    expect(r.priced).toBe(false);
    expect(r.methodTag).toBe("est_routes_tprr_v1");
    expect(EST_ROUTES_METHOD_TAG).toBe("est_routes_tprr_v1");
  });

  it("refuses zero team snaps", () => {
    const r = estRoutesTprr({
      playerOffenseSnaps: 40,
      teamOffenseSnaps: 0,
      teamDropbacks: 35,
      targets: 8,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected refuse");
    expect(r.refuse).toBe("zero_team_snaps");
    expect(r.priced).toBe(false);
  });

  it("refuses negative required counts", () => {
    const r = estRoutesTprr({
      playerOffenseSnaps: -1,
      teamOffenseSnaps: 70,
      teamDropbacks: 35,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected refuse");
    expect(r.refuse).toBe("bad_input");
    expect(r.priced).toBe(false);
    expect(
      estRoutesTprr({
        playerOffenseSnaps: 40,
        teamOffenseSnaps: Number.NaN,
        teamDropbacks: 35,
      }).ok,
    ).toBe(false);
  });

  it("leaves tprr null when targets are omitted", () => {
    const r = estRoutesTprr({
      playerOffenseSnaps: 40,
      teamOffenseSnaps: 70,
      teamDropbacks: 35,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.tprr).toBeNull();
    expect(r.estRoutes).toBeCloseTo(20, 12);
    expect(r.priced).toBe(false);
  });

  it("is never priced", () => {
    const ok = estRoutesTprr({
      playerOffenseSnaps: 10,
      teamOffenseSnaps: 60,
      teamDropbacks: 30,
      targets: 2,
    });
    const zero = estRoutesTprr({
      playerOffenseSnaps: 10,
      teamOffenseSnaps: 0,
      teamDropbacks: 30,
    });
    const bad = estRoutesTprr({
      playerOffenseSnaps: 10,
      teamOffenseSnaps: 60,
      teamDropbacks: Number.POSITIVE_INFINITY,
    });
    expect(ok.priced).toBe(false);
    expect(zero.priced).toBe(false);
    expect(bad.priced).toBe(false);
  });
});
