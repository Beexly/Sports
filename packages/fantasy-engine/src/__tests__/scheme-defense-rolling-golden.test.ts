import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { schemeLabel, topShare, SCHEME_THRESHOLDS, type TeamSchemeTendencies } from "../nfl/scheme";
import { computeTeamDefense, type TeamDefenseCategories } from "../nfl/defense";
import { computeFormDeltas, proeShiftRead, type TeamWindowAggregates } from "../nfl/rolling";

/**
 * GOLDEN-FILE verification for the coaching/scheme labels, team-defense
 * indices, and rolling-form deltas against the validated clean-room reference
 * implementation's live 2025 outputs (32 teams each).
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

describe("Coaching/Scheme golden verification (32 teams, 2025 live season)", () => {
  const rows = parseCsv("scheme_coaching.csv");
  const teams: TeamSchemeTendencies[] = rows.map((r) => ({
    team: r["team"]!,
    playsPerGame: Number(r["plays_pg"]),
    proe: Number(r["PROE"]),
    rbBellcowShare: Number(r["rb_bellcow"]),
    wr1TargetShare: Number(r["wr_funnel"]),
  }));

  it("loads all 32 teams", () => {
    expect(teams.length).toBe(32);
  });

  it("reproduces every scheme label verbatim (32/32)", () => {
    const failures: string[] = [];
    teams.forEach((t, i) => {
      const got = schemeLabel(t);
      const ref = rows[i]!["scheme"]!;
      if (got !== ref) failures.push(`${t.team}: got "${got}" ref "${ref}"`);
    });
    expect(failures).toEqual([]);
  });

  it("pins the headline reads (KC most pass-happy; BAL run-heavy bellcow)", () => {
    // Fixture is sorted by PROE descending.
    expect(rows[0]!["team"]).toBe("KC");
    expect(Number(rows[0]!["PROE"])).toBeCloseTo(4.6, 1);
    const bal = rows.find((r) => r["team"] === "BAL")!;
    expect(Number(bal["PROE"])).toBeCloseTo(-8.2, 1);
    expect(bal["scheme"]).toContain("RUN-heavy");
    expect(bal["scheme"]).toContain("bellcow-RB");
  });

  it("topShare concentrates correctly and refuses a zero denominator", () => {
    expect(topShare([180, 60, 40, 20])).toBeCloseTo(0.6, 10);
    expect(Number.isNaN(topShare([0, 0]))).toBe(true);
    expect(Number.isNaN(topShare([]))).toBe(true);
  });

  it("labeling thresholds are the public contract", () => {
    const base = { team: "X", playsPerGame: 62, proe: 0, rbBellcowShare: 0.55, wr1TargetShare: 0.2 };
    expect(schemeLabel({ ...base, proe: 2.01 })).toContain("PASS-heavy");
    expect(schemeLabel({ ...base, proe: -2.01 })).toContain("RUN-heavy");
    expect(schemeLabel(base)).toContain("balanced");
    expect(schemeLabel({ ...base, playsPerGame: SCHEME_THRESHOLDS.fastPace })).toContain("fast");
    expect(schemeLabel({ ...base, playsPerGame: SCHEME_THRESHOLDS.slowPace })).toContain("slow");
    expect(schemeLabel({ ...base, rbBellcowShare: 0.62 })).toContain("bellcow-RB");
    expect(schemeLabel({ ...base, rbBellcowShare: 0.49 })).toContain("committee-RB");
    expect(schemeLabel({ ...base, wr1TargetShare: 0.26 })).toContain("WR1-funnel");
  });
});

describe("Team Defense golden verification (32 teams, 2025 live season)", () => {
  const rows = parseCsv("team_defense.csv");
  const teams: TeamDefenseCategories[] = rows.map((r) => ({
    team: r["team"]!,
    passEpaAllowed: Number(r["pass_epa_allowed"]),
    rushEpaAllowed: Number(r["rush_epa_allowed"]),
    rushSuccessRateAllowed: Number(r["rush_sr_allowed"]),
    epaPerPlayAllowed: Number(r["epa_play_allowed"]),
    coverageCompletionPct: Number(r["cov_cmp_pct"]),
    coverageRating: Number(r["cov_rat"]),
    pressures: Number(r["prss"]),
  }));

  // Display-rounding rank ties get a drift allowance (same discipline as the
  // trench golden test): each tied component can shift the z-mapped index.
  function tieCount(i: number, keys: ReadonlyArray<keyof TeamDefenseCategories>): number {
    let ties = 0;
    for (const k of keys) {
      if (teams.some((t, j) => j !== i && t[k] === teams[i]![k])) ties++;
    }
    return ties;
  }

  it("loads all 32 teams", () => {
    expect(teams.length).toBe(32);
  });

  it("reproduces the pass-defense index within rounded-input drift (32/32)", () => {
    const scores = computeTeamDefense(teams);
    const keys: ReadonlyArray<keyof TeamDefenseCategories> = [
      "passEpaAllowed",
      "coverageRating",
      "coverageCompletionPct",
      "pressures",
    ];
    const failures: string[] = [];
    scores.forEach((s, i) => {
      const ref = Number(rows[i]!["passD_idx"]);
      const allowance = 0.25 + 0.7 * tieCount(i, keys);
      if (Math.abs(s.passDefenseIndex - ref) > allowance) {
        failures.push(`${s.team}: got ${s.passDefenseIndex.toFixed(2)} ref ${ref}`);
      }
    });
    expect(failures).toEqual([]);
  });

  it("reproduces the rush-defense index within rounded-input drift (32/32)", () => {
    const scores = computeTeamDefense(teams);
    const keys: ReadonlyArray<keyof TeamDefenseCategories> = [
      "rushEpaAllowed",
      "rushSuccessRateAllowed",
    ];
    const failures: string[] = [];
    scores.forEach((s, i) => {
      const ref = Number(rows[i]!["rushD_idx"]);
      const allowance = 0.25 + 0.7 * tieCount(i, keys);
      if (Math.abs(s.rushDefenseIndex - ref) > allowance) {
        failures.push(`${s.team}: got ${s.rushDefenseIndex.toFixed(2)} ref ${ref}`);
      }
    });
    expect(failures).toEqual([]);
  });

  it("reproduces the overall index within rounded-input drift (32/32)", () => {
    const scores = computeTeamDefense(teams);
    const failures: string[] = [];
    scores.forEach((s, i) => {
      const ref = Number(rows[i]!["DEF_idx"]);
      const allowance = 0.25 + 0.7 * tieCount(i, ["epaPerPlayAllowed"]);
      if (Math.abs(s.overallIndex - ref) > allowance) {
        failures.push(`${s.team}: got ${s.overallIndex.toFixed(2)} ref ${ref}`);
      }
    });
    expect(failures).toEqual([]);
  });

  it("pins the dossier headline: Seattle #1 overall and #1 run defense (−0.207 EPA/rush)", () => {
    // Fixture is sorted by DEF_idx descending.
    expect(rows[0]!["team"]).toBe("SEA");
    const sea = teams[0]!;
    expect(sea.rushEpaAllowed).toBeCloseTo(-0.207, 3);
    const scores = computeTeamDefense(teams);
    const best = [...scores].sort((a, b) => b.rushDefenseIndex - a.rushDefenseIndex)[0]!;
    expect(best.team).toBe("SEA");
  });
});

describe("Rolling windows golden verification (32 teams, 2025 live season)", () => {
  const rows = parseCsv("rolling_form.csv");
  // First column is the unnamed team index from the reference export.
  const teamKey = Object.keys(rows[0]!)[0]!;
  const teams: TeamWindowAggregates[] = rows.map((r) => ({
    team: r[teamKey]!,
    season: {
      playsPerGame: Number(r["plays_pg_season"]),
      proe: Number(r["PROE_season"]),
      offEpaPerPlay: Number(r["off_epa_season"]),
    },
    recent: {
      playsPerGame: Number(r["plays_pg_L4W"]),
      proe: Number(r["PROE_L4W"]),
      offEpaPerPlay: Number(r["off_epa_L4W"]),
    },
  }));

  it("loads all 32 teams", () => {
    expect(teams.length).toBe(32);
  });

  it("reproduces every PROE and pace delta (32/32, exact to fixture rounding)", () => {
    const deltas = computeFormDeltas(teams);
    const failures: string[] = [];
    deltas.forEach((d, i) => {
      const refProe = Number(rows[i]!["PROE_delta"]);
      const refPace = Number(rows[i]!["pace_delta"]);
      // Fixture inputs are 2dp, deltas 1dp-or-2dp — allow the compound rounding.
      if (Math.abs(d.proeDelta - refProe) > 0.06) {
        failures.push(`${d.team}: PROEΔ got ${d.proeDelta.toFixed(2)} ref ${refProe}`);
      }
      if (Math.abs(d.paceDelta - refPace) > 0.06) {
        failures.push(`${d.team}: paceΔ got ${d.paceDelta.toFixed(2)} ref ${refPace}`);
      }
    });
    expect(failures).toEqual([]);
  });

  it("pins the dossier headline: Baltimore's hidden late-season run-lean (−8.2 season → −18.8 L4W)", () => {
    const bal = teams.find((t) => t.team === "BAL")!;
    expect(bal.season.proe).toBeCloseTo(-8.18, 2);
    expect(bal.recent.proe).toBeCloseTo(-18.75, 2); // the dossier's "−18.8" at 1dp
    const [delta] = computeFormDeltas([bal]);
    expect(delta!.proeDelta).toBeCloseTo(-10.6, 1);
    expect(proeShiftRead(delta!.proeDelta)).toBe("leaning heavier to the run");
  });

  it("the shift read respects the public materiality threshold", () => {
    expect(proeShiftRead(3)).toBe("leaning heavier to the pass");
    expect(proeShiftRead(-3)).toBe("leaning heavier to the run");
    expect(proeShiftRead(2.9)).toBe("no meaningful shift");
    expect(proeShiftRead(Number.NaN)).toBe("no meaningful shift");
  });
});
