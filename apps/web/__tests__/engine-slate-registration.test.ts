import { describe, it, expect, afterEach } from "vitest";
import {
  registerEngineDfsProvider,
  type EngineSlateReport,
} from "@/lib/fantasy/engine-slate";
import {
  activeDfsSlate,
  isLiveDfs,
  registerDfsSlateProvider,
} from "@/lib/integrations/dfs";
import { DFS_SLATE } from "@/lib/fantasy/dfs-slate";

/**
 * Proves the wire-up this fix lands in
 * `app/api/cron/engine-dfs-slate/route.ts`: the cron now calls
 * `registerEngineDfsProvider` (the call `registerDfsSlateProvider` never had),
 * so `activeDfsSlate()` can serve the measured engine slate instead of the
 * illustrative fixture — but ONLY when the founder's DFS_PROVIDER flag is
 * set (law 3). Registration alone flips nothing.
 */

const LIVE_ENV = { DFS_PROVIDER: "gse-engine" } as Record<string, string | undefined>;
const DARK_ENV = {} as Record<string, string | undefined>;

afterEach(() => registerDfsSlateProvider(null));

const fakeReport: EngineSlateReport = {
  players: [
    {
      id: "p1",
      name: "Engine Player",
      pos: "WR",
      team: "KC",
      opp: "BUF",
      salary: 0,
      proj: 15.5,
      floor: 8,
      ceiling: 24,
      own: 0.5,
    },
  ],
  dropped: [],
  adjustmentCount: 0,
  adjustmentsCalibrated: false,
  salaryIsReal: false,
  ownershipIsAssumed: true,
  window: 5,
  season: 2026,
  week: 4,
};

function registerWithCache(): void {
  // Exactly what the cron route does after buildEngineSlate succeeds.
  const handle = registerEngineDfsProvider({
    season: 2026,
    week: 4,
    now: new Date().toISOString(),
  });
  handle.cache = fakeReport;
}

describe("engine DFS provider registration (cron wire-up)", () => {
  it("activeDfsSlate serves the registered engine slate once DFS_PROVIDER is set", () => {
    registerWithCache();
    const slate = activeDfsSlate(LIVE_ENV);
    expect(slate).toHaveLength(1);
    expect(slate[0]!.name).toBe("Engine Player");
    expect(slate[0]!.proj).toBe(15.5);
    expect(isLiveDfs(LIVE_ENV)).toBe(true);
  });

  it("stays illustrative while DFS_PROVIDER is unset, even after registration", () => {
    registerWithCache();
    expect(activeDfsSlate(DARK_ENV)).toHaveLength(DFS_SLATE.length);
    expect(isLiveDfs(DARK_ENV)).toBe(false);
  });

  it("a registered provider with no built slate yields EMPTY, never the fiction", () => {
    registerEngineDfsProvider({
      season: 2026,
      week: 4,
      now: new Date().toISOString(),
    });
    // Cache intentionally left null: registered but not yet built.
    expect(activeDfsSlate(LIVE_ENV)).toHaveLength(0);
  });
});
