import { describe, expect, it } from "vitest";
import { computeFamilyDiagnostics } from "../../evidence/family-diagnostics.js";
import { missing, real } from "../../evidence/types.js";
import { freshBundle } from "./fixtures.js";

describe("computeFamilyDiagnostics", () => {
  it("reports every family, measured or not", () => {
    const diags = computeFamilyDiagnostics(freshBundle());
    const names = diags.map((d) => d.family);
    expect(names).toEqual([
      "rest",
      "weather",
      "formEpa",
      "injuries",
      "coaching",
      "corpusTactical",
      "premisesAndEquations",
      "nflFarmPriors",
    ]);
  });

  it("carries a measured deviation in native units, not a log-odds delta", () => {
    const diags = computeFamilyDiagnostics(freshBundle());
    const rest = diags.find((d) => d.family === "rest");
    expect(rest?.status).toBe("REAL");
    // away 6 days, home 7 days -> -1 day
    expect(rest?.deviation).toBe(-1);
    expect(rest?.unit).toBe("days");
    // No fitted coefficient exists, so the log-odds contribution is zero even
    // though the deviation is real. This is the whole point: the deviation is
    // what a future fit would be fitted against.
    expect(rest?.delta).toBe(0);
    expect(rest?.emissionWeight).toBe(0);
  });

  it("computes the EPA matchup difference from both teams", () => {
    const diags = computeFamilyDiagnostics(freshBundle());
    const form = diags.find((d) => d.family === "formEpa");
    // home off -0.02 vs away def -0.01 -> -0.01
    // away off  0.01 vs home def 0.03 -> -0.02
    // deviation = -0.01 - (-0.02) = 0.01
    expect(form?.value).toBeCloseTo(-0.01, 6);
    expect(form?.reference).toBeCloseTo(-0.02, 6);
    expect(form?.deviation).toBeCloseTo(0.01, 6);
  });

  it("counts unavailable players per side", () => {
    const bundle = freshBundle({
      injuries: real(
        [
          { playerName: "A", team: "NYG", position: "WR", reportStatus: "Out", practiceStatus: null, primaryInjury: null },
          { playerName: "B", team: "NYG", position: "CB", reportStatus: "Doubtful", practiceStatus: null, primaryInjury: null },
          { playerName: "C", team: "WSH", position: "RB", reportStatus: "Questionable", practiceStatus: null, primaryInjury: null },
        ],
        "espn:injuries",
        "2026-11-12T20:00:00.000Z",
      ),
    });
    const inj = computeFamilyDiagnostics(bundle).find((d) => d.family === "injuries");
    expect(inj?.value).toBe(2);
    expect(inj?.reference).toBe(0);
    expect(inj?.deviation).toBe(2);
  });

  it("marks a family MISSING when its input is absent, never zero", () => {
    const bundle = freshBundle({ rest: missing("no rest data") });
    const rest = computeFamilyDiagnostics(bundle).find((d) => d.family === "rest");
    expect(rest?.status).toBe("MISSING");
    expect(rest?.value).toBeNull();
    expect(rest?.deviation).toBeNull();
  });

  it("keeps the two unwired families MISSING with a reason", () => {
    const diags = computeFamilyDiagnostics(freshBundle());
    for (const name of ["premisesAndEquations", "nflFarmPriors"]) {
      const d = diags.find((x) => x.family === name);
      expect(d?.status).toBe("MISSING");
      expect(d?.note.length).toBeGreaterThan(10);
    }
  });

  it("never emits a non-zero weight or delta", () => {
    for (const d of computeFamilyDiagnostics(freshBundle())) {
      expect(d.emissionWeight).toBe(0);
      expect(d.delta).toBe(0);
    }
  });
});
