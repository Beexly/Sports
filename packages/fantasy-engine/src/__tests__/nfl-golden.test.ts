import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyQb, computeQbTypes, mobilityReceipts, type QbSeason } from "../nfl/qb-types";
import {
  computeDefensiveLineIndex,
  computeOffensiveLineIndex,
  trenchMatchup,
  type TeamOffensiveLine,
} from "../nfl/trench";
import { computeWrSmash, type ReceiverSeason } from "../nfl/wr-smash";

/**
 * NFL golden-file verification against the validated clean-room reference
 * implementation's live 2025-season outputs.
 *
 * Fixture coverage varies by module and is stated per test: the QB table
 * carries everything needed for full classification golden-matching; the
 * trench table carries all O-line inputs (D-line inputs qbkd/hurries are not
 * exported by the reference, so the D-line side is verified structurally
 * plus formula-tested synthetically); the WR table exports only the display
 * columns, so WR SMASH is verified on structure, headline ordering, and the
 * documented missing-data deviation.
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

describe("QB-Types golden verification (45 QBs, 2025 live season)", () => {
  const rows = parseCsv("qb_types.csv");

  it("loads the full reference population", () => {
    expect(rows.length).toBe(45);
  });

  it("reproduces every classification except display-rounding boundary straddles (45/45)", () => {
    // The reference classified on UNROUNDED per-game rates; the fixture
    // stores 1dp. A rate within 0.05 of a threshold may straddle it.
    const nearThreshold = (att: number, yds: number): boolean =>
      Math.abs(att - 6) <= 0.05 ||
      Math.abs(att - 3.5) <= 0.05 ||
      Math.abs(yds - 32) <= 0.05 ||
      Math.abs(yds - 18) <= 0.05;

    const failures: string[] = [];
    rows.forEach((r) => {
      const att = Number(r["rush_att_pg"]);
      const yds = Number(r["rush_ypg"]);
      const got = classifyQb(att, yds);
      if (got !== r["qb_type"] && !nearThreshold(att, yds)) {
        failures.push(`${r["QB"]}: got ${got} ref ${r["qb_type"]}`);
      }
    });
    expect(failures).toEqual([]);
  });

  it("computes the mobility premium WITH receipts — live 2025: ≈ +5.0 FP/G, larger than the public +2–4 claim", () => {
    // Rebuild tier means from the fixture's own per-game numbers.
    const scores = rows.map((r) => ({
      id: r["QB"]!,
      type: r["qb_type"] as ReturnType<typeof classifyQb>,
      rushAttemptsPerGame: Number(r["rush_att_pg"]),
      rushYardsPerGame: Number(r["rush_ypg"]),
      fantasyPointsPerGame: Number(r["fp_pg"]),
      rushFantasyShare: Number(r["rush_fp_pct"]) / 100,
    }));
    const receipts = mobilityReceipts(scores);

    const byType = new Map(receipts.tiers.map((t) => [t.type, t]));
    expect(byType.get("Very Mobile/Running")!.count).toBe(7);
    expect(byType.get("Mobile")!.count).toBe(14);
    expect(byType.get("Pocket")!.count).toBe(24);
    expect(byType.get("Very Mobile/Running")!.meanFpPerGame).toBeCloseTo(18.2, 1);
    expect(byType.get("Pocket")!.meanFpPerGame).toBeCloseTo(13.2, 1);
    expect(receipts.premiumFpPerGame).toBeGreaterThan(4.5);
    expect(receipts.premiumFpPerGame).toBeLessThan(5.5);
  });

  it("derives per-game rates and rushing share from raw season lines", () => {
    const allen: QbSeason = {
      id: "allen",
      games: 16,
      passAttempts: 460,
      carries: 112, // 7.0/g
      rushingYards: 579, // 36.2/g
      rushingTds: 9,
      fantasyPoints: 364.8, // 22.8/g
    };
    const [s] = computeQbTypes([allen]);
    expect(s!.type).toBe("Very Mobile/Running");
    expect(s!.rushAttemptsPerGame).toBeCloseTo(7.0, 1);
    expect(s!.fantasyPointsPerGame).toBeCloseTo(22.8, 1);
    // 57.9 + 54 = 111.9 rushing FP of 364.8 total ≈ 31%
    expect(s!.rushFantasyShare).toBeCloseTo(0.307, 2);
  });

  it("classification thresholds are exact (public contract)", () => {
    expect(classifyQb(6, 0)).toBe("Very Mobile/Running");
    expect(classifyQb(0, 32)).toBe("Very Mobile/Running");
    expect(classifyQb(5.99, 31.99)).toBe("Mobile");
    expect(classifyQb(3.5, 0)).toBe("Mobile");
    expect(classifyQb(0, 18)).toBe("Mobile");
    expect(classifyQb(3.49, 17.99)).toBe("Pocket");
  });
});

describe("Trench SMASH golden verification (32 teams, 2025 live season)", () => {
  const rows = parseCsv("trench_smash.csv");
  const teams: TeamOffensiveLine[] = rows.map((r) => ({
    team: r["team"]!,
    pressurePct: Number(r["pressure_pct"]),
    sackRate: Number(r["sack_rate"]),
    pocketTime: Number(r["pocket_time"]),
    yardsBeforeContactPerAtt: Number(r["ybc_att"]),
  }));

  it("loads all 32 teams", () => {
    expect(teams.length).toBe(32);
  });

  it("reproduces every O-line index within rounded-input drift (32/32)", () => {
    const scores = computeOffensiveLineIndex(teams);

    // Teams whose 3dp-rounded inputs TIE with another team carry provable
    // percentile-rank drift (the reference ranked unrounded values; rounding
    // merges them into average-rank ties). Each stacked tie can move the
    // z-mapped index ~0.6; everyone else must sit tight. SEA is the live
    // example: three-way ties on both sack_rate (PIT/CIN) and pocket_time
    // (ATL/CAR).
    const tieCount = (i: number): number => {
      const cols: ReadonlyArray<keyof TeamOffensiveLine> = [
        "pressurePct",
        "sackRate",
        "pocketTime",
        "yardsBeforeContactPerAtt",
      ];
      let ties = 0;
      for (const col of cols) {
        if (teams.some((t, j) => j !== i && t[col] === teams[i]![col])) ties++;
      }
      return ties;
    };

    const failures: string[] = [];
    scores.forEach((s, i) => {
      const ref = Number(rows[i]!["OL_idx"]);
      const allowance = 0.25 + 0.6 * tieCount(i);
      if (Math.abs(s.index - ref) > allowance) {
        failures.push(`${s.team}: got ${s.index.toFixed(2)} ref ${ref} (allowance ${allowance})`);
      }
    });
    expect(failures).toEqual([]);
    // Measured distribution: 21/32 teams land within 0.07 (i.e. exact up to
    // the reference's own 1dp output rounding); the rest carry rank-tie drift.
    // Pin that the essentially-exact majority stays the majority.
    const diffs = scores.map((s, i) => Math.abs(s.index - Number(rows[i]!["OL_idx"])));
    expect(diffs.filter((d) => d <= 0.1).length / diffs.length).toBeGreaterThan(0.6);
  });

  it("reproduces the headline O-line board (Rams top; the dossier's leaders present)", () => {
    const scores = computeOffensiveLineIndex(teams);
    const sorted = [...scores].sort((a, b) => b.index - a.index);
    expect(sorted[0]!.team).toBe("LA");
    expect(sorted[0]!.index).toBeCloseTo(68.7, 0);
    const topSix = sorted.slice(0, 6).map((s) => s.team);
    for (const leader of ["LA", "DEN", "BUF"]) {
      expect(topSix).toContain(leader);
    }
  });

  it("D-line formula: weights and ordering behave on a synthetic league (fixture lacks qbkd/hurries inputs)", () => {
    const league = [
      { team: "STRONG", pressures: 200, sacks: 50, qbKnockdowns: 60, hurries: 90 },
      { team: "MID", pressures: 150, sacks: 38, qbKnockdowns: 45, hurries: 70 },
      { team: "WEAK", pressures: 100, sacks: 25, qbKnockdowns: 30, hurries: 50 },
    ];
    const scores = computeDefensiveLineIndex(league);
    expect(scores[0]!.index).toBeGreaterThan(scores[1]!.index);
    expect(scores[1]!.index).toBeGreaterThan(scores[2]!.index);
    // 50±10 scale: symmetric synthetic league centers on 50.
    expect(scores[1]!.index).toBeCloseTo(50, 5);
  });

  it("the matchup read is the signed index gap on the shared scale", () => {
    expect(trenchMatchup(68.7, 64.5)).toBeCloseTo(4.2, 10);
    expect(trenchMatchup(40, 60)).toBeCloseTo(-20, 10);
  });
});

describe("WR SMASH (160 pass-catchers, 2025 live season)", () => {
  const rows = parseCsv("wr_smash.csv");

  it("loads the full reference population", () => {
    expect(rows.length).toBe(160);
  });

  it("pins the reference headline board (Nacua 74.5 ELITE, JSN 70.2 ELITE)", () => {
    expect(rows[0]!["Player"]).toBe("Puka Nacua");
    expect(Number(rows[0]!["SMASH"])).toBeCloseTo(74.5, 1);
    expect(rows[0]!["tier"]).toBe("ELITE");
    expect(rows[1]!["Player"]).toBe("Jaxon Smith-Njigba");
    expect(Number(rows[1]!["SMASH"])).toBeCloseTo(70.2, 1);
  });

  it("DOCUMENTED DEVIATION: the reference tiers missing-advanced-stat rows AVOID; GSE rates them UNRATED", () => {
    // e.g. A.J. Brown's row has empty adot/yac_r/SMASH yet tier "AVOID" in the
    // reference output — missing PFR columns became a skill judgment. Our
    // port returns tier null for exactly this shape.
    const missingRows = rows.filter((r) => r["SMASH"] === "");
    expect(missingRows.length).toBeGreaterThan(0);
    expect(missingRows.every((r) => r["tier"] === "AVOID")).toBe(true);

    const population: ReceiverSeason[] = [
      {
        id: "complete",
        recYardsPerGame: 80,
        targetShare: 0.25,
        adot: 10,
        yacPerReception: 5,
        brokenTackles: 8,
        ratingWhenTargeted: 110,
        dropPercent: 3,
        receivingEpa: 40,
      },
      {
        id: "missing-advanced",
        recYardsPerGame: 66.9,
        targetShare: 0.24,
        adot: Number.NaN, // the A.J. Brown shape: raw stats fine, PFR merge missed
        yacPerReception: Number.NaN,
        brokenTackles: Number.NaN,
        ratingWhenTargeted: Number.NaN,
        dropPercent: Number.NaN,
        receivingEpa: 35,
      },
      {
        id: "floor",
        recYardsPerGame: 20,
        targetShare: 0.1,
        adot: 6,
        yacPerReception: 3,
        brokenTackles: 1,
        ratingWhenTargeted: 70,
        dropPercent: 9,
        receivingEpa: -5,
      },
    ];
    const scores = computeWrSmash(population);
    expect(Number.isNaN(scores[1]!.smash)).toBe(true);
    expect(scores[1]!.tier).toBeNull();
    // And the complete rows still score and tier normally.
    expect(scores[0]!.tier).not.toBeNull();
    expect(scores[0]!.smash).toBeGreaterThan(scores[2]!.smash);
  });

  it("weights favor volume + efficiency: same profile with higher yards/EPA scores higher", () => {
    const base: ReceiverSeason = {
      id: "base",
      recYardsPerGame: 60,
      targetShare: 0.2,
      adot: 9,
      yacPerReception: 4.5,
      brokenTackles: 5,
      ratingWhenTargeted: 95,
      dropPercent: 4,
      receivingEpa: 20,
    };
    const population: ReceiverSeason[] = [
      base,
      { ...base, id: "better", recYardsPerGame: 90, receivingEpa: 45 },
      { ...base, id: "droppy", dropPercent: 12 },
    ];
    const scores = computeWrSmash(population);
    const byId = new Map(scores.map((s) => [s.id, s]));
    expect(byId.get("better")!.smash).toBeGreaterThan(byId.get("base")!.smash);
    expect(byId.get("droppy")!.smash).toBeLessThan(byId.get("base")!.smash);
  });
});
