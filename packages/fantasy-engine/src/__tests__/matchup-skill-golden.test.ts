import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  computeHitterMsi,
  computePitcherMsi,
  msiTier,
  type HitterSkillInput,
} from "../mlb/matchup-skill";
import { matchupXwoba, matchupEdge, platoonAdjustedMatchup, staffXwobaAllowed } from "../mlb/advantage";
import { mean } from "../core/stats";

/**
 * GOLDEN-FILE verification: the TypeScript port must reproduce the validated
 * clean-room reference implementation's live-season outputs ROW FOR ROW.
 *
 * The fixtures are the reference engine's actual output tables over the 2026
 * MLB season (463 hitters, 337 pitchers): input columns AND the reference
 * MSI/tier outputs. The scored population is exactly the fixture rows, so
 * the port's population z-scores must land within display rounding (the
 * reference rounds to 1 decimal) of every reference score. This is the
 * glass-box promise made executable: anyone can re-run the math and get the
 * same numbers.
 */

interface GoldenRow extends HitterSkillInput {
  readonly name: string;
  readonly refMsi: number;
  readonly refTier: string;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function loadGolden(file: string, hasTeam: boolean): GoldenRow[] {
  const raw = readFileSync(resolve(__dirname, "fixtures", file), "utf8").trim();
  const [header, ...lines] = raw.split("\n");
  const cols = parseCsvLine(header!);
  const idx = (name: string): number => {
    const i = cols.indexOf(name);
    if (i === -1) throw new Error(`fixture ${file}: missing column ${name}`);
    return i;
  };
  const nameI = idx("name");
  const xwobaI = idx("xwoba");
  const barrelI = idx("barrel_batted_rate");
  const hardI = idx("hard_hit_percent");
  const kI = idx("k_percent");
  const bbI = idx("bb_percent");
  const whiffI = idx("whiff_percent");
  const msiI = idx("MSI");
  const tierI = idx("tier");
  void hasTeam;

  return lines.map((line) => {
    const f = parseCsvLine(line);
    return {
      name: f[nameI]!,
      xwoba: Number(f[xwobaI]),
      barrelBattedRate: Number(f[barrelI]),
      hardHitPercent: Number(f[hardI]),
      kPercent: Number(f[kI]),
      bbPercent: Number(f[bbI]),
      whiffPercent: Number(f[whiffI]),
      refMsi: Number(f[msiI]),
      refTier: f[tierI]!,
    };
  });
}

// Reference rounds to 1dp; allow rounding + float-order drift.
const TOLERANCE = 0.06;

describe("MSI golden-file verification (2026 live-season reference outputs)", () => {
  const hitters = loadGolden("msi_hitters.csv", false);
  const pitchers = loadGolden("msi_pitchers.csv", true);

  it("loads the full reference populations", () => {
    expect(hitters.length).toBe(463);
    expect(pitchers.length).toBe(337);
  });

  it("reproduces every hitter MSI within display rounding (463/463)", () => {
    const scores = computeHitterMsi(hitters);
    const failures: string[] = [];
    scores.forEach((s, i) => {
      if (Math.abs(s.msi - hitters[i]!.refMsi) > TOLERANCE) {
        failures.push(`${hitters[i]!.name}: got ${s.msi.toFixed(3)} ref ${hitters[i]!.refMsi}`);
      }
    });
    expect(failures).toEqual([]);
  });

  it("reproduces every pitcher MSI within display rounding (337/337)", () => {
    const scores = computePitcherMsi(pitchers);
    const failures: string[] = [];
    scores.forEach((s, i) => {
      if (Math.abs(s.msi - pitchers[i]!.refMsi) > TOLERANCE) {
        failures.push(`${pitchers[i]!.name}: got ${s.msi.toFixed(3)} ref ${pitchers[i]!.refMsi}`);
      }
    });
    expect(failures).toEqual([]);
  });

  it("reproduces every tier assignment except display-rounding boundary straddles", () => {
    // The reference tiers off the UNROUNDED score; a score within TOLERANCE of
    // a boundary can legitimately straddle it after rounding. Everything else
    // must match exactly.
    const boundaries = [63, 56, 44, 37];
    const nearBoundary = (v: number): boolean =>
      boundaries.some((b) => Math.abs(v - b) <= TOLERANCE);

    const scores = computeHitterMsi(hitters);
    const failures: string[] = [];
    scores.forEach((s, i) => {
      if (s.tier !== hitters[i]!.refTier && !nearBoundary(s.msi)) {
        failures.push(`${hitters[i]!.name}: got ${s.tier} ref ${hitters[i]!.refTier}`);
      }
    });
    expect(failures).toEqual([]);
  });

  it("pins the season's headline results (the numbers the dossier reported)", () => {
    const scores = computeHitterMsi(hitters);
    const byName = new Map(hitters.map((h, i) => [h.name, scores[i]!]));

    const alvarez = byName.get("Alvarez, Yordan")!;
    expect(alvarez.msi).toBeCloseTo(71.2, 1);
    expect(alvarez.tier).toBe("ELITE");

    const pScores = computePitcherMsi(pitchers);
    const pByName = new Map(pitchers.map((p, i) => [p.name, pScores[i]!]));
    const miller = pByName.get("Miller, Mason")!;
    expect(miller.msi).toBeCloseTo(81.3, 1);
    expect(miller.tier).toBe("ELITE");
  });

  it("computes the Log5 Advantage on the fixture league (Soto vs Mason Miller = strong pitcher edge)", () => {
    const leagueXwoba = mean(hitters.map((h) => h.xwoba));
    const soto = hitters.find((h) => h.name === "Soto, Juan")!;
    const miller = pitchers.find((p) => p.name === "Miller, Mason")!;

    const expected = matchupXwoba(soto.xwoba, miller.xwoba, leagueXwoba);
    // .434 × .177 / lg(≈.309) ≈ .249 — far below the league line.
    expect(expected).toBeGreaterThan(0.2);
    expect(expected).toBeLessThan(0.27);
    expect(matchupEdge(expected, leagueXwoba)).toBe("PITCHER");
  });

  it("platoon adjustment scales by the split ratio and degrades safely without splits", () => {
    // Soto 2026 verified splits: .855 OPS vs LHP, 1.069 vs RHP.
    const base = 0.3;
    expect(platoonAdjustedMatchup(base, 0.855, 0.962)).toBeCloseTo(0.3 * (0.855 / 0.962), 10);
    expect(platoonAdjustedMatchup(base, null, 0.962)).toBe(base);
    expect(platoonAdjustedMatchup(base, 0.855, null)).toBe(base);
  });

  it("staff xwOBA-allowed is exposure-weighted", () => {
    const staff = [
      { xwobaAllowed: 0.3, battersFaced: 300 },
      { xwobaAllowed: 0.24, battersFaced: 100 },
    ];
    expect(staffXwobaAllowed(staff)).toBeCloseTo((0.3 * 300 + 0.24 * 100) / 400, 10);
  });

  it("missing inputs surface as UNRATED (tier null), never the worst tier (Codex on PR #90)", () => {
    const population: HitterSkillInput[] = [
      hitters[0]!,
      hitters[1]!,
      { ...hitters[2]!, xwoba: Number.NaN },
    ];
    const scores = computeHitterMsi(population);
    expect(Number.isNaN(scores[2]!.msi)).toBe(true);
    expect(scores[2]!.tier).toBeNull();
    // And the tier function itself refuses non-finite scores.
    expect(() => msiTier(Number.NaN)).toThrow();
  });

  it("matchupEdge treats a missing/zero league baseline as NEUTRAL, never a universal hitter edge (Codex on PR #90)", () => {
    expect(matchupEdge(0.32, 0)).toBe("NEUTRAL");
    expect(matchupEdge(0.32, -0.1)).toBe("NEUTRAL");
    expect(matchupEdge(0.32, Number.NaN)).toBe("NEUTRAL");
  });

  it("tier boundaries are exact (public contract)", () => {
    expect(msiTier(63)).toBe("ELITE");
    expect(msiTier(62.999)).toBe("GREEN");
    expect(msiTier(56)).toBe("GREEN");
    expect(msiTier(55.999)).toBe("WHITE");
    expect(msiTier(44)).toBe("WHITE");
    expect(msiTier(43.999)).toBe("RED");
    expect(msiTier(37)).toBe("RED");
    expect(msiTier(36.999)).toBe("AVOID");
  });
});
