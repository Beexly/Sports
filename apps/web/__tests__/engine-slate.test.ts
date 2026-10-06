import { describe, it, expect, afterEach } from "vitest";
import { PROJECTION_WINDOW } from "@/lib/fantasy/engine-slate";
import {
  activeDfsSlate,
  resolveDfsSlateProvider,
  isLiveDfs,
  registerDfsSlateProvider,
  ILLUSTRATIVE_DFS,
} from "@/lib/integrations/dfs";
import { DFS_SLATE } from "@/lib/fantasy/dfs-slate";

/**
 * The provider seam has THREE conditions, not one. Verified in
 * `lib/integrations/dfs.ts`:
 *   activeDfsSlate() is live only when (a) a provider is registered,
 *   (b) it declares `live: true`, AND (c) `isConfigured("dfs")` — which reads
 *   the DFS_PROVIDER env var. Registering the engine provider is therefore NOT
 *   sufficient on its own; that env flag is a founder-only flip under law 3 and
 *   this suite asserts the behaviour WITHOUT setting it.
 *
 * These tests pin the seam's safety property: an engine provider that finds no
 * measured data must return an empty slate, never the fictional one.
 */

const LIVE_ENV = { DFS_PROVIDER: "gse-engine" } as Record<string, string | undefined>;

afterEach(() => registerDfsSlateProvider(null));

describe("the sample-slate seam", () => {
  it("falls back to the illustrative slate when no provider is registered", () => {
    registerDfsSlateProvider(null);
    expect(resolveDfsSlateProvider({})).toBe(ILLUSTRATIVE_DFS);
    expect(activeDfsSlate({})).toHaveLength(DFS_SLATE.length);
  });

  it("refuses a provider that does not declare itself live", () => {
    registerDfsSlateProvider({ name: "fake", live: false, slate: () => DFS_SLATE });
    expect(resolveDfsSlateProvider(LIVE_ENV)).toBe(ILLUSTRATIVE_DFS);
  });

  it("still refuses a live provider while DFS_PROVIDER is unset (law 3 gate)", () => {
    registerDfsSlateProvider({ name: "gse", live: true, slate: () => [DFS_SLATE[0]!] });
    // Registered + live, but the env credential is absent -> still illustrative.
    expect(resolveDfsSlateProvider({})).toBe(ILLUSTRATIVE_DFS);
    expect(isLiveDfs({})).toBe(false);
  });

  it("serves the live provider once the credential is present", () => {
    registerDfsSlateProvider({ name: "gse", live: true, slate: () => [DFS_SLATE[0]!] });
    expect(resolveDfsSlateProvider(LIVE_ENV)).not.toBe(ILLUSTRATIVE_DFS);
    expect(activeDfsSlate(LIVE_ENV)).toHaveLength(1);
    expect(isLiveDfs(LIVE_ENV)).toBe(true);
  });

  it("an empty live slate stays EMPTY rather than falling back to fiction", () => {
    // The single most dangerous failure here: a live provider with no measured
    // data silently serving 36 fictional players.
    registerDfsSlateProvider({ name: "gse", live: true, slate: () => [] });
    expect(activeDfsSlate(LIVE_ENV)).toHaveLength(0);
  });
});

describe("engine slate projection contract", () => {
  it("declares a real recent-form window", () => {
    expect(Number.isInteger(PROJECTION_WINDOW)).toBe(true);
    expect(PROJECTION_WINDOW).toBeGreaterThan(0);
    expect(PROJECTION_WINDOW).toBeLessThanOrEqual(10);
  });
});
