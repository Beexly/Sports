import { describe, expect, it } from "vitest";
import {
  buildIdCrosswalk,
  resolveGsisFromRow,
  resolveGsisId,
} from "./nflverse-id-crosswalk.js";
import {
  currentNflSeasonLabel,
  latestCompletedNflSeasonFloor,
  resolveFootballStatsSeason,
} from "./nflverse-season.js";

describe("buildIdCrosswalk", () => {
  it("maps PFR and ESPN to GSIS without inventing ids", () => {
    const cw = buildIdCrosswalk(2025, [
      {
        season: 2025,
        rows: [
          { gsis_id: "00-0023459", pfr_id: "RodgAa00", espn_id: "8439" },
          { gsis_id: "00-0036900", pfr_id: "", espn_id: "" },
          { gsis_id: "", pfr_id: "Ghost00", espn_id: "1" },
        ],
      },
    ]);
    expect(resolveGsisId(cw, "pfr", "RodgAa00")).toBe("00-0023459");
    expect(resolveGsisId(cw, "espn", "8439")).toBe("00-0023459");
    expect(resolveGsisId(cw, "pfr", "Ghost00")).toBeNull();
    expect(resolveGsisId(cw, "pfr", "")).toBeNull();
    expect(cw.stats.pfrBridged).toBe(1);
    expect(cw.stats.espnBridged).toBe(1);
  });

  it("prefers primary season and fills gaps from prior season only", () => {
    const cw = buildIdCrosswalk(2026, [
      {
        season: 2026,
        rows: [{ gsis_id: "00-AAAA", pfr_id: "NewGuy01", espn_id: "100" }],
      },
      {
        season: 2025,
        rows: [
          { gsis_id: "00-AAAA", pfr_id: "OldSlug01", espn_id: "100" },
          { gsis_id: "00-BBBB", pfr_id: "PriorOnly", espn_id: "200" },
        ],
      },
    ]);
    // Primary season wins for 00-AAAA
    expect(resolveGsisId(cw, "pfr", "NewGuy01")).toBe("00-AAAA");
    expect(resolveGsisId(cw, "pfr", "OldSlug01")).toBeNull();
    // Prior-only player still bridges
    expect(resolveGsisId(cw, "pfr", "PriorOnly")).toBe("00-BBBB");
    expect(cw.seasonsUsed).toEqual([2026, 2025]);
  });
});

describe("resolveGsisFromRow", () => {
  it("uses direct GSIS before vendor bridge", () => {
    const cw = buildIdCrosswalk(2025, [
      { season: 2025, rows: [{ gsis_id: "00-1", pfr_id: "X", espn_id: "9" }] },
    ]);
    expect(resolveGsisFromRow(cw, { player_id: "00-DIRECT" })).toBe("00-DIRECT");
    expect(resolveGsisFromRow(cw, { pfr_player_id: "X" })).toBe("00-1");
    expect(resolveGsisFromRow(null, { pfr_player_id: "X" })).toBe("");
  });
});

describe("football season resolution", () => {
  it("August 2026 labels 2025 and floors completed at 2025", () => {
    const aug = new Date(Date.UTC(2026, 7, 6));
    expect(currentNflSeasonLabel(aug)).toBe(2025);
    expect(latestCompletedNflSeasonFloor(aug)).toBe(2025);
    const res = resolveFootballStatsSeason(aug);
    expect(res.season).toBe(2025);
  });

  it("prefers labelled current only when REG rows exist", () => {
    const sep = new Date(Date.UTC(2026, 8, 15));
    expect(currentNflSeasonLabel(sep)).toBe(2026);
    const without2026 = resolveFootballStatsSeason(sep, (s) => s === 2025);
    expect(without2026.season).toBe(2025);
    const with2026 = resolveFootballStatsSeason(sep, (s) => s === 2026 || s === 2025);
    expect(with2026.season).toBe(2026);
  });
});
