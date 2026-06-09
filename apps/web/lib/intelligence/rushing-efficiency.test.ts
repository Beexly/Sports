import { describe, it, expect } from "vitest";
import { buildRushingEfficiency, loadRushingEfficiency } from "./rushing-efficiency";
import type { NgsRushingLine } from "@/lib/nflverse/next-gen-stats";

// pctStackedBox is a 0..1 fraction (NGS percent_attempts_gte_eight_defenders / 100),
// matching the real loader output — whole-number percents here would mask the threshold bug.
function rb(name: string, ryoePerAtt: number, rushAttempts: number, pctStackedBox = 0.15): NgsRushingLine {
  return { playerId: name, playerName: name, team: "ATL", rushAttempts, ryoePerAtt, efficiency: 4.0, pctStackedBox, avgTimeToLos: 2.9, expectedRushYards: null, rushPctOverExpected: null };
}

const RBS: NgsRushingLine[] = [
  rb("Bell Cow", 1.0, 250, 0.25),       // efficient + high volume + loaded boxes (>= 0.20)
  rb("Efficient Backup", 1.2, 80, 0.10), // efficient + low volume + light boxes (< 0.20)
  rb("Workhorse", -0.5, 240, 0.22),      // high volume + low efficiency
  rb("Limited Back", -0.8, 70, 0.12),    // low both
];

describe("buildRushingEfficiency", () => {
  const rows = buildRushingEfficiency(RBS);
  const byName = (n: string) => rows.find((r) => r.name === n)!;

  it("reads efficient + high-volume as a bell-cow", () => {
    expect(byName("Bell Cow").read).toBe("bell-cow");
  });

  it("reads efficient-on-light-volume as buy-low", () => {
    expect(byName("Efficient Backup").read).toBe("buy-low");
  });

  it("reads high-volume-low-efficiency as volume-dependent (a floor, not a fade)", () => {
    expect(byName("Workhorse").read).toBe("volume-dependent");
  });

  it("reads low-both as limited", () => {
    expect(byName("Limited Back").read).toBe("limited");
  });

  it("credits efficiency earned against loaded boxes, flags light-box efficiency", () => {
    expect(byName("Bell Cow").note).toContain("loaded boxes");
    expect(byName("Efficient Backup").note.toLowerCase()).toContain("regression");
  });

  it("leads with volume (the sticky signal)", () => {
    expect(rows[0]!.name).toBe("Bell Cow"); // 250 carries
    expect(rows[1]!.name).toBe("Workhorse"); // 240 carries
  });
});

describe("loadRushingEfficiency", () => {
  it("degrades to source-error when Next Gen is unreachable", async () => {
    const r = await loadRushingEfficiency({ fetcher: async () => { throw new Error("blocked"); } });
    expect(r.status).toBe("source-error");
    expect(r.rows).toEqual([]);
    expect(r.canPublishProjections).toBe(false);
  });
});
