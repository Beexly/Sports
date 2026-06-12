import { describe, it, expect } from "vitest";
import { providerStatuses, isConfigured, readinessSummary } from "./providers";
import {
  resolveProjectionsProvider, isLiveProjections, registerProjectionsProvider,
  ILLUSTRATIVE_PROJECTIONS, type ProjectionsProvider,
} from "./projections";

describe("provider registry & gating", () => {
  it("projections is configured by default (opt-out model)", () => {
    expect(isConfigured("projections", {})).toBe(true);
  });

  it("projections can be disabled by setting PROJECTIONS_PROVIDER=off", () => {
    expect(isConfigured("projections", { PROJECTIONS_PROVIDER: "off" })).toBe(false);
    expect(isConfigured("projections", { PROJECTIONS_PROVIDER: "false" })).toBe(false);
    expect(isConfigured("projections", { PROJECTIONS_PROVIDER: "disabled" })).toBe(false);
  });

  it("non-projections providers still require their env var", () => {
    const empty = {};
    expect(isConfigured("image-safety", empty)).toBe(false);
    expect(isConfigured("league-espn", empty)).toBe(false);
    expect(readinessSummary({}).configured).toBe(1); // only projections is on by default
  });

  it("flips a vendor provider to configured when its env var is present", () => {
    const env = { THE_ODDS_API_KEY: "key123" };
    expect(isConfigured("odds", env)).toBe(true);
    expect(isConfigured("image-safety", env)).toBe(false);
  });

  it("treats blank/whitespace env values as not configured for vendor providers", () => {
    expect(isConfigured("odds", { THE_ODDS_API_KEY: "   " })).toBe(false);
  });
});

describe("projections provider resolution", () => {
  const live: ProjectionsProvider = {
    name: "Acme Live", live: true,
    list: () => [{ playerId: "x", name: "X", pos: "QB", team: "PHI", proj: 1, floor: 0, ceiling: 2, source: "live" }],
  };

  it("defaults to illustrative when no provider is registered (even with projections configured)", () => {
    registerProjectionsProvider(null);
    // projections is now configured by default, but no provider registered → illustrative
    expect(resolveProjectionsProvider({}).name).toBe(ILLUSTRATIVE_PROJECTIONS.name);
    expect(isLiveProjections({})).toBe(false);
    expect(resolveProjectionsProvider({}).list()[0]!.source).toBe("illustrative");
  });

  it("goes live when a provider is registered AND projections is configured (default)", () => {
    registerProjectionsProvider(live);
    // projections configured by default (no env var needed)
    expect(isLiveProjections({})).toBe(true);
    expect(resolveProjectionsProvider({}).name).toBe("Acme Live");
    registerProjectionsProvider(null); // reset
  });

  it("goes live when a provider is registered AND explicit env var is set", () => {
    registerProjectionsProvider(live);
    const env = { PROJECTIONS_PROVIDER: "acme" };
    expect(isLiveProjections(env)).toBe(true);
    expect(resolveProjectionsProvider(env).name).toBe("Acme Live");
    registerProjectionsProvider(null);
  });

  it("falls back to illustrative when PROJECTIONS_PROVIDER=off, even with a registered provider", () => {
    registerProjectionsProvider(live);
    expect(isLiveProjections({ PROJECTIONS_PROVIDER: "off" })).toBe(false);
    expect(resolveProjectionsProvider({ PROJECTIONS_PROVIDER: "off" }).name).toBe(ILLUSTRATIVE_PROJECTIONS.name);
    registerProjectionsProvider(null);
  });

  it("ignores a non-live provider even if registered", () => {
    registerProjectionsProvider({ name: "fake", live: false, list: () => [] });
    expect(isLiveProjections({})).toBe(false);
    registerProjectionsProvider(null);
  });
});
