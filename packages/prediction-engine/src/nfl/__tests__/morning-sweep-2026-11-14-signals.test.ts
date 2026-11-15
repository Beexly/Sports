import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  SHRINK_PSEUDOCOUNT,
  shrinkTowardBaseline,
  parseCsv,
  parseNum,
  parsePercent,
  parseQbEpaByDefTier,
  parseGridironMatchup,
  parseBarrettManZone,
  parseDynatyzeCard,
  parseJmThriveInjury,
  parseFantasyPtsTprr,
  parseBarrettDank2,
  classifySweepFile,
  loadMorningSweepSignals,
} from "../morning-sweep-2026-11-14-signals";

const REPO_ROOT = resolve(__dirname, "../../../../..");
const PRIMARY_TABLES = resolve(REPO_ROOT, "docs/data-sources/research/2026-11-14/morning-sweep-tables");
const FALLBACK_TABLES = resolve(REPO_ROOT, "docs/research/2026-11-14/full-tables");
const TABLES = existsSync(PRIMARY_TABLES) ? PRIMARY_TABLES : FALLBACK_TABLES;
const read = (name: string) => readFileSync(join(TABLES, name), "utf8");

describe("sample-shrinkage core (shrink n<20 toward season baseline)", () => {
  it("uses a pseudo-count of 20", () => {
    expect(SHRINK_PSEUDOCOUNT).toBe(20);
  });

  it("n=0 collapses fully to the season baseline", () => {
    const r = shrinkTowardBaseline(0.9, 0, 0.3);
    expect(r.shrunk).toBeCloseTo(0.3, 10);
    expect(r.weight).toBe(0);
    expect(r.smallSample).toBe(true);
  });

  it("a small sample (n<20) is pulled majority toward the baseline", () => {
    const r = shrinkTowardBaseline(0.8, 5, 0.3);
    // weight = 5/25 = 0.2 -> shrunk = 0.2*0.8 + 0.8*0.3 = 0.4
    expect(r.weight).toBeCloseTo(0.2, 10);
    expect(r.shrunk).toBeCloseTo(0.4, 10);
    expect(r.smallSample).toBe(true);
    expect(r.shrunk).toBeGreaterThan(0.3);
    expect(r.shrunk).toBeLessThan(0.8);
  });

  it("n=20 is the half-weight boundary and is NOT flagged small", () => {
    const r = shrinkTowardBaseline(0.8, 20, 0.3);
    expect(r.weight).toBeCloseTo(0.5, 10);
    expect(r.shrunk).toBeCloseTo(0.55, 10);
    expect(r.smallSample).toBe(false);
  });

  it("a large sample stays close to the observed rate", () => {
    const r = shrinkTowardBaseline(0.8, 200, 0.3);
    expect(r.weight).toBeCloseTo(200 / 220, 10);
    expect(r.shrunk).toBeCloseTo((200 * 0.8 + 20 * 0.3) / 220, 10);
    expect(r.smallSample).toBe(false);
  });

  it("is monotone in n: more samples move the estimate toward observed", () => {
    const lo = shrinkTowardBaseline(0.9, 3, 0.2).shrunk;
    const hi = shrinkTowardBaseline(0.9, 60, 0.2).shrunk;
    expect(hi).toBeGreaterThan(lo);
  });

  it("observed==baseline is a fixed point for any n", () => {
    for (const n of [0, 1, 19, 20, 100]) {
      expect(shrinkTowardBaseline(0.42, n, 0.42).shrunk).toBeCloseTo(0.42, 10);
    }
  });

  it("honours a custom pseudo-count", () => {
    const r = shrinkTowardBaseline(1, 10, 0, 10);
    expect(r.weight).toBeCloseTo(0.5, 10);
    expect(r.shrunk).toBeCloseTo(0.5, 10);
  });
});

describe("CSV parsing primitives", () => {
  it("parses CRLF rows and empty cells", () => {
    const rows = parseCsv("a,b,c\r\n1,,3\r\n4,5,6\r\n");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ a: "1", b: "", c: "3" });
    expect(rows[1]).toEqual({ a: "4", b: "5", c: "6" });
  });

  it("handles quoted fields with commas", () => {
    const rows = parseCsv('name,note\n"Dell, Tank",ok\n');
    expect(rows[0]!.name).toBe("Dell, Tank");
  });

  it("parseNum returns NaN for blank, number otherwise", () => {
    expect(parseNum("")).toBeNaN();
    expect(parseNum("3.5")).toBe(3.5);
    expect(parseNum("12")).toBe(12);
  });

  it("parsePercent strips the % sign", () => {
    expect(parsePercent("6.6%")).toBeCloseTo(6.6, 10);
    expect(parsePercent("")).toBeNaN();
  });
});

describe("sfdata QB EPA by defensive tier (2026 + 2025)", () => {
  it("shrinks each tier EPA toward the QB's overall EPA using tier_n", () => {
    const parsed = parseQbEpaByDefTier(read("sfdata-qb-epa-by-def-tier-2026.csv"), 2026);
    expect(parsed.season).toBe(2026);
    const purdy = parsed.qbs.find((q) => q.qb === "B.Purdy")!;
    expect(purdy).toBeTruthy();
    expect(purdy.ovrEpa).toBeCloseTo(0.31, 10);
    const elite = purdy.tiers.find((t) => t.tier === "elite")!;
    // elite_epa=0.06, elite_n=78, baseline=ovr_epa=0.31
    expect(elite.epa.observed).toBeCloseTo(0.06, 10);
    expect(elite.epa.n).toBe(78);
    expect(elite.epa.baseline).toBeCloseTo(0.31, 10);
    expect(elite.epa.shrunk).toBeCloseTo((78 * 0.06 + 20 * 0.31) / 98, 10);
  });

  it("skips tiers with a blank EPA (J.Allen good tier is empty)", () => {
    const parsed = parseQbEpaByDefTier(read("sfdata-qb-epa-by-def-tier-2026.csv"), 2026);
    const allen = parsed.qbs.find((q) => q.qb === "J.Allen")!;
    expect(allen.tiers.find((t) => t.tier === "good")).toBeUndefined();
    expect(allen.tiers.length).toBe(3);
  });

  it("parses the 2025 variant with the same schema", () => {
    const parsed = parseQbEpaByDefTier(read("sfdata-qb-epa-by-def-tier-2025.csv"), 2025);
    expect(parsed.season).toBe(2025);
    expect(parsed.qbs.length).toBeGreaterThan(30);
  });
});

describe("Gridiron matchup cards", () => {
  it("parses offense/defense metric pairs with ranks and values", () => {
    const rows = parseGridironMatchup(read("gridiron-matchup-buf-nyj-2026.csv"));
    expect(rows.length).toBeGreaterThan(10);
    const points = rows.find((r) => r.metric === "Points")!;
    expect(points.offenseTeam).toBe("BUF");
    expect(points.defenseTeam).toBe("NYJ");
    expect(points.offValue).toBeCloseTo(32.0, 10);
    expect(points.defAllowedValue).toBeCloseTo(24.8, 10);
    expect(points.offRank).toBe("1st");
  });
});

describe("Barrett Dank3 man/zone coverage", () => {
  it("shrinks man/zone rates toward the league mean baseline", () => {
    const rows = parseBarrettManZone(read("barrett-dank3-man-zone-teams-2026.csv"));
    expect(rows.length).toBe(10);
    const min = rows.find((r) => r.name === "Minnesota")!;
    expect(min.manPct.observed).toBeCloseTo(6.6, 10);
    expect(min.zonePct.observed).toBeCloseTo(86.0, 10);
    // baseline is the mean man_pct across the table; shrunk lies between obs and baseline
    expect(min.manPct.shrunk).toBeGreaterThanOrEqual(Math.min(6.6, min.manPct.baseline));
    expect(min.manPct.shrunk).toBeLessThanOrEqual(Math.max(6.6, min.manPct.baseline));
  });
});

describe("Dynatyze player cards (item/value)", () => {
  it("parses the key/value card into numeric fields", () => {
    const card = parseDynatyzeCard(read("dynatyze-allen-card-2026.csv"));
    expect(card.targets).toBe(58);
    expect(card.rec).toBe(40);
    expect(card.rec_yds).toBe(351);
  });
});

describe("jmthrive Texans Week 10 injury report", () => {
  it("parses practice participation and game status", () => {
    const rows = parseJmThriveInjury(read("jmthrive-texans-injury-report-week10-2026.csv"));
    expect(rows.length).toBe(16);
    const azeez = rows.find((r) => r.player === "Azeez Al-Shaair")!;
    expect(azeez.injury).toBe("GROIN/PERSONAL");
    expect(azeez.gameStatus).toBe("OUT");
    expect(azeez.wed).toBe("DNP");
    const tank = rows.find((r) => r.player === "Tank Dell")!;
    expect(tank.fri).toBe("FULL");
    expect(tank.gameStatus).toBe("");
  });
});

describe("FantasyPts TPRR", () => {
  it("shrinks TPRR toward the league mean using routes as the sample", () => {
    const rows = parseFantasyPtsTprr(read("fantasypts-tprr-player-details-2026.csv"));
    expect(rows.length).toBe(13);
    const puka = rows.find((r) => r.name === "Puka Nacua")!;
    expect(puka.tprr.observed).toBeCloseTo(0.39, 10);
    expect(puka.tprr.n).toBe(239);
    expect(puka.yprr).toBeCloseTo(2.99, 10);
    expect(puka.tprr.shrunk).toBeGreaterThan(0);
  });
});

describe("Barrett Dank2 team details (League Avg baseline)", () => {
  it("shrinks EPA/play toward the League Avg row using games as n", () => {
    const rows = parseBarrettDank2(read("barrett-dank2-team-details-partial-2026.csv"));
    const tb = rows.find((r) => r.name === "Tampa Bay")!;
    expect(tb.epaPerPlay.observed).toBeCloseTo(-0.241, 10);
    expect(tb.epaPerPlay.baseline).toBeCloseTo(0.018, 10);
    expect(tb.epaPerPlay.n).toBe(9);
    expect(tb.epaPerPlay.smallSample).toBe(true);
    // League Avg itself is not emitted as a team signal
    expect(rows.find((r) => r.name === "League Avg")).toBeUndefined();
  });
});

describe("63-file registry + integration", () => {
  it("classifies every named family", () => {
    expect(classifySweepFile("sfdata-qb-epa-by-def-tier-2026.csv")).toBe("qb-epa-by-def-tier");
    expect(classifySweepFile("gridiron-matchup-buf-nyj-2026.csv")).toBe("gridiron-matchup");
    expect(classifySweepFile("barrett-dank3-man-zone-teams-2026.csv")).toBe("barrett-man-zone");
    expect(classifySweepFile("dynatyze-allen-card-2026.csv")).toBe("dynatyze-card");
    expect(classifySweepFile("jmthrive-texans-injury-report-week10-2026.csv")).toBe("injury-report");
    expect(classifySweepFile("fantasypts-tprr-player-details-2026.csv")).toBe("fantasypts-tprr");
  });

  it("loads all 63 CSVs from the morning sweep into a typed bundle", () => {
    const files = readdirSync(TABLES).filter((f) => f.endsWith(".csv"));
    expect(files.length).toBe(63);
    const bundle = loadMorningSweepSignals((name) => read(name), files);
    expect(bundle.fileCount).toBe(63);
    expect(bundle.qbEpaByDefTier.length).toBe(2); // 2026 + 2025
    expect(bundle.gridironMatchups.length).toBe(12); // 12 matchup cards
    expect(bundle.injuryReports.length).toBeGreaterThanOrEqual(1);
    expect(bundle.familyCounts["qb-epa-by-def-tier"]).toBe(2);
    // every file is accounted for in the family census
    const total = Object.values(bundle.familyCounts).reduce((a, b) => a + b, 0);
    expect(total).toBe(63);
  });
});