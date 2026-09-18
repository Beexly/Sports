/**
 * NFL adv metrics — formula pins + gse-lab CSV checks.
 *
 * Synthetic rows are fixtures, not NFL results. CSV reads are the 2026-09-17
 * lab tables in docs/research/2026-09-17/gse-lab/.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isSuccessfulPlay, type SuccessPlay } from "../../expected-metrics/success-rate.js";
import {
  dfsOwnershipLeverage,
  epaRushByGap,
  firstDownQuadrants,
  formationUsage,
  inLabSample,
  isExplosive,
  isLabSuccess,
  leaguePercentile,
  PALAZZOLO_RUN_GAP_CAVEAT,
  pressureToSack,
  rankCompositeQbs,
  rankSurvivorPicks,
  refuseChartingMetric,
  type LabPlay,
} from "../index.js";

function labPlay(over: Partial<LabPlay>): LabPlay {
  return {
    seasonType: "REG",
    playType: "pass",
    qbKneel: 0,
    qbSpike: 0,
    epa: 0.1,
    qtr: 2,
    wp: 0.5,
    passAttempt: 1,
    rushAttempt: 0,
    qbScramble: 0,
    yardsGained: 8,
    ...over,
  };
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  const header = (lines[0] ?? "").split(",");
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      const key = header[i];
      if (key !== undefined) row[key] = cells[i] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function labCsv(name: string): Record<string, string>[] {
  // vitest cwd = packages/prediction-engine
  const path = join(process.cwd(), "..", "..", "docs", "research", "2026-09-17", "gse-lab", name);
  return parseCsv(readFileSync(path, "utf8"));
}

describe("lab filters (COMPUTATION_NOTES)", () => {
  it("drops POST, kneel, spike, non-finite EPA, and Q4 blowout WP", () => {
    expect(inLabSample(labPlay({}))).toBe(true);
    expect(inLabSample(labPlay({ seasonType: "POST" }))).toBe(false);
    expect(inLabSample(labPlay({ qbKneel: 1 }))).toBe(false);
    expect(inLabSample(labPlay({ qbSpike: 1 }))).toBe(false);
    expect(inLabSample(labPlay({ epa: null }))).toBe(false);
    expect(inLabSample(labPlay({ epa: Number.NaN }))).toBe(false);
    expect(inLabSample(labPlay({ qtr: 4, wp: 0.96 }))).toBe(false);
    expect(inLabSample(labPlay({ qtr: 4, wp: 0.04 }))).toBe(false);
    expect(inLabSample(labPlay({ qtr: 4, wp: 0.5 }))).toBe(true);
    expect(inLabSample(labPlay({ qtr: 4, wp: null }))).toBe(true);
  });

  it("lab success is EPA > 0, distinct from FO yardage-fraction success", () => {
    expect(isLabSuccess(0.1)).toBe(true);
    expect(isLabSuccess(0)).toBe(false);
    expect(isLabSuccess(-0.01)).toBe(false);
    const fo: SuccessPlay = {
      playId: "g-1",
      teamId: "BUF",
      playerId: "00-1",
      down: 1,
      ydstogo: 10,
      yardsGained: 3,
      touchdown: 0,
      turnover: 0,
    };
    expect(isSuccessfulPlay(fo)).toBe(false);
    expect(isLabSuccess(0.1)).toBe(true);
  });

  it("explosive uses 15-yard dropback / 10-yard designed rush", () => {
    expect(isExplosive(labPlay({ yardsGained: 15, passAttempt: 1 }))).toBe(true);
    expect(isExplosive(labPlay({ yardsGained: 14, passAttempt: 1 }))).toBe(false);
    expect(
      isExplosive(
        labPlay({
          playType: "run",
          passAttempt: 0,
          rushAttempt: 1,
          qbScramble: 0,
          yardsGained: 10,
        }),
      ),
    ).toBe(true);
    expect(
      isExplosive(
        labPlay({
          playType: "run",
          passAttempt: 0,
          rushAttempt: 1,
          qbScramble: 1,
          yardsGained: 10,
        }),
      ),
    ).toBe(false);
  });
});

describe("league percentile", () => {
  it("100 is best; lower-is-better inverts", () => {
    expect(leaguePercentile([1, 2, 3], true)).toEqual([0, 50, 100]);
    expect(leaguePercentile([1, 2, 3], false)).toEqual([100, 50, 0]);
  });

  it("keeps nulls and refuses n < 2", () => {
    expect(leaguePercentile([1, null, 3], true)[1]).toBeNull();
    expect(leaguePercentile([5], true)).toEqual([null]);
    expect(leaguePercentile([null, null], true)).toEqual([null, null]);
  });
});

describe("composite QB z4", () => {
  it("ranks the four-component equal-weight z mean and drops non-finite", () => {
    const result = rankCompositeQbs(
      [
        {
          playerId: "good",
          attempts: 100,
          epaPerPlay: 0.3,
          successRate: 0.55,
          cpoe: 8,
          airYardsPerReception: 12,
        },
        {
          playerId: "bad",
          attempts: 100,
          epaPerPlay: -0.1,
          successRate: 0.4,
          cpoe: -4,
          airYardsPerReception: 6,
        },
        {
          playerId: "mid",
          attempts: 100,
          epaPerPlay: 0.1,
          successRate: 0.48,
          cpoe: 2,
          airYardsPerReception: 9,
        },
        {
          playerId: "missing-aypr",
          attempts: 100,
          epaPerPlay: 0.4,
          successRate: 0.6,
          cpoe: 10,
          airYardsPerReception: Number.NaN,
        },
        {
          playerId: "short",
          attempts: 9,
          epaPerPlay: 0.9,
          successRate: 0.9,
          cpoe: 20,
          airYardsPerReception: 20,
        },
      ],
      10,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.method).toBe("gse-composite-qb-z4-v1");
    expect(result.n).toBe(3);
    expect(result.rows.map((r) => r.playerId)).toEqual(["good", "mid", "bad"]);
    expect(result.rows[0]?.rank).toBe(1);
  });

  it("refuses a single qualifier", () => {
    const result = rankCompositeQbs(
      [
        {
          playerId: "only",
          attempts: 100,
          epaPerPlay: 0.2,
          successRate: 0.5,
          cpoe: 1,
          airYardsPerReception: 8,
        },
      ],
      10,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("insufficient_qualifiers");
  });
});

describe("formation usage", () => {
  it("splits shotgun vs under-center-or-pistol and nulls empty EPA", () => {
    const out = formationUsage([
      { shotgun: 1, epa: 0.2 },
      { shotgun: 1, epa: 0.0 },
      { shotgun: 0, epa: -0.1 },
    ]);
    expect(out.underCenterOrPistolRate).toBeCloseTo(1 / 3, 5);
    expect(out.shotgun.plays).toBe(2);
    expect(out.underCenterOrPistol.plays).toBe(1);
    expect(out.shotgun.epaPerPlay).toBeCloseTo(0.1, 5);
    expect(out.caveat).toContain("pistol");
    const empty = formationUsage([]);
    expect(empty.underCenterOrPistolRate).toBeNull();
    expect(empty.shotgun.epaPerPlay).toBeNull();
  });
});

describe("pressure-to-sack", () => {
  it("computes true PTR only when times_pressured is present", () => {
    const truePtr = pressureToSack({ sacks: 4, timesPressured: 20 });
    expect(truePtr.ok).toBe(true);
    if (!truePtr.ok || truePtr.kind !== "true_ptr") throw new Error("expected true_ptr");
    expect(truePtr.pressureToSack).toBe(0.2);
  });

  it("emits the hit+sack floor with a caveat instead of calling it PTR", () => {
    const proxy = pressureToSack({ sacks: 3, timesPressured: null, qbHits: 7, dropbacks: 50 });
    expect(proxy.ok).toBe(true);
    if (!proxy.ok || proxy.kind !== "hit_sack_floor_proxy") throw new Error("expected proxy");
    expect(proxy.hitSackFloorRate).toBe(0.2);
    expect(proxy.caveat).toContain("not_pressure_to_sack");
  });

  it("refuses zero pressures and missing charting", () => {
    expect(pressureToSack({ sacks: 1, timesPressured: 0 }).ok).toBe(false);
    expect(pressureToSack({ sacks: 1, timesPressured: null }).ok).toBe(false);
  });
});

describe("EPA/rush by gap", () => {
  it("always carries the Palazzolo caveat on the result and every split", () => {
    const out = epaRushByGap([
      { runGap: "end", epa: 0.2 },
      { runGap: "end", epa: 0.0 },
      { runGap: "guard", epa: -0.1 },
    ]);
    expect(out.caveat).toBe(PALAZZOLO_RUN_GAP_CAVEAT);
    expect(out.splits.every((s) => s.caveat === PALAZZOLO_RUN_GAP_CAVEAT)).toBe(true);
    const end = out.splits.find((s) => s.gap === "end");
    expect(end?.epaPerRush).toBeCloseTo(0.1, 5);
    const tackle = out.splits.find((s) => s.gap === "tackle");
    expect(tackle?.epaPerRush).toBeNull();
  });
});

describe("DFS leverage and survivor", () => {
  it("leverage is optimal share minus ownership; refuses out of range", () => {
    const ok = dfsOwnershipLeverage({
      playerId: "00-1",
      optimalLineupShare: 0.25,
      projectedOwnership: 0.1,
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.leverage).toBeCloseTo(0.15, 6);
    expect(
      dfsOwnershipLeverage({ playerId: "00-1", optimalLineupShare: 1.2, projectedOwnership: 0.1 }).ok,
    ).toBe(false);
  });

  it("survivor ranks unused teams by ln(p) and refuses empty unused", () => {
    const ranked = rankSurvivorPicks(
      [
        { teamId: "BUF", winProb: 0.7 },
        { teamId: "DET", winProb: 0.55 },
        { teamId: "NYJ", winProb: 0.2 },
      ],
      new Set(["BUF"]),
    );
    expect(ranked.ok).toBe(true);
    if (!ranked.ok) return;
    expect(ranked.rows.map((r) => r.teamId)).toEqual(["DET", "NYJ"]);
    expect(ranked.caveat).toContain("not_contest_win_probability");
    const empty = rankSurvivorPicks([{ teamId: "BUF", winProb: 0.7 }], new Set(["BUF"]));
    expect(empty.ok).toBe(false);
  });
});

describe("charting refuses", () => {
  it("has no success path for read / time-to-pressure / PFF play rates", () => {
    expect(refuseChartingMetric("qb_read_distribution").reason).toBe("no_read_progression_charting");
    expect(refuseChartingMetric("time_to_pressure").reason).toBe("no_timing_column");
    expect(refuseChartingMetric("pff_positive_play_rate").reason).toBe("pff_paywalled_not_ingested");
    expect(refuseChartingMetric("pff_negative_play_rate").ok).toBe(false);
  });
});

describe("gse-lab CSV validation", () => {
  it("qb_aggressiveness_2026 CPOE is percentage points, not a 0-1 rate", () => {
    const rows = labCsv("qb_aggressiveness_2026.csv");
    expect(rows.length).toBeGreaterThan(10);
    const cpoe = rows.map((r) => Number(r.cpoe)).filter((x) => Number.isFinite(x));
    expect(cpoe.some((x) => Math.abs(x) > 1)).toBe(true);
    const mayfield = rows.find((r) => r.player === "B.Mayfield");
    expect(Number(mayfield?.cpoe)).toBeCloseTo(12.89323, 4);
    const rodgers = rows.find((r) => r.player === "A.Rodgers");
    expect(Number(rodgers?.air_yards)).toBeCloseTo(407, 4);
    expect(Number(rodgers?.adot)).toBeCloseTo(10.175, 3);
  });

  it("player_first_downs_2026 dual-threat quadrants use both finite rates", () => {
    const rows = labCsv("player_first_downs_2026.csv");
    const players = rows.map((r) => ({
      playerId: r.player ?? "",
      rushFdRate: r.rush_fd_rate === "" ? null : Number(r.rush_fd_rate),
      recFdRate: r.rec_fd_rate === "" ? null : Number(r.rec_fd_rate),
    }));
    const out = firstDownQuadrants(players);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const jeanty = out.rows.find((r) => r.playerId === "A.Jeanty");
    expect(jeanty).toBeDefined();
    expect(jeanty?.rushFdRate).toBeCloseTo(0.41176, 5);
    expect(jeanty?.recFdRate).toBeCloseTo(0.4, 5);
    const counts = {
      high_rush_high_rec: 0,
      high_rush_low_rec: 0,
      low_rush_high_rec: 0,
      low_rush_low_rec: 0,
      on_median: 0,
    };
    for (const row of out.rows) counts[row.quadrant] += 1;
    expect(out.n).toBe(counts.high_rush_high_rec + counts.high_rush_low_rec + counts.low_rush_high_rec + counts.low_rush_low_rec + counts.on_median);
    expect(out.n).toBeGreaterThan(10);
    expect(players.filter((p) => p.rushFdRate === null || p.recFdRate === null).length).toBeGreaterThan(0);
  });

  it("rush_pressure_2026 is a hit+sack floor rate, not PTR", () => {
    const rows = labCsv("rush_pressure_2026.csv");
    const buf = rows.find((r) => r.team === "BUF");
    expect(buf).toBeDefined();
    const proxy = Number(buf?.pressure_proxy_rate_forced);
    expect(proxy).toBeGreaterThan(0);
    expect(proxy).toBeLessThan(1);
    const refused = pressureToSack({ sacks: 9, timesPressured: null });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.reason).toBe("no_pressure_charting");
  });
});
