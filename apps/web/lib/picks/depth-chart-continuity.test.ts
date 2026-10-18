import { describe, expect, it } from "vitest";
import {
  CONTINUITY_UNIT_POSITIONS,
  computeContinuityByTeam,
  computeTeamUnitContinuity,
  loadDepthChartContinuity,
  nflSeasonForKickoff,
  resolvePickTeamAbbreviation,
  starterSetsByUnit,
  unitContinuityDelta,
  unitForPosition,
  type DepthChartEntryReader,
  type DepthChartRow,
} from "./depth-chart-continuity";
import { resolveNflTeamAbbreviation } from "@/lib/nfl/team-resolver";

/**
 * These fixtures are hand-written to exercise the ARITHMETIC. They are not
 * claims about any real team; the real numbers are produced from
 * `depth_chart_entries` (see the backfill script and the route wiring).
 */
function row(team: string, position: string, depthRank: number, id: string, name = id): DepthChartRow {
  return { team, position, depthRank, gsisId: id, playerName: name };
}

const ARI_OL_W5 = ["00-1", "00-2", "00-3", "00-4", "00-5"].map((id, i) =>
  row("ARI", ["LT", "LG", "C", "RG", "RT"][i]!, 1, id),
);
const ARI_OL_W6 = ["00-1", "00-2", "00-3", "00-4", "00-9"].map((id, i) =>
  row("ARI", ["LT", "LG", "C", "RG", "RT"][i]!, 1, id),
);
const KC_OL_W5 = ["00-11", "00-12", "00-13", "00-14", "00-15"].map((id, i) =>
  row("KC", ["LT", "LG", "C", "RG", "RT"][i]!, 1, id),
);
const KC_OL_W6 = KC_OL_W5;

describe("unit definition", () => {
  it("uses the specific nflverse pos_abb codes, not generic OT/OG/DE/CB", () => {
    expect(CONTINUITY_UNIT_POSITIONS.OL).toEqual(["LT", "RT", "LG", "RG", "C"]);
    expect(CONTINUITY_UNIT_POSITIONS.DL).toEqual(["LDE", "RDE", "LDT", "RDT", "NT"]);
    expect(CONTINUITY_UNIT_POSITIONS.DB).toEqual(["LCB", "RCB", "NB", "FS", "SS"]);
  });

  it("maps every unit position and rejects positions outside the three units", () => {
    for (const p of CONTINUITY_UNIT_POSITIONS.OL) expect(unitForPosition(p)).toBe("OL");
    for (const p of CONTINUITY_UNIT_POSITIONS.DL) expect(unitForPosition(p)).toBe("DL");
    for (const p of CONTINUITY_UNIT_POSITIONS.DB) expect(unitForPosition(p)).toBe("DB");
    for (const p of ["QB", "WR", "TE", "RB", "K", "P", "MLB", "OT", "CB", "", null]) {
      expect(unitForPosition(p)).toBeNull();
    }
  });

  it("accepts lower-case positions from older rows", () => {
    expect(unitForPosition("lt")).toBe("OL");
  });
});

describe("starter sets", () => {
  it("counts only depthRank 1 and only unit positions", () => {
    const sets = starterSetsByUnit([
      row("ARI", "LT", 1, "00-1"),
      row("ARI", "LT", 2, "00-2"),
      row("ARI", "QB", 1, "00-3"),
      row("ARI", "LDE", 1, "00-4"),
    ]);
    expect([...sets.OL]).toEqual(["gsis:00-1"]);
    expect([...sets.DL]).toEqual(["gsis:00-4"]);
    expect(sets.DB.size).toBe(0);
  });

  it("identifies a player by gsis id even when the name spelling changes", () => {
    const current = starterSetsByUnit([row("ARI", "LT", 1, "00-1", "Jedrick Wills Jr.")]);
    const prior = starterSetsByUnit([row("ARI", "LT", 1, "00-1", "Jedrick Wills")]);
    expect(unitContinuityDelta(current.OL, prior.OL)).toBe(0);
  });

  it("falls back to the normalised name when a row has no gsis id", () => {
    const current = starterSetsByUnit([row("ARI", "LT", 1, "", "  Josh  Fryar ")]);
    expect([...current.OL]).toEqual(["name:josh fryar"]);
  });
});

describe("continuity delta arithmetic", () => {
  it("is 0 when every starter returns and negative when one is replaced", () => {
    const full = new Set(["a", "b", "c", "d", "e"]);
    expect(unitContinuityDelta(full, full)).toBe(0);
    expect(unitContinuityDelta(full, new Set(["a", "b", "c", "d", "z"]))).toBe(-0.2);
    expect(unitContinuityDelta(full, new Set(["a", "z"]))).toBe(-0.5);
    expect(unitContinuityDelta(full, new Set(["z"]))).toBe(-1);
    expect(unitContinuityDelta(full, new Set())).toBeNull();
    expect(unitContinuityDelta(new Set(), full)).toBeNull();
  });

  it("returns null rather than a number when a unit has no starters at all", () => {
    const result = computeTeamUnitContinuity([], [], 6, 5);
    expect(result.olContinuityDelta).toBeNull();
    expect(result.dlContinuityDelta).toBeNull();
    expect(result.dbContinuityDelta).toBeNull();
    expect(result.week).toBe(6);
    expect(result.priorWeek).toBe(5);
  });

  it("reports the prior starter count as the delta denominator", () => {
    const result = computeTeamUnitContinuity(
      [...ARI_OL_W6, row("ARI", "LDE", 1, "00-21"), row("ARI", "NT", 1, "00-22")],
      [...ARI_OL_W5, row("ARI", "LDE", 1, "00-21")],
      6,
      5,
    );
    expect(result.olStarters).toBe(5);
    expect(result.dlStarters).toBe(1); // prior week listed only LDE
    expect(result.dlContinuityDelta).toBe(0); // the added NT displaced nobody
    expect(result.dbContinuityDelta).toBeNull();
  });

  it("produces different values for different teams from the same weeks", () => {
    const byTeam = computeContinuityByTeam([...ARI_OL_W6, ...KC_OL_W6], [...ARI_OL_W5, ...KC_OL_W5], 6, 5);
    expect(byTeam.get("ARI")!.olContinuityDelta).toBe(-0.2);
    expect(byTeam.get("KC")!.olContinuityDelta).toBe(0);
    expect(byTeam.get("ARI")!.olContinuityDelta).not.toBe(byTeam.get("KC")!.olContinuityDelta);
  });
});

describe("loadDepthChartContinuity", () => {
  function readerFor(rows: Array<DepthChartRow & { week: number }>): DepthChartEntryReader {
    return {
      async findMany(args) {
        const where = args.where as { week?: { in: number[] } | number };
        const weeks = where.week && typeof where.week === "object" ? where.week.in : null;
        if (!("select" in args) || Object.keys(args.select).length === 1) {
          // distinct-week probe
          return [...new Set(rows.map((r) => r.week))]
            .sort((a, b) => b - a)
            .slice(0, args.take ?? 2)
            .map((week) => ({ week }) as DepthChartRow & { week: number });
        }
        return weeks ? rows.filter((r) => weeks.includes(r.week)) : rows;
      },
    };
  }

  it("computes real deltas when two weekly snapshots exist", async () => {
    const rows = [
      ...ARI_OL_W6.map((r) => ({ ...r, week: 6 })),
      ...ARI_OL_W5.map((r) => ({ ...r, week: 5 })),
      ...ARI_OL_W5.map((r) => ({ ...r, week: 0 })),
    ];
    const result = await loadDepthChartContinuity(["ARI"], { season: 2026, reader: readerFor(rows) });
    expect(result.get("ARI")!.olContinuityDelta).toBe(-0.2);
    expect(result.get("ARI")!.week).toBe(6);
    expect(result.get("ARI")!.priorWeek).toBe(5);
  });

  it("returns an EMPTY map with a single snapshot — one week cannot produce a delta", async () => {
    const rows = ARI_OL_W6.map((r) => ({ ...r, week: 0 }));
    const result = await loadDepthChartContinuity(["ARI"], { season: 2026, reader: readerFor(rows) });
    expect(result.size).toBe(0);
  });

  it("returns an empty map instead of throwing when the reader fails", async () => {
    const result = await loadDepthChartContinuity(["ARI"], {
      season: 2026,
      reader: { findMany: async () => { throw new Error("db down"); } },
    });
    expect(result.size).toBe(0);
  });

  it("does no work for an empty team list", async () => {
    const result = await loadDepthChartContinuity([], { season: 2026, reader: readerFor([]) });
    expect(result.size).toBe(0);
  });
});

describe("team resolution", () => {
  it("resolves the full names stored on games rows through the shared alias table", () => {
    expect(resolveNflTeamAbbreviation("Arizona Cardinals")).toBe("ARI");
    expect(resolveNflTeamAbbreviation("Kansas City Chiefs")).toBe("KC");
    expect(resolveNflTeamAbbreviation("San Francisco 49ers")).toBe("SF");
    expect(resolveNflTeamAbbreviation("Arizona")).toBe("ARI");
    expect(resolveNflTeamAbbreviation("Not A Team")).toBeNull();
  });

  it("takes the side from the selection, and refuses to guess on a total", () => {
    const base = { homeTeamName: "Arizona Cardinals", awayTeamName: "Kansas City Chiefs" };
    expect(resolvePickTeamAbbreviation({ ...base, pickType: "SPREAD", selection: "Arizona Cardinals +3.5" })).toBe("ARI");
    expect(resolvePickTeamAbbreviation({ ...base, pickType: "MONEYLINE", selection: "Kansas City Chiefs" })).toBe("KC");
    expect(resolvePickTeamAbbreviation({ ...base, pickType: "TOTAL", selection: "OVER 48.5" })).toBeNull();
    expect(resolvePickTeamAbbreviation({ ...base, pickType: "SPREAD", selection: "+3.5" })).toBeNull();
  });
});

describe("nflSeasonForKickoff", () => {
  it("keeps January playoff games in the previous season", () => {
    expect(nflSeasonForKickoff(new Date("2026-10-17T17:00:00Z"))).toBe(2026);
    expect(nflSeasonForKickoff(new Date("2027-01-10T18:00:00Z"))).toBe(2026);
    expect(nflSeasonForKickoff(new Date("2026-09-10T00:20:00Z"))).toBe(2026);
  });
});
