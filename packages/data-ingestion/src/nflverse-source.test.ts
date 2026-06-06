import { describe, it, expect } from "vitest";
import {
  parseCsv,
  nflverseUrl,
  NFLVERSE_CATALOG,
  NFLVERSE_BASE,
} from "./nflverse-source";

describe("nflverse CSV parser", () => {
  it("parses a simple table into keyed records", () => {
    const t = parseCsv("season,player,targets\n2024,A. Brown,9\n2024,J. Jefferson,11\n");
    expect(t.header).toEqual(["season", "player", "targets"]);
    expect(t.records).toHaveLength(2);
    expect(t.records[0]).toEqual({ season: "2024", player: "A. Brown", targets: "9" });
    expect(t.records[1]!.targets).toBe("11");
  });

  it("handles quoted fields with embedded commas and doubled quotes", () => {
    const t = parseCsv('id,name\n1,"Smith, Jr."\n2,"He said ""go"""\n');
    expect(t.records[0]!.name).toBe("Smith, Jr.");
    expect(t.records[1]!.name).toBe('He said "go"');
  });

  it("handles a missing trailing newline and skips blank lines", () => {
    const t = parseCsv("a,b\n1,2\n\n3,4");
    expect(t.records).toHaveLength(2);
    expect(t.records[1]).toEqual({ a: "3", b: "4" });
  });

  it("fills missing trailing columns with empty strings", () => {
    const t = parseCsv("a,b,c\n1,2\n");
    expect(t.records[0]).toEqual({ a: "1", b: "2", c: "" });
  });
});

describe("nflverse url builder", () => {
  it("builds seasonal asset urls", () => {
    expect(nflverseUrl("rosters", 2024)).toBe(`${NFLVERSE_BASE}/rosters/roster_2024.csv`);
    expect(nflverseUrl("snap_counts", 2023)).toBe(`${NFLVERSE_BASE}/snap_counts/snap_counts_2023.csv`);
    expect(nflverseUrl("player_stats_week", 2022)).toBe(`${NFLVERSE_BASE}/player_stats/player_stats.csv.gz`);
  });

  it("applies dataset variants (NGS type, PFR unit) and gz extension", () => {
    expect(nflverseUrl("ngs", 2024, "receiving")).toBe(`${NFLVERSE_BASE}/nextgen_stats/ngs_2024_receiving.csv.gz`);
    expect(nflverseUrl("ngs", 2024)).toContain("ngs_2024_receiving.csv.gz"); // default variant
    expect(nflverseUrl("pfr_advstats", 2023, "def")).toBe(`${NFLVERSE_BASE}/pfr_advstats/advstats_week_def_2023.csv`);
  });

  it("builds non-seasonal master urls", () => {
    expect(nflverseUrl("players", 0)).toBe(`${NFLVERSE_BASE}/players/players.csv`);
    expect(nflverseUrl("schedules", 0)).toBe(`${NFLVERSE_BASE}/schedules/games.csv`);
  });
});

describe("nflverse catalog integrity", () => {
  it("every entry is well-formed and self-consistent", () => {
    for (const [key, d] of Object.entries(NFLVERSE_CATALOG)) {
      expect(d.key).toBe(key);
      expect(d.tag.length).toBeGreaterThan(0);
      expect(d.description.length).toBeGreaterThan(0);
      expect(d.unlocks.length).toBeGreaterThan(0);
      expect(typeof d.file(2024)).toBe("string");
      expect(d.file(2024).length).toBeGreaterThan(0);
    }
  });

  it("covers the premium advanced datasets, not just box scores", () => {
    for (const key of ["pbp", "ngs", "snap_counts", "injuries", "pfr_advstats", "ftn_charting"]) {
      expect(NFLVERSE_CATALOG).toHaveProperty(key);
    }
  });
});
