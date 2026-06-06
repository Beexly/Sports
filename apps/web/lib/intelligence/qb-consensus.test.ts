import { describe, it, expect } from "vitest";
import { normName, percentileRanks, buildQbConsensus, loadQbConsensus } from "./qb-consensus";
import type { QbrRow } from "@/lib/nflverse/qbr";
import type { NgsPassingLine } from "@/lib/nflverse/next-gen-stats";

function qbr(name: string, q: number, team = "KC"): QbrRow {
  return { playerId: name, name, team, games: 10, plays: 400, qbr: q, epaTotal: 0, ptsAdded: 0 };
}
function ngs(name: string, cpoe: number, team = "KC"): NgsPassingLine {
  return { playerId: name, playerName: name, team, attempts: 300, cpoe, completionPct: 67, expectedCompletionPct: 65, avgTimeToThrow: 2.7, aggressiveness: 16, passerRating: 95 };
}

describe("normName", () => {
  it("strips case, punctuation, and suffixes for cross-source joins", () => {
    expect(normName("Patrick Mahomes II.")).toBe("patrick mahomes");
    expect(normName("A.J. Brown Jr")).toBe("aj brown");
  });
});

describe("percentileRanks", () => {
  it("returns midrank percentiles in 0-100", () => {
    expect(percentileRanks([10, 20, 30])).toEqual([16.7, 50, 83.3]);
    expect(percentileRanks([])).toEqual([]);
  });
});

describe("buildQbConsensus", () => {
  const QBR = [qbr("Alpha QB", 80), qbr("Beta QB", 75), qbr("Gamma QB", 40), qbr("Delta QB", 60)];
  const NGS = [ngs("Alpha QB", 5.0), ngs("Beta QB", 0.5), ngs("Gamma QB", 4.5), ngs("Echo QB", 3.0)];
  const rows = buildQbConsensus(QBR, NGS);
  const byName = (n: string) => rows.find((r) => r.name === n)!;

  it("ranks aligned, two-source QBs at the top with full agreement", () => {
    expect(rows[0]?.name).toBe("Alpha QB");
    expect(byName("Alpha QB").divergence).toBe("aligned");
    expect(byName("Alpha QB").agreement).toBe(1);
  });

  it("flags results-over-accuracy when QBR outruns CPOE", () => {
    expect(byName("Beta QB").divergence).toBe("results-over-accuracy");
    expect(byName("Beta QB").agreement).toBe(0.5);
  });

  it("flags accuracy-over-results when CPOE outruns QBR", () => {
    expect(byName("Gamma QB").divergence).toBe("accuracy-over-results");
  });

  it("treats QBs present in only one source as single-source (no agreement)", () => {
    expect(byName("Delta QB").divergence).toBe("single-source");
    expect(byName("Delta QB").agreement).toBeNull();
    expect(byName("Delta QB").cpoe).toBeNull();
    expect(byName("Echo QB").qbr).toBeNull();
  });

  it("never averages disagreement away silently — it labels it", () => {
    expect(rows.every((r) => typeof r.note === "string" && r.note.length > 0)).toBe(true);
  });
});

describe("loadQbConsensus", () => {
  it("returns source-error when neither estimator can load", async () => {
    const r = await loadQbConsensus({ fetcher: async () => { throw new Error("blocked"); } });
    expect(r.status).toBe("source-error");
    expect(r.rows).toEqual([]);
    expect(r.canPublishPicks).toBe(false);
  });
});
