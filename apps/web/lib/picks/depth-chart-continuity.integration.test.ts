import { describe, expect, it } from "vitest";
import type { TeamUnitContinuity } from "./depth-chart-continuity";

/**
 * Live integration check against `depth_chart_entries`.
 *
 * `vitest.setup.ts` pins DATABASE_URL to the "stub" sentinel so unit tests never
 * touch a real database. This suite therefore reads the connection string from
 * `CONTINUITY_LIVE_DB`, installs it as DATABASE_URL BEFORE the module's dynamic
 * import (so @sports/db builds a real client), and skips entirely when unset:
 *
 *   CONTINUITY_LIVE_DB=postgres://… npx vitest run lib/picks/depth-chart-continuity.integration.test.ts
 *
 * Assertions are INVARIANTS, not pinned numbers: the depth chart changes every
 * week, so pinning today's -0.4 would be a stale test by Sunday. What must hold
 * forever is that values are real (grounded in a prior-week starter set),
 * signed, non-constant across teams, and null exactly where no baseline exists.
 */
const liveUrl = process.env.CONTINUITY_LIVE_DB ?? "";
const hasDb = /^postgres(ql)?:\/\//.test(liveUrl);

describe.skipIf(!hasDb)("depth chart continuity against the live table", () => {
  it("returns real, signed, non-constant deltas for NFL teams", async () => {
    process.env.DATABASE_URL = liveUrl;
    const { loadDepthChartContinuity } = await import("./depth-chart-continuity");

    const teams = ["ARI", "BAL", "CAR", "CHI", "KC", "LAC", "NYG", "PHI"];
    const byTeam = await loadDepthChartContinuity(teams, { season: 2026 });

    expect(byTeam.size).toBeGreaterThanOrEqual(6);
    const entries = [...byTeam.values()] as TeamUnitContinuity[];
    expect(entries[0]!.week).toBeGreaterThan(entries[0]!.priorWeek);

    const all: Array<number | null> = [];
    for (const entry of entries as TeamUnitContinuity[]) {
      for (const [delta, starters] of [
        [entry.olContinuityDelta, entry.olStarters],
        [entry.dlContinuityDelta, entry.dlStarters],
        [entry.dbContinuityDelta, entry.dbStarters],
      ] as const) {
        all.push(delta);
        if (delta !== null) {
          expect(delta).toBeLessThanOrEqual(0);
          expect(delta).toBeGreaterThanOrEqual(-1);
        }
        // No prior starters ⇒ no delta. This is the null-not-a-constant rule.
        if (starters === 0) expect(delta).toBeNull();
      }
    }

    // Real values exist and they are not one constant: last week's chart moved
    // for some teams and held for others.
    expect(all.some((d) => d !== null && d < 0)).toBe(true);
    expect(all.some((d) => d === 0)).toBe(true);
  }, 60_000);
});
