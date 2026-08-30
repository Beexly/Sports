import { describe, it, expect } from "vitest";
import { providerStatuses, isConfigured, readinessSummary } from "./providers";
import {
  resolveProjectionsProvider, isLiveProjections, registerProjectionsProvider,
  ILLUSTRATIVE_PROJECTIONS, type ProjectionsProvider,
} from "./projections";

describe("provider registry & gating", () => {
  it("reports every provider gated when no env is set", () => {
    const s = providerStatuses({});
    expect(s.length).toBeGreaterThanOrEqual(5);
    expect(s.every((p) => !p.configured)).toBe(true);
    expect(readinessSummary({}).configured).toBe(0);
  });

  it("flips a provider to configured when its env var is present", () => {
    const env = { PROJECTIONS_PROVIDER: "acme-proj" };
    expect(isConfigured("projections", env)).toBe(true);
    expect(isConfigured("image-safety", env)).toBe(false);
    expect(readinessSummary(env).configured).toBe(1);
  });

  it("treats blank/whitespace env values as not configured", () => {
    expect(isConfigured("projections", { PROJECTIONS_PROVIDER: "   " })).toBe(false);
  });
});

describe("projections provider resolution (founder-gated)", () => {
  const live: ProjectionsProvider = {
    name: "Acme Live", live: true,
    list: () => [{ playerId: "x", name: "X", pos: "QB", team: "PHI", proj: 1, floor: 0, ceiling: 2, source: "live" }],
  };

  it("defaults to the illustrative pool", () => {
    registerProjectionsProvider(null);
    expect(resolveProjectionsProvider({}).name).toBe(ILLUSTRATIVE_PROJECTIONS.name);
    expect(isLiveProjections({})).toBe(false);
    expect(resolveProjectionsProvider({}).list()[0]!.source).toBe("illustrative");
  });

  it("requires BOTH a registered live provider AND the env flag to go live", () => {
    registerProjectionsProvider(live);
    // registered but env not set → still illustrative
    expect(isLiveProjections({})).toBe(false);
    expect(resolveProjectionsProvider({}).live).toBe(false);
    // registered AND env set → live
    const env = { PROJECTIONS_PROVIDER: "acme" };
    expect(isLiveProjections(env)).toBe(true);
    expect(resolveProjectionsProvider(env).name).toBe("Acme Live");
    registerProjectionsProvider(null); // reset
  });

  it("ignores a non-live provider even if registered", () => {
    registerProjectionsProvider({ name: "fake", live: false, list: () => [] });
    expect(isLiveProjections({ PROJECTIONS_PROVIDER: "x" })).toBe(false);
    registerProjectionsProvider(null);
  });
});
