import { describe, expect, it } from "vitest";
import {
  countThreeCycles, transitivityDiagnostic, sampleDiagnostic, ratingsLicenseChecklist,
  GSE_RATINGS_LICENSE_ENFORCED,
} from "./ratings-license-checklist-2312.js";

const transitive = {
  teams: ["A", "B", "C"],
  wins: [[0, 2, 2], [0, 0, 2], [0, 0, 0]],
};
const rockPaper = {
  teams: ["A", "B", "C"],
  wins: [[0, 0, 2], [2, 0, 0], [0, 2, 0]], // A>B, B>C, C>A
};

describe("ratings license checklist", () => {
  it("counts 3-cycles", () => {
    expect(countThreeCycles(transitive)).toBe(0);
    expect(countThreeCycles(rockPaper)).toBe(1);
  });
  it("flags full intransitivity", () => {
    const d = transitivityDiagnostic(rockPaper);
    expect(d.passed).toBe(false);
    expect(d.check).toBe("transitivity");
  });
  it("flags thin-sample teams", () => {
    const d = sampleDiagnostic({ teams: ["A", "B"], wins: [[0, 1], [0, 0]] });
    expect(d.passed).toBe(false);
  });
  it("licenses only when every check passes", () => {
    const ok = {
      teams: ["A", "B", "C"],
      wins: [[0, 6, 6], [0, 0, 6], [0, 0, 0]],
    };
    expect(ratingsLicenseChecklist(ok).licensed).toBe(true);
    expect(ratingsLicenseChecklist(transitive).licensed).toBe(false); // thin samples
  });
  it("stays advisory until the held-out gate clears", () => {
    expect(GSE_RATINGS_LICENSE_ENFORCED).toBe(false);
  });
  it("handles empty input", () => {
    const m = { teams: [], wins: [] as number[][] };
    expect(countThreeCycles(m)).toBe(0);
    const c = ratingsLicenseChecklist(m);
    expect(c.findings).toHaveLength(2);
    // vacuous pass on empties: no cycles, no thin teams
    expect(c.licensed).toBe(true);
  });
  it("handles edge inputs", () => {
    // single team: no triples possible
    const solo = { teams: ["KC"], wins: [[0]] };
    expect(countThreeCycles(solo)).toBe(0);
    expect(transitivityDiagnostic(solo).passed).toBe(true);
    // ragged matrix rows do not throw
    const ragged = { teams: ["A", "B"], wins: [[0], [1, 0]] };
    expect(countThreeCycles(ragged)).toBe(0);
  });
});

