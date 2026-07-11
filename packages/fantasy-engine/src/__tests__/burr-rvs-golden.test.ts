import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeBurr, BURR_CATEGORIES, type TeamBullpenCategories } from "../mlb/burr";
import { computeRvs, relieverRole, type RelieverSeason } from "../mlb/rvs";

/**
 * GOLDEN-FILE verification for BURR and RVS against the validated clean-room
 * reference implementation's live 2026-season tables.
 *
 * Precision note (stated, not hidden): the fixtures store the reference
 * engine's inputs ROUNDED for display (3dp categories, 1dp K−BB%, whole-pct
 * reliability), while the reference computed from unrounded values. Ratios
 * over 3dp-rounded categories bound the BURR drift at well under 0.01; the
 * RVS percentile ranks can flip on display-rounding near-ties, which the
 * tolerance and the ≥-share assertions below account for explicitly.
 */

function parseCsv(file: string): Array<Record<string, string>> {
  const raw = readFileSync(resolve(__dirname, "fixtures", file), "utf8").trim();
  const [header, ...lines] = raw.split("\n");
  const cols = header!.split(",");
  return lines.map((line) => {
    const fields = line.split(",");
    const row: Record<string, string> = {};
    cols.forEach((c, i) => {
      row[c] = fields[i]!;
    });
    return row;
  });
}

describe("BURR golden-file verification (30 team bullpens, 2026 live season)", () => {
  const rows = parseCsv("burr_table.csv");
  const teams: TeamBullpenCategories[] = rows.map((r) => ({
    team: r["team"]!,
    era: Number(r["ERA"]),
    fip: Number(r["FIP"]),
    kPct: Number(r["Kpct"]),
    bbPct: Number(r["BBpct"]),
    kMinusBb: Number(r["KmBB"]),
    hrPer9: Number(r["HR9"]),
    whip: Number(r["WHIP"]),
    lob: Number(r["LOB"]),
    inheritedStrandRate: r["IRstr"] === "" ? null : Number(r["IRstr"]),
    saveConversion: r["svconv"] === "" ? null : Number(r["svconv"]),
    goAo: Number(r["GOAO"]),
    xwobaAllowed: Number(r["xwoba_a"]),
    barrelAllowed: Number(r["barrel_a"]),
    hardHitAllowed: Number(r["hard_a"]),
  }));

  it("loads all 30 teams and the 14 public categories sum to the pinned weight total", () => {
    expect(teams.length).toBe(30);
    expect(BURR_CATEGORIES.length).toBe(14);
    expect(BURR_CATEGORIES.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(14.5, 10);
  });

  it("reproduces every team's BURR within rounded-input drift (30/30)", () => {
    const scores = computeBurr(teams);
    const failures: string[] = [];
    scores.forEach((s, i) => {
      const ref = Number(rows[i]!["BURR"]);
      if (Math.abs(s.burr - ref) > 0.01) {
        failures.push(`${s.team}: got ${s.burr.toFixed(4)} ref ${ref}`);
      }
    });
    expect(failures).toEqual([]);
  });

  it("reproduces the strength ordering (ATL strongest, WSH weakest; display-precision ties may swap)", () => {
    const scores = computeBurr(teams);
    const byRank = [...scores].sort((a, b) => a.rank - b.rank);
    expect(byRank[0]!.team).toBe("ATL");
    expect(byRank[0]!.burr).toBeCloseTo(1.205, 2);
    expect(byRank[byRank.length - 1]!.team).toBe("WSH");

    // Reference ranks are 1..30 in fixture order (already sorted desc). A team
    // whose reference BURR sits within the rounded-input drift bound of a
    // neighbor (e.g. the KC 0.880 / CIN 0.879 / CWS 0.879 three-way tie) may
    // legitimately swap with that neighbor; everyone else must match exactly.
    const DRIFT = 0.01;
    const refBurr = rows.map((r) => Number(r["BURR"]));
    const rankFailures: string[] = [];
    scores.forEach((s, i) => {
      const refRank = Number(rows[i]!["rank"]);
      const nearTie =
        (i > 0 && Math.abs(refBurr[i]! - refBurr[i - 1]!) <= DRIFT) ||
        (i < refBurr.length - 1 && Math.abs(refBurr[i]! - refBurr[i + 1]!) <= DRIFT);
      const allowed = nearTie ? 2 : 0;
      if (Math.abs(s.rank - refRank) > allowed) {
        rankFailures.push(`${s.team}: rank ${s.rank} ref ${refRank}`);
      }
    });
    expect(rankFailures).toEqual([]);
  });

  it("exposes all 14 component indices (the glass-box breakdown)", () => {
    const scores = computeBurr(teams);
    for (const s of scores) {
      expect(Object.keys(s.components).length).toBe(14);
      for (const v of Object.values(s.components)) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("a missing category contributes a NEUTRAL 1.0, never a reward or penalty", () => {
    const scores = computeBurr([
      { ...teams[0]!, team: "X", saveConversion: null },
      ...teams.slice(1),
    ]);
    expect(scores[0]!.components.saveConversion).toBe(1.0);
  });
});

describe("RVS golden-file verification (311 relievers, 2026 live season)", () => {
  const rows = parseCsv("solds_table.csv");
  const population: RelieverSeason[] = rows.map((r, i) => ({
    id: `${r["name"]}#${i}`,
    gamesPitched: Number(r["GP"]),
    saves: Number(r["SV"]),
    holds: Number(r["HLD"]),
    blownSaves: Number(r["BS"]),
    // SVO is not in the output table; role golden-matching is therefore
    // partial (see the role tests) and RVS does not consume SVO.
    saveOpportunities: Number(r["SV"]) + Number(r["BS"]),
    kMinusBb: Number(r["KmBB"]) / 100, // stored ×100, 1dp
    fip: Number(r["FIP"]), // stored 2dp
  }));

  it("loads the full reference population", () => {
    expect(population.length).toBe(311);
  });

  it("reproduces the reference RVS across the population (display-rounded inputs)", () => {
    const scores = computeRvs(population);
    const diffs = scores.map((s, i) => Math.abs(s.rvs - Number(rows[i]!["RVS"])));
    const within01 = diffs.filter((d) => d <= 0.1).length;
    const max = Math.max(...diffs);
    // Near-tie rank flips from display rounding bound the tail; the bulk must
    // match tightly and nothing may drift beyond a third of an RVS point.
    expect(within01 / diffs.length).toBeGreaterThan(0.9);
    expect(max).toBeLessThan(0.35);
  });

  it("pins the season's headline board (Mason Miller on top)", () => {
    const scores = computeRvs(population);
    expect(rows[0]!["name"]).toBe("Mason Miller");
    expect(scores[0]!.rvs).toBeCloseTo(99.6, 0);
    expect(scores[0]!.role).toBe("Closer");
    expect(scores[0]!.solds).toBe(23);
  });

  it("Solds and Solds% reproduce exactly (they are pure arithmetic)", () => {
    const scores = computeRvs(population);
    const failures: string[] = [];
    scores.forEach((s, i) => {
      const refSolds = Number(rows[i]!["Solds"]);
      if (s.solds !== refSolds) failures.push(`${s.id}: solds ${s.solds} ref ${refSolds}`);
      const refPct = rows[i]!["Solds_pct"];
      if (refPct !== "" && s.soldsPct !== null) {
        if (Math.abs(s.soldsPct * 100 - Number(refPct)) > 0.5) {
          failures.push(`${s.id}: solds% ${(s.soldsPct * 100).toFixed(1)} ref ${refPct}`);
        }
      }
    });
    expect(failures).toEqual([]);
  });

  it("role rules match the public contract (SVO-dependent branches synthetic-tested)", () => {
    expect(relieverRole({ saves: 3, holds: 0, saveOpportunities: 3 })).toBe("Closer");
    expect(relieverRole({ saves: 2, holds: 1, saveOpportunities: 5 })).toBe("Closer");
    expect(relieverRole({ saves: 1, holds: 4, saveOpportunities: 2 })).toBe("Committee/9th");
    expect(relieverRole({ saves: 0, holds: 5, saveOpportunities: 0 })).toBe("Setup (high-lev)");
    expect(relieverRole({ saves: 0, holds: 1, saveOpportunities: 0 })).toBe("Middle/Hold");
    expect(relieverRole({ saves: 0, holds: 0, saveOpportunities: 0 })).toBe("Low-leverage");
    // Every fixture reliever with SV≥3 must be a Closer under the same rules
    // the reference used.
    rows.forEach((r) => {
      if (Number(r["SV"]) >= 3) expect(r["role"]).toBe("Closer");
    });
  });

  it("a no-chances reliever gets the population-median reliability, never a free 100%", () => {
    const tiny: RelieverSeason[] = [
      { id: "a", gamesPitched: 10, saves: 5, holds: 0, blownSaves: 5, saveOpportunities: 10, kMinusBb: 0.1, fip: 4 },
      { id: "b", gamesPitched: 10, saves: 0, holds: 0, blownSaves: 0, saveOpportunities: 0, kMinusBb: 0.2, fip: 3 },
    ];
    const scores = computeRvs(tiny);
    expect(scores[1]!.soldsPct).toBeNull();
    // b's reliability contribution used the median (0.5 from a), not 1.0:
    // RVS(b) = 100·(0.55·pct(vol=0) + 0.25·skill(=1.0) + 0.20·0.5)
    expect(scores[1]!.rvs).toBeCloseTo(100 * (0.55 * 0.5 + 0.25 * 1.0 + 0.2 * 0.5), 5);
  });
});
